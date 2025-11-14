# Quick Start: NWS Weather on Apple Watch

## The Problem
You can't directly import iOS Shortcuts via copy-paste or script. They must be created manually OR shared via iCloud link.

## Your Options

### ✅ Option 1: Follow Step-by-Step Instructions (RECOMMENDED)

**Time required:** ~15 minutes

1. **Transfer files to your iPhone:**
   - Email yourself: `SHORTCUT_1_UPDATE.md` and `SHORTCUT_2_DISPLAY.md`
   - Or use AirDrop
   - Or open in GitHub on your phone

2. **Install Data Jar:**
   - App Store → Search "Data Jar" → Install (FREE)
   - Open it once

3. **Create First Shortcut:**
   - Open Shortcuts app
   - Tap "+" to create new shortcut
   - Open `SHORTCUT_1_UPDATE.md` side-by-side
   - Follow each step (33 total)
   - Name it "Update Weather Data"

4. **Create Second Shortcut:**
   - Tap "+" again
   - Open `SHORTCUT_2_DISPLAY.md`
   - Follow each step (10 total)
   - Name it "Weather"

5. **Set Up Automation:**
   - Shortcuts app → Automation tab → "+"
   - "Time of Day" → Choose 6:00 AM
   - "Run Shortcut" → "Update Weather Data"
   - Turn OFF "Ask Before Running"
   - Repeat for 12:00 PM and 6:00 PM

6. **Add to Apple Watch:**
   - Long-press "Weather" shortcut
   - Details → Toggle "Show on Apple Watch"
   - Toggle "Pin in Apple Watch app"

7. **Add Complication:**
   - On watch: Long-press watch face
   - Edit → Tap complication slot
   - Scroll to "Shortcuts" → Select "Weather"

### 🔧 Option 2: Find Pre-Made Shortcuts

**Search these sites:**
- **RoutineHub.co** - Search "weather XML" or "NWS"
- **r/shortcuts** subreddit - Search for weather parsers
- **iCloud shortcut links** - If someone shares one

Then modify the URL to use your location.

### 💻 Option 3: Use Shortcuts-JS (Advanced)

The JSON files in this folder could theoretically be converted using:
```bash
npm install -g shortcuts-js
# (documentation at github.com/joshfarrant/shortcuts-js)
```

**However**, this is complex and the manual method is faster.

## Customize Your Location

In `SHORTCUT_1_UPDATE.md`, Step 1 has this URL:
```
https://forecast.weather.gov/MapClick.php?lat=37.48&lon=-122.28&unit=0&lg=english&FcstType=dwml
```

**To change location:**
1. Go to https://forecast.weather.gov
2. Search your location
3. Click "Hourly Weather Forecast"
4. Copy the URL or note the lat/lon
5. Replace `37.48` and `-122.28` with your coordinates

## What You'll Get

When you tap the watch complication:
```
72°
H:85° L:60°
Sunny
Updated: 6:00 PM
```

Updates automatically 3x per day.

## Troubleshooting

**Shortcut doesn't work:**
- Test "Update Weather Data" manually first
- Check Data Jar has the keys: `weather_current`, `weather_hilow`, `weather_conditions`, `weather_updated`
- Make sure URL is correct for your location

**Can't find shortcut on watch:**
- Make sure "Show on Apple Watch" is enabled
- Restart Watch app on iPhone
- Make sure watch is updated to latest watchOS

**Data not updating:**
- Check automation is enabled and "Ask Before Running" is OFF
- Check automation permissions in Settings → Shortcuts → Automation

## Tips

- **Test first**: Run "Update Weather Data" manually before setting up automation
- **Check Data Jar**: Open Data Jar app to see if values are being stored
- **Start simple**: Get the display shortcut working first with dummy data
- **Fallback**: If XML parsing fails, use simpler Split Text instead of regex

## Files in This Folder

- `SHORTCUT_1_UPDATE.md` - **START HERE** - Creates the data fetcher
- `SHORTCUT_2_DISPLAY.md` - Creates the display shortcut
- `shortcut_update_weather.json` - Machine-readable format (reference)
- `shortcut_display_weather.json` - Machine-readable format (reference)
- `generate_shortcut.py` - Script to regenerate these files

---

**Questions?** Check:
- r/shortcuts subreddit
- Data Jar documentation at datajar.app
- iOS Shortcuts User Guide (Apple)
