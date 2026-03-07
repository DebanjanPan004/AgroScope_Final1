# 🚀 Quick Vercel Deployment Checklist

## ✅ Pre-Deployment Checklist

- [ ] MongoDB Atlas cluster created (Free M0)
- [ ] MongoDB user created with password saved
- [ ] MongoDB Network Access: 0.0.0.0/0 allowed
- [ ] DeepSeek API key obtained
- [ ] Tavily API key obtained
- [ ] JWT secret generated (64 characters)
- [ ] Code pushed to GitHub

## 📝 Environment Variables Needed

Copy these into Vercel Dashboard → Settings → Environment Variables:

```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://agroscope:YOUR_PASSWORD@cluster.mongodb.net/agroscope
DEEPSEEK_API_KEY=your_deepseek_key
TAVILY_API_KEY=your_tavily_key
JWT_SECRET=your_64_char_random_string
JWT_EXPIRES_IN=7d
```

## 🎯 Deployment Steps

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import GitHub repo: `Thoshith-A/AgroScope_Final1`
4. Framework: **Vite**
5. Build command: `npm run build`
6. Output: `dist`
7. Add all environment variables above
8. Click **Deploy**!

## 🧪 Post-Deployment Testing

Test these URLs after deployment:

- ✅ `https://your-app.vercel.app` → Home page loads
- ✅ `https://your-app.vercel.app/api/health` → Returns OK status
- ✅ Login with: `f1@gmail.com` / `farmer`

## 🔧 If Something Breaks

1. Check Vercel build logs
2. Verify all environment variables are set
3. Test `/api/health` endpoint
4. Check MongoDB connection string format
5. View Vercel Function logs

## 💡 Quick Commands

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Redeploy (after changes)
git add .
git commit -m "Update"
git push

# Test locally before deploying
npm run dev
```

## 📊 Your Vercel URL

After deployment, your app will be at:
```
https://[your-project-name].vercel.app
```

## 🎉 Done!

Full guide: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
