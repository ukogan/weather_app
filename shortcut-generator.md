# iOS Shortcuts for NWS Weather - Generation Guide

## Option 1: Use Shortcut Share Links (Easiest)

Unfortunately, I cannot create actual iCloud shortcut links from this environment. However, you can:

1. Find someone who has created similar shortcuts on:
   - r/shortcuts subreddit
   - RoutineHub.co (shortcut sharing site)
   - Search for "NWS weather shortcut" or "XML parser shortcut"

## Option 2: Use a Shortcut Creation Tool

### Online Shortcut Builder
Visit: https://www.icloud.com/shortcuts/ (if available)

### Shortcut Format
Shortcuts use a plist/binary format. Here's what you need conceptually:

## Option 3: Manual Entry with Copy-Paste Helper

Use this condensed format to speed up manual entry:

### Shortcut 1: "Update Weather Data"

**Variables to create:**
- CurrentTemp
- HighTemp
- LowTemp
- Conditions

**Action sequence (copy this list):**
```
1. Text: https://forecast.weather.gov/MapClick.php?lat=37.48&lon=-122.28&unit=0&lg=english&FcstType=dwml
2. Get Contents of URL [Text]
3. Match Text [Contents] - Pattern: <temperature type="apparent"[^>]*>\s*<value>(\d+)</value> - Group: 1
4. Get First Item [Matches]
5. Set Variable "CurrentTemp" [Item]
6. Match Text [Contents] - Pattern: <temperature type="maximum"[^>]*>.*?<value>(\d+)</value> - Group: 1
7. Get First Item [Matches]
8. Set Variable "HighTemp" [Item]
9. Match Text [Contents] - Pattern: <temperature type="minimum"[^>]*>.*?<value>(\d+)</value> - Group: 1
10. Get First Item [Matches]
11. Set Variable "LowTemp" [Item]
12. Match Text [Contents] - Pattern: weather-summary="([^"]+)" - Group: 1
13. Get First Item [Matches]
14. Set Variable "Conditions" [Item]
15. Text: [CurrentTemp]°
16. Set Data Jar Value - Key: "weather_current" - Value: [Text]
17. Text: H:[HighTemp]° L:[LowTemp]°
18. Set Data Jar Value - Key: "weather_hilow" - Value: [Text]
19. Text: [Conditions]
20. Set Data Jar Value - Key: "weather_conditions" - Value: [Text]
21. Current Date (formatted as "h:mm a")
22. Set Data Jar Value - Key: "weather_updated" - Value: [Date]
```

### Shortcut 2: "Weather" (Display)

```
1. Get Data Jar Value - Key: "weather_current"
2. Set Variable "temp" [Value]
3. Get Data Jar Value - Key: "weather_hilow"
4. Set Variable "hilow" [Value]
5. Get Data Jar Value - Key: "weather_conditions"
6. Set Variable "cond" [Value]
7. Get Data Jar Value - Key: "weather_updated"
8. Set Variable "updated" [Value]
9. Text: [temp]
[hilow]
[cond]
Updated: [updated]
10. Show Result [Text]
```

## Option 4: Simplified Version (Works Better)

Since regex in Shortcuts can be unreliable, here's a simpler approach using "Split Text":

### Simplified "Update Weather Data" Shortcut

```
1. Text: https://forecast.weather.gov/MapClick.php?lat=37.48&lon=-122.28&unit=0&lg=english&FcstType=dwml
2. Get Contents of URL [Text]
3. Split Text [Contents] by: <temperature type="apparent"
4. Get Last Item [Split Text]
5. Split Text [Item] by: <value>
6. Get Item from List - Index: 2
7. Split Text [Item] by: </value>
8. Get First Item [Split Text]
9. Set Data Jar Value - Key: "weather_current" - Value: [Item]
```

This is more reliable than regex in iOS Shortcuts!

## Quick Test Commands

To verify your XML is parseable, test URLs:
- Daily: https://forecast.weather.gov/MapClick.php?lat=LAT&lon=LON&FcstType=dwml
- Hourly: https://forecast.weather.gov/MapClick.php?lat=LAT&lon=LON&FcstType=digitalDWML

Replace LAT/LON with your coordinates.
