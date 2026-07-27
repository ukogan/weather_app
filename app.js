/* ============================================================================
   Weather with Privacy — Modernist redesign.

   Vanilla JS, no build step, runs entirely in the browser.
   Data: NWS api.weather.gov (forecast, hourly, Area Forecast Discussion, alerts)
   plus Open-Meteo for UV, sun times and AQI — none of which are in the NWS feed.

   Color ramps, iconFor/apparent/gustMph and the AFD parser are ported verbatim
   from the design handoff: they encode real edge cases hit against the live API.
   NOTE: api.weather.gov asks for a descriptive User-Agent, but browsers forbid
   setting that header from fetch(); it is served without one here.
   ========================================================================== */

'use strict';

const DEFAULT_LOCATION = { lat: 37.4655, lon: -122.2758, name: 'Emerald Hills' };
const MIN_SPLASH_MS = 1500;

/* ---- color scales: data gets meteorological hue; chrome stays ink + red ---- */
const INK = [32, 30, 29];
function hex2rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function rgb2hex(c) { return '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join(''); }
function mix(a, b, t) { return a.map((v, i) => v + (b[i] - v) * t); }
function darken(hex, t) { return rgb2hex(mix(hex2rgb(hex), INK, t)); }

const TEMP_STOPS = [
  [-30, '#7b4fa8'], [0, '#3560ad'], [32, '#4d9de0'], [45, '#3fa9a0'],
  [58, '#63ac54'], [70, '#d9bb37'], [82, '#e8912e'], [95, '#d9482a'], [112, '#a8236b']
];
function tempColor(v) {
  if (v == null) return '#8b8590';
  const s = TEMP_STOPS;
  if (v <= s[0][0]) return s[0][1];
  if (v >= s[s.length - 1][0]) return s[s.length - 1][1];
  for (let i = 0; i < s.length - 1; i++) {
    if (v >= s[i][0] && v <= s[i + 1][0]) {
      const t = (v - s[i][0]) / (s[i + 1][0] - s[i][0]);
      return rgb2hex(mix(hex2rgb(s[i][1]), hex2rgb(s[i + 1][1]), t));
    }
  }
  return s[s.length - 1][1];
}
function tempInk(v) { return darken(tempColor(v), 0.34); }

function uvColor(v) {
  if (v < 3) return '#3d9c57';
  if (v < 6) return '#d9bb37';
  if (v < 8) return '#e8912e';
  if (v < 11) return '#d9482a';
  return '#7b4fa8';
}
function aqiColor(v) {
  if (v <= 50) return '#3d9c57';
  if (v <= 100) return '#d9bb37';
  if (v <= 150) return '#e8912e';
  if (v <= 200) return '#d9482a';
  if (v <= 300) return '#7b4fa8';
  return '#7a1f2b';
}

const DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const c2f = c => c == null ? null : c * 9 / 5 + 32;

function isDayAt(date, riseH, setH) {
  const h = date.getHours() + date.getMinutes() / 60;
  return h >= riseH && h < setH;
}
function hourLabel(hr) {
  const ap = hr < 12 ? 'AM' : 'PM';
  let h = hr % 12; if (h === 0) h = 12;
  return h + ' ' + ap;
}
function iconFor(text, isDay) {
  const t = (text || '').toLowerCase();
  if (/snow|sleet|flurr|wintry|ice pellets/.test(t)) return 'snow';
  if (/thunder|storm|rain|shower|drizzle/.test(t)) return 'rain';
  if (/fog|haze|mist|smoke/.test(t)) return 'fog';
  if (/(mostly|partly) cloudy|partly sunny|few clouds|scattered clouds/.test(t)) return isDay ? 'partly' : 'partly-night';
  if (/cloud|overcast/.test(t)) return 'cloud';
  return isDay ? 'sun' : 'moon';
}
function apparent(tF, rh, mph) {
  if (tF == null) return null;
  if (tF >= 80 && rh != null) {
    const T = tF, R = rh;
    return Math.round(-42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R
      - 0.00683783 * T * T - 0.05481717 * R * R + 0.00122874 * T * T * R
      + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R);
  }
  if (tF <= 50 && mph > 3) {
    return Math.round(35.74 + 0.6215 * tF - 35.75 * Math.pow(mph, 0.16) + 0.4275 * tF * Math.pow(mph, 0.16));
  }
  return Math.round(tF);
}
function gustMph(g, baseMph) {
  const fallback = baseMph + 6;
  if (!g || g.value == null) return fallback;
  const v = /km/i.test(g.unitCode || '') ? g.value * 0.621371 : g.value;
  const r = Math.round(v);
  return r > baseMph ? r : fallback;
}
function firstNum(s) { const m = /(\d+)/.exec(s || ''); return m ? +m[1] : 0; }
function fmtTime(d) {
  let h = d.getHours(); const m = d.getMinutes();
  const ap = h < 12 ? 'AM' : 'PM';
  h = h % 12; if (h === 0) h = 12;
  return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
}
function aqiLabel(v) {
  if (v == null) return '—';
  if (v <= 50) return 'Good';
  if (v <= 100) return 'Moderate';
  if (v <= 150) return 'Unhealthy for sensitive';
  if (v <= 200) return 'Unhealthy';
  if (v <= 300) return 'Very unhealthy';
  return 'Hazardous';
}
function uvLabel(v) {
  if (v == null) return '—';
  if (v < 3) return 'Low';
  if (v < 6) return 'Moderate';
  if (v < 8) return 'High';
  if (v < 11) return 'Very high';
  return 'Extreme';
}

/* Pull the readable prose sections out of an NWS Area Forecast Discussion. */
function parseAFD(text) {
  if (!text) return null;
  const clean = text.replace(/\r/g, '');
  const WANT = [
    ['KEY MESSAGES', 'Key Messages'], ['SYNOPSIS', 'Synopsis'],
    ['SHORT TERM', 'Short Term'], ['LONG TERM', 'Long Term'], ['DISCUSSION', 'Discussion']
  ];
  const sections = [];
  for (const pair of WANT) {
    const startRe = new RegExp('^\\.' + pair[0] + '[^\\n]*\\n', 'm');
    const m = startRe.exec(clean);
    if (!m) continue;
    let rest = clean.slice(m.index + m[0].length);
    const endM = /\n\s*\n\s*\.[A-Z]|\n\s*&&|\n\s*\$\$/.exec(rest);
    if (endM) rest = rest.slice(0, endM.index);
    while (/^\s*(Issued|Updated) at[^\n]*\n?/i.test(rest)) {
      rest = rest.replace(/^\s*(Issued|Updated) at[^\n]*\n?/i, '');
    }
    const items = [];
    rest.split(/\n\s*\n/).forEach(chunk => {
      const c = chunk.trim();
      if (!c) return;
      if (/^-\s/.test(c)) {
        c.split(/\n(?=\s*-\s)/).forEach(b => {
          const t = b.replace(/^\s*-\s*/, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          if (t) items.push({ text: t, bullet: true });
        });
      } else {
        const t = c.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        if (t) items.push({ text: t, bullet: false });
      }
    });
    if (items.length) sections.push({ head: pair[1], items });
  }
  return sections.length ? sections : null;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* Open-Meteo current weather_code → our glyph set (saved-location previews). */
function omIcon(code, isDay) {
  if (code == null) return isDay ? 'sun' : 'moon';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return 'rain';
  if ([45, 48].includes(code)) return 'fog';
  if ([2].includes(code)) return isDay ? 'partly' : 'partly-night';
  if ([3].includes(code)) return 'cloud';
  if ([1].includes(code)) return isDay ? 'partly' : 'partly-night';
  return isDay ? 'sun' : 'moon';
}

/* ---- weather glyphs (multi-color hand-drawn SVG, per the design) ---- */
const ICON_C = { sun: '#e8a723', moon: '#6a76a3', cloud: '#8b9298', rain: '#3b8fd4', snow: '#7fb6e0' };
function wxIcon(type, size) {
  const s = size;
  const C = ICON_C;
  const head = `<svg viewBox="0 0 24 24" width="${s}" height="${s}" style="display:block" fill="none"`;
  switch (type) {
    case 'sun':
      return `${head} stroke="${C.sun}" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="${C.sun}" fill-opacity="0.22"></circle><line x1="12" y1="2.6" x2="12" y2="5.2"></line><line x1="12" y1="18.8" x2="12" y2="21.4"></line><line x1="2.6" y1="12" x2="5.2" y2="12"></line><line x1="18.8" y1="12" x2="21.4" y2="12"></line><line x1="5.4" y1="5.4" x2="7.2" y2="7.2"></line><line x1="16.8" y1="16.8" x2="18.6" y2="18.6"></line><line x1="16.8" y1="7.2" x2="18.6" y2="5.4"></line><line x1="5.4" y1="18.6" x2="7.2" y2="16.8"></line></svg>`;
    case 'moon':
      return `${head} stroke="${C.moon}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" fill="${C.moon}" fill-opacity="0.16"></path></svg>`;
    case 'partly':
      return `${head} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g stroke="${C.sun}"><circle cx="8.5" cy="8" r="2.8" fill="${C.sun}" fill-opacity="0.22"></circle><line x1="8.5" y1="2.6" x2="8.5" y2="4"></line><line x1="3.1" y1="8" x2="4.5" y2="8"></line><line x1="4.6" y1="4.1" x2="5.6" y2="5.1"></line></g><path d="M8.5,18.2 a4,4 0 0 1 0,-8 a5,5 0 0 1 9.4,-1 a3.5,3.5 0 0 1 0.4,9 z" stroke="${C.cloud}" fill="${C.cloud}" fill-opacity="0.13"></path></svg>`;
    case 'partly-night':
      return `${head} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.6 8.4A4.6 4.6 0 0 1 7 3.4a4.6 4.6 0 1 0 5.6 5Z" stroke="${C.moon}" fill="${C.moon}" fill-opacity="0.16"></path><path d="M8.5,18.2 a4,4 0 0 1 0,-8 a5,5 0 0 1 9.4,-1 a3.5,3.5 0 0 1 0.4,9 z" stroke="${C.cloud}" fill="${C.cloud}" fill-opacity="0.13"></path></svg>`;
    case 'cloud':
      return `${head} stroke="${C.cloud}" stroke-width="1.8" stroke-linejoin="round"><path d="M7,16.5 a4,4 0 0 1 0,-8 a5,5 0 0 1 9.4,-1 a3.5,3.5 0 0 1 0.4,9 z" fill="${C.cloud}" fill-opacity="0.13"></path></svg>`;
    case 'fog':
      return `${head} stroke="${C.cloud}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7,13.5 a4,4 0 0 1 0,-8 a5,5 0 0 1 9.4,-1 a3.5,3.5 0 0 1 0.4,9 z" fill="${C.cloud}" fill-opacity="0.13"></path><line x1="4" y1="17.5" x2="17" y2="17.5"></line><line x1="7" y1="20.5" x2="20" y2="20.5"></line></svg>`;
    case 'rain':
      return `${head} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7,14 a4,4 0 0 1 0,-8 a5,5 0 0 1 9.4,-1 a3.5,3.5 0 0 1 0.4,9 z" stroke="${C.cloud}" fill="${C.cloud}" fill-opacity="0.13"></path><g stroke="${C.rain}"><line x1="8.6" y1="17.2" x2="7.4" y2="20.4"></line><line x1="12.4" y1="17.2" x2="11.2" y2="20.4"></line><line x1="16.2" y1="17.2" x2="15" y2="20.4"></line></g></svg>`;
    case 'snow':
      return `${head} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7,14 a4,4 0 0 1 0,-8 a5,5 0 0 1 9.4,-1 a3.5,3.5 0 0 1 0.4,9 z" stroke="${C.cloud}" fill="${C.cloud}" fill-opacity="0.13"></path><g stroke="${C.snow}"><line x1="8" y1="17.6" x2="8" y2="20.8"></line><line x1="6.6" y1="18.4" x2="9.4" y2="20"></line><line x1="9.4" y1="18.4" x2="6.6" y2="20"></line><line x1="15" y1="17.6" x2="15" y2="20.8"></line><line x1="13.6" y1="18.4" x2="16.4" y2="20"></line><line x1="16.4" y1="18.4" x2="13.6" y2="20"></line></g></svg>`;
    default:
      return `${head}></svg>`;
  }
}

/* ---- sample forecast: the honest fallback when a fetch fails ---- */
function genHours(o) {
  const out = [];
  for (let i = 0; i < 48; i++) {
    const hr = (o.startHour + i) % 24;
    const phase = Math.cos((hr - 15) / 24 * 2 * Math.PI) * 0.5 + 0.5;
    const temp = Math.round(o.lo + (o.hi - o.lo) * phase);
    const isDay = hr >= o.riseHour && hr < o.setHour;
    const hum = Math.round(Math.max(4, Math.min(100, o.hum + (o.hi - temp) * (o.humSlope || 0))));
    const wind = Math.max(0, Math.round(o.wind + (isDay ? 3 : -1) * Math.abs(Math.sin(i / 5))));
    out.push({
      label: i === 0 ? 'Now' : hourLabel(hr),
      temp, feels: apparent(temp, hum, wind), wind, hum,
      pop: o.pop ? o.pop(hr, i) : 0,
      icon: isDay ? o.dayIcon : o.nightIcon, h: hr
    });
  }
  return out;
}
function genDaily(o) {
  return ['Today', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'].map((day, i) => ({
    day,
    hi: o.hi + (o.drift ? o.drift[i] : 0),
    lo: o.lo + (o.drift ? o.drift[i] : 0),
    pop: o.dayPops ? o.dayPops[i] : 0,
    icon: o.dayIcons ? o.dayIcons[i] : o.dayIcon
  }));
}
const SAMPLE = {
  live: false, place: 'Emerald Hills', region: '',
  cur: { temp: 61, feels: 62, cond: 'Partly Cloudy', icon: 'partly', hi: 72, lo: 53 },
  headline: 'Sunny conditions expected around 9 AM. Wind gusts up to 11 mph.',
  wind: { speed: 5, gust: 11, dir: 283, dirLabel: '283° WNW' },
  hum: { value: 83, dew: 54 },
  aqi: { value: 34, label: 'Good' },
  uv: { value: 2, label: 'Low', max: 5 },
  sun: { rise: '6:07 AM', set: '8:23 PM', frac: 0.14, riseH: 6.12, setH: 20.38 },
  hours: genHours({ hi: 72, lo: 53, startHour: 8, riseHour: 6, setHour: 20, hum: 70, humSlope: 1.1, wind: 5, dayIcon: 'partly', nightIcon: 'moon' }),
  daily: genDaily({ hi: 72, lo: 53, drift: [0, 1, 0, -3, 2, -1, 0], dayIcon: 'sun', dayPops: [0, 0, 0, 20, 0, 30, 0], dayIcons: ['sun', 'sun', 'partly', 'cloud', 'sun', 'rain', 'sun'] }),
  discussion: {
    office: 'NWS Bay Area', issued: '5:41 AM', live: false,
    sections: [
      { head: 'Synopsis', items: [{ text: 'A weak ridge builds over the region today, bringing mostly sunny skies and near-seasonal highs in the low 70s. Onshore flow returns tonight with patchy low clouds near the coast by morning.', bullet: false }] },
      { head: 'Short Term', items: [{ text: 'Dry conditions persist through the extended period. Afternoon breezes off the bay peak between 2 and 5 PM, with gusts to 11 mph along the ridgelines.', bullet: false }] }
    ]
  }
};

/* ============================================================================
   State
   ========================================================================== */
const state = {
  location: loadLocation() || Object.assign({}, DEFAULT_LOCATION),
  saved: loadSaved(),
  d: JSON.parse(JSON.stringify(SAMPLE)),
  zoom: 48,
  series: { temp: true, feels: true, precip: true, wind: false, hum: false },
  expanded: false
};

function loadLocation() { try { return JSON.parse(localStorage.getItem('ww_location')); } catch (e) { return null; } }
function persistLocation() { try { localStorage.setItem('ww_location', JSON.stringify(state.location)); } catch (e) {} }
function loadSaved() { try { return JSON.parse(localStorage.getItem('ww_saved')) || []; } catch (e) { return []; } }
function persistSaved() { try { localStorage.setItem('ww_saved', JSON.stringify(state.saved)); } catch (e) {} }

/* ============================================================================
   Data load — fetch order matters (sun times drive day/night icons)
   ========================================================================== */
async function loadForecast(loc) {
  const d = JSON.parse(JSON.stringify(SAMPLE));
  if (loc.name) d.place = loc.name;
  let riseH = 6.5, setH = 19.5;

  try {
    const om = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat + '&longitude=' + loc.lon + '&daily=uv_index_max,sunrise,sunset&current=uv_index&timezone=auto&forecast_days=1').then(r => r.json());
    if (om.daily) {
      const uvMax = om.daily.uv_index_max[0];
      // Current UV drives the value (0 at night); the daily peak becomes context.
      const uvNow = om.current && om.current.uv_index;
      if (uvMax != null) d.uv.max = Math.round(uvMax);
      if (uvNow != null) { d.uv.value = Math.round(uvNow); d.uv.label = uvLabel(uvNow); }
      else if (uvMax != null) { d.uv.value = Math.round(uvMax); d.uv.label = uvLabel(uvMax); }
      const rise = new Date(om.daily.sunrise[0]), set = new Date(om.daily.sunset[0]);
      riseH = rise.getHours() + rise.getMinutes() / 60;
      setH = set.getHours() + set.getMinutes() / 60;
      d.sun.rise = fmtTime(rise); d.sun.set = fmtTime(set);
      d.sun.riseH = riseH; d.sun.setH = setH;
      d.sun.frac = Math.max(0, Math.min(1, (Date.now() - rise.getTime()) / (set.getTime() - rise.getTime())));
    }
  } catch (e) { /* keep sample */ }

  try {
    const pts = await fetch('https://api.weather.gov/points/' + loc.lat + ',' + loc.lon).then(r => r.json());
    const P = pts.properties;
    const rl = P.relativeLocation && P.relativeLocation.properties;
    if (!loc.name && rl && rl.city) d.place = rl.city;

    const [hourly, daily] = await Promise.all([
      fetch(P.forecastHourly).then(r => r.json()),
      fetch(P.forecast).then(r => r.json())
    ]);

    const hp = (hourly.properties.periods || []).slice(0, 48);
    d.hours = hp.map((p, i) => {
      const start = new Date(p.startTime);
      const rh = p.relativeHumidity && p.relativeHumidity.value;
      const mph = firstNum(p.windSpeed);
      // Day/night is a property of the MOMENT, not the period's start. Use the
      // real clock for the current cell and each period's midpoint after.
      const when = i === 0 ? new Date() : new Date(start.getTime() + 30 * 60 * 1000);
      return {
        label: i === 0 ? 'Now' : hourLabel(start.getHours()),
        temp: Math.round(p.temperature),
        feels: apparent(p.temperature, rh, mph),
        wind: mph,
        hum: rh == null ? 0 : Math.round(rh),
        pop: (p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value) || 0,
        icon: iconFor(p.shortForecast, isDayAt(when, riseH, setH)),
        h: start.getHours()
      };
    });

    const now = hp[0];
    if (now) {
      const rh = now.relativeHumidity && now.relativeHumidity.value;
      const mph = firstNum(now.windSpeed);
      d.cur.temp = Math.round(now.temperature);
      d.cur.feels = apparent(now.temperature, rh, mph);
      d.cur.cond = now.shortForecast;
      d.cur.icon = iconFor(now.shortForecast, isDayAt(new Date(), riseH, setH));
      d.wind.speed = mph;
      d.wind.gust = gustMph(now.windGust, mph);
      if (rh != null) d.hum.value = Math.round(rh);
      const dew = now.dewpoint && now.dewpoint.value;
      if (dew != null) d.hum.dew = Math.round(c2f(dew));
      const idx = DIRS.indexOf(now.windDirection || '');
      if (idx >= 0) { d.wind.dir = idx * 22.5; d.wind.dirLabel = Math.round(idx * 22.5) + '° ' + now.windDirection; }
    }

    const dp = daily.properties.periods || [];
    if (dp.length) {
      if (dp[0].detailedForecast) d.headline = dp[0].detailedForecast.split(/(?<=\.)\s/).slice(0, 2).join(' ');
      const days = [];
      for (let i = 0; i < dp.length; i++) {
        const p = dp[i];
        const pop = (p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value) || 0;
        if (!p.isDaytime) {
          if (!days.length) {
            days.push({ day: 'Tonight', hi: null, lo: Math.round(p.temperature), pop, icon: iconFor(p.shortForecast, false) });
          } else {
            const last = days[days.length - 1];
            if (last.lo == null) last.lo = Math.round(p.temperature);
          }
          continue;
        }
        const isNow = days.length === 0 || /^(Today|This )/i.test(p.name);
        days.push({
          day: isNow ? 'Today' : p.name.slice(0, 3),
          hi: Math.round(p.temperature), lo: null, pop,
          icon: iconFor(p.shortForecast, true)
        });
      }
      const usable = days.filter((x, i) => x.lo != null && (x.hi != null || i === 0)).slice(0, 7);
      if (usable.length >= 3) {
        d.daily = usable;
        d.cur.hi = usable[0].hi;
        d.cur.lo = usable[0].lo;
      }
    }

    const office = P.cwa || P.gridId;
    if (office) {
      try {
        const list = await fetch('https://api.weather.gov/products/types/AFD/locations/' + office).then(r => r.json());
        const first = list['@graph'] && list['@graph'][0];
        const url = first && (first['@id'] || 'https://api.weather.gov/products/' + first.id);
        if (url) {
          const prod = await fetch(url).then(r => r.json());
          const sections = parseAFD(prod.productText);
          if (sections) {
            d.discussion.sections = sections;
            d.discussion.office = 'NWS ' + office;
            d.discussion.issued = fmtTime(new Date(prod.issuanceTime));
            d.discussion.live = true;
          }
        }
      } catch (e) { /* keep sample discussion, flagged as sample */ }
    }
    d.live = true;
  } catch (e) { /* keep sample */ }

  // Active weather alerts — feeds the poster-red banner. Not in the sample.
  try {
    const al = await fetch('https://api.weather.gov/alerts/active?point=' + loc.lat + ',' + loc.lon).then(r => r.json());
    const f = al.features && al.features[0];
    if (f && f.properties && f.properties.event) d.region = f.properties.event;
  } catch (e) { /* no banner */ }

  try {
    const aq = await fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + loc.lat + '&longitude=' + loc.lon + '&current=us_aqi').then(r => r.json());
    const v = aq.current && aq.current.us_aqi;
    if (v != null) { d.aqi.value = Math.round(v); d.aqi.label = aqiLabel(v); }
  } catch (e) { /* keep sample */ }

  return d;
}

/* ============================================================================
   Forecast graphics
   ========================================================================== */
function uvGfx(uv) {
  const t = Math.max(0, Math.min(1, (uv.value || 0) / 11));
  const cx = 30, cy = 25, inner = 10.5 + 1.5 * t, len = 3.5 + 6.5 * t;
  const rays = [];
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    rays.push({
      x1: +(cx + inner * Math.cos(a)).toFixed(1), y1: +(cy + inner * Math.sin(a)).toFixed(1),
      x2: +(cx + (inner + len) * Math.cos(a)).toFixed(1), y2: +(cy + (inner + len) * Math.sin(a)).toFixed(1)
    });
  }
  const c = uvColor(uv.value || 0);
  return {
    value: uv.value, label: uv.label, rays, color: c, textColor: darken(c, 0.3),
    r: +(6.5 + 1.8 * t).toFixed(1),
    fillOpacity: +(0.10 + 0.80 * t).toFixed(2),
    rayOpacity: +(0.28 + 0.72 * t).toFixed(2),
    rayWidth: +(1.4 + 0.9 * t).toFixed(1)
  };
}
function humGfx(hum) {
  const frac = Math.max(0, Math.min(1, (hum.value || 0) / 100));
  const top = 11, bottom = 41, h = +((bottom - top) * frac).toFixed(1);
  return {
    value: hum.value, dew: hum.dew,
    waterY: +(bottom - h).toFixed(1), waterH: h,
    surfaceY: +(bottom - h).toFixed(1), showSurface: frac > 0.02
  };
}
function aqiGfx(aqi) {
  const t = Math.max(0, Math.min(1, (aqi.value || 0) / 150));
  const c = aqiColor(aqi.value || 0);
  return {
    value: aqi.value, label: aqi.label, color: darken(c, 0.28),
    sky: t < 0.34 ? '#cfe0ee' : (t < 0.67 ? '#e4dcc4' : '#e5cdb4'),
    hazeColor: t < 0.34 ? '#dfe9f1' : (t < 0.67 ? '#e8dfc8' : '#e0c3a6'),
    hazeFar: +(0.10 + 0.80 * t).toFixed(2),
    hazeMid: +(0.02 + 0.60 * t).toFixed(2),
    hazeBand: +(0.06 + 0.44 * t).toFixed(2)
  };
}
function sunGfx(sun) {
  const frac = sun.frac == null ? 0 : sun.frac;
  const up = frac > 0 && frac < 1;
  const elev = up ? Math.sin(frac * Math.PI) : 0;
  const ang = Math.PI - frac * Math.PI;
  let color = '#e0552a';
  if (!up) color = '#6a76a3';
  else if (elev > 0.72) color = '#f5cd3f';
  else if (elev > 0.42) color = '#f0a92c';
  else if (elev > 0.18) color = '#ef8b2c';
  const parkX = frac <= 0 ? 14 : 110;
  return {
    rise: sun.rise, set: sun.set, color,
    x: up ? +(62 + 48 * Math.cos(ang)).toFixed(1) : parkX,
    y: up ? +(34 - 26 * Math.sin(ang)).toFixed(1) : 34,
    glow: +(0.34 * (1 - Math.min(1, elev / 0.5))).toFixed(2)
  };
}
// Daylight card copy: describe the current sun state, and point the big number
// at the NEXT event (sunrise or sunset) rather than always showing sunset.
function daylightVals(sun) {
  if (sun.riseH == null || sun.setH == null) return { kicker: 'Daylight', big: sun.set, cap: 'Sunset' };
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  const riseH = sun.riseH, setH = sun.setH;
  if (nowH < riseH) {
    return { kicker: (riseH - nowH) <= 1.5 ? 'Almost dawn' : 'Before dawn', big: sun.rise, cap: 'Sunrise' };
  }
  if (nowH >= setH) {
    return { kicker: (nowH - setH) <= 1 ? 'Just after sunset' : 'After dark', big: sun.rise, cap: 'Sunrise' };
  }
  const f = (nowH - riseH) / Math.max(0.01, setH - riseH);
  const kicker = f < 0.15 ? 'Daybreak' : f < 0.4 ? 'Morning' : f < 0.55 ? 'Midday' : f < 0.75 ? 'Midafternoon' : f < 0.9 ? 'Late afternoon' : 'Approaching sunset';
  return { kicker: kicker, big: sun.set, cap: 'Sunset' };
}

function buildChart(targetW) {
  const d = state.d, S = state.series, zoom = state.zoom;
  // The zoom is a real time window: show exactly the next N hours and fit them
  // to the chart's container width, so "12h/24h/48h" matches what's on screen
  // (and the title), instead of just changing point spacing on a 48-hour scroll.
  const N = Math.max(2, Math.min(zoom, d.hours.length));
  const hours = d.hours.slice(0, N);
  const L = 30, R = 14, plotTop = 14, plotH = 118, baseline = plotTop + plotH;
  const fallback = Math.min((typeof window !== 'undefined' && window.innerWidth) || 390, 430) - 44;
  const w = Math.max(targetW || fallback, 240);
  const PX = (w - L - R) / (N - 1);

  const temps = hours.map(h => h.temp);
  const feels = hours.map(h => h.feels == null ? h.temp : h.feels);
  const pool = S.feels ? temps.concat(feels) : temps;
  let tmin = Math.min.apply(null, pool) - 3, tmax = Math.max.apply(null, pool) + 3;
  if (tmax - tmin < 12) { const mid = (tmax + tmin) / 2; tmin = mid - 6; tmax = mid + 6; }

  const X = i => +(L + i * PX).toFixed(1);
  const YT = v => +(plotTop + (tmax - v) / (tmax - tmin) * plotH).toFixed(1);
  const wmax = Math.max(10, Math.max.apply(null, hours.map(h => h.wind)) + 2);
  const line = (arr, Y) => arr.map((v, i) => X(i) + ',' + Y(v)).join(' ');
  const YW = v => +(baseline - (v / wmax) * plotH).toFixed(1);
  const YH = v => +(baseline - (v / 100) * plotH).toFixed(1);

  const humLine = line(hours.map(h => h.hum), YH);
  const step = zoom === 12 ? 2 : zoom === 24 ? 3 : 6;
  const ticks = [];
  for (let i = 0; i < hours.length; i += step) {
    ticks.push({
      x: X(i), label: hours[i].label,
      sub: S.wind ? hours[i].wind + 'mph' : (S.hum ? hours[i].hum + '%' : ''),
      subColor: S.wind ? '#5b7a8c' : '#2f80d4'
    });
  }

  const gridVals = [];
  const step10 = (tmax - tmin) > 45 ? 20 : 10;
  for (let v = Math.ceil(tmin / step10) * step10; v < tmax; v += step10) gridVals.push(v);
  const grid = gridVals.map(v => ({ y: YT(v), ty: YT(v) - 3, label: v + '°' }));

  const pops = [];
  hours.forEach((h, i) => {
    if (S.precip && h.pop > 0) {
      const hh = (h.pop / 100) * plotH;
      pops.push({ x: +(X(i) - PX / 2).toFixed(1), w: +Math.max(PX - 1, 3).toFixed(1), y: +(baseline - hh).toFixed(1), h: +hh.toFixed(1) });
    }
  });

  const n = hours.length;
  const tempStops = hours.map((h, i) => ({ o: (i / (n - 1) * 100).toFixed(2) + '%', c: tempColor(h.temp) }));

  return {
    span: hours.length,
    viewBox: '0 0 ' + w + ' 170',
    w, right: w - R + 6,
    gx1: X(0), gx2: X(n - 1), tempStops,
    grid, ticks, pops,
    temp: line(temps, YT), feels: line(feels, YT),
    wind: line(hours.map(h => h.wind), YW), hum: humLine,
    humArea: X(0) + ',' + baseline + ' ' + humLine + ' ' + X(n - 1) + ',' + baseline,
    showTemp: S.temp, showFeels: S.feels, showWind: S.wind, showHum: S.hum,
    nowX: X(0), nowY: YT(temps[0]), nowColor: tempColor(temps[0])
  };
}

/* ============================================================================
   Forecast render
   ========================================================================== */
const REFRESH_SVG = '<svg viewBox="0 0 24 24" style="width:17px;height:17px;" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"></path><polyline points="20,4 20,11 13.5,11"></polyline></svg>';
const ALERT_SVG = '<svg viewBox="0 0 24 24" style="width:16px;height:16px;flex:none;" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M12 3.5 1.8 20.5h20.4Z"></path><line x1="12" y1="10" x2="12" y2="14.5"></line><line x1="12" y1="17.4" x2="12" y2="17.5"></line></svg>';

const SERIES_DEFS = [
  { key: 'temp', label: 'Temp', swatch: '3px solid #d9482a' },
  { key: 'feels', label: 'Feels', swatch: '2px dashed #8b8590' },
  { key: 'precip', label: 'Precip', swatch: '9px solid rgba(59,143,212,.42)' },
  { key: 'wind', label: 'Wind', swatch: '2px dotted #5b7a8c' },
  { key: 'hum', label: 'Humidity', swatch: '2px solid #2f80d4' }
];

function chartSVG(c) {
  let s = `<svg viewBox="${c.viewBox}" style="display:block;width:${c.w}px;height:170px;">`;
  s += `<defs><linearGradient id="tempGrad" gradientUnits="userSpaceOnUse" x1="${c.gx1}" y1="0" x2="${c.gx2}" y2="0">`;
  s += c.tempStops.map(st => `<stop offset="${st.o}" stop-color="${st.c}"></stop>`).join('');
  s += `</linearGradient></defs>`;
  s += c.grid.map(g => `<line x1="30" x2="${c.right}" y1="${g.y}" y2="${g.y}" stroke="rgba(32,30,29,.13)" stroke-width="1"></line><text x="0" y="${g.ty}" fill="#7d7979" font-size="10" font-weight="600">${g.label}</text>`).join('');
  s += c.pops.map(p => `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#3b8fd4" fill-opacity="0.20"></rect>`).join('');
  if (c.showHum) s += `<polygon points="${c.humArea}" fill="#2f80d4" fill-opacity="0.10"></polygon><polyline points="${c.hum}" fill="none" stroke="#2f80d4" stroke-width="1.8"></polyline>`;
  if (c.showWind) s += `<polyline points="${c.wind}" fill="none" stroke="#5b7a8c" stroke-width="1.8" stroke-dasharray="1 3" stroke-linecap="round"></polyline>`;
  if (c.showFeels) s += `<polyline points="${c.feels}" fill="none" stroke="#8b8590" stroke-width="1.6" stroke-dasharray="5 4"></polyline>`;
  if (c.showTemp) s += `<polyline points="${c.temp}" fill="none" stroke="url(#tempGrad)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"></polyline><circle cx="${c.nowX}" cy="${c.nowY}" r="4.5" fill="${c.nowColor}" stroke="#f3f2f2" stroke-width="1.5"></circle>`;
  s += `<line x1="${c.nowX}" x2="${c.nowX}" y1="14" y2="132" stroke="#201e1d" stroke-width="1" stroke-dasharray="3 3" opacity="0.32"></line>`;
  s += c.ticks.map(tk => `<line x1="${tk.x}" x2="${tk.x}" y1="132" y2="137" stroke="rgba(32,30,29,.35)" stroke-width="1"></line><text x="${tk.x}" y="150" fill="#605d5d" font-size="10" font-weight="600" text-anchor="middle">${tk.label}</text><text x="${tk.x}" y="164" fill="${tk.subColor}" font-size="9" font-weight="600" text-anchor="middle">${tk.sub}</text>`).join('');
  s += `</svg>`;
  return s;
}

// Resize the chart SVG to its actual container width (the content column is
// wider in the landscape/two-column layout than the phone column).
function fitChart() {
  const box = document.getElementById('fc-chart-scroll');
  if (!box) return;
  const w = box.clientWidth;
  if (!w) return;
  box.innerHTML = chartSVG(buildChart(w));
}

function renderForecast() {
  const d = state.d, S = state.series;
  const scr = document.getElementById('forecast-screen');

  const summary = d.cur.hi != null
    ? 'H ' + d.cur.hi + '° / L ' + d.cur.lo + '° / Feels ' + d.cur.feels + '°'
    : 'Low ' + d.cur.lo + '° tonight / Feels ' + d.cur.feels + '°';
  const sourceLabel = d.live ? 'Live · NWS' : 'Sample data';

  // 7-day domain
  const his = d.daily.map(x => x.hi).filter(v => v != null);
  const los = d.daily.map(x => x.lo).filter(v => v != null);
  const wmin = Math.min.apply(null, los) - 2, wmax = Math.max.apply(null, his.concat(los)) + 2;
  const dspan = Math.max(1, wmax - wmin);

  const zoomBtns = [12, 24, 48].map(z => `<button class="zoom__btn ${state.zoom === z ? 'is-on' : ''}" data-zoom="${z}" type="button">${z}h</button>`).join('');
  const chips = SERIES_DEFS.map(o => `<button class="chip ${S[o.key] ? 'is-on' : ''}" data-series="${o.key}" type="button"><span class="chip__swatch" style="border-top:${o.swatch}"></span>${o.label}</button>`).join('');

  const chart = buildChart();
  const hourCells = d.hours.slice(0, chart.span).map(h => `<div class="hour-cell"><span class="hour-cell__label">${esc(h.label)}</span>${wxIcon(h.icon, 21)}<span class="hour-cell__temp" style="color:${tempInk(h.temp)}">${h.temp}°</span><span class="hour-cell__pop">${h.pop >= 10 ? h.pop + '%' : ''}</span></div>`).join('');

  const dayRows = d.daily.map(x => {
    const hasHi = x.hi != null;
    const loC = tempColor(x.lo), hiC = tempColor(hasHi ? x.hi : x.lo);
    const left = ((x.lo - wmin) / dspan * 100).toFixed(1) + '%';
    const width = (hasHi ? Math.max(2, (x.hi - x.lo) / dspan * 100) : 3).toFixed(1) + '%';
    return `<div class="day-row">
      <div class="day-row__name"><div class="day-row__day">${esc(x.day)}</div><div class="day-row__pop">${x.pop > 0 ? x.pop + '%' : ''}</div></div>
      <span class="day-row__icon">${wxIcon(x.icon, 21)}</span>
      <span class="day-row__lo" style="color:${tempInk(x.lo)}">${x.lo}°</span>
      <div class="day-row__track"><div class="day-row__fill" style="left:${left};width:${width};background:linear-gradient(90deg,${loC},${hiC})"></div></div>
      <span class="day-row__hi" style="color:${hasHi ? tempInk(x.hi) : '#9b9797'}">${hasHi ? x.hi + '°' : '—'}</span>
    </div>`;
  }).join('');

  const hum = humGfx(d.hum), aqi = aqiGfx(d.aqi), uv = uvGfx(d.uv), sun = sunGfx(d.sun);
  const windRotate = 'rotate(' + ((d.wind.dir + 180) % 360) + ' 32 32)';

  const windCard = `<div class="card card--wind">
    <div style="flex:1;">
      <div class="card__kicker">Wind</div>
      <div class="card__value">${d.wind.speed} <span>mph</span></div>
      <div class="wind-row"><span>Gusts</span><span>${d.wind.gust} mph</span></div>
      <div class="wind-row"><span>Direction</span><span>${esc(d.wind.dirLabel)}</span></div>
    </div>
    <svg viewBox="0 0 64 64" style="width:78px;height:78px;display:block;flex:none;">
      <circle cx="32" cy="32" r="25" fill="none" stroke="rgba(32,30,29,.22)" stroke-width="1.5"></circle>
      <text x="32" y="12" fill="#7d7979" font-size="8" font-weight="700" text-anchor="middle">N</text>
      <text x="54" y="35" fill="#7d7979" font-size="8" font-weight="700" text-anchor="middle">E</text>
      <text x="32" y="59" fill="#7d7979" font-size="8" font-weight="700" text-anchor="middle">S</text>
      <text x="10" y="35" fill="#7d7979" font-size="8" font-weight="700" text-anchor="middle">W</text>
      <g transform="${windRotate}">
        <line x1="32" y1="52" x2="32" y2="16" stroke="#5b7a8c" stroke-width="2.4"></line>
        <circle cx="32" cy="52" r="2.6" fill="#5b7a8c"></circle>
        <polygon points="32,10 28.3,17.4 35.7,17.4" fill="#5b7a8c"></polygon>
      </g>
    </svg>
  </div>`;

  const humCard = `<div class="card card--metric">
    <div class="card__kicker">Humidity</div>
    <div class="card__value" style="color:#2265ad">${d.hum.value}%</div>
    <svg viewBox="0 0 60 48">
      <rect x="22" y="${hum.waterY}" width="16" height="${hum.waterH}" fill="#2f80d4" fill-opacity="0.42"></rect>
      ${hum.showSurface ? `<line x1="22" x2="38" y1="${hum.surfaceY}" y2="${hum.surfaceY}" stroke="#2265ad" stroke-width="2.2"></line>` : ''}
      <path d="M21 8 L21 41 L39 41 L39 8" fill="none" stroke="#201e1d" stroke-width="2"></path>
      <line x1="16" y1="44" x2="44" y2="44" stroke="#201e1d" stroke-width="2"></line>
    </svg>
    <div class="card__caption">Dew point ${d.hum.dew}°</div>
  </div>`;

  const aqiCard = `<div class="card card--metric">
    <div class="card__kicker">Air Quality</div>
    <div class="card__value" style="color:${aqi.color}">${d.aqi.value}</div>
    <svg viewBox="0 0 60 48">
      <rect x="0" y="0" width="60" height="44" fill="${aqi.sky}"></rect>
      <polygon points="0,30 13,17 24,27 33,20 46,32 60,24 60,44 0,44" fill="#8d9aa5"></polygon>
      <rect x="0" y="0" width="60" height="44" fill="${aqi.hazeColor}" fill-opacity="${aqi.hazeFar}"></rect>
      <polygon points="0,36 11,27 22,35 34,28 47,38 60,33 60,44 0,44" fill="#5c7360"></polygon>
      <rect x="0" y="0" width="60" height="44" fill="${aqi.hazeColor}" fill-opacity="${aqi.hazeMid}"></rect>
      <polygon points="0,42 12,36 26,42 40,37 60,42 60,44 0,44" fill="#2f3d33"></polygon>
      <rect x="0" y="26" width="60" height="18" fill="${aqi.hazeColor}" fill-opacity="${aqi.hazeBand}"></rect>
      <line x1="0" y1="44" x2="60" y2="44" stroke="#201e1d" stroke-width="2"></line>
    </svg>
    <div class="card__caption">${esc(d.aqi.label)}</div>
  </div>`;

  const uvCard = `<div class="card card--metric">
    <div class="card__kicker">UV Index</div>
    <div class="card__value" style="color:${uv.textColor}">${d.uv.value}</div>
    <svg viewBox="0 0 60 48">
      ${uv.rays.map(r => `<line x1="${r.x1}" y1="${r.y1}" x2="${r.x2}" y2="${r.y2}" stroke="${uv.color}" stroke-opacity="${uv.rayOpacity}" stroke-width="${uv.rayWidth}" stroke-linecap="round"></line>`).join('')}
      <circle cx="30" cy="25" r="${uv.r}" fill="${uv.color}" fill-opacity="${uv.fillOpacity}" stroke="${uv.color}" stroke-width="2.2"></circle>
    </svg>
    <div class="card__caption">${esc(d.uv.label)}${d.uv.max != null ? ' · peak ' + d.uv.max + ' today' : ''}</div>
  </div>`;

  const day = daylightVals(d.sun);
  const daylightCard = `<div class="card card--metric card--daylight">
    <div class="card__kicker">${esc(day.kicker)}</div>
    <div class="card__value">${esc(day.big)}</div>
    <svg viewBox="0 0 124 44">
      <path d="M 14,34 A 48,26 0 0 1 110,34" fill="none" stroke="rgba(32,30,29,.2)" stroke-width="1.5" stroke-dasharray="2 3"></path>
      <line x1="10" y1="34" x2="114" y2="34" stroke="#201e1d" stroke-width="2"></line>
      <circle cx="${sun.x}" cy="${sun.y}" r="10" fill="${sun.color}" fill-opacity="${sun.glow}"></circle>
      <circle cx="${sun.x}" cy="${sun.y}" r="5" fill="${sun.color}"></circle>
    </svg>
    <div class="card__caption">${esc(day.cap)}</div>
  </div>`;

  // discussion
  const secs = d.discussion.sections || [];
  const shownSecs = state.expanded ? secs : secs.slice(0, 1);
  let discParas = '';
  shownSecs.forEach(sec => {
    sec.items.forEach((it, i) => {
      const gap = i === 0 ? '5px' : (it.bullet ? '6px' : '10px');
      const indent = it.bullet ? '2px' : '0px';
      if (i === 0) discParas += `<div class="disc-head">${esc(sec.head)}</div>`;
      discParas += `<div class="disc-body" style="margin-top:${gap};padding-left:${indent}">${esc(it.bullet ? '— ' + it.text : it.text)}</div>`;
    });
  });
  const discLive = d.discussion.live;
  const discLabel = discLive ? 'Forecast Discussion' : 'Forecast Discussion — sample';
  const discMeta = discLive ? esc(d.discussion.office) + ' · issued ' + esc(d.discussion.issued) : 'Sample text — live discussion unavailable';
  const discToggle = secs.length > 1 ? `<button class="disc-toggle" id="disc-toggle" type="button">${state.expanded ? 'Show less' : 'Read full discussion'}</button>` : '';

  scr.innerHTML = `${Delight.rainMarkup(d)}<div class="forecast__inner">
    <div class="fc-identity">
    <header class="fc-header">
      <button id="fc-open-picker" type="button" title="Change location" style="background:transparent;border:none;padding:0;text-align:left;cursor:pointer;color:inherit;font:inherit;">
        <div class="kicker">${esc(sourceLabel)}</div>
        <div class="fc-place">${esc(d.place)}</div>
      </button>
      <div class="fc-header__actions">
        <button class="icon-btn" id="fc-locations" type="button" title="Locations" aria-label="Change location">${PIN_SVG}</button>
        <button class="icon-btn" id="fc-refresh" type="button" title="Refresh" aria-label="Refresh forecast">${REFRESH_SVG}</button>
      </div>
    </header>

    ${d.region ? `<div class="fc-alert">${ALERT_SVG}<span>${esc(d.region)}</span></div>` : ''}

    <div class="fc-current">
      <div class="fc-temp" style="color:${tempInk(d.cur.temp)}">${d.cur.temp}°</div>
      <div style="padding-top:3px;min-width:0;">
        ${wxIcon(d.cur.icon, 34)}
        <div class="fc-cond">${esc(d.cur.cond)}</div>
        <div class="fc-summary">${esc(summary)}</div>
      </div>
    </div>

    <div class="fc-headline"><div class="fc-headline__bar"></div><div class="fc-headline__text">${esc(d.headline)}</div></div>
    </div>

    <div class="fc-content">
    <section class="fc-section fc-chart">
      <div class="chart-head"><span class="chart-title">Next ${chart.span} Hours</span><div class="zoom">${zoomBtns}</div></div>
      <div class="series">${chips}</div>
      <div class="scrollx" id="fc-chart-scroll">${chartSVG(chart)}</div>
      <div class="scrollx hour-strip">${hourCells}</div>
    </section>

    <div class="fc-twoup">
    <section class="fc-section">
      <div class="section-head">7-Day Forecast</div>
      ${dayRows}
    </section>

    <section class="fc-section">
      <div class="section-head cards-head">Conditions</div>
      ${windCard}
      <div class="cards-grid">${humCard}${aqiCard}${uvCard}${daylightCard}</div>
    </section>
    </div>

    <section class="fc-section fc-disc">
      <div class="section-head">${esc(discLabel)}</div>
      <div class="disc-flow">${discParas}</div>
      ${discToggle}
      <div class="disc-meta">${discMeta}</div>
    </section>

    <div class="footnote">Forecast &amp; discussion: NWS api.weather.gov. UV, daylight &amp; AQI: Open-Meteo (not in the NWS feed).</div>
    </div>
  </div>`;

  // events
  document.getElementById('fc-open-picker').addEventListener('click', openPicker);
  document.getElementById('fc-locations').addEventListener('click', openPicker);
  document.getElementById('fc-refresh').addEventListener('click', () => refresh());
  const dt = document.getElementById('disc-toggle');
  if (dt) dt.addEventListener('click', () => { state.expanded = !state.expanded; renderForecast(); });
  scr.querySelectorAll('.zoom__btn').forEach(b => b.addEventListener('click', () => { state.zoom = +b.dataset.zoom; renderForecast(); }));
  scr.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => toggleSeries(b.dataset.series)));
  fitChart();
  Delight.applyTint(d); // D7 time-of-day ground tint
}

function toggleSeries(k) {
  const s = Object.assign({}, state.series);
  s[k] = !s[k];
  if (!s.temp && !s.feels && !s.precip && !s.wind && !s.hum) return; // at least one on
  state.series = s;
  renderForecast();
}

async function refresh() {
  const btn = document.getElementById('fc-refresh');
  if (btn) btn.style.opacity = '0.4';
  state.d = await loadForecast(state.location);
  renderForecast();
}

/* ============================================================================
   Location picker
   ========================================================================== */
const picker = {
  view: 'list', query: '', editing: false,
  pin: { lat: DEFAULT_LOCATION.lat, lon: DEFAULT_LOCATION.lon },
  zoom: 13, draftName: '', home: false, editId: null,
  grid: { status: 'idle', office: '', gridId: '', cell: '', place: '' },
  _map: null, _node: null, _gridT: null, _gridToken: 0, _searchT: null
};

const PIN_SVG = `<svg viewBox="0 0 24 24" style="width:17px;height:17px;" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 21.5s7-6.2 7-11.5a7 7 0 1 0-14 0c0 5.3 7 11.5 7 11.5Z"></path><circle cx="12" cy="10" r="2.4"></circle></svg>`;
const CHEVRON_SVG = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;display:block;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9,5 16,12 9,19"></polyline></svg>`;
const HOME_SVG = `<svg viewBox="0 0 24 24" style="width:14px;height:14px;" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 11.2 12 4.5l8 6.7V20H4Z"></path></svg>`;
const CROSSHAIR_SVG = `<svg viewBox="0 0 56 56" style="width:56px;height:56px;display:block;">
  <line x1="28" y1="0" x2="28" y2="19" stroke="#f3f2f2" stroke-width="4"></line><line x1="28" y1="37" x2="28" y2="56" stroke="#f3f2f2" stroke-width="4"></line><line x1="0" y1="28" x2="19" y2="28" stroke="#f3f2f2" stroke-width="4"></line><line x1="37" y1="28" x2="56" y2="28" stroke="#f3f2f2" stroke-width="4"></line>
  <line x1="28" y1="0" x2="28" y2="19" stroke="#ec3013" stroke-width="2"></line><line x1="28" y1="37" x2="28" y2="56" stroke="#ec3013" stroke-width="2"></line><line x1="0" y1="28" x2="19" y2="28" stroke="#ec3013" stroke-width="2"></line><line x1="37" y1="28" x2="56" y2="28" stroke="#ec3013" stroke-width="2"></line>
  <circle cx="28" cy="28" r="4.5" fill="#ec3013" stroke="#f3f2f2" stroke-width="2"></circle></svg>`;

function openPicker() { picker.view = 'list'; picker.query = ''; picker.editing = false; buildListView(); showScreen('location'); }
function backToForecast() { teardownMap(); showScreen('forecast'); }

function buildListView() {
  const scr = document.getElementById('location-screen');
  scr.innerHTML = `<div class="picker__list">
    <div class="picker-header">
      <div><div class="kicker">Settings</div><div class="picker-title">Locations</div></div>
      <button class="icon-btn icon-btn--ink" id="pk-add" type="button" title="Add location" aria-label="Add location">
        <svg viewBox="0 0 24 24" style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
    </div>

    <div class="search">
      <span class="search__icon"><svg viewBox="0 0 24 24" style="width:17px;height:17px;" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><line x1="16.2" y1="16.2" x2="21" y2="21"></line></svg></span>
      <input class="search__input" id="pk-search" type="text" inputmode="search" placeholder="Search city or ZIP" autocomplete="off" />
      <button class="search__clear" id="pk-clear" type="button" title="Clear" aria-label="Clear search" hidden><svg viewBox="0 0 24 24" style="width:16px;height:16px;" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg></button>
    </div>

    <button class="use-current map-entry" id="pk-map" type="button">
      <span class="use-current__icon">${PIN_SVG}</span>
      <span class="use-current__label">Set location on the map</span>
      <span class="use-current__note">${CHEVRON_SVG}</span>
    </button>

    <div id="pk-results" hidden></div>
    <div id="pk-saved"></div>
  </div>`;

  document.getElementById('pk-add').addEventListener('click', () => openMapNew());
  document.getElementById('pk-map').addEventListener('click', () => openMapNew());
  const input = document.getElementById('pk-search');
  const clear = document.getElementById('pk-clear');
  input.addEventListener('input', () => {
    picker.query = input.value;
    clear.hidden = picker.query.trim().length === 0;
    scheduleSearch();
  });
  clear.addEventListener('click', () => { input.value = ''; picker.query = ''; clear.hidden = true; input.focus(); scheduleSearch(); });
  renderSaved();
  hydrateSaved();
}

function scheduleSearch() {
  clearTimeout(picker._searchT);
  const results = document.getElementById('pk-results');
  const saved = document.getElementById('pk-saved');
  const q = picker.query.trim();
  if (!q) { results.hidden = true; results.innerHTML = ''; saved.hidden = false; return; }
  saved.hidden = true; results.hidden = false;
  results.innerHTML = `<div style="margin-top:18px;"><div class="results-head">Searching…</div></div>`;
  picker._searchT = setTimeout(() => runSearch(q), 400);
}

async function runSearch(q) {
  let list = [];
  try {
    const res = await fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&countrycodes=us&format=json&addressdetails=1&limit=5', { headers: { 'Accept': 'application/json' } });
    const raw = await res.json();
    list = raw.map(r => {
      const a = r.address || {};
      const name = a.city || a.town || a.village || a.hamlet || a.county || (r.display_name || '').split(',')[0];
      const sub = [a.county, a.state, a.postcode].filter(Boolean).join(' · ');
      return { name: name, sub: sub || (r.display_name || ''), lat: +r.lat, lon: +r.lon };
    });
  } catch (e) { list = []; }
  if (picker.query.trim() !== q) return; // superseded
  renderResults(list);
}

function renderResults(list) {
  const results = document.getElementById('pk-results');
  if (!results) return;
  if (!list.length) {
    results.innerHTML = `<div style="margin-top:18px;">
      <div class="results-head">No matches</div>
      <div class="empty-note">Nothing by that name. Drop a pin on the map instead — it's the only way to an exact NWS grid point.</div>
      <button class="btn-save" id="pk-openmap" type="button" style="flex:none;width:100%;">Open map</button>
    </div>`;
    document.getElementById('pk-openmap').addEventListener('click', () => openMapNew());
    return;
  }
  const rows = list.map((r, i) => `<button class="result-row" data-i="${i}" type="button">
    <span class="result-row__icon">${PIN_SVG}</span>
    <span class="result-row__body"><span class="result-row__name">${esc(r.name)}</span><span class="result-row__sub">${esc(r.sub)}</span></span>
    <span class="result-row__cta">Set on map</span>
  </button>`).join('');
  results.innerHTML = `<div style="margin-top:18px;"><div class="results-head">${list.length} match${list.length === 1 ? '' : 'es'}</div>${rows}</div>`;
  results.querySelectorAll('.result-row').forEach(b => {
    const r = list[+b.dataset.i];
    b.addEventListener('click', () => openMapAt(r.lat, r.lon, r.name, null, false));
  });
}

function renderSaved() {
  const wrap = document.getElementById('pk-saved');
  if (!wrap) return;
  const rows = state.saved.map(s => {
    const removeBtn = picker.editing ? `<button class="saved-row__remove" data-id="${s.id}" data-act="remove" type="button" title="Remove"><svg viewBox="0 0 24 24" style="width:13px;height:13px;" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="6" y1="12" x2="18" y2="12"></line></svg></button>` : '';
    const editBtn = picker.editing ? `<button class="saved-row__edit" data-id="${s.id}" data-act="edit" type="button" title="Adjust pin"><svg viewBox="0 0 24 24" style="width:14px;height:14px;" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 20h4L20 8l-4-4L4 16Z"></path></svg></button>` : '';
    const homeMark = s.home ? `<span class="saved-row__home">${HOME_SVG}</span>` : '';
    const tempTxt = s.temp != null ? s.temp + '°' : '—';
    const tempCol = s.temp != null ? tempInk(s.temp) : '#9b9797';
    const icon = s.icon ? wxIcon(s.icon, 20) : '';
    return `<div class="saved-row">
      ${removeBtn}
      <button class="saved-row__main" data-id="${s.id}" data-act="select" type="button">
        <span class="saved-row__label">
          <span class="saved-row__nameline">${homeMark}<span class="saved-row__name">${esc(s.name)}</span></span>
          <span class="saved-row__meta">${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}${s.grid ? ' · ' + esc(s.grid) : ''}</span>
        </span>
        <span class="saved-row__cond"><span id="saved-icon-${s.id}">${icon}</span><span class="saved-row__temp" id="saved-temp-${s.id}" style="color:${tempCol}">${tempTxt}</span></span>
      </button>
      ${editBtn}
    </div>`;
  }).join('');

  wrap.innerHTML = `<div style="margin-top:22px;">
    <div class="saved-head"><span class="saved-head__title">Saved</span>${state.saved.length ? `<button class="saved-head__edit" id="pk-edit" type="button">${picker.editing ? 'Done' : 'Edit'}</button>` : ''}</div>
    ${rows}
    <button class="use-current" id="pk-current" type="button">
      <span class="use-current__icon"><svg viewBox="0 0 24 24" style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="3"></circle><circle cx="12" cy="12" r="8"></circle><line x1="12" y1="1.5" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22.5"></line><line x1="1.5" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22.5" y2="12"></line></svg></span>
      <span class="use-current__label">Use my current location</span>
      <span class="use-current__note">GPS</span>
    </button>
  </div>`;

  const editBtn = document.getElementById('pk-edit');
  if (editBtn) editBtn.addEventListener('click', () => { picker.editing = !picker.editing; renderSaved(); hydrateSaved(); });
  document.getElementById('pk-current').addEventListener('click', useCurrentLocation);
  wrap.querySelectorAll('[data-act]').forEach(b => {
    const id = b.dataset.id, act = b.dataset.act;
    const s = state.saved.find(x => String(x.id) === String(id));
    if (!s) return;
    b.addEventListener('click', () => {
      if (act === 'remove') { state.saved = state.saved.filter(x => String(x.id) !== String(id)); persistSaved(); renderSaved(); hydrateSaved(); }
      else if (act === 'edit') openMapAt(s.lat, s.lon, s.name, s.id, s.home);
      else selectSaved(s);
    });
  });
}

// Best-effort current-temp preview for saved rows (Open-Meteo, one call each).
function hydrateSaved() {
  state.saved.forEach(async s => {
    if (s.temp != null) return;
    try {
      const j = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + s.lat + '&longitude=' + s.lon + '&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit&timezone=auto').then(r => r.json());
      const cur = j.current;
      if (!cur) return;
      s.temp = Math.round(cur.temperature_2m);
      s.icon = omIcon(cur.weather_code, cur.is_day);
      persistSaved();
      const te = document.getElementById('saved-temp-' + s.id);
      const ie = document.getElementById('saved-icon-' + s.id);
      if (te) { te.textContent = s.temp + '°'; te.style.color = tempInk(s.temp); }
      if (ie) ie.innerHTML = wxIcon(s.icon, 20);
    } catch (e) { /* leave placeholder */ }
  });
}

function selectSaved(s) {
  state.location = { lat: s.lat, lon: s.lon, name: s.name };
  persistLocation();
  backToForecast();
  refresh();
}

function useCurrentLocation() {
  if (!navigator.geolocation) { openMapNew(); return; }
  const note = document.querySelector('.use-current__note');
  if (note) note.textContent = 'Locating…';
  navigator.geolocation.getCurrentPosition(
    pos => openMapAt(pos.coords.latitude, pos.coords.longitude, '', null, false),
    () => { if (note) note.textContent = 'GPS'; openMapNew(); },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function openMapNew() {
  const c = state.location;
  openMapAt(c.lat, c.lon, '', null, false);
}
function openMapAt(lat, lon, name, id, home) {
  teardownMap();
  picker.view = 'map';
  picker.pin = { lat: lat, lon: lon };
  picker.draftName = name || '';
  picker.editId = id == null ? null : id;
  picker.home = !!home;
  picker.zoom = 13;
  picker.grid = { status: 'loading', office: '', gridId: '', cell: '', place: '' };
  buildMapView();
}

function buildMapView() {
  const scr = document.getElementById('location-screen');
  const kicker = picker.editId != null ? 'Adjust saved pin' : 'New location';
  scr.innerHTML = `<div class="picker__map-view">
    <div class="map-header">
      <button class="icon-btn" id="mp-back" type="button" title="Back" aria-label="Back to list"><svg viewBox="0 0 24 24" style="width:17px;height:17px;" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="14,5 7,12 14,19"></polyline></svg></button>
      <div style="flex:1;min-width:0;"><div class="map-header__kicker">${esc(kicker)}</div><div class="map-header__title">Drop the pin</div></div>
    </div>

    <div class="map-wrap">
      <div id="mp-map" class="map-node map-ink"></div>
      <div class="map-cross">${CROSSHAIR_SVG}</div>
      <div class="map-badge-wrap"><span class="map-badge" id="mp-zoom">${zoomNote(picker.zoom)}</span></div>
    </div>

    <div class="map-form">
      <div class="coord-grid">
        <div class="coord-cell"><div class="coord-cell__label">Latitude</div><div class="coord-cell__value" id="mp-lat">${picker.pin.lat.toFixed(4)}°</div></div>
        <div class="coord-cell"><div class="coord-cell__label">Longitude</div><div class="coord-cell__value" id="mp-lon">${picker.pin.lon.toFixed(4)}°</div></div>
      </div>

      <div id="mp-grid"></div>

      <div class="name-field">
        <label for="mp-name">Name this place</label>
        <input id="mp-name" type="text" placeholder="Home" value="${esc(picker.draftName)}" autocomplete="off" />
      </div>

      <label class="home-check ${picker.home ? 'is-on' : ''}" id="mp-home-label">
        <span class="home-check__box">${picker.home ? '<svg viewBox="0 0 24 24" style="width:13px;height:13px;" fill="none" stroke="#f3f2f2" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,13 9,18 20,6"></polyline></svg>' : ''}</span>
        <input type="checkbox" id="mp-home" ${picker.home ? 'checked' : ''} />
        <span class="home-check__label">Make this my home location</span>
      </label>

      <div class="map-actions">
        <button class="btn-save" id="mp-save" type="button" disabled>${picker.editId != null ? 'Update location' : 'Save location'}</button>
        <button class="btn-cancel" id="mp-cancel" type="button">Cancel</button>
      </div>

      <div class="footnote">The pin stays centred — drag the map under it. Coordinates are saved at four decimals (about 11&nbsp;m), the precision NWS grid lookups need.</div>
    </div>
  </div>`;

  document.getElementById('mp-back').addEventListener('click', backToList);
  document.getElementById('mp-cancel').addEventListener('click', backToList);
  document.getElementById('mp-name').addEventListener('input', e => { picker.draftName = e.target.value; updateSaveBtn(); });
  document.getElementById('mp-home').addEventListener('change', e => {
    picker.home = e.target.checked;
    const lbl = document.getElementById('mp-home-label');
    lbl.classList.toggle('is-on', picker.home);
    lbl.querySelector('.home-check__box').innerHTML = picker.home ? '<svg viewBox="0 0 24 24" style="width:13px;height:13px;" fill="none" stroke="#f3f2f2" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,13 9,18 20,6"></polyline></svg>' : '';
  });
  document.getElementById('mp-save').addEventListener('click', saveLocation);
  updateGridStatus();
  ensureMap();
}

function backToList() { teardownMap(); picker.view = 'list'; buildListView(); }

function zoomNote(z) { return 'Zoom ' + z + ' · ' + (z >= 15 ? 'street level' : z >= 12 ? 'neighborhood' : 'regional'); }

function teardownMap() {
  if (picker._map) { try { picker._map.remove(); } catch (e) {} picker._map = null; }
  picker._node = null;
}

function ensureMap() {
  const node = document.getElementById('mp-map');
  if (!node) return;
  picker._node = node;
  if (picker._map) { picker._map.invalidateSize(); return; }
  if (!window.L) { setTimeout(ensureMap, 120); return; }

  const map = window.L.map(node, { center: [picker.pin.lat, picker.pin.lon], zoom: picker.zoom, zoomControl: true, attributionControl: true });
  window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  map.zoomControl.setPosition('topright');
  picker._map = map;

  map.on('moveend', () => {
    const c = map.getCenter();
    picker.pin = { lat: c.lat, lon: c.lng };
    picker.zoom = map.getZoom();
    setText('mp-lat', c.lat.toFixed(4) + '°');
    setText('mp-lon', c.lng.toFixed(4) + '°');
    setText('mp-zoom', zoomNote(picker.zoom));
    lookupGrid(c.lat, c.lng);
  });
  map.on('zoomend', () => { picker.zoom = map.getZoom(); setText('mp-zoom', zoomNote(picker.zoom)); });
  setTimeout(() => { map.invalidateSize(); lookupGrid(picker.pin.lat, picker.pin.lon); }, 60);
}

function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }

/* Resolve the pin to its actual NWS grid cell. Debounced; doubles as the
   US-only coverage check. */
function lookupGrid(lat, lon) {
  clearTimeout(picker._gridT);
  picker.grid = Object.assign({}, picker.grid, { status: 'loading' });
  updateGridStatus();
  picker._gridT = setTimeout(async () => {
    const token = ++picker._gridToken;
    try {
      const r = await fetch('https://api.weather.gov/points/' + lat.toFixed(4) + ',' + lon.toFixed(4));
      if (picker._gridToken !== token) return;
      if (!r.ok) { picker.grid = { status: 'outside', office: '', gridId: '', cell: '', place: '' }; updateGridStatus(); return; }
      const j = await r.json();
      if (picker._gridToken !== token) return;
      const P = j.properties || {};
      const rl = P.relativeLocation && P.relativeLocation.properties;
      picker.grid = {
        status: 'ok',
        office: P.cwa || P.gridId || '',
        gridId: P.gridId || '',
        cell: (P.gridX != null ? P.gridX + ',' + P.gridY : ''),
        place: rl ? rl.city + ', ' + rl.state : ''
      };
      updateGridStatus();
    } catch (e) {
      if (picker._gridToken !== token) return;
      picker.grid = { status: 'error', office: '', gridId: '', cell: '', place: '' };
      updateGridStatus();
    }
  }, 450);
}

function updateGridStatus() {
  const el = document.getElementById('mp-grid');
  if (!el) return;
  const G = picker.grid;
  const view = {
    loading: { title: 'Resolving grid cell…', sub: 'Asking api.weather.gov for this point', bg: '#eae9e9', accent: '#7d7979', icon: 'pending' },
    ok: { title: G.place ? 'Nearest: ' + G.place : 'Point is in NWS coverage', sub: G.office ? 'Forecast office ' + G.office + ' · grid ' + G.cell : '', bg: '#eae9e9', accent: '#3d9c57', icon: 'ok' },
    outside: { title: 'Outside NWS coverage', sub: 'This app forecasts US locations only', bg: 'rgba(236,48,19,.10)', accent: '#ec3013', icon: 'warn' },
    error: { title: 'Can’t reach the weather service', sub: 'Check your connection, then nudge the map to try this spot again', bg: 'rgba(236,48,19,.10)', accent: '#ec3013', icon: 'warn' },
    idle: { title: 'Move the map to pick a point', sub: '', bg: '#eae9e9', accent: '#7d7979', icon: 'pending' }
  }[G.status] || { title: '', sub: '', bg: '#eae9e9', accent: '#7d7979', icon: 'pending' };

  const icons = {
    ok: '<svg viewBox="0 0 24 24" style="width:17px;height:17px;display:block;" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,13 9,18 20,6"></polyline></svg>',
    warn: '<svg viewBox="0 0 24 24" style="width:17px;height:17px;display:block;" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M12 3.5 1.8 20.5h20.4Z"></path><line x1="12" y1="10" x2="12" y2="14.5"></line><line x1="12" y1="17.4" x2="12" y2="17.5"></line></svg>',
    pending: '<svg viewBox="0 0 24 24" style="width:17px;height:17px;display:block;" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"></circle></svg>'
  };

  el.innerHTML = `<div class="grid-status" style="background:${view.bg};border-left-color:${view.accent};">
    <span class="grid-status__icon" style="color:${view.accent};">${icons[view.icon]}</span>
    <div style="flex:1;min-width:0;"><div class="grid-status__title">${esc(view.title)}</div><div class="grid-status__sub">${esc(view.sub)}</div></div>
  </div>`;
  updateSaveBtn();
}

function updateSaveBtn() {
  const btn = document.getElementById('mp-save');
  if (!btn) return;
  const canSave = !!(picker.draftName || '').trim() && picker.grid.status === 'ok';
  btn.disabled = !canSave;
}

function saveLocation() {
  const name = (picker.draftName || '').trim();
  if (!name || picker.grid.status !== 'ok') return;
  const cell = picker.grid.office ? picker.grid.office + ' ' + picker.grid.cell : '';
  const lat = +picker.pin.lat.toFixed(4), lon = +picker.pin.lon.toFixed(4);

  if (picker.editId != null) {
    state.saved = state.saved.map(s => String(s.id) === String(picker.editId)
      ? Object.assign({}, s, { name: name, lat: lat, lon: lon, grid: cell, temp: null, icon: null })
      : s);
  } else {
    state.saved.push({ id: Date.now(), name: name, lat: lat, lon: lon, grid: cell, temp: null, icon: null, home: false });
  }
  if (picker.home) {
    const targetId = picker.editId != null ? picker.editId : state.saved[state.saved.length - 1].id;
    state.saved = state.saved.map(s => Object.assign({}, s, { home: String(s.id) === String(targetId) }));
  }
  persistSaved();

  // Make the just-saved place active and show its forecast.
  state.location = { lat: lat, lon: lon, name: name };
  persistLocation();
  teardownMap();
  backToForecast();
  refresh();
}

/* ============================================================================
   Navigation + init
   ========================================================================== */
/* ============================================================================
   DELIGHT LAYER
   Twelve small moments of polish. Flip any flag below to false to remove that
   moment cleanly — the hooks elsewhere all no-op when their flag is off. All
   motion also self-disables under prefers-reduced-motion. Paired CSS lives in
   the "DELIGHT LAYER" section of styles.css.
   ========================================================================== */
const DELIGHT = {
  splashReveal: true,     // D1  splash lifts away, forecast rises in
  tempCountUp: true,      // D2  the big temperature ticks up to its reading
  chartDraw: true,        // D3  hourly temp line strokes on left-to-right
  dayBars: true,          // D4  7-day range bars grow in, staggered
  screenFade: true,       // D5  forecast <-> locations cross-fade
  buttonPhysics: true,    // D6  hover-lift / press-travel (CSS-only; see styles.css)
  todTint: true,          // D7  ground tints subtly warm at dawn/dusk, cool at night
  rotatingStatus: true,   // D8  splash status cycles through the real load steps
  consoleSignature: true, // D9  a privacy note for anyone who opens devtools
  rainNod: true,          // D11 faint rain drift when it's actually precipitating
  konami: true            // D12 the arrow-keys sequence brings back the rainbow
};

const Delight = {
  reduce() {
    return typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /* D1 — splash -> forecast. Called from init instead of a bare showScreen. */
  splashToForecast() {
    const splash = document.getElementById('splash-screen');
    const fc = document.getElementById('forecast-screen');
    fc.hidden = false;
    window.scrollTo(0, 0);
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(fitChart);
    if (DELIGHT.splashReveal && !this.reduce()) fc.classList.add('forecast--enter');
    this.revealForecast();
    if (!DELIGHT.splashReveal || this.reduce()) { splash.hidden = true; return; }
    splash.classList.add('splash--leaving');
    const done = () => { splash.hidden = true; splash.classList.remove('splash--leaving'); };
    splash.addEventListener('animationend', done, { once: true });
    setTimeout(done, 700); // fallback if animationend never fires
  },

  /* D2/D3/D4 — one-time entrance animations, run after the reveal paints. */
  revealForecast() {
    const run = () => { this.countUp(); this.drawChart(); this.growBars(); };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(run));
    else run();
  },
  countUp() {
    const el = document.querySelector('#forecast-screen .fc-temp');
    if (!el) return;
    const target = state.d && state.d.cur ? state.d.cur.temp : null;
    if (target == null) return;
    if (!DELIGHT.tempCountUp || this.reduce()) { el.textContent = target + '°'; return; }
    const dur = 850; let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const v = Math.round(e * target);
      el.textContent = v + '°'; el.style.color = tempInk(v);
      if (p < 1) requestAnimationFrame(step); else el.style.color = tempInk(target);
    };
    el.textContent = '0°'; requestAnimationFrame(step);
  },
  drawChart() {
    if (!DELIGHT.chartDraw || this.reduce()) return;
    const line = document.querySelector('#fc-chart-scroll polyline[stroke-width="3"]');
    if (!line || !line.getTotalLength) return;
    const len = line.getTotalLength();
    line.style.transition = 'none';
    line.style.strokeDasharray = len;
    line.style.strokeDashoffset = len;
    requestAnimationFrame(() => {
      line.style.transition = 'stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1)';
      line.style.strokeDashoffset = '0';
    });
  },
  growBars() {
    if (!DELIGHT.dayBars || this.reduce()) return;
    const fills = document.querySelectorAll('#forecast-screen .day-row__fill');
    fills.forEach((f, i) => {
      const w = f.style.width;
      f.style.transition = 'none';
      f.style.width = '0';
      requestAnimationFrame(() => {
        f.style.transition = 'width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) ' + (i * 0.05) + 's';
        f.style.width = w;
      });
    });
  },

  /* D5 — cross-fade whichever screen just became visible (via showScreen). */
  enter(name) {
    if (!DELIGHT.screenFade || this.reduce()) return;
    if (name !== 'forecast' && name !== 'location') return;
    const el = document.getElementById(name === 'forecast' ? 'forecast-screen' : 'location-screen');
    if (!el) return;
    el.classList.remove('screen--enter');
    void el.offsetWidth; // restart the animation
    el.classList.add('screen--enter');
    el.addEventListener('animationend', () => el.classList.remove('screen--enter'), { once: true });
  },

  /* D7 — subtle time-of-day tint on the two grounds; the accent never moves. */
  applyTint(d) {
    const root = document.documentElement.style;
    if (!DELIGHT.todTint) { root.removeProperty('--color-bg'); root.removeProperty('--color-surface'); return; }
    let phase = 'day';
    const s = d && d.sun;
    if (s && s.riseH != null && s.setH != null) {
      const now = new Date();
      const h = now.getHours() + now.getMinutes() / 60;
      if (h < s.riseH - 0.5 || h >= s.setH + 0.5) phase = 'night';
      else if (h < s.riseH + 1.2) phase = 'dawn';
      else if (h >= s.setH - 1.2) phase = 'dusk';
    }
    const map = { day: null, dawn: ['#f5f1ec', '#ece7e1'], dusk: ['#f3eeec', '#eae3df'], night: ['#eceaec', '#e3e1e4'] };
    const t = map[phase];
    if (t) { root.setProperty('--color-bg', t[0]); root.setProperty('--color-surface', t[1]); }
    else { root.removeProperty('--color-bg'); root.removeProperty('--color-surface'); }
  },

  /* D8 — rotate the splash status through the actual load sequence. */
  startStatus() {
    if (!DELIGHT.rotatingStatus) return;
    const el = document.getElementById('splash-status');
    if (!el) return;
    const lines = ['Contacting api.weather.gov', 'Resolving your grid cell', 'Reading the hourly forecast', 'Reading the sky'];
    let i = 0; el.textContent = lines[0];
    this._statusT = setInterval(() => { i = (i + 1) % lines.length; el.textContent = lines[i]; }, 1100);
  },
  stopStatus() { clearInterval(this._statusT); },

  /* D9 — a note where a tracker would sit. */
  consoleSignature() {
    if (!DELIGHT.consoleSignature) return;
    try {
      console.log('%cWeather with Privacy', 'color:#ec3013;font:800 20px Archivo,system-ui,sans-serif');
      console.log('%cNo account. No tracking. No location leaving this device.\nSource: api.weather.gov (NWS) + Open-Meteo.',
        'color:#605d5d;font:500 12px Archivo,system-ui,sans-serif');
    } catch (e) { /* console unavailable */ }
  },

  /* D11 — markup for the rain nod; only when the current condition is rain. */
  rainMarkup(d) {
    if (!DELIGHT.rainNod) return '';
    if (!d || !d.cur || d.cur.icon !== 'rain') return '';
    return '<div class="wx-rain" aria-hidden="true"></div>';
  },

  /* D12 — the classic sequence brings back the app's one splash of colour. */
  initKonami() {
    if (!DELIGHT.konami || this._konamiInit) return;
    this._konamiInit = true;
    const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let pos = 0;
    window.addEventListener('keydown', (e) => {
      const k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === seq[pos]) { pos++; if (pos === seq.length) { pos = 0; this.showEgg(); } }
      else { pos = (k === seq[0]) ? 1 : 0; }
    });
  },
  showEgg() {
    let egg = document.getElementById('wx-egg');
    if (!egg) {
      egg = document.createElement('div');
      egg.id = 'wx-egg'; egg.className = 'egg';
      egg.innerHTML = '<img class="egg__img" src="rainbow.png" alt="Rainbow over Emerald Hills" />'
        + '<div class="egg__cap"><div class="egg__cap-title">Weather with Privacy</div>'
        + '<div class="egg__cap-sub">You found the one splash of colour. Tap to dismiss.</div></div>';
      egg.addEventListener('click', () => egg.classList.remove('on'));
      document.body.appendChild(egg);
    }
    egg.classList.add('on');
    clearTimeout(this._eggT);
    this._eggT = setTimeout(() => egg.classList.remove('on'), 4000);
  }
};

function showScreen(name) {
  document.getElementById('splash-screen').hidden = name !== 'splash';
  document.getElementById('forecast-screen').hidden = name !== 'forecast';
  document.getElementById('location-screen').hidden = name !== 'location';
  window.scrollTo(0, 0);
  if (name === 'forecast' && typeof requestAnimationFrame === 'function') requestAnimationFrame(fitChart);
  Delight.enter(name); // D5 cross-fade
}

let _resizeT = null;
window.addEventListener('resize', () => {
  clearTimeout(_resizeT);
  _resizeT = setTimeout(() => { if (!document.getElementById('forecast-screen').hidden) fitChart(); }, 150);
});

async function init() {
  Delight.consoleSignature(); // D9
  Delight.initKonami();       // D12
  Delight.startStatus();      // D8

  // Seed the saved list on first run so it isn't empty.
  if (!state.saved.length) {
    state.saved = [{ id: Date.now(), name: state.location.name || 'Home', lat: state.location.lat, lon: state.location.lon, grid: '', temp: null, icon: null, home: true }];
    persistSaved();
  }

  const started = Date.now();
  state.d = await loadForecast(state.location);
  renderForecast();

  const wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - started));
  setTimeout(() => { Delight.stopStatus(); Delight.splashToForecast(); }, wait); // D1
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
