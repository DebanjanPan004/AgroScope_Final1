# 🚀 AgroScope - Free Vercel Deployment Guide

Deploy your full-stack AgroScope application to Vercel **completely FREE** with frontend and backend API support!

---

## 📋 Prerequisites

Before deploying, ensure you have:
- ✅ GitHub account (free)
- ✅ Vercel account (free) - [vercel.com](https://vercel.com)
- ✅ MongoDB Atlas account (free) - [mongodb.com/atlas](https://mongodb.com/atlas)
- ✅ DeepSeek API key (for AI features) - [platform.deepseek.com](https://platform.deepseek.com)
- ✅ Tavily API key (for news) - [tavily.com](https://tavily.com)

---

## 🗄️ Step 1: Set Up MongoDB Atlas (Free Tier)

1. **Create Account**: Go to [mongodb.com/atlas](https://mongodb.com/atlas) and sign up
2. **Create Cluster**:
   - Click "Build a Database"
   - Choose **M0 FREE** tier
   - Select provider: AWS
   - Region: **ap-south-1 (Mumbai)** or closest to your users
   - Cluster name: `AgroScope`

3. **Create Database User**:
   - Go to "Database Access"
   - Click "Add New Database User"
   - Username: `agroscope`
   - Password: **Generate secure password** (save this!)
   - Database User Privileges: **Read and write to any database**

4. **Configure Network Access**:
   - Go to "Network Access"
   - Click "Add IP Address"
   - Select **"Allow Access from Anywhere" (0.0.0.0/0)**
   - (Required for Vercel serverless functions)

5. **Get Connection String**:
   - Go to "Database" → Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string:
   ```
   mongodb+srv://agroscope:<password>@cluster.mongodb.net/agroscope
   ```
   - Replace `<password>` with your actual password

---

## 🔑 Step 2: Get API Keys

### DeepSeek API (AI Price Negotiation)
1. Go to [platform.deepseek.com](https://platform.deepseek.com)
2. Sign up / Log in
3. Navigate to API Keys
4. Create new API key → Copy it

### Tavily API (Agro News)
1. Go to [tavily.com](https://tavily.com)
2. Sign up for free account
3. Get your API key from dashboard

---

## 📦 Step 3: Push to GitHub

If you haven't already:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/AgroScope_Final1.git
git push -u origin main
```

---

## ☁️ Step 4: Deploy to Vercel

### Option A: Using Vercel Dashboard (Recommended)

1. **Import Project**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your GitHub repository: `Thoshith-A/AgroScope_Final1`
   - Click "Import"

2. **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Add Environment Variables**:
   Click "Environment Variables" and add these:

   | Variable Name | Value |
   |--------------|--------|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | Your MongoDB connection string |
   | `DEEPSEEK_API_KEY` | Your DeepSeek API key |
   | `TAVILY_API_KEY` | Your Tavily API key |
   | `JWT_SECRET` | Generate random 64-char string* |
   | `JWT_EXPIRES_IN` | `7d` |

   *Generate JWT_SECRET using:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - Your site will be live at: `https://your-project.vercel.app`

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables
vercel env add MONGODB_URI
vercel env add DEEPSEEK_API_KEY
vercel env add TAVILY_API_KEY
vercel env add JWT_SECRET
vercel env add JWT_EXPIRES_IN

# Deploy production
vercel --prod
```

---

## ✅ Step 5: Verify Deployment

After deployment, test these URLs:

1. **Frontend**: `https://your-project.vercel.app`
   - Should load the home page

2. **API Health**: `https://your-project.vercel.app/api/health`
   - Should return: `{"status":"OK","message":"AgroScope Backend API is running on Vercel"}`

3. **Test Login**:
   - Go to login page
   - Try demo account: `f1@gmail.com` / `farmer`

---

## 🔄 Auto-Deploy from GitHub

Vercel automatically redeploys when you push to GitHub:

```bash
git add .
git commit -m "Update features"
git push
```

Your site updates automatically in 2-3 minutes!

---

## 🎨 Custom Domain (Optional - Free)

1. Go to your Vercel project
2. Click "Settings" → "Domains"
3. Add your custom domain (requires DNS configuration)
4. Follow Vercel's DNS setup guide

---

## 🐛 Troubleshooting

### Issue: Build Failed
- Check that all dependencies are in `package.json`
- Ensure `vercel.json` and `api/index.js` exist
- Check build logs in Vercel dashboard

### Issue: API Returns 500 Error
- Verify MongoDB connection string is correct
- Check environment variables are set in Vercel
- View Function Logs in Vercel dashboard

### Issue: MongoDB Connection Failed
- Ensure IP whitelist includes `0.0.0.0/0`
- Check MongoDB user has read/write permissions
- Verify connection string format

### Issue: Frontend loads but API fails
- Check `/api/health` endpoint
- Verify all routes start with `/api/`
- Check browser console for errors

---

## 💰 Cost Breakdown (FREE!)

| Service | Free Tier |
|---------|-----------|
| **Vercel** | 100GB bandwidth/month, Unlimited sites |
| **MongoDB Atlas** | 512MB storage, Shared cluster |
| **DeepSeek API** | Free tier with rate limits |
| **Tavily API** | 1000 searches/month free |

**Total Monthly Cost: $0** 🎉

---

## 📊 Limits to Be Aware Of

- **Vercel**: 100GB bandwidth/month (plenty for small-medium apps)
- **MongoDB**: 512MB storage (good for thousands of records)
- **Vercel Functions**: 10-second timeout (fine for most APIs)
- **DeepSeek**: Rate limits apply (check their docs)

---

## 🔄 Updating Your Deployment

### Update Frontend
```bash
# Make changes in src/
git add .
git commit -m "Update UI"
git push
```

### Update Backend API
```bash
# Make changes in server/
git add .
git commit -m "Update API"
git push
```

### Update Environment Variables
1. Go to Vercel dashboard
2. Project Settings → Environment Variables
3. Edit/Add variables
4. Redeploy (automatic or click "Redeploy")

---

## 📚 Files Created for Vercel

- ✅ `vercel.json` - Vercel configuration
- ✅ `api/index.js` - Serverless API wrapper
- ✅ `.env.production.example` - Environment variables template

---

## 🎯 Next Steps

1. ✅ Deploy to Vercel
2. 🔐 Secure your API keys (never commit `.env` files!)
3. 📈 Monitor usage in Vercel dashboard
4. 🎨 Customize your domain
5. 📊 Set up analytics (Vercel Analytics is free!)

---

## 🆘 Need Help?

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **MongoDB Docs**: [docs.mongodb.com](https://docs.mongodb.com/atlas/)
- **GitHub Issues**: Create issue in your repo

---

## 🎉 Congratulations!

Your AgroScope app is now live on the internet for **FREE**! Share your URL with the world! 🌍

**Demo Login Accounts:**
- Farmer: `f1@gmail.com` / `farmer`
- Startup: `east@argo` / `east@argo`

---

Made with 💚 by the AgroScope Team
