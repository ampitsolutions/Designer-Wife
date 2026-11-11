// Free weather from Open-Meteo (no API key). Forecast covers about 16 days ahead;
// further out we show the same dates from last year as a "typical" guide.

import { addDays, daysBetween, today } from './dates';

export type Place = { label: string; latitude: number; longitude: number };

export type DayWeather = {
  date: string;
  min: number;
  max: number;
  rain: number; // mm
  code: number; // WMO weather code
  typical: boolean; // true = last year's weather, not a forecast
};

const FORECAST_DAYS = 16;

export async function findPlace(name: string): Promise<Place | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=${encodeURIComponent(name.trim())}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Place lookup failed (${res.status})`);
  const data = await res.json();
  const r = data?.results?.[0];
  if (!r) return null;
  const label = [r.name, r.admin1 !== r.name ? r.admin1 : null, r.country].filter(Boolean).join(', ');
  return { label, latitude: r.latitude, longitude: r.longitude };
}

type Daily = {
  time: string[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  precipitation_sum: (number | null)[];
  weather_code: (number | null)[];
};

async function fetchDaily(base: string, place: Place, start: string, end: string): Promise<Daily> {
  const q = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
    timezone: 'auto',
    start_date: start,
    end_date: end,
  });
  const res = await fetch(`${base}?${q}`);
  if (!res.ok) throw new Error(`Weather lookup failed (${res.status})`);
  const data = await res.json();
  return data.daily as Daily;
}

const toDays = (d: Daily, shiftYears: number): DayWeather[] =>
  d.time.map((t, i) => ({
    date: shiftYears ? `${Number(t.slice(0, 4)) + shiftYears}${t.slice(4)}` : t,
    min: Math.round(d.temperature_2m_min[i] ?? 0),
    max: Math.round(d.temperature_2m_max[i] ?? 0),
    rain: Math.round((d.precipitation_sum[i] ?? 0) * 10) / 10,
    code: d.weather_code[i] ?? 0,
    typical: shiftYears !== 0,
  }));

const lastYear = (s: string) => `${Number(s.slice(0, 4)) - 1}${s.slice(4)}`.replace('-02-29', '-02-28');

/** Weather for each date in [start, end]. Uses the forecast where possible, last year's weather otherwise. */
export async function tripWeather(place: Place, start: string, end: string): Promise<DayWeather[]> {
  const now = today();
  const forecastEnd = addDays(now, FORECAST_DAYS - 1);
  const out: DayWeather[] = [];

  // Part within the forecast window
  const fStart = start < now ? now : start;
  const fEnd = end < forecastEnd ? end : forecastEnd;
  if (fStart <= fEnd && daysBetween(fStart, fEnd) >= 0) {
    out.push(...toDays(await fetchDaily('https://api.open-meteo.com/v1/forecast', place, fStart, fEnd), 0));
  }

  // Part beyond the forecast (or in the past): same dates last year
  const tStart = start > forecastEnd ? start : addDays(forecastEnd, 1);
  if (tStart <= end) {
    const hist = await fetchDaily('https://archive-api.open-meteo.com/v1/archive', place, lastYear(tStart), lastYear(end));
    out.push(...toDays(hist, 1));
  }

  const wanted = new Set<string>();
  for (let d = start; d <= end; d = addDays(d, 1)) wanted.add(d);
  return out.filter((w) => wanted.has(w.date));
}

/** WMO code → short description and emoji. */
export function describe(code: number): { text: string; icon: string } {
  if (code === 0) return { text: 'Clear', icon: '☀️' };
  if (code <= 2) return { text: 'Partly cloudy', icon: '⛅' };
  if (code === 3) return { text: 'Cloudy', icon: '☁️' };
  if (code <= 48) return { text: 'Fog', icon: '🌫️' };
  if (code <= 57) return { text: 'Drizzle', icon: '🌦️' };
  if (code <= 67) return { text: 'Rain', icon: '🌧️' };
  if (code <= 77) return { text: 'Snow', icon: '❄️' };
  if (code <= 82) return { text: 'Showers', icon: '🌦️' };
  if (code <= 86) return { text: 'Snow showers', icon: '🌨️' };
  return { text: 'Thunderstorm', icon: '⛈️' };
}

/** One line for the AI prompt and the UI, e.g. "8–14°C, Rain, 6 mm (typical)". */
export const weatherLine = (w: DayWeather) =>
  `${w.min}–${w.max}°C, ${describe(w.code).text}${w.rain >= 1 ? `, ${w.rain} mm` : ''}${w.typical ? ' (typical)' : ''}`;
