# Weather

## Steps to create this shortcut:

### Step 1
**Action Type:** datajar.get

- Add **Get Data Jar Value** action
- Key: `weather_current`

### Step 2
**Action Type:** variable.set

- Add **Set Variable** action
- Variable: `temp`

### Step 3
**Action Type:** datajar.get

- Add **Get Data Jar Value** action
- Key: `weather_hilow`

### Step 4
**Action Type:** variable.set

- Add **Set Variable** action
- Variable: `hilow`

### Step 5
**Action Type:** datajar.get

- Add **Get Data Jar Value** action
- Key: `weather_conditions`

### Step 6
**Action Type:** variable.set

- Add **Set Variable** action
- Variable: `cond`

### Step 7
**Action Type:** datajar.get

- Add **Get Data Jar Value** action
- Key: `weather_updated`

### Step 8
**Action Type:** variable.set

- Add **Set Variable** action
- Variable: `updated`

### Step 9
**Action Type:** text

- Add a **Text** action
- Content: `{temp}
{hilow}
{cond}
Updated: {updated}`

### Step 10
**Action Type:** show.result

- Add **Show Result** action

