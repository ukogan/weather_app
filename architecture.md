# Weather App Architecture

## Architecture Change Counter: 1

## Overview
A lightweight, client-side weather app that displays National Weather Service
forecasts in the **Modernist** design system — flat, architectural, set in
Archivo, near-mono red on a light ground, zero corner radius and strong 2px
rules. Data carries meteorological hue; chrome stays ink + red.

The app runs entirely in the browser with no backend and no build step, in
keeping with its "Weather with Privacy" premise: no account, no tracking, no
location leaving the device.

## Tech Stack
- **Language**: Vanilla JavaScript (ES2020+)
- **Runtime**: Browser (no build process)
- **Data**: NWS `api.weather.gov` (JSON) + Open-Meteo (JSON)
- **Map**: Leaflet 1.9.4 + OpenStreetMap tiles (no API key)
- **Styling**: CSS3 with custom-property design tokens
- **Fonts / icons**: Archivo (Google Fonts); hand-drawn SVG weather glyphs

## Core Architecture

Pure client-side; all code runs in the browser.

**Files**
- `index.html` — screen containers (splash, forecast, picker) + asset links
- `app.js` — data layer, normalization, SVG generation, rendering, navigation
- `styles.css` — Modernist tokens and component styles

### Screens
1. **Splash** — first-run loading screen: full-color rainbow photograph,
   "Weather with Privacy" wordmark, animated progress bar. Revealed to the
   forecast once data resolves (min display time so it never flashes).
2. **Forecast** — the main screen. One scroll: header, conditional alert
   banner, current conditions, narrative headline, toggleable hourly chart,
   7-day forecast, four data-driven condition cards + wind compass, NWS Area
   Forecast Discussion, data-source footnote.
3. **Location picker** — list view (search, saved locations, GPS) ⇄ map view
   (fixed crosshair over a draggable map, live NWS grid-cell lookup).

### Data flow
```
Splash → loadForecast(location)
  ├─ Open-Meteo daily (sunrise/sunset/UV)   ← fetched first: sun times drive
  │                                            day/night icon selection
  ├─ api.weather.gov/points → forecastHourly, forecast, cwa
  ├─ api.weather.gov AFD product (Area Forecast Discussion)
  ├─ api.weather.gov/alerts/active (alert banner)
  └─ Open-Meteo air-quality (US AQI)
→ normalized `d` → renderForecast() → reveal
```

Every fetch is individually caught. A failure leaves that slice at its sample
value and degrades the honesty label (`Sample data`, `Forecast Discussion —
sample`) — nothing throws, the screen always renders. Partial NWS outages are
common, so this is deliberate.

### Interaction state (forecast)
- `zoom` — 12h / 24h / 48h; sets chart point spacing and tick step.
- `series` — `{temp, feels, precip, wind, hum}` toggles; at least one stays on.
- `expanded` — collapses the discussion to its first AFD section.

Changing any of these re-derives from the already-fetched data — no refetch.

## Normalization (ported, encodes real API edge cases)
- **Apparent temperature** — NWS heat-index polynomial ≥80°F w/ humidity; NWS
  wind-chill ≤50°F w/ wind >3 mph; else the plain temperature.
- **Icons** — `shortForecast` matched case-insensitively; day/night from the
  actual sunrise/sunset evaluated at each period's midpoint (not its start).
- **Daily pairing** — walk every period; a daytime period opens a day, the
  following night fills its low; a leading night becomes a `Tonight` row.
- **AFD parsing** — pull `KEY MESSAGES / SYNOPSIS / SHORT TERM / LONG TERM /
  DISCUSSION`; end on a blank line + `.SECTION`, or `&&` / `$$`; split
  paragraphs and `- ` bullets; collapse hard-wrapped lines.
- **Wind** — first integer of the `"5 to 10 mph"` string; gusts checked for
  km/h vs mph via `unitCode`; direction indexed into the 16-point compass.

## Color system
Chrome is Modernist ink (`#201e1d`) + accent red (`#ec3013`). Anything
encoding a measurement takes a meteorological color:
- **Temperature ramp** — 9-stop piecewise-linear sRGB interpolation drives the
  chart gradient, the now-dot and the 7-day range bars. `tempInk()` (ramp
  darkened toward ink) drives all temperature *text* for legibility.
- **UV / AQI** — banded color scales.
- **Humidity / precip / wind** — fixed blues and slate.

## APIs used
- `api.weather.gov/points/{lat},{lon}` → grid + `forecast`, `forecastHourly`
- `api.weather.gov/products/types/AFD/locations/{cwa}` → discussion
- `api.weather.gov/alerts/active?point={lat},{lon}` → alert banner
- Open-Meteo `forecast` (UV, sunrise/sunset) and `air-quality` (US AQI) —
  none of which are in the NWS feed
- Nominatim (OpenStreetMap) for search geocoding
- NWS asks for a descriptive `User-Agent`; browsers forbid setting that header
  from `fetch()`, so requests are served without one.

## Persistence
`localStorage` only — the active location (`ww_location`) and saved locations
(`ww_saved`). Nothing leaves the device.

## Known limitations / next steps
- Landscape/wide two-column reflow is specified in the design but not yet built
  (portrait is faithful and centered on wide viewports).
- Open-Meteo's US AQI is a model estimate; EPA AirNow is authoritative but
  needs an API key.
- Accessibility: series chips / zoom need real toggle semantics; the chart
  needs a text alternative; the map needs a keyboard path to set coordinates.
