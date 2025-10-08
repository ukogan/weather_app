# Weather App Architecture

## Architecture Change Counter: 0

## Overview
A lightweight, client-side weather application that displays NWS (National Weather Service) forecast data using the DWML (Digital Weather Markup Language) XML format.

## Tech Stack
- **Language**: Vanilla JavaScript (ES6+)
- **Runtime**: Browser (no build process)
- **Data Source**: National Weather Service DWML API
- **Styling**: CSS3 with CSS custom properties
- **Markup**: HTML5

## Core Architecture

### Frontend-Only Application
This is a pure client-side application with no backend server. All code runs in the browser.

**Files:**
- `index.html` - Main HTML structure and templates
- `app.js` - All application logic and data processing
- `styles.css` - All styling and theming
- `sample_dwml.xml` - Sample data for testing/reference

### Data Flow
```
User → Browser → NWS DWML API → XML Response → Parser → Render
```

1. App loads with default forecast URL (San Mateo, CA)
2. Fetches XML from NWS DWML endpoint via browser fetch API
3. Parses XML using browser DOMParser
4. Transforms DWML structure into app data model
5. Renders forecast data to DOM using templates

### Key Components

**State Management** (app.js:5-8)
- Single `state` object holds:
  - `forecastUrl`: Current NWS API endpoint
  - `data`: Parsed forecast data

**Element References** (app.js:10-26)
- Cached DOM references stored in `elements` object
- Avoids repeated querySelector calls

**XML Parsing** (app.js:91-131)
- `parseDwmlForecast()` - Main parser function
- Extracts location, current conditions, hourly/daily forecasts, details
- Uses helper functions to build structured data from DWML XML

**Rendering** (app.js:324-414)
- Template-based rendering using `<template>` elements
- Document fragments for efficient DOM manipulation
- Separate render functions for each UI section

## Features

### Current Implementation
1. **Current Conditions Display** - Shows temp, condition, hi/lo
2. **Hourly Forecast** - Next 12 periods with temps and icons
3. **10-Day Forecast** - Daily highs/lows with weather icons
4. **Detail Tiles** - Feels like, humidity, dew point, wind, visibility, pressure, precipitation chance
5. **Custom Location** - Settings dialog to change forecast URL
6. **Dark/Light Mode** - Automatic based on system preference

## Data Schema

### DWML Input Format
NWS provides XML with:
- `<data type="forecast">` - Main forecast data
- `<data type="current observations">` - Current conditions
- `<time-layout>` - Time series definitions
- `<parameters>` - Temperature, weather, icons, precipitation

### Internal Data Model

**Current Observation:**
```javascript
{
  temperature: number,
  condition: string,
  icon: string,
  dewPoint: number,
  humidity: number,
  pressure: number,
  visibility: number,
  observationTime: Date,
  wind: {
    directionDegrees: number,
    speedKnots: number,
    gustKnots: number
  },
  hiLo: {
    high: number,
    low: number
  }
}
```

**Hourly Forecast Item:**
```javascript
{
  label: string,
  temperature: number,
  icon: string,
  summary: string,
  precipitationChance: number
}
```

**Daily Forecast Item:**
```javascript
{
  label: string,
  periodName: string,
  high: number,
  low: number,
  icon: string,
  summary: string,
  precipitationChanceDay: number,
  precipitationChanceNight: number
}
```

## APIs Used
- **NWS DWML Forecast API**: `forecast.weather.gov/MapClick.php?lat={lat}&lon={lon}&unit=0&lg=english&FcstType=dwml`
  - Returns XML format weather data
  - No API key required
  - Public government data

## Error Handling
- Network failures show error message in UI
- XML parsing errors caught and displayed
- Missing data returns null/empty states
- Visual fallbacks for missing icons/values

## Browser Compatibility
- Requires ES6+ support (fetch, arrow functions, template literals, async/await)
- Uses DOMParser for XML parsing
- Uses `<dialog>` element for settings
- Uses CSS custom properties
- Uses Intl.DateTimeFormat for date/time formatting

## Known Limitations
- No offline support
- No data caching
- CORS limitations (relies on NWS allowing cross-origin requests)
- No user location detection (requires manual URL input)
- No historical data
- No weather alerts
