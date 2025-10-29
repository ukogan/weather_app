const DEFAULT_LAT = 37.4718;
const DEFAULT_LON = -122.2695;
const HOUR_FORMAT = new Intl.DateTimeFormat('en-US', { hour: 'numeric' });
const DAY_FORMAT = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const TEMP_MIN = -20;
const TEMP_MAX = 120;

const state = {
  location: JSON.parse(localStorage.getItem('weather_location')) || { lat: DEFAULT_LAT, lon: DEFAULT_LON },
  data: null,
  loadStartTime: Date.now(),
};

let elements = {};
let map = null;
let marker = null;
let selectedLocation = null;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  // Initialize DOM element references
  elements = {
    // Loading screen
    loadingScreen: document.getElementById('loading-screen'),
    // Forecast screen
    forecastScreen: document.getElementById('forecast-screen'),
    locationName: document.getElementById('location-name'),
    currentTemp: document.getElementById('current-temp'),
    currentCondition: document.getElementById('current-condition'),
    currentHiLo: document.getElementById('current-hi-lo'),
    hourlyForecast: document.getElementById('hourly-forecast'),
    hourlyChart: document.getElementById('hourly-chart'),
    dailyForecast: document.getElementById('daily-forecast'),
    detailsGrid: document.getElementById('details-grid'),
    settingsButton: document.getElementById('settings-button'),
    hourlyTemplate: document.getElementById('hourly-card-template'),
    dailyTemplate: document.getElementById('daily-row-template'),
    detailTemplate: document.getElementById('detail-tile-template'),
    // Location screen
    locationScreen: document.getElementById('location-screen'),
    backButton: document.getElementById('back-button'),
    locationSearch: document.getElementById('location-search'),
    geolocateButton: document.getElementById('geolocate-button'),
    map: document.getElementById('map'),
    selectedCoords: document.getElementById('selected-coords'),
    confirmButton: document.getElementById('confirm-location'),
  };

  setupNavigation();
  setupLocationPicker();
  loadForecastForLocation(state.location.lat, state.location.lon);
}

function setupNavigation() {
  elements.settingsButton.addEventListener('click', () => {
    showScreen('location');
  });

  elements.backButton.addEventListener('click', () => {
    showScreen('forecast');
  });
}

function showScreen(screenName) {
  // Hide all screens
  elements.loadingScreen.style.display = 'none';
  elements.forecastScreen.style.display = 'none';
  elements.locationScreen.style.display = 'none';

  // Show requested screen
  if (screenName === 'loading') {
    elements.loadingScreen.style.display = 'flex';
  } else if (screenName === 'location') {
    elements.locationScreen.style.display = 'flex';
    if (!map) {
      initMap();
    }
  } else {
    elements.forecastScreen.style.display = 'block';
  }
}

function setupLocationPicker() {
  // Geolocation button
  elements.geolocateButton.addEventListener('click', async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    elements.geolocateButton.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLocation(lat, lon);
        map.setView([lat, lon], 10);
        elements.geolocateButton.disabled = false;
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location');
        elements.geolocateButton.disabled = false;
      }
    );
  });

  // Search input with debounce
  let searchTimeout;
  elements.locationSearch.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if (query.length < 3) return;

    searchTimeout = setTimeout(() => searchLocation(query), 500);
  });

  // Confirm button
  elements.confirmButton.addEventListener('click', () => {
    if (selectedLocation) {
      state.location = selectedLocation;
      localStorage.setItem('weather_location', JSON.stringify(selectedLocation));
      loadForecastForLocation(selectedLocation.lat, selectedLocation.lon);
      showScreen('forecast');
    }
  });
}

function initMap() {
  map = L.map('map').setView([state.location.lat, state.location.lon], 10);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  // Click to select location
  map.on('click', (e) => {
    setLocation(e.latlng.lat, e.latlng.lng);
  });

  // Set initial location
  setLocation(state.location.lat, state.location.lon);
}

function setLocation(lat, lon) {
  selectedLocation = { lat, lon };

  // Update marker
  if (marker) {
    marker.setLatLng([lat, lon]);
  } else {
    marker = L.marker([lat, lon]).addTo(map);
  }

  // Update UI
  elements.selectedCoords.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  elements.confirmButton.disabled = false;
}

async function searchLocation(query) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `countrycodes=us&` +
      `format=json&` +
      `limit=1`
    );
    const results = await response.json();

    if (results.length > 0) {
      const result = results[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);
      setLocation(lat, lon);
      map.setView([lat, lon], 10);
    }
  } catch (error) {
    console.error('Search error:', error);
  }
}

async function loadForecastForLocation(lat, lon) {
  const url = `https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lon}&unit=0&lg=english&FcstType=dwml`;

  try {
    // Fetch main forecast (daily, current, details)
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

    const data = parseDwmlForecast(xml);

    // Fetch hourly data
    try {
      const hourlyUrl = `https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lon}&unit=0&lg=english&FcstType=digitalDWML`;
      const hourlyResponse = await fetch(hourlyUrl);
      if (hourlyResponse.ok) {
        const hourlyXmlText = await hourlyResponse.text();
        const hourlyXml = parser.parseFromString(hourlyXmlText, 'text/xml');
        const hourlyTemps = extractHourlyTemperatures(hourlyXml);
        if (hourlyTemps.length > 0) {
          data.hourly = buildHourlyForecastFromTemps(hourlyTemps);
        }
      }
    } catch (hourlyError) {
      console.warn('Failed to fetch hourly data', hourlyError);
    }

    state.data = data;
    renderForecast();

    // Show loading screen for at least 3 seconds
    const minLoadTime = 3000;
    const loadEndTime = Date.now();
    const loadDuration = loadEndTime - state.loadStartTime;
    const remainingTime = Math.max(0, minLoadTime - loadDuration);

    setTimeout(() => {
      showScreen('forecast');
    }, remainingTime);
  } catch (error) {
    console.error('Failed to load forecast', error);
    showError(error);

    // Show loading screen for at least 3 seconds even on error
    const minLoadTime = 3000;
    const loadEndTime = Date.now();
    const loadDuration = loadEndTime - state.loadStartTime;
    const remainingTime = Math.max(0, minLoadTime - loadDuration);

    setTimeout(() => {
      showScreen('forecast');
    }, remainingTime);
  }
}

function parseDwmlForecast(xml) {
  // Try to find forecast data node (dwml format) or just use first data node (digitalDWML format)
  let forecastNode = Array.from(xml.querySelectorAll('data')).find((node) => node.getAttribute('type') === 'forecast');
  if (!forecastNode) {
    forecastNode = xml.querySelector('data');
  }
  if (!forecastNode) {
    throw new Error('Forecast data missing in DWML response.');
  }

  const currentNode = Array.from(xml.querySelectorAll('data')).find((node) => node.getAttribute('type') === 'current observations');

  // Extract location with multiple fallback strategies
  let location = cleanText(forecastNode.querySelector('location > area-description'));

  if (!location) {
    // Try without child selector in case XML structure differs
    location = cleanText(forecastNode.querySelector('area-description'));
  }

  if (!location) {
    // Fallback to coordinates if area-description is missing
    const point = forecastNode.querySelector('location > point');
    if (point) {
      const lat = point.getAttribute('latitude');
      const lon = point.getAttribute('longitude');
      location = `${lat}, ${lon}`;
    }
  }

  if (!location) {
    location = 'Unknown location';
  }

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

function buildHourlyForecastFromTemps(hourlyTemps) {
  const now = new Date();

  return hourlyTemps.slice(0, 24).map((item, index) => {
    // Check if this period is current (within the hour)
    const isCurrent = item.startTime &&
      Math.abs(now - item.startTime) < 60 * 60 * 1000;

    return {
      label: isCurrent ? 'Now' : HOUR_FORMAT.format(item.startTime),
      temperature: item.value,
      icon: null,
      summary: null,
      precipitationChance: item.precipitationChance,
    };
  });
}

function extractHourlyTemperatures(xml) {
  const dataNode = xml.querySelector('data');
  if (!dataNode) return [];

  const parameters = dataNode.querySelector('parameters');
  if (!parameters) return [];

  const timeLayouts = buildTimeLayoutMap(dataNode);
  const temps = extractTemperatureSeries(parameters, 'hourly', timeLayouts);

  // Also extract precipitation probabilities
  const popNode = parameters.querySelector('probability-of-precipitation[type="floating"]');
  const pops = popNode ? Array.from(popNode.querySelectorAll('value')).map(parseMaybeNumber) : [];

  // Merge temps and precipitation
  return temps.map((temp, index) => ({
    ...temp,
    precipitationChance: pops[index] ?? null
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

function drawLineChart(canvasId, data, color, fillColor) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error('Canvas not found:', canvasId);
    return;
  }

  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();

  // If canvas has no dimensions, retry after a short delay
  if (rect.width === 0 || rect.height === 0) {
    console.log('Canvas not yet visible, retrying...');
    setTimeout(() => drawLineChart(canvasId, data, color, fillColor), 100);
    return;
  }

  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  ctx.scale(2, 2);

  const width = rect.width;
  const height = rect.height;
  const padding = 20;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  ctx.clearRect(0, 0, width, height);

  // Draw grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding + (height - padding * 2) * (i / 4);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw filled area
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(0, height - padding);

    data.forEach((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      ctx.lineTo(x, y);
    });

    ctx.lineTo(width, height - padding);
    ctx.closePath();
    ctx.fill();
  }

  // Draw line
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  data.forEach((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Draw points
  data.forEach((value, i) => {
    if (i % 3 === 0) {
      const x = (i / (data.length - 1)) * width;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function renderHourly(hourly) {
  elements.hourlyForecast.innerHTML = '';
  if (!hourly.length || !elements.hourlyTemplate) {
    console.error('Hourly data missing or template not found');
    return;
  }

  // Draw temperature chart
  const temps = hourly.map(item => item.temperature).filter(t => t != null);
  if (temps.length > 0) {
    drawLineChart('hourly-chart', temps, '#ef5350', 'rgba(239, 83, 80, 0.1)');
  }

  // Render hourly cards
  const fragment = document.createDocumentFragment();

  hourly.forEach((item) => {
    const node = elements.hourlyTemplate.content.firstElementChild.cloneNode(true);

    // Time label
    node.querySelector('.hourly__time').textContent = item.label;

    // Temperature with color
    const tempEl = node.querySelector('.hourly__temp');
    tempEl.textContent = item.temperature != null ? formatTemperature(item.temperature) : '--';
    if (item.temperature != null) {
      tempEl.style.color = getTemperatureColor(item.temperature);
    }

    // Precipitation chance
    const precipEl = node.querySelector('.hourly__precip');
    if (item.precipitationChance != null && item.precipitationChance > 0) {
      precipEl.textContent = `${Math.round(item.precipitationChance)}%`;
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

  // Find the actual min/max across the forecast period for positioning
  const allTemps = daily.flatMap(item => [item.high, item.low]).filter(t => t != null);
  const forecastMin = Math.min(...allTemps);
  const forecastMax = Math.max(...allTemps);
  const forecastRange = forecastMax - forecastMin || 1;

  const fragment = document.createDocumentFragment();

  daily.forEach((item) => {
    const row = elements.dailyTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector('.daily__day').textContent = item.label;
    row.querySelector('.daily__temp--high').textContent = item.high != null ? formatTemperature(item.high) : '--';
    row.querySelector('.daily__temp--low').textContent = item.low != null ? formatTemperature(item.low) : '--';

    const rangeBar = row.querySelector('.daily__temp-range');
    if (item.low != null && item.high != null) {
      // Position based on forecast range (so bars fill the width)
      const leftPercent = ((item.low - forecastMin) / forecastRange) * 100;
      const rightPercent = ((item.high - forecastMin) / forecastRange) * 100;
      const widthPercent = rightPercent - leftPercent;

      rangeBar.style.left = `${leftPercent}%`;
      rangeBar.style.width = `${Math.max(2, widthPercent)}%`;

      // Colors based on absolute temperature scale
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
