// server/services/deepseekAgriNews.js - DeepSeek AI for agriculture news analysis

import axios from 'axios';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

function generateFallbackInsight(article) {
  const text = `${article.headline || ''} ${article.summary || ''}`.toLowerCase();
  if (text.includes('price') || text.includes('market')) return 'Market changes ahead - monitor prices and adjust selling strategy accordingly.';
  if (text.includes('subsidy') || text.includes('scheme')) return 'Government support available - check eligibility and apply through official channels.';
  if (text.includes('technology') || text.includes('app')) return 'New technology can improve farm productivity - evaluate adoption costs and benefits.';
  if (text.includes('weather') || text.includes('climate')) return 'Climate factors affecting agriculture - plan crop cycle and irrigation accordingly.';
  return 'Stay informed about this development and assess impact on your farming operations.';
}

export async function analyzeNewsWithAI(article, apiKey) {
  if (!apiKey || apiKey === 'demo_key') {
    return {
      enhancedSummary: article.summary,
      farmerInsight: generateFallbackInsight(article),
      relevanceScore: 7,
      actionableSteps: []
    };
  }
  try {
    const prompt = `Analyze this agriculture news article and provide insights for farmers:

Title: ${article.headline}
Content: ${article.summary}

Provide JSON only:
{
  "enhancedSummary": "...",
  "farmerInsight": "...",
  "relevanceScore": 8,
  "actionableSteps": ["step1", "step2"]
}`;

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are an agricultural expert helping farmers understand news. Respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 8000 }
    );

    let jsonText = (response.data.choices?.[0]?.message?.content || '').trim();
    if (jsonText.startsWith('```json')) jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    else if (jsonText.startsWith('```')) jsonText = jsonText.replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(jsonText);
    return {
      enhancedSummary: parsed.enhancedSummary || article.summary,
      farmerInsight: parsed.farmerInsight || generateFallbackInsight(article),
      relevanceScore: typeof parsed.relevanceScore === 'number' ? parsed.relevanceScore : 7,
      actionableSteps: Array.isArray(parsed.actionableSteps) ? parsed.actionableSteps : []
    };
  } catch (error) {
    console.error('DeepSeek agri news error:', error.response?.data || error.message);
    return {
      enhancedSummary: article.summary,
      farmerInsight: generateFallbackInsight(article),
      relevanceScore: 7,
      actionableSteps: []
    };
  }
}

export async function batchAnalyzeNews(articles, apiKey, maxArticles = 15) {
  if (!apiKey || apiKey === 'demo_key') {
    return articles.slice(0, maxArticles).map(article => ({
      ...article,
      enhancedSummary: article.summary,
      farmerInsight: generateFallbackInsight(article),
      relevanceScore: 7,
      actionableSteps: []
    }));
  }
  const articlesToAnalyze = articles.slice(0, Math.min(5, maxArticles));
  const remainingArticles = articles.slice(articlesToAnalyze.length, maxArticles);

  const analyses = [];
  for (let i = 0; i < articlesToAnalyze.length; i++) {
    try {
      const analysis = await Promise.race([
        analyzeNewsWithAI(articlesToAnalyze[i], apiKey),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
      ]);
      analyses.push({ ...articlesToAnalyze[i], ...analysis });
      if (i < articlesToAnalyze.length - 1) await new Promise(r => setTimeout(r, 400));
    } catch (error) {
      analyses.push({
        ...articlesToAnalyze[i],
        enhancedSummary: articlesToAnalyze[i].summary,
        farmerInsight: generateFallbackInsight(articlesToAnalyze[i]),
        relevanceScore: 7,
        actionableSteps: []
      });
    }
  }

  const remainingWithFallback = remainingArticles.map(article => ({
    ...article,
    enhancedSummary: article.summary,
    farmerInsight: generateFallbackInsight(article),
    relevanceScore: 6,
    actionableSteps: []
  }));

  return [...analyses, ...remainingWithFallback];
}

export async function generateLocationInsight(location, newsArticles, apiKey) {
  if (!apiKey || apiKey === 'demo_key') {
    return [
      `${location.city}, ${location.state} is in ${location.agricultureRegion || 'an agriculture-active region'}.`,
      'Current weather, water availability, and crop pattern make local updates highly relevant.',
      'Follow local alerts first, then compare with national signals before taking farm decisions.'
    ].join('\n');
  }
  try {
    const newsContext = (newsArticles || []).slice(0, 3).map(a => a.headline).join('\n');
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are an agricultural advisor. Return plain text only.' },
          { role: 'user', content: `Based on these headlines for ${location.city}, ${location.state} (${location.agricultureRegion || 'agriculture region'}):\n${newsContext}\n\nProvide a concise 3-4 line note for local farmers. Plain text only.` }
        ],
        temperature: 0.7,
        max_tokens: 200
      },
      { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 8000 }
    );
    return (response.data.choices?.[0]?.message?.content || '').trim();
  } catch (error) {
    return `${location.city}, ${location.state} is seeing active agriculture signals. Prioritize local alerts from this feed.`;
  }
}

export async function generateLiveUpdateSummary(apiKey) {
  if (!apiKey || apiKey === 'demo_key') {
    return { headline: 'Live Agriculture Updates', summary: 'Real-time monitoring of agriculture news across India and globally.', timestamp: Date.now() };
  }
  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Generate a realistic agriculture news headline for the current moment.' },
          { role: 'user', content: 'Generate a single agriculture news headline happening right now in India.' }
        ],
        temperature: 0.9,
        max_tokens: 100
      },
      { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 5000 }
    );
    const headline = (response.data.choices?.[0]?.message?.content || 'Agriculture Markets Active').trim();
    return { headline, summary: 'Breaking agriculture news - stay updated with live developments.', timestamp: Date.now() };
  } catch (error) {
    return { headline: 'Agriculture Markets Active', summary: 'Monitoring live updates from farming regions nationwide.', timestamp: Date.now() };
  }
}
