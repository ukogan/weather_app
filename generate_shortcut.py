#!/usr/bin/env python3
"""
Generate iOS Shortcut instructions for NWS Weather
This creates a formatted markdown file with step-by-step instructions
that can be followed to create the shortcuts manually.

For actual .shortcut file generation, you'd need:
- shortcuts-js (npm package)
- shortcut-exporter tools
- Or use the iOS Shortcuts app directly
"""

import json

def generate_weather_fetcher_shortcut():
    """Generate the Update Weather Data shortcut structure"""

    # Replace with your actual NWS URL
    nws_url = "https://forecast.weather.gov/MapClick.php?lat=37.48&lon=-122.28&unit=0&lg=english&FcstType=dwml"

    shortcut = {
        "name": "Update Weather Data",
        "actions": [
            {
                "type": "text",
                "text": nws_url,
                "note": "Your NWS DWML URL"
            },
            {
                "type": "url.get",
                "input": "previous",
                "note": "Fetch the XML data"
            },
            {
                "type": "text.split",
                "input": "previous",
                "separator": '<temperature type="apparent"',
                "note": "Start parsing current temperature"
            },
            {
                "type": "list.get",
                "input": "previous",
                "index": "last",
                "note": "Get the apparent temperature section"
            },
            {
                "type": "text.split",
                "input": "previous",
                "separator": "<value>",
            },
            {
                "type": "list.get",
                "input": "previous",
                "index": 2,
            },
            {
                "type": "text.split",
                "input": "previous",
                "separator": "</value>",
            },
            {
                "type": "list.get",
                "input": "previous",
                "index": "first",
                "note": "This is the current temperature"
            },
            {
                "type": "text.combine",
                "input": "previous",
                "text": "°",
                "note": "Add degree symbol"
            },
            {
                "type": "datajar.set",
                "key": "weather_current",
                "value": "previous",
                "note": "Store in Data Jar"
            },
            # Get high temperature
            {
                "type": "text.split",
                "input": "url_contents",  # reference to step 2
                "separator": '<temperature type="maximum"',
            },
            {
                "type": "list.get",
                "input": "previous",
                "index": "last",
            },
            {
                "type": "text.split",
                "input": "previous",
                "separator": "<value>",
            },
            {
                "type": "list.get",
                "input": "previous",
                "index": 2,
            },
            {
                "type": "text.split",
                "input": "previous",
                "separator": "</value>",
            },
            {
                "type": "list.get",
                "input": "previous",
                "index": "first",
                "variable": "high_temp",
                "note": "Store as variable"
            },
            # Get low temperature
            {
                "type": "text.split",
                "input": "url_contents",
                "separator": '<temperature type="minimum"',
            },
            {
                "type": "list.get",
                "input": "previous",
                "index": "last",
            },
            {
                "type": "text.split",
                "input": "previous",
                "separator": "<value>",
            },
            {
                "type": "list.get",
                "input": "previous",
                "index": 2,
            },
            {
                "type": "text.split",
                "input": "previous",
                "separator": "</value>",
            },
            {
                "type": "list.get",
                "input": "previous",
                "index": "first",
                "variable": "low_temp"
            },
            # Combine high/low
            {
                "type": "text",
                "text": "H:{high_temp}° L:{low_temp}°",
                "note": "Format high/low"
            },
            {
                "type": "datajar.set",
                "key": "weather_hilow",
                "value": "previous"
            },
            # Get conditions
            {
                "type": "text.split",
                "input": "url_contents",
                "separator": 'weather-summary="',
            },
            {
                "type": "list.get",
                "input": "previous",
                "index": 2,
            },
            {
                "type": "text.split",
                "input": "previous",
                "separator": '"',
            },
            {
                "type": "list.get",
                "input": "previous",
                "index": "first"
            },
            {
                "type": "datajar.set",
                "key": "weather_conditions",
                "value": "previous"
            },
            # Timestamp
            {
                "type": "date.current",
                "format": "h:mm a"
            },
            {
                "type": "datajar.set",
                "key": "weather_updated",
                "value": "previous"
            }
        ]
    }

    return shortcut

def generate_weather_display_shortcut():
    """Generate the Weather display shortcut"""

    shortcut = {
        "name": "Weather",
        "actions": [
            {
                "type": "datajar.get",
                "key": "weather_current"
            },
            {
                "type": "variable.set",
                "name": "temp",
                "value": "previous"
            },
            {
                "type": "datajar.get",
                "key": "weather_hilow"
            },
            {
                "type": "variable.set",
                "name": "hilow",
                "value": "previous"
            },
            {
                "type": "datajar.get",
                "key": "weather_conditions"
            },
            {
                "type": "variable.set",
                "name": "cond",
                "value": "previous"
            },
            {
                "type": "datajar.get",
                "key": "weather_updated"
            },
            {
                "type": "variable.set",
                "name": "updated",
                "value": "previous"
            },
            {
                "type": "text",
                "text": "{temp}\n{hilow}\n{cond}\nUpdated: {updated}"
            },
            {
                "type": "show.result",
                "input": "previous"
            }
        ]
    }

    return shortcut

def generate_markdown_instructions(shortcut, filename):
    """Generate human-readable markdown instructions"""

    md = f"# {shortcut['name']}\n\n"
    md += "## Steps to create this shortcut:\n\n"

    for i, action in enumerate(shortcut['actions'], 1):
        md += f"### Step {i}\n"
        md += f"**Action Type:** {action['type']}\n\n"

        if 'note' in action:
            md += f"*{action['note']}*\n\n"

        # Add specific instructions based on type
        if action['type'] == 'text':
            md += f"- Add a **Text** action\n"
            md += f"- Content: `{action.get('text', '')}`\n"
        elif action['type'] == 'url.get':
            md += f"- Add **Get Contents of URL** action\n"
            md += f"- Input: {action.get('input', 'previous result')}\n"
        elif action['type'] == 'text.split':
            md += f"- Add **Split Text** action\n"
            md += f"- Split by: `{action.get('separator', '')}`\n"
        elif action['type'] == 'list.get':
            md += f"- Add **Get Item from List** action\n"
            md += f"- Get: {action.get('index', 'item')}\n"
        elif action['type'] == 'datajar.set':
            md += f"- Add **Set Data Jar Value** action\n"
            md += f"- Key: `{action.get('key', '')}`\n"
            md += f"- Value: {action.get('value', 'previous result')}\n"
        elif action['type'] == 'datajar.get':
            md += f"- Add **Get Data Jar Value** action\n"
            md += f"- Key: `{action.get('key', '')}`\n"
        elif action['type'] == 'variable.set':
            md += f"- Add **Set Variable** action\n"
            md += f"- Variable: `{action.get('name', '')}`\n"
        elif action['type'] == 'show.result':
            md += f"- Add **Show Result** action\n"
        elif action['type'] == 'date.current':
            md += f"- Add **Current Date** action\n"
            md += f"- Format: {action.get('format', 'default')}\n"

        md += "\n"

    # Write to file
    with open(filename, 'w') as f:
        f.write(md)

    print(f"✅ Created {filename}")

def main():
    print("🔧 Generating iOS Shortcuts for NWS Weather\n")

    # Generate both shortcuts
    fetcher = generate_weather_fetcher_shortcut()
    display = generate_weather_display_shortcut()

    # Save as JSON (for reference)
    with open('/home/user/weather_app/shortcut_update_weather.json', 'w') as f:
        json.dump(fetcher, f, indent=2)
    print("✅ Created shortcut_update_weather.json")

    with open('/home/user/weather_app/shortcut_display_weather.json', 'w') as f:
        json.dump(display, f, indent=2)
    print("✅ Created shortcut_display_weather.json")

    # Generate markdown instructions
    generate_markdown_instructions(fetcher, '/home/user/weather_app/SHORTCUT_1_UPDATE.md')
    generate_markdown_instructions(display, '/home/user/weather_app/SHORTCUT_2_DISPLAY.md')

    print("\n" + "="*60)
    print("📱 NEXT STEPS:")
    print("="*60)
    print("\n1. Install Data Jar from the App Store (free)")
    print("\n2. Open the Shortcuts app on your iPhone")
    print("\n3. Follow the instructions in:")
    print("   - SHORTCUT_1_UPDATE.md (creates data fetcher)")
    print("   - SHORTCUT_2_DISPLAY.md (creates display)")
    print("\n4. Set up automation to run 'Update Weather Data' 3x daily")
    print("\n5. Enable 'Weather' shortcut on Apple Watch")
    print("\n6. Add to watch face complication")
    print("\n" + "="*60)
    print("\n💡 TIP: The JSON files can be used with shortcuts-js")
    print("   if you want to programmatically generate the .shortcut files")
    print("   See: https://github.com/joshfarrant/shortcuts-js")

if __name__ == "__main__":
    main()
