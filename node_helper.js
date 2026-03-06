const NodeHelper = require("node_helper");
const needle = require("needle");

const OVATION_URL = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";
const FORECAST_URL = "https://services.swpc.noaa.gov/text/3-day-forecast.txt";

function get(url) {
  return new Promise((resolve, reject) => {
    needle.get(url, { parse_response: true, json: true }, (err, res) => {
      if (err) reject(err);
      else resolve(res.body);
    });
  });
}

function convertUtTimeRangeToUtc(utTimeRange, dateStr) {
  const match = utTimeRange.match(/(\d{2})-(\d{2})UT/);
  if (!match) throw new Error(`Invalid UT time range: ${utTimeRange}`);
  const startHour = parseInt(match[1], 10);
  const endHour = parseInt(match[2], 10);
  const refDate = new Date(`${dateStr} ${new Date().getUTCFullYear()} 00:00:00 UTC`);
  const startTime = new Date(refDate);
  startTime.setUTCHours(startHour);
  const endTime = new Date(refDate);
  endTime.setUTCHours(endHour);
  if (endHour < startHour) endTime.setUTCDate(endTime.getUTCDate() + 1);
  return { startTime, endTime };
}

function parseKpForecast(text) {
  const result = { issued: null, rationale: null, kpIndexData: [] };

  const issuedMatch = text.match(/:Issued: (.*?)(?:\r?\n)/);
  if (issuedMatch) result.issued = issuedMatch[1].trim();

  const rationaleMatch = text.match(/Rationale:(.*?)(?=\s*B\.\s*NOAA Solar Radiation)/s);
  if (rationaleMatch) result.rationale = rationaleMatch[1].trim().replace(/\s*\n\s*/g, " ");

  const kpTableMatch = text.match(/NOAA Kp index breakdown.*?\n.*?\n(.*?)(?=Rationale:|$)/s);
  if (!kpTableMatch) return result;

  const lines = kpTableMatch[1].trim().split("\n");
  if (lines.length < 2) return result;

  const datesMatch = lines[0].match(/(\w+ \d{2})\s+(\w+ \d{2})\s+(\w+ \d{2})/);
  if (!datesMatch) return result;
  const dates = [datesMatch[1], datesMatch[2], datesMatch[3]];

  for (let i = 1; i < lines.length; i++) {
    const timeMatch = lines[i].match(
      /(\d{2}-\d{2}UT)\s+([\d.]+)(?:\s+\(G(\d)\))?\s+([\d.]+)(?:\s+\(G(\d)\))?\s+([\d.]+)(?:\s+\(G(\d)\))?/
    );
    if (!timeMatch) continue;

    const timePeriod = timeMatch[1];
    const groups = [
      { kp: timeMatch[2], g: timeMatch[3] },
      { kp: timeMatch[4], g: timeMatch[5] },
      { kp: timeMatch[6], g: timeMatch[7] }
    ];

    for (let j = 0; j < 3; j++) {
      const kpValue = parseFloat(groups[j].kp);
      const gScale = groups[j].g ? `G${groups[j].g}` : null;
      const { startTime, endTime } = convertUtTimeRangeToUtc(timePeriod, dates[j]);
      result.kpIndexData.push({
        date: dates[j],
        timePeriod,
        timePeriodStart: startTime.toISOString(),
        timePeriodEnd: endTime.toISOString(),
        kpValue,
        geomagneticStorm: gScale
      });
    }
  }

  result.kpIndexData.sort((a, b) => new Date(a.timePeriodStart) - new Date(b.timePeriodStart));
  return result;
}

function findAuroraProb(coordinates, lat, lon) {
  let closest = null, minDist = Infinity;
  for (const [pLon, pLat, prob] of coordinates) {
    const dist = Math.hypot(pLat - lat, pLon - lon);
    if (dist < minDist) { minDist = dist; closest = prob; }
  }
  return closest;
}

module.exports = NodeHelper.create({
  async socketNotificationReceived(notification, payload) {
    if (notification !== "GET_AURORA_DATA") return;
    try {
      const [ovation, forecastText] = await Promise.all([get(OVATION_URL), get(FORECAST_URL)]);

      const auroraProb = findAuroraProb(ovation.coordinates, payload.latitude, payload.longitude);
      const kp = parseKpForecast(forecastText);

      const now = new Date();
      const currentSlot = kp.kpIndexData.find(s =>
        new Date(s.timePeriodStart) <= now && now < new Date(s.timePeriodEnd)
      ) || null;

      // Group by date for per-day slot lists and daily summaries
      const dateMap = {};
      for (const slot of kp.kpIndexData) {
        if (!dateMap[slot.date]) dateMap[slot.date] = [];
        dateMap[slot.date].push(slot);
      }

      const dailySummary = Object.entries(dateMap).map(([date, slots]) => {
        const peak = slots.reduce((m, s) => s.kpValue > m.kpValue ? s : m, slots[0]);
        return { date, peakKp: peak.kpValue, peakStorm: peak.geomagneticStorm, slots };
      });

      this.sendSocketNotification("AURORA_DATA", {
        auroraProb,
        issued: kp.issued,
        rationale: kp.rationale,
        currentSlot,
        dailySummary
      });
    } catch (err) {
      console.error("[MMM-AuroraForecast] Fetch error:", err.message);
    }
  }
});
