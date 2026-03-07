// server/routes/agriNews.js - Agriculture News API (location + DeepSeek)

import express from 'express';
import {
  fetchAgricultureNews,
  getDemoAgricultureNews,
  filterNewsByLocation,
  categorizeNews,
  calculateImpactScore,
  detectOpportunity
} from '../services/newsService.js';
import {
  batchAnalyzeNews,
  generateLocationInsight,
  generateLiveUpdateSummary
} from '../services/deepseekAgriNews.js';
import {
  reverseGeocode,
  getLocationFromIP,
  getAgricultureRegion,
  getLocationKeywords,
  isValidCoordinates
} from '../services/geocodingService.js';

const router = express.Router();

const cache = {
  globalNews: { data: null, timestamp: 0, ttl: 5 * 60 * 1000 },
  liveUpdate: { data: null, timestamp: 0, ttl: 30 * 1000 }
};

function extractTags(article) {
  const text = `${article.headline || ''} ${article.summary || ''}`.toLowerCase();
  const tags = [];
  const tagPatterns = {
    'biomass': /biomass|bio-energy|biofuel/,
    'stubble-burning': /stubble|burning|fire/,
    'policy': /government|policy|scheme|subsidy/,
    'market-price': /price|market|cost|rate/,
    'technology': /app|digital|technology|innovation/,
    'climate': /climate|weather|monsoon|temperature/,
    'export': /export|trade|international/
  };
  for (const [tag, pattern] of Object.entries(tagPatterns)) {
    if (pattern.test(text)) tags.push(tag);
  }
  return tags.slice(0, 3);
}

const safeLimit = (limit) => Math.max(1, Math.min(50, parseInt(limit, 10) || 15));

function buildNewsItem(article, index, now) {
  return {
    id: article.id || `news_${now}_${index}`,
    headline: article.headline,
    summary: article.enhancedSummary || article.summary,
    farmerInsight: article.farmerInsight || 'Stay informed about agricultural developments.',
    location: article.source || 'Global',
    category: article.category,
    impactScore: article.relevanceScore ?? article.impactScore,
    opportunityAlert: article.opportunityAlert,
    actionableSteps: article.actionableSteps || [],
    timestamp: article.publishedAt || now,
    tags: article.tags || [],
    region: article.region || 'Global',
    url: article.url,
    imageUrl: article.imageUrl
  };
}

router.get('/global', async (req, res) => {
  const now = Date.now();
  const limitNum = safeLimit(req.query.limit);

  try {
    const { category, region } = req.query;
    const config = {
      newsApiKey: process.env.NEWS_API_KEY,
      tavilyApiKey: process.env.TAVILY_API_KEY,
      deepseekApiKey: process.env.DEEPSEEK_API_KEY,
      rssFeeds: [
        'https://www.agriculture.com/rss',
        'https://www.farms.com/rss/latest-agriculture-news',
        'https://www.downtoearth.org.in/rss/agriculture',
        'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'
      ]
    };

    const cacheValid = cache.globalNews.data && cache.globalNews.data.length > 0 && (now - cache.globalNews.timestamp) < cache.globalNews.ttl;
    if (cacheValid) {
      let news = cache.globalNews.data;
      if (category && category !== 'all') news = news.filter(item => String(item.category).toLowerCase() === String(category).toLowerCase());
      if (region && region !== 'all') news = news.filter(item => item.region === region);
      const out = news.length ? news.slice(0, limitNum) : cache.globalNews.data.slice(0, limitNum);
      return res.json({ success: true, count: out.length, news: out, cached: true, timestamp: now });
    }

    let rawArticles = await fetchAgricultureNews(config);
    if (!rawArticles || rawArticles.length === 0) {
      rawArticles = getDemoAgricultureNews();
    }

    const seenHeadlines = new Set();
    const uniqueArticles = rawArticles.filter(article => {
      const key = (article.headline || '').toLowerCase().trim().substring(0, 50);
      if (seenHeadlines.has(key)) return false;
      seenHeadlines.add(key);
      return true;
    });

    const processedArticles = uniqueArticles.map(article => ({
      ...article,
      category: categorizeNews(article),
      impactScore: calculateImpactScore(article),
      opportunityAlert: detectOpportunity(article),
      region: 'Global',
      tags: extractTags(article)
    }));

    let enhancedArticles;
    try {
      enhancedArticles = await batchAnalyzeNews(processedArticles, config.deepseekApiKey, 15);
    } catch (batchErr) {
      console.warn('batchAnalyzeNews fallback:', batchErr.message);
      enhancedArticles = processedArticles.slice(0, 15).map(a => ({
        ...a,
        enhancedSummary: a.summary,
        farmerInsight: 'Stay informed about agricultural developments.',
        relevanceScore: a.impactScore
      }));
    }

    if (!enhancedArticles || enhancedArticles.length === 0) {
      enhancedArticles = processedArticles.slice(0, 15);
    }

    const finalNews = enhancedArticles.map((article, index) => buildNewsItem(article, index, now));

    cache.globalNews = { data: finalNews, timestamp: now, ttl: 5 * 60 * 1000 };

    let filteredNews = finalNews;
    if (category && category !== 'all') filteredNews = filteredNews.filter(item => String(item.category).toLowerCase() === String(category).toLowerCase());
    if (region && region !== 'all') filteredNews = filteredNews.filter(item => item.region === region);

    let newsToSend = filteredNews.length ? filteredNews.slice(0, limitNum) : finalNews.slice(0, limitNum);
    res.json({ success: true, count: newsToSend.length, news: newsToSend, cached: false, timestamp: now });
  } catch (error) {
    console.error('Agri news global error:', error);
    try {
      const demo = getDemoAgricultureNews();
      const processed = demo.map((article, index) => {
        const enriched = { ...article, category: categorizeNews(article), impactScore: calculateImpactScore(article), opportunityAlert: detectOpportunity(article), tags: extractTags(article) };
        return buildNewsItem(enriched, index, Date.now());
      });
      const out = processed.slice(0, limitNum);
      return res.json({ success: true, count: out.length, news: out, cached: false, timestamp: Date.now() });
    } catch (fallbackErr) {
      console.error('Demo news fallback error:', fallbackErr);
      res.status(500).json({ success: false, error: error.message, timestamp: Date.now() });
    }
  }
});

router.post('/location', async (req, res) => {
  try {
    let { latitude, longitude } = req.body;
    const config = {
      geocodingApiKey: process.env.OPENCAGE_API_KEY,
      tavilyApiKey: process.env.TAVILY_API_KEY,
      newsApiKey: process.env.NEWS_API_KEY,
      deepseekApiKey: process.env.DEEPSEEK_API_KEY
    };

    let location;
    if (latitude != null && longitude != null && isValidCoordinates(Number(latitude), Number(longitude))) {
      location = await reverseGeocode(Number(latitude), Number(longitude), config.geocodingApiKey);
    } else {
      location = await getLocationFromIP();
    }

    const agriRegion = getAgricultureRegion(location);
    location.agricultureRegion = agriRegion;

    let globalNews = cache.globalNews.data || [];
    if (globalNews.length === 0) {
      const rawArticles = await fetchAgricultureNews(config);
      const seen = new Set();
      const unique = (rawArticles || []).filter(a => {
        const key = (a.headline || '').toLowerCase().trim().substring(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      globalNews = unique.map((a, i) => ({
        id: a.id || `news_${Date.now()}_${i}`,
        headline: a.headline,
        summary: a.summary,
        farmerInsight: 'Stay informed.',
        location: a.source || 'Global',
        category: categorizeNews(a),
        impactScore: calculateImpactScore(a),
        opportunityAlert: detectOpportunity(a),
        actionableSteps: [],
        timestamp: a.publishedAt || Date.now(),
        tags: extractTags(a),
        region: 'Global',
        url: a.url,
        imageUrl: a.imageUrl
      }));
      cache.globalNews = { data: globalNews, timestamp: Date.now(), ttl: 5 * 60 * 1000 };
    }

    const locationKeywords = getLocationKeywords(location);
    const localNews = filterNewsByLocation(globalNews, locationKeywords);
    const locationInsight = await generateLocationInsight(location, localNews, config.deepseekApiKey);

    const alerts = localNews.filter(n => (n.impactScore || 0) >= 8);
    const opportunities = localNews.filter(n => n.opportunityAlert);

    res.json({
      success: true,
      location: {
        city: location.city,
        state: location.state,
        country: location.country,
        region: location.state,
        coordinates: location.coordinates,
        agricultureRegion: agriRegion,
        insight: locationInsight
      },
      stats: { totalNews: localNews.length, alerts: alerts.length, opportunities: opportunities.length },
      news: localNews.slice(0, 10),
      alerts,
      opportunities,
      count: localNews.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Agri news location error:', error);
    res.status(500).json({ success: false, error: error.message, timestamp: Date.now() });
  }
});

router.get('/categories', (req, res) => {
  res.json({
    success: true,
    categories: [
      { value: 'all', label: 'All Categories' },
      { value: 'Policy', label: 'Policy' },
      { value: 'Market', label: 'Market' },
      { value: 'Environment', label: 'Environment' },
      { value: 'Technology', label: 'Technology' }
    ]
  });
});

router.get('/regions', (req, res) => {
  res.json({
    success: true,
    regions: [
      { value: 'all', label: 'All Regions' },
      { value: 'india', label: 'India' },
      { value: 'asia', label: 'Asia' },
      { value: 'europe', label: 'Europe' },
      { value: 'usa', label: 'USA' },
      { value: 'Global', label: 'Global' }
    ]
  });
});

router.get('/live', async (req, res) => {
  try {
    const now = Date.now();
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (cache.liveUpdate.data && (now - cache.liveUpdate.timestamp) < cache.liveUpdate.ttl) {
      return res.json({ success: true, news: cache.liveUpdate.data, cached: true });
    }
    const liveUpdate = await generateLiveUpdateSummary(apiKey);
    const newsItem = {
      id: `live_${now}`,
      headline: liveUpdate.headline,
      summary: liveUpdate.summary,
      timestamp: liveUpdate.timestamp,
      isLive: true
    };
    cache.liveUpdate = { data: newsItem, timestamp: now, ttl: 30 * 1000 };
    res.json({ success: true, news: newsItem, cached: false });
  } catch (error) {
    res.json({
      success: true,
      news: {
        id: `live_${Date.now()}`,
        headline: 'Agriculture Updates Live',
        summary: 'Monitoring real-time agriculture news across all regions.',
        timestamp: Date.now(),
        isLive: true
      },
      cached: false
    });
  }
});

export default router;
