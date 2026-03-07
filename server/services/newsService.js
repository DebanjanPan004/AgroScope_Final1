// server/services/newsService.js - Agriculture news from multiple sources

import axios from 'axios';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

const rssParser = new Parser({
  headers: { 'User-Agent': 'AgroScope/1.0 (Agriculture News; +https://agroscope.app)', 'Accept': 'application/rss+xml' },
  timeout: 8000
});

const AGRICULTURE_IMAGES = [
  'https://picsum.photos/800/600?random=1',
  'https://picsum.photos/800/600?random=2',
  'https://picsum.photos/800/600?random=3',
  'https://picsum.photos/800/600?random=4',
  'https://picsum.photos/800/600?random=5',
  'https://picsum.photos/800/600?random=6',
  'https://picsum.photos/800/600?random=7',
  'https://picsum.photos/800/600?random=8',
  'https://picsum.photos/800/600?random=9',
  'https://picsum.photos/800/600?random=10',
  'https://picsum.photos/800/600?random=11',
  'https://picsum.photos/800/600?random=12',
  'https://picsum.photos/800/600?random=13',
  'https://picsum.photos/800/600?random=14',
  'https://picsum.photos/800/600?random=15',
  'https://picsum.photos/800/600?random=16',
  'https://picsum.photos/800/600?random=17',
  'https://picsum.photos/800/600?random=18',
  'https://picsum.photos/800/600?random=19',
  'https://picsum.photos/800/600?random=20'
];

export async function fetchNewsAPI(apiKey, query = 'agriculture OR farming OR crops', pageSize = 20) {
  if (!apiKey || apiKey === 'demo_key') {
    console.log('⚠️  Using demo mode - News API key not configured');
    return null;
  }
  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: { q: query, language: 'en', sortBy: 'publishedAt', pageSize, apiKey },
      timeout: 5000
    });
    return response.data.articles.map(article => ({
      id: `newsapi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      headline: article.title,
      summary: article.description || article.content?.substring(0, 200) || 'No description available',
      source: article.source.name,
      url: article.url,
      imageUrl: article.urlToImage || AGRICULTURE_IMAGES[Math.floor(Math.random() * AGRICULTURE_IMAGES.length)],
      publishedAt: new Date(article.publishedAt).getTime(),
      rawData: article
    }));
  } catch (error) {
    console.error('News API error:', error.response?.data || error.message);
    return null;
  }
}

export async function fetchTavilyNews(apiKey, query = 'agriculture farming crops India news today', maxResults = 20) {
  if (!apiKey || apiKey === 'demo_key') {
    console.log('⚠️  Using demo mode - Tavily API key not configured');
    return null;
  }
  try {
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        query: query,
        search_depth: 'basic',
        max_results: Math.min(maxResults, 20),
        topic: 'news',
        include_answer: false,
        include_raw_content: false,
        include_images: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        timeout: 15000
      }
    );

    const results = response.data.results || [];
    let sourceForUrl = (url) => {
      try { return url ? new URL(url).hostname : 'Tavily News'; } catch { return 'Tavily News'; }
    };
    const processedResults = results.map((result) => {
      const hash = (result.title || 'default').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const imageUrl = (Array.isArray(result.images) && result.images[0]) || AGRICULTURE_IMAGES[hash % AGRICULTURE_IMAGES.length];
      return {
        id: `tavily_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        headline: result.title || 'Untitled',
        summary: result.content || result.description || 'No description available',
        source: sourceForUrl(result.url),
        url: result.url || '#',
        imageUrl,
        publishedAt: result.published_date ? new Date(result.published_date).getTime() : Date.now(),
        score: result.score || 0,
        rawData: result
      };
    });
    return processedResults;
  } catch (error) {
    console.error('Tavily API error:', error.response?.data || error.message);
    return null;
  }
}

export async function fetchRSSFeeds(feedUrls) {
  const allArticles = [];
  for (const feedUrl of feedUrls) {
    try {
      const feed = await rssParser.parseURL(feedUrl);
      const articles = (feed.items || []).slice(0, 10).map(item => {
        const hash = (item.title || 'rss').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return {
          id: `rss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          headline: item.title,
          summary: item.contentSnippet || (item.content && item.content.substring(0, 200)) || 'No description available',
          source: feed.title || 'RSS Feed',
          url: item.link,
          imageUrl: item.enclosure?.url || AGRICULTURE_IMAGES[hash % AGRICULTURE_IMAGES.length],
          publishedAt: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
          rawData: item
        };
      });
      allArticles.push(...articles);
    } catch (error) {
      console.error(`RSS feed error (${feedUrl}):`, error.message);
    }
  }
  return allArticles;
}

/** Demo agriculture news when no API keys or RSS are available - ensures Agro News Live always has content */
export function getDemoAgricultureNews() {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    { id: 'demo_1', headline: 'India launches new scheme for crop residue management', summary: 'The government has announced financial support for farmers who adopt non-burning alternatives for paddy stubble. States can register for the scheme from next month.', source: 'Ministry of Agriculture', url: 'https://agriculture.gov.in', imageUrl: AGRICULTURE_IMAGES[0], publishedAt: now - 1 * day },
    { id: 'demo_2', headline: 'Wheat procurement crosses 26 million tonnes in Punjab', summary: 'Procurement agencies have purchased record wheat from farmers. Market prices remain stable. Farmers advised to complete e-NAM registration for direct sales.', source: 'FCI', url: 'https://fci.gov.in', imageUrl: AGRICULTURE_IMAGES[1], publishedAt: now - 2 * day },
    { id: 'demo_3', headline: 'Agri-tech startups see 40% funding rise in Q1', summary: 'Venture capital flow into farm technology and supply chain solutions has increased. Digital mandi and FPO platforms are leading the growth.', source: 'AgriTech India', url: 'https://agritech.gov.in', imageUrl: AGRICULTURE_IMAGES[2], publishedAt: now - 2 * day },
    { id: 'demo_4', headline: 'Monsoon forecast: Normal rainfall expected in central India', summary: 'IMD predicts near-normal monsoon for 2025. Farmers in Maharashtra and MP can plan kharif sowing. Check weather forecast before field operations.', source: 'IMD', url: 'https://mausam.imd.gov.in', imageUrl: AGRICULTURE_IMAGES[3], publishedAt: now - 3 * day },
    { id: 'demo_5', headline: 'PM-KISAN instalment credited to 9 crore farmers', summary: 'Latest instalment of Rs 2,000 under PM-KISAN has been transferred. Beneficiaries should verify Aadhaar-linked bank accounts.', source: 'PM-KISAN', url: 'https://pmkisan.gov.in', imageUrl: AGRICULTURE_IMAGES[4], publishedAt: now - 3 * day },
    { id: 'demo_6', headline: 'Organic certification body eases norms for small farmers', summary: 'Group certification and simplified paperwork will help small and marginal farmers access premium markets. Registration open for FPOs.', source: 'APEDA', url: 'https://apeda.gov.in', imageUrl: AGRICULTURE_IMAGES[5], publishedAt: now - 4 * day },
    { id: 'demo_7', headline: 'Sugarcane farmers get higher FRP for 2025-26 season', summary: 'Fair and Remunerative Price for sugarcane has been increased. Sugar mills directed to clear dues in time.', source: 'Cane Commission', url: '#', imageUrl: AGRICULTURE_IMAGES[6], publishedAt: now - 4 * day },
    { id: 'demo_8', headline: 'Drone subsidy scheme: 50% off for farmers and FPOs', summary: 'Subsidy on agriculture drones for spraying and mapping is available. Apply through state agriculture departments or approved centres.', source: 'Department of Agriculture', url: '#', imageUrl: AGRICULTURE_IMAGES[7], publishedAt: now - 5 * day },
    { id: 'demo_9', headline: 'Cold storage capacity to be expanded in 50 districts', summary: 'New cold chain projects will reduce post-harvest losses for fruits and vegetables. PPP mode for private investors.', source: 'NHB', url: '#', imageUrl: AGRICULTURE_IMAGES[8], publishedAt: now - 5 * day },
    { id: 'demo_10', headline: 'Carbon credit pilot for paddy farmers in Punjab', summary: 'Farmers adopting residue management can earn carbon credits. Pilot in select blocks; scaling planned after evaluation.', source: 'Climate Action', url: '#', imageUrl: AGRICULTURE_IMAGES[9], publishedAt: now - 6 * day },
  ];
}

export async function fetchAgricultureNews(config) {
  try {
    const { newsApiKey, tavilyApiKey, rssFeeds = [] } = config;
    console.log('🔄 Fetching agriculture news from multiple sources...');

    const [newsApiResults, tavilyResults, rssResults] = await Promise.all([
      fetchNewsAPI(newsApiKey),
      fetchTavilyNews(tavilyApiKey, 'agriculture farming crops India news today', 15),
      rssFeeds.length > 0 ? fetchRSSFeeds(rssFeeds) : Promise.resolve([])
    ]);

    let allNews = [
      ...(newsApiResults || []),
      ...(tavilyResults || []),
      ...(rssResults || [])
    ];

    if (allNews.length === 0) {
      console.log('⚠️ No live sources returned data - serving demo agriculture news');
      allNews = getDemoAgricultureNews();
    } else {
      console.log(`✅ Total articles fetched: ${allNews.length} (NewsAPI: ${newsApiResults?.length || 0}, Tavily: ${tavilyResults?.length || 0}, RSS: ${rssResults?.length || 0})`);
    }
    allNews.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
    return allNews;
  } catch (err) {
    console.error('fetchAgricultureNews error:', err.message);
    return getDemoAgricultureNews();
  }
}

export function filterNewsByLocation(articles, locationKeywords) {
  if (!locationKeywords || locationKeywords.length === 0) return articles;
  const keywords = locationKeywords.map(k => k.toLowerCase());
  return articles.filter(article => {
    const searchText = `${article.headline || ''} ${article.summary || ''}`.toLowerCase();
    return keywords.some(keyword => searchText.includes(keyword));
  });
}

export function categorizeNews(article) {
  const text = `${article.headline || ''} ${article.summary || ''}`.toLowerCase();
  if (text.match(/government|policy|law|regulation|ban|mandate|subsidy|scheme/)) return 'Policy';
  if (text.match(/price|market|trade|export|import|demand|supply|cost/)) return 'Market';
  if (text.match(/technology|app|digital|drone|automation|ai|sensor|iot/)) return 'Technology';
  if (text.match(/climate|environment|pollution|sustainability|green|carbon|emission/)) return 'Environment';
  return 'Market';
}

export function calculateImpactScore(article) {
  const text = `${article.headline || ''} ${article.summary || ''}`.toLowerCase();
  let score = 5;
  const highImpact = ['billion', 'million', 'nationwide', 'government', 'crisis', 'breakthrough'];
  highImpact.forEach(keyword => { if (text.includes(keyword)) score += 2; });
  const mediumImpact = ['thousand', 'regional', 'increase', 'decrease', 'launch', 'new'];
  mediumImpact.forEach(keyword => { if (text.includes(keyword)) score += 1; });
  return Math.min(Math.round(score), 10);
}

export function detectOpportunity(article) {
  const text = `${article.headline || ''} ${article.summary || ''}`.toLowerCase();
  const opportunityKeywords = ['subsidy', 'grant', 'funding', 'scheme', 'program', 'opportunity', 'earn', 'income', 'profit', 'benefit', 'register', 'apply', 'enroll'];
  if (!opportunityKeywords.some(keyword => text.includes(keyword))) return null;
  const sentences = (article.summary || '').split(/[.!?]/);
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (opportunityKeywords.some(keyword => lowerSentence.includes(keyword)))
      return sentence.trim() || 'Check article for opportunity details';
  }
  return 'Potential opportunity for farmers - read full article';
}
