const DEFAULT_FORECAST_URL = 'https://forecast.weather.gov/MapClick.php?lat=37.4718&lon=-122.2695&unit=0&lg=english&FcstType=dwml';
const HOUR_FORMAT = new Intl.DateTimeFormat('en-US', { hour: 'numeric' });
const DAY_FORMAT = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const TEMP_MIN = -20;
const TEMP_MAX = 120;

const state = {
  forecastUrl: DEFAULT_FORECAST_URL,
  data: null,
};

const elements = {
  locationName: document.getElementById('location-name'),
  currentTemp: document.getElementById('current-temp'),
  currentCondition: document.getElementById('current-condition'),
  currentHiLo: document.getElementById('current-hi-lo'),
  hourlyForecast: document.getElementById('hourly-forecast'),
  dailyForecast: document.getElementById('daily-forecast'),
  detailsGrid: document.getElementById('details-grid'),
  settingsButton: document.getElementById('settings-button'),
  settingsDialog: document.getElementById('settings-dialog'),
  settingsForm: document.getElementById('settings-form'),
  settingsInput: document.getElementById('forecast-url'),
  settingsError: document.getElementById('settings-error'),
  hourlyTemplate: document.getElementById('hourly-card-template'),
  dailyTemplate: document.getElementById('daily-row-template'),
  detailTemplate: document.getElementById('detail-tile-template'),
};

init();

function init() {
  setupSettingsDialog();
  loadForecast(DEFAULT_FORECAST_URL);
}

function setupSettingsDialog() {
  if (!elements.settingsDialog) {
    return;
  }

  elements.settingsButton.addEventListener('click', () => {
    elements.settingsInput.value = state.forecastUrl;
    elements.settingsError.textContent = '';
    elements.settingsDialog.showModal();
  });

  elements.settingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const url = elements.settingsInput.value.trim();

    if (!url) {
      elements.settingsError.textContent = 'Please provide a forecast URL.';
      return;
    }

    elements.settingsError.textContent = '';
    elements.settingsDialog.close();
    await loadForecast(url);
  });

  elements.settingsForm.addEventListener('reset', () => {
    elements.settingsDialog.close();
    elements.settingsError.textContent = '';
  });
}

async function loadForecast(url) {
  state.forecastUrl = url;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Forecast request failed: ${response.status}`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');

    if (xml.querySelector('parsererror')) {
      throw new Error('Unable to parse forecast XML.');
    }

    state.data = parseDwmlForecast(xml);
    renderForecast();
  } catch (error) {
    console.error('Failed to load forecast', error);
    showError(error);
  }
}

function parseDwmlForecast(xml) {
  const forecastNode = Array.from(xml.querySelectorAll('data')).find((node) => node.getAttribute('type') === 'forecast');
  if (!forecastNode) {
    throw new Error('Forecast data missing in DWML response.');
  }

  const currentNode = Array.from(xml.querySelectorAll('data')).find((node) => node.getAttribute('type') === 'current observations');
  const location = cleanText(forecastNode.querySelector('location > area-description')) ?? 'Unknown location';
  const issuedAt = cleanText(xml.querySelector('head > product > creation-date'));
  const timeLayouts = buildTimeLayoutMap(forecastNode);
  const parameters = forecastNode.querySelector('parameters');

  if (!parameters) {
    throw new Error('Forecast parameters missing in DWML response.');
  }

  const maxTemps = extractTemperatureSeries(parameters, 'maximum', timeLayouts);
  const minTemps = extractTemperatureSeries(parameters, 'minimum', timeLayouts);
  const periodForecast = buildPeriodForecast(parameters, timeLayouts);
  const daily = buildDailyForecast(maxTemps, minTemps, periodForecast);
  const hourly = buildHourlyForecast(periodForecast);
  const current = parseCurrentObservations(currentNode);
  const details = buildDetails(current, daily, periodForecast);

  if (current && daily.length) {
    const today = daily[0];
    current.hiLo = {
      high: today.high ?? null,
      low: today.low ?? null,
    };
  }

  return {
    location,
    issuedAt,
    current,
    hourly,
    daily,
    details,
    periodForecast,
  };
}

function buildTimeLayoutMap(scope) {
  const layouts = new Map();

  scope.querySelectorAll('time-layout').forEach((layout) => {
    const key = cleanText(layout.querySelector('layout-key'));
    if (!key) {
      return;
    }

    const entries = Array.from(layout.querySelectorAll('start-valid-time')).map((node) => ({
      periodName: node.getAttribute('period-name') ?? null,
      startTime: parseTimestamp(node.textContent),
    }));

    layouts.set(key, entries);
  });

  return layouts;
}

function extractTemperatureSeries(parameters, type, layouts) {
  const node = parameters.querySelector(`temperature[type="${type}"]`);
  if (!node) {
    return [];
  }

  const layoutKey = node.getAttribute('time-layout');
  const layoutEntries = layoutKey ? layouts.get(layoutKey) ?? [] : [];
  const values = Array.from(node.querySelectorAll('value')).map(parseMaybeNumber);

  return layoutEntries.map((entry, index) => ({
    periodName: entry.periodName ?? formatDay(entry.startTime, index),
    startTime: entry.startTime,
    value: values[index] ?? null,
  }));
}

function buildPeriodForecast(parameters, layouts) {
  const textNode = parameters.querySelector('wordedForecast');
  const textLayoutKey = textNode?.getAttribute('time-layout');
  const layoutEntries = textLayoutKey ? layouts.get(textLayoutKey) ?? [] : [];

  const texts = textNode ? Array.from(textNode.querySelectorAll('text')).map((node) => cleanText(node) ?? '') : [];
  const iconNode = parameters.querySelector('conditions-icon');
  const icons = iconNode ? Array.from(iconNode.querySelectorAll('icon-link')).map((node) => cleanText(node) ?? '') : [];
  const popNode = parameters.querySelector('probability-of-precipitation');
  const pops = popNode ? Array.from(popNode.querySelectorAll('value')).map(parseMaybeNumber) : [];

  const temperatureMap = new Map();
  extractTemperatureSeries(parameters, 'maximum', layouts).forEach((item) => {
    if (item.periodName) {
      temperatureMap.set(item.periodName, item.value);
    }
  });
  extractTemperatureSeries(parameters, 'minimum', layouts).forEach((item) => {
    if (item.periodName) {
      temperatureMap.set(item.periodName, item.value);
    }
  });

  return layoutEntries.map((entry, index) => {
    const periodName = entry.periodName ?? formatDay(entry.startTime, index);
    const isNight = /night/i.test(periodName ?? '');
    const temperature = temperatureMap.get(periodName ?? '') ?? null;

    return {
      periodName,
      startTime: entry.startTime,
      isNight,
      temperature,
      icon: icons[index] ?? null,
      narrative: texts[index] ?? '',
      precipitationChance: pops[index] ?? null,
    };
  });
}

function buildDailyForecast(maxTemps, minTemps, periodForecast) {
  const nightLookup = new Map(minTemps.map((item) => [item.periodName ?? '', item]));
  const periodLookup = new Map(periodForecast.map((item) => [item.periodName ?? '', item]));

  return maxTemps.map((dayItem, index) => {
    const baseName = dayItem.periodName ?? formatDay(dayItem.startTime, index);
    const nightName = index === 0 ? 'Tonight' : `${baseName} Night`;
    const nightItem = nightLookup.get(nightName) ?? null;
    const dayPeriod = periodLookup.get(baseName) ?? null;
    const nightPeriod = periodLookup.get(nightName) ?? null;
    const label = index === 0 ? 'Today' : formatDay(dayItem.startTime, index);

    return {
      label,
      periodName: baseName,
      high: dayItem.value ?? null,
      low: nightItem?.value ?? null,
      icon: dayPeriod?.icon ?? nightPeriod?.icon ?? null,
      summary: selectSummary(dayPeriod?.narrative, nightPeriod?.narrative),
      precipitationChanceDay: dayPeriod?.precipitationChance ?? null,
      precipitationChanceNight: nightPeriod?.precipitationChance ?? null,
    };
  });
}

function buildHourlyForecast(periodForecast) {
  return periodForecast.slice(0, 12).map((item, index) => ({
    label: formatHourlyLabel(item, index),
    temperature: item.temperature,
    icon: item.icon,
    summary: selectSummary(item.narrative),
    precipitationChance: item.precipitationChance,
  }));
}

function parseCurrentObservations(currentNode) {
  if (!currentNode) {
    return null;
  }

  const layouts = buildTimeLayoutMap(currentNode);
  const parameters = currentNode.querySelector('parameters');
  if (!parameters) {
    return null;
  }

  const temperatureValue = parseMaybeNumber(parameters.querySelector('temperature[type="apparent"] value'));
  const dewPoint = parseMaybeNumber(parameters.querySelector('temperature[type="dew point"] value'));
  const humidity = parseMaybeNumber(parameters.querySelector('humidity[type="relative"] value'));
  const pressure = parseMaybeNumber(parameters.querySelector('pressure[type="barometer"] value'));
  const visibility = parseMaybeNumber(parameters.querySelector('weather-conditions value visibility'));
  const weatherSummary = parameters.querySelector('weather-conditions[weather-summary]')?.getAttribute('weather-summary') ?? 'Conditions unavailable';
  const icon = cleanText(parameters.querySelector('conditions-icon icon-link'));
  const windDirection = parseMaybeNumber(parameters.querySelector('direction[type="wind"] value'));
  const windSpeedKnots = parseMaybeNumber(parameters.querySelector('wind-speed[type="sustained"] value'));
  const windGustKnots = parseMaybeNumber(parameters.querySelector('wind-speed[type="gust"] value'));

  const anyTempLayout = parameters.querySelector('temperature')?.getAttribute('time-layout');
  const observationTime = anyTempLayout ? layouts.get(anyTempLayout)?.[0]?.startTime ?? null : null;

  return {
    temperature: temperatureValue,
    condition: weatherSummary,
    icon,
    dewPoint,
    humidity,
    pressure,
    visibility,
    observationTime,
    wind: {
      directionDegrees: windDirection,
      speedKnots: windSpeedKnots,
      gustKnots: windGustKnots,
    },
  };
}

function buildDetails(current, daily, periodForecast) {
  const details = [];
  if (current?.temperature != null) {
    details.push({ label: 'FEELS LIKE', value: formatTemperature(current.temperature) });
  }
  if (current?.humidity != null) {
    details.push({ label: 'HUMIDITY', value: `${Math.round(current.humidity)}%` });
  }
  if (current?.dewPoint != null) {
    details.push({ label: 'DEW POINT', value: formatTemperature(current.dewPoint) });
  }
  if (current?.wind) {
    const windText = formatWind(current.wind.speedKnots, current.wind.directionDegrees, current.wind.gustKnots);
    details.push({
      label: 'WIND',
      value: windText,
      windDirection: current.wind.directionDegrees
    });
  }
  if (current?.visibility != null) {
    details.push({ label: 'VISIBILITY', value: `${Number(current.visibility).toFixed(1)} mi` });
  }
  if (current?.pressure != null) {
    details.push({ label: 'PRESSURE', value: `${current.pressure.toFixed(2)} inHg` });
  }

  const nextPrecip = periodForecast.find((item) => typeof item.precipitationChance === 'number');
  if (nextPrecip) {
    details.push({
      label: 'NEXT 12H PRECIP',
      value: `${Math.round(nextPrecip.precipitationChance)}%`,
    });
  }

  if (daily.length > 1 && daily[1].summary) {
    details.push({ label: 'TOMORROW', value: daily[1].summary });
  }

  // Add worded forecasts for upcoming periods
  const forecastsToShow = periodForecast.slice(0, 3);
  forecastsToShow.forEach((period) => {
    if (period.narrative && period.periodName) {
      details.push({
        label: period.periodName.toUpperCase(),
        value: period.narrative,
        isNarrative: true
      });
    }
  });

  return details;
}

function renderForecast() {
  if (!state.data) {
    return;
  }

  const { location, current, hourly, daily, details } = state.data;

  elements.locationName.textContent = location;
  elements.currentTemp.textContent = current?.temperature != null ? formatTemperature(current.temperature) : '--';
  elements.currentCondition.textContent = current?.condition ?? 'No data';
  elements.currentHiLo.textContent = current?.hiLo ? formatHiLo(current.hiLo) : '-- / --';

  renderHourly(hourly);
  renderDaily(daily);
  renderDetails(details);
}

function renderHourly(hourly) {
  elements.hourlyForecast.innerHTML = '';
  if (!hourly.length || !elements.hourlyTemplate) {
    return;
  }

  // Find min/max temps in hourly data
  const temps = hourly.map(item => item.temperature).filter(t => t != null);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = maxTemp - minTemp || 1;

  const fragment = document.createDocumentFragment();

  hourly.forEach((item) => {
    const node = elements.hourlyTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.hourly__time').textContent = item.label;
    node.querySelector('.hourly__temp').textContent = item.temperature != null ? formatTemperature(item.temperature) : '--';

    const tempBar = node.querySelector('.hourly__temp-bar');
    if (item.temperature != null) {
      const heightPercent = ((item.temperature - minTemp) / tempRange) * 100;
      tempBar.style.height = `${Math.max(10, heightPercent)}%`;
      tempBar.style.backgroundColor = getTemperatureColor(item.temperature);
    }

    fragment.appendChild(node);
  });

  elements.hourlyForecast.appendChild(fragment);
}

function renderDaily(daily) {
  elements.dailyForecast.innerHTML = '';
  if (!daily.length || !elements.dailyTemplate) {
    return;
  }

  // Find global min/max across all days
  const allTemps = daily.flatMap(item => [item.high, item.low]).filter(t => t != null);
  const globalMin = Math.min(...allTemps);
  const globalMax = Math.max(...allTemps);
  const globalRange = globalMax - globalMin || 1;

  const fragment = document.createDocumentFragment();

  daily.forEach((item) => {
    const row = elements.dailyTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector('.daily__day').textContent = item.label;
    row.querySelector('.daily__temp--high').textContent = item.high != null ? formatTemperature(item.high) : '--';
    row.querySelector('.daily__temp--low').textContent = item.low != null ? formatTemperature(item.low) : '--';

    const rangeBar = row.querySelector('.daily__temp-range');
    if (item.low != null && item.high != null) {
      // Calculate position and width based on global range
      const leftPercent = ((item.low - globalMin) / globalRange) * 100;
      const widthPercent = ((item.high - item.low) / globalRange) * 100;

      rangeBar.style.left = `${leftPercent}%`;
      rangeBar.style.width = `${Math.max(2, widthPercent)}%`;

      // Use gradient from low to high temp
      const lowColor = getTemperatureColor(item.low);
      const highColor = getTemperatureColor(item.high);
      rangeBar.style.background = `linear-gradient(to right, ${lowColor}, ${highColor})`;
    }

    fragment.appendChild(row);
  });

  elements.dailyForecast.appendChild(fragment);
}

function renderDetails(details) {
  elements.detailsGrid.innerHTML = '';
  if (!details.length || !elements.detailTemplate) {
    return;
  }

  const fragment = document.createDocumentFragment();
  details.forEach((detail) => {
    const tile = elements.detailTemplate.content.firstElementChild.cloneNode(true);
    tile.querySelector('.detail__label').textContent = detail.label;
    const valueEl = tile.querySelector('.detail__value');

    if (detail.windDirection != null) {
      // Create wind arrow with direction
      const arrow = document.createElement('span');
      arrow.className = 'wind-arrow';
      arrow.textContent = '↑';
      arrow.style.display = 'inline-block';
      arrow.style.transform = `rotate(${detail.windDirection}deg)`;
      arrow.style.marginRight = '8px';

      valueEl.innerHTML = '';
      valueEl.appendChild(arrow);
      valueEl.appendChild(document.createTextNode(detail.value));
    } else {
      valueEl.textContent = detail.value;
    }

    if (detail.isNarrative) {
      tile.classList.add('detail--narrative');
      valueEl.classList.add('detail__value--narrative');
    }

    fragment.appendChild(tile);
  });

  elements.detailsGrid.appendChild(fragment);
}

function showError(error) {
  elements.locationName.textContent = 'Unable to load forecast';
  elements.currentCondition.textContent = error.message;
  elements.currentTemp.textContent = '--';
  elements.currentHiLo.textContent = '-- / --';
  elements.hourlyForecast.innerHTML = '';
  elements.dailyForecast.innerHTML = '';
  elements.detailsGrid.innerHTML = '';
}

function createIconElement(url, summary) {
  if (url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = summary ?? 'Weather icon';
    img.loading = 'lazy';
    img.width = 36;
    img.height = 36;
    img.className = 'icon-image';
    return img;
  }

  const placeholder = document.createElement('div');
  placeholder.className = 'icon-placeholder';
  return placeholder;
}

function formatTemperature(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return '--';
  }
  return `${Math.round(Number(value))}°`;
}

function formatHiLo(hiLo) {
  const high = hiLo.high != null ? formatTemperature(hiLo.high) : '--';
  const low = hiLo.low != null ? formatTemperature(hiLo.low) : '--';
  return `${high} / ${low}`;
}

function formatHourlyLabel(item, index) {
  if (!item.startTime) {
    return item.periodName ?? `+${index * 12}h`;
  }

  const now = Date.now();
  const timeMs = item.startTime.getTime();
  if (index === 0 && Math.abs(timeMs - now) < 60 * 60 * 1000) {
    return 'Now';
  }

  return HOUR_FORMAT.format(item.startTime);
}

function formatDay(date, index) {
  if (!date) {
    return index === 0 ? 'Today' : `Day ${index + 1}`;
  }

  return DAY_FORMAT.format(date);
}

function parseTimestamp(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMaybeNumber(node) {
  if (!node) {
    return null;
  }

  const value = typeof node === 'string' ? node : node.textContent;
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'na') {
    return null;
  }

  const number = Number(trimmed);
  return Number.isNaN(number) ? null : number;
}

function cleanText(node) {
  if (!node) {
    return null;
  }
  const value = typeof node === 'string' ? node : node.textContent;
  return value ? value.trim() : null;
}

function selectSummary(...summaries) {
  for (const text of summaries) {
    if (!text) {
      continue;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      continue;
    }
    const sentenceMatch = trimmed.match(/^[^.!?]+[.!?]?/);
    const firstSentence = sentenceMatch ? sentenceMatch[0] : trimmed;
    return firstSentence.replace(/\s+/g, ' ');
  }
  return '';
}

function formatWind(speedKnots, directionDegrees, gustKnots) {
  const speedMph = knotsToMph(speedKnots);
  const gustMph = knotsToMph(gustKnots);
  const compass = directionDegrees != null ? degreesToCompass(directionDegrees) : null;

  if (!speedMph && !gustMph) {
    return 'Calm';
  }

  const parts = [];
  if (directionDegrees != null) {
    // Add arrow pointing in wind direction
    parts.push(`↑ ${compass || ''}`);
  } else if (compass) {
    parts.push(compass);
  }
  if (speedMph) {
    parts.push(`${Math.round(speedMph)} mph`);
  }
  if (gustMph) {
    parts.push(`gusts ${Math.round(gustMph)}`);
  }

  return parts.join(' ');
}

function knotsToMph(knots) {
  if (knots == null) {
    return null;
  }
  return knots * 1.15078;
}

function degreesToCompass(degrees) {
  if (degrees == null) {
    return null;
  }
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((degrees % 360) / 22.5)) % directions.length;
  return directions[index];
}

function getTemperatureColor(temp) {
  if (temp == null) return 'rgba(128, 128, 128, 0.5)';

  // Normalize temperature to 0-1 range
  const normalized = Math.max(0, Math.min(1, (temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)));

  // Color stops: white -> purple -> blue -> green -> yellow -> red -> burgundy
  const stops = [
    { pos: 0.00, color: [255, 255, 255] },  // -20F white
    { pos: 0.14, color: [147, 112, 219] },  // 0F purple
    { pos: 0.29, color: [100, 181, 246] },  // 20F blue
    { pos: 0.43, color: [102, 187, 106] },  // 40F green
    { pos: 0.57, color: [255, 235, 59] },   // 60F yellow
    { pos: 0.71, color: [239, 83, 80] },    // 80F red
    { pos: 1.00, color: [136, 14, 79] }     // 120F burgundy
  ];

  // Find the two stops to interpolate between
  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (normalized >= stops[i].pos && normalized <= stops[i + 1].pos) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  // Interpolate between the two colors
  const range = upper.pos - lower.pos;
  const rangePct = range === 0 ? 0 : (normalized - lower.pos) / range;

  const r = Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * rangePct);
  const g = Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * rangePct);
  const b = Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * rangePct);

  return `rgb(${r}, ${g}, ${b})`;
}
