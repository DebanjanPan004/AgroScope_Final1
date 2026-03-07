/**
 * Live market price: Tavily search → DeepSeek extraction → structured price.
 * Cache 6 hours per (wasteType + city). Keys from .env: TAVILY_API_KEY, DEEPSEEK_API_KEY.
 */
import fetch from 'node-fetch';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map();

const WASTE_LABELS = {
  paddy_husk: 'Paddy Husk',
  wheat_straw: 'Wheat Straw',
  corn_stalks: 'Corn Stalks',
  sugarcane_bagasse: 'Sugarcane Bagasse',
  coconut_shells: 'Coconut Shells',
};

/** Normalize label ("Paddy Husk") or key ("paddy_husk") to key for lookups. */
function toWasteKey(wasteType) {
  const s = String(wasteType || '').trim();
  const keyForm = s.toLowerCase().replace(/\s+/g, '_');
  if (WASTE_LABELS[keyForm]) return keyForm;
  const entry = Object.entries(WASTE_LABELS).find(([, label]) => label.toLowerCase() === s.toLowerCase());
  return entry ? entry[0] : 'paddy_husk';
}

const FALLBACK_RANGES = {
  paddy_husk: { min: 1.2, max: 2.8 },
  wheat_straw: { min: 0.8, max: 2.2 },
  corn_stalks: { min: 0.6, max: 1.8 },
  sugarcane_bagasse: { min: 1.5, max: 3.5 },
  coconut_shells: { min: 2.0, max: 4.5 },
};

function cacheKey(wasteType, city) {
  return `${String(wasteType || '').trim().toLowerCase()}:${String(city || '').trim()}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, cachedAt: Date.now() });
}

async function tavilySearch(wasteType, city) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;
  const label = WASTE_LABELS[wasteType] || String(wasteType).replace(/_/g, ' ');
  const monthYear = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const query = `${label} crop residue market price per kg India ${city} ${monthYear}`;
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query,
      search_depth: 'advanced',
      max_results: 5,
      include_answer: true,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return data;
}

async function deepSeekExtract(wasteType, city, searchResults) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  const label = WASTE_LABELS[wasteType] || String(wasteType).replace(/_/g, ' ');
  const today = new Date().toLocaleDateString('en-IN');
  const context = searchResults?.answer || (Array.isArray(searchResults?.results)
    ? searchResults.results.map((r) => r.content || '').join('\n')
    : 'No results');
  const fallbackRanges = Object.entries(FALLBACK_RANGES)
    .map(([k, v]) => `${k}: ${v.min}–${v.max}`)
    .join(', ');

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a commodity price extraction expert for Indian agricultural markets. Extract structured price data from search results. Return ONLY valid JSON, no markdown, no code block.',
        },
        {
          role: 'user',
          content: `From these search results, extract the current market price for ${label} in ${city}, India. Today is ${today}.

Search results:
${context.slice(0, 3000)}

Return exactly this JSON (no other text):
{"pricePerKg": number, "confidence": "high"|"medium"|"low", "source": "string", "priceRange": {"min": number, "max": number}, "trend": "rising"|"falling"|"stable", "lastUpdated": "string"}

If no real price found, set confidence to "low" and use India-wide average ranges as fallback: ${fallbackRanges}.`,
        },
      ],
      max_tokens: 400,
      temperature: 0.2,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const content = data?.choices?.[0]?.message?.content?.trim() || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function buildResponse(extracted, wasteType, quantityTons = 1) {
  const key = toWasteKey(wasteType);
  const range = FALLBACK_RANGES[key] || FALLBACK_RANGES.paddy_husk;
  const pricePerKg = extracted?.pricePerKg ?? (range.min + range.max) / 2;
  const priceRange = extracted?.priceRange ?? { min: range.min, max: range.max };
  const trend = extracted?.trend ?? 'stable';
  const confidence = extracted?.confidence ?? 'low';
  const source = extracted
    ? (extracted.source && String(extracted.source).trim() ? extracted.source : `Tavily + DeepSeek · ${new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`)
    : 'Estimated (set TAVILY_API_KEY & DEEPSEEK_API_KEY for live rates)';
  const lastUpdated = extracted?.lastUpdated ?? new Date().toISOString().slice(0, 10);
  const carbonPerKg = 0.34;
  const carbonValuePerTon = carbonPerKg * 1000;
  const totalLotValue = pricePerKg * quantityTons * 1000;

  return {
    pricePerKg,
    priceRange,
    trend,
    confidence,
    source,
    lastUpdated,
    carbonValuePerTon,
    totalLotValue: Math.round(totalLotValue),
  };
}

/**
 * Get live market price for wasteType + city. Uses cache for 6h.
 * @param {string} wasteType - e.g. paddy_husk
 * @param {string} city - e.g. Chennai
 * @param {number} [quantityTons] - for totalLotValue
 * @returns {Promise<{ pricePerKg, priceRange, trend, confidence, source, lastUpdated, carbonValuePerTon, totalLotValue }>}
 */
export async function getLiveMarketPrice(wasteType, city, quantityTons = 1) {
  const w = toWasteKey(wasteType);
  const c = (city && String(city).trim()) || 'Chennai';
  const key = cacheKey(w, c);
  const cached = getCached(key);
  if (cached) {
    return buildResponse(cached, w, quantityTons);
  }

  let searchResults = null;
  try {
    searchResults = await tavilySearch(w, c);
  } catch (err) {
    console.warn('liveMarketPrice: Tavily error', err.message);
  }

  let extracted = null;
  if (searchResults) {
    try {
      extracted = await deepSeekExtract(w, c, searchResults);
    } catch (err) {
      console.warn('liveMarketPrice: DeepSeek error', err.message);
    }
  }

  const response = buildResponse(extracted, w, quantityTons);
  if (extracted) setCache(key, extracted);
  return response;
}

/** Fallback when API fails — always returns valid shape so UI never sees 404. */
export function getLiveMarketPriceFallback(wasteType, city, quantityTons = 1) {
  const w = toWasteKey(wasteType);
  const c = (city && String(city).trim()) || 'Chennai';
  return buildResponse(null, w, quantityTons);
}
