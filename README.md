# MMM-AuroraForecast

A [MagicMirror²](https://magicmirror.builders/) module that displays aurora viewing probability for your location, along with the 3-day Kp index forecast from NOAA.

## Data Sources

- **Aurora probability**: [NOAA Ovation Aurora](https://services.swpc.noaa.gov/json/ovation_aurora_latest.json)
- **Kp index forecast**: [NOAA 3-Day Forecast](https://services.swpc.noaa.gov/text/3-day-forecast.txt)

## Screenshots

**Detailed layout** — aurora probability, current Kp, geomagnetic storm alert, hourly Kp bars, and 3-day peak summary.

**Compact layout** — aurora probability percentage only.

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/damithsj/MMM-AuroraForecast
cd MMM-AuroraForecast
git checkout v1
npm install
```

Then restart MagicMirror.

## Configuration

Add the module to the `modules` array in `~/MagicMirror/config/config.js`.

### Detailed layout (default)

```js
{
  module: "MMM-AuroraForecast",
  position: "top_right",
  config: {
    updateInterval: 30,
    latitude: 58.41,
    longitude: 15.62,
    location: "Linköping",
    layout: "detailed"
  }
}
```

### Compact layout

```js
{
  module: "MMM-AuroraForecast",
  position: "top_right",
  config: {
    updateInterval: 30,
    latitude: 58.41,
    longitude: 15.62,
    location: "Linköping",
    layout: "compact"
  }
}
```

## Config Options

| Option | Default | Description |
|---|---|---|
| `updateInterval` | `30` | How often to refresh data, in minutes |
| `latitude` | `0` | Your location latitude |
| `longitude` | `0` | Your location longitude |
| `location` | `"My Location"` | Display label for your location |
| `layout` | `"detailed"` | `"detailed"` or `"compact"` |

## Kp Color Scale

| Kp value | Color | Meaning |
|---|---|---|
| 0 – 2 | Blue-grey | Quiet |
| 3 – 4 | Yellow | Active |
| 5 – 6 | Orange | G1–G2 Storm |
| 7 – 9 | Red | G3–G5 Severe Storm |
