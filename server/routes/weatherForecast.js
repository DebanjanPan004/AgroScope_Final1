import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const CACHE = new Map();
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

const CITY_COORDS = {
  Chennai: { lat: 13.0827, lon: 80.2707 },
  Mumbai: { lat: 19.076, lon: 72.8777 },
  Delhi: { lat: 28.6139, lon: 77.209 },
  Bengaluru: { lat: 12.9716, lon: 77.5946 },
  Hyderabad: { lat: 17.385, lon: 78.4867 },
  Kolkata: { lat: 22.5726, lon: 88.3639 },
  Pune: { lat: 18.5204, lon: 73.8567 },
  Ahmedabad: { lat: 23.0225, lon: 72.5714 },
  Jaipur: { lat: 26.9124, lon: 75.7873 },
  Surat: { lat: 21.1702, lon: 72.8311 },
};

router.get("/forecast", async (req, res) => {
  const { city = "Chennai", wasteType = "paddy_husk" } = req.query;
  const cacheKey = `${city}_${new Date().toDateString()}`;

  if (CACHE.has(cacheKey)) {
    const cached = CACHE.get(cacheKey);
    if (Date.now() < cached.expiresAt) return res.json(cached.data);
    CACHE.delete(cacheKey);
  }

  const coords = CITY_COORDS[city];
  if (!coords) return res.status(400).json({ error: `Unknown city: ${city}` });

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${coords.lat}&longitude=${coords.lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,` +
      `relative_humidity_2m_max,windspeed_10m_max,weathercode` +
      `&timezone=Asia%2FKolkata&forecast_days=16`;

    const omRes = await fetch(url);
    if (!omRes.ok) throw new Error(`Open-Meteo error: ${omRes.status}`);
    const raw = await omRes.json();

    const realDays = raw.daily.time.map((date, i) => ({
      date,
      dayLabel: new Date(date).toLocaleDateString("en-IN", { weekday: "short" }),
      tempMax: Math.round(raw.daily.temperature_2m_max[i] ?? 30),
      tempMin: Math.round(raw.daily.temperature_2m_min[i] ?? 22),
      rainfall: Math.round((raw.daily.precipitation_sum[i] ?? 0) * 10) / 10,
      humidity: Math.round(raw.daily.relative_humidity_2m_max[i] ?? 65),
      windSpeed: Math.round(raw.daily.windspeed_10m_max[i] ?? 12),
      weatherCode: raw.daily.weathercode[i] ?? 1,
      extrapolated: false,
    }));

    const avg = {
      tempMax: realDays.reduce((s, d) => s + d.tempMax, 0) / realDays.length,
      tempMin: realDays.reduce((s, d) => s + d.tempMin, 0) / realDays.length,
      rainfall: realDays.reduce((s, d) => s + d.rainfall, 0) / realDays.length,
      humidity: realDays.reduce((s, d) => s + d.humidity, 0) / realDays.length,
      windSpeed: realDays.reduce((s, d) => s + d.windSpeed, 0) / realDays.length,
    };

    const lastDate = new Date(realDays[realDays.length - 1].date);
    const extrapolated = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i + 1);
      const v = Math.sin(i * 1.7 + 0.5) * 0.12;
      return {
        date: d.toISOString().split("T")[0],
        dayLabel: d.toLocaleDateString("en-IN", { weekday: "short" }),
        tempMax: Math.round(avg.tempMax * (1 + v * 0.5)),
        tempMin: Math.round(avg.tempMin * (1 + v * 0.3)),
        rainfall: Math.max(0, Math.round(avg.rainfall * (1 + v) * 10) / 10),
        humidity: Math.min(95, Math.max(35, Math.round(avg.humidity * (1 + v * 0.2)))),
        windSpeed: Math.round(avg.windSpeed * (1 + Math.abs(v) * 0.3)),
        weatherCode: avg.rainfall > 10 ? 61 : 1,
        extrapolated: true,
      };
    });

    const data = {
      city,
      wasteType,
      generatedAt: new Date().toISOString(),
      dataSource: "Open-Meteo (open-meteo.com)",
      forecast: [...realDays, ...extrapolated],
    };

    CACHE.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL });
    res.json(data);
  } catch (err) {
    console.error("[WeatherForecast]", err.message);
    res.status(500).json({ error: "Failed to fetch weather data. Try again shortly." });
  }
});

export default router;
