# Update Weather Data

## Steps to create this shortcut:

### Step 1
**Action Type:** text

*Your NWS DWML URL*

- Add a **Text** action
- Content: `https://forecast.weather.gov/MapClick.php?lat=37.48&lon=-122.28&unit=0&lg=english&FcstType=dwml`

### Step 2
**Action Type:** url.get

*Fetch the XML data*

- Add **Get Contents of URL** action
- Input: previous

### Step 3
**Action Type:** text.split

*Start parsing current temperature*

- Add **Split Text** action
- Split by: `<temperature type="apparent"`

### Step 4
**Action Type:** list.get

*Get the apparent temperature section*

- Add **Get Item from List** action
- Get: last

### Step 5
**Action Type:** text.split

- Add **Split Text** action
- Split by: `<value>`

### Step 6
**Action Type:** list.get

- Add **Get Item from List** action
- Get: 2

### Step 7
**Action Type:** text.split

- Add **Split Text** action
- Split by: `</value>`

### Step 8
**Action Type:** list.get

*This is the current temperature*

- Add **Get Item from List** action
- Get: first

### Step 9
**Action Type:** text.combine

*Add degree symbol*


### Step 10
**Action Type:** datajar.set

*Store in Data Jar*

- Add **Set Data Jar Value** action
- Key: `weather_current`
- Value: previous

### Step 11
**Action Type:** text.split

- Add **Split Text** action
- Split by: `<temperature type="maximum"`

### Step 12
**Action Type:** list.get

- Add **Get Item from List** action
- Get: last

### Step 13
**Action Type:** text.split

- Add **Split Text** action
- Split by: `<value>`

### Step 14
**Action Type:** list.get

- Add **Get Item from List** action
- Get: 2

### Step 15
**Action Type:** text.split

- Add **Split Text** action
- Split by: `</value>`

### Step 16
**Action Type:** list.get

*Store as variable*

- Add **Get Item from List** action
- Get: first

### Step 17
**Action Type:** text.split

- Add **Split Text** action
- Split by: `<temperature type="minimum"`

### Step 18
**Action Type:** list.get

- Add **Get Item from List** action
- Get: last

### Step 19
**Action Type:** text.split

- Add **Split Text** action
- Split by: `<value>`

### Step 20
**Action Type:** list.get

- Add **Get Item from List** action
- Get: 2

### Step 21
**Action Type:** text.split

- Add **Split Text** action
- Split by: `</value>`

### Step 22
**Action Type:** list.get

- Add **Get Item from List** action
- Get: first

### Step 23
**Action Type:** text

*Format high/low*

- Add a **Text** action
- Content: `H:{high_temp}° L:{low_temp}°`

### Step 24
**Action Type:** datajar.set

- Add **Set Data Jar Value** action
- Key: `weather_hilow`
- Value: previous

### Step 25
**Action Type:** text.split

- Add **Split Text** action
- Split by: `weather-summary="`

### Step 26
**Action Type:** list.get

- Add **Get Item from List** action
- Get: 2

### Step 27
**Action Type:** text.split

- Add **Split Text** action
- Split by: `"`

### Step 28
**Action Type:** list.get

- Add **Get Item from List** action
- Get: first

### Step 29
**Action Type:** datajar.set

- Add **Set Data Jar Value** action
- Key: `weather_conditions`
- Value: previous

### Step 30
**Action Type:** date.current

- Add **Current Date** action
- Format: h:mm a

### Step 31
**Action Type:** datajar.set

- Add **Set Data Jar Value** action
- Key: `weather_updated`
- Value: previous

