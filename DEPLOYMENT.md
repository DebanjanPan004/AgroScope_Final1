# 🚂 AgroScope — Railway Deployment Guide

## One-Command Deployment
Push to GitHub → Railway auto-deploys everything.

## Setup Steps

### 1. MongoDB Atlas (Free)
1. Go to mongodb.com/atlas
2. Create free M0 cluster
3. Choose AWS Mumbai (ap-south-1)
4. Create user: agroscope / [strong password]
5. Network Access → Allow from Anywhere (0.0.0.0/0)
6. Copy connection string

### 2. Railway Deployment
1. Go to railway.app
2. New Project → Deploy from GitHub
3. Select: Thoshith-A/AgroScope_Final1
4. Add these environment variables:

| Variable | Value |
|----------|-------|
| NODE_ENV | production |
| PORT | 5000 |
| DEEPSEEK_API_KEY | your_key |
| TAVILY_API_KEY | your_key |
| MONGODB_URI | your_atlas_uri |
| JWT_SECRET | random_64_char_string |

5. Settings → Generate Domain
6. Your app is live! 🎉

### 3. After Deploy — Test These URLs
- `your-app.railway.app` → Home page loads
- `your-app.railway.app/api/health` → {"status":"ok"}
- `your-app.railway.app/input` → Farmer input loads

## Auto-Deploy
Every `git push` → Railway rebuilds and redeploys automatically.
