# Weather with Privacy

A clean, client-side weather app that displays National Weather Service
forecasts in the **Modernist** design system. No account, no tracking, no
location leaving your device.

## Features

- **Current conditions** — temperature (colored by a meteorological ramp),
  condition, hi/lo and feels-like, with a plain-language narrative headline.
- **Alert banner** — active NWS watches/warnings surface as a poster-red bar.
- **Hourly chart** — one SVG chart with **toggleable series** (temp, feels-like,
  precip, wind, humidity) and **12h / 24h / 48h** horizontal zoom.
- **7-day forecast** — daily highs/lows with temperature-gradient range bars.
- **Condition cards** — four data-driven graphics (humidity glass, air-quality
  haze, UV sun, daylight arc) plus a wind compass.
- **Forecast Discussion** — the real NWS Area Forecast Discussion, parsed into
  readable sections.
- **Location picker** — search, saved locations, GPS, and a precision map with
  a fixed crosshair and live NWS grid-cell lookup.
- **Custom weather glyphs** and full **Archivo** type throughout.

## Quick Start

Open [index.html](index.html) in a modern web browser. No build process
required. (Serving over `http://` — e.g. `npx http-server` — is recommended so
the browser's `fetch` works against the weather APIs.)

## Changing Location

1. Tap your location name in the header to open **Locations**.
2. Search for a city or ZIP, use **current location**, or tap **+** to drop a
   pin on the map.
3. On the map, drag under the fixed crosshair — the status bar resolves the
   exact NWS grid cell (US-only). Name the place and **Save**.

Saved locations persist locally in your browser.

## Technical Details

See [architecture.md](architecture.md) for full architectural documentation.

- **Tech stack:** Vanilla JavaScript, HTML5, CSS3, Leaflet
- **Data sources:** NWS `api.weather.gov` (forecast, hourly, discussion,
  alerts) and Open-Meteo (UV, sun times, air quality — not in the NWS feed)
- **No backend required** — runs entirely in the browser
