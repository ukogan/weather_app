# Weather App

A clean, modern weather application that displays National Weather Service forecasts.

## Features

### ✅ Implemented
- **Current Conditions** - Real-time temperature, conditions, and hi/lo
- **Hourly Forecast** - 12-hour outlook with temps and weather icons
- **10-Day Forecast** - Extended daily forecasts with highs and lows
- **Weather Details** - Comprehensive metrics including feels-like temp, humidity, dew point, wind, visibility, pressure, and precipitation chances
- **Custom Location** - Change location via NWS DWML URL
- **Automatic Theming** - Dark/light mode based on system preference

## Quick Start

Open [index.html](index.html) in a modern web browser. No build process required.

## Changing Location

1. Click the settings icon (top right)
2. Get a DWML URL from [forecast.weather.gov](https://forecast.weather.gov)
   - Search for your location
   - Click "Hourly Weather Forecast"
   - Look for XML link or construct URL: `https://forecast.weather.gov/MapClick.php?lat={LAT}&lon={LON}&unit=0&lg=english&FcstType=dwml`
3. Paste the URL and click "Load Forecast"

## Technical Details

See [architecture.md](architecture.md) for complete architectural documentation.

**Tech Stack:** Vanilla JavaScript, HTML5, CSS3
**Data Source:** National Weather Service DWML API
**No backend required** - Runs entirely in browser
