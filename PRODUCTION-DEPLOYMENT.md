# Production Deployment Guide - Vista AI

Complete guide for deploying Vista AI to production on Vercel.

## 🚀 Quick Start

### Prerequisites
- Vercel account (connected to GitHub)
- Railway/Render account (for WhatsApp service)
- API keys: Groq, Gemini, or Hugging Face (at least one)

## 📋 Pre-Deployment Checklist

### 1. Environment Variables

Set these in **Vercel Project Settings → Environment Variables**:

#### Required (at least one AI API key):
```
GROQ_API_KEY=your_groq_api_key_here
# OR
GEMINI_API_KEY=your_gemini_api_key_here
# OR
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```

#### Optional (for WhatsApp):
```
WHATSAPP_SERVICE_URL=https://your-whatsapp-service.railway.app
```

**Note:** If `WHATSAPP_SERVICE_URL` is not set, WhatsApp features will be disabled (graceful fallback).

### 2. Build Configuration

The project is already configured for Vercel:
- ✅ `next.config.ts` excludes `whatsapp-web.js` from bundling
- ✅ Build script: `npm run build`
- ✅ Start script: `npm start`

### 3. Deploy to Vercel

#### Option A: Via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./` (root)
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
5. Add environment variables (see above)
6. Click "Deploy"

#### Option B: Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 4. Custom Domain Setup

If you have `vista.upvistadigital.com`:
1. Go to Vercel Project → Settings → Domains
2. Add domain: `vista.upvistadigital.com`
3. Follow DNS instructions:
   - Add CNAME record: `vista` → `cname.vercel-dns.com`
   - Or A record as instructed by Vercel
4. Wait for DNS propagation (5-60 minutes)

## 🔧 WhatsApp Service Setup (Optional)

If you want WhatsApp features, deploy a separate service:

### Deploy to Railway (Recommended)

1. **Create Railway Account:**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Service:**
   - Create a new service
   - Set root directory to a folder with WhatsApp service (or create one)
   - Set start command: `node server.js`

4. **Get Service URL:**
   - Railway provides a URL like: `https://your-app.railway.app`
   - Copy this URL

5. **Add to Vercel:**
   - Go to Vercel → Project Settings → Environment Variables
   - Add: `WHATSAPP_SERVICE_URL=https://your-app.railway.app`

### Deploy to Render (Alternative)

1. Go to [render.com](https://render.com)
2. Create new "Web Service"
3. Connect GitHub repository
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Get service URL and add to Vercel env vars

## ✅ Post-Deployment Verification

### 1. Test Basic Functionality
- [ ] Visit your domain: `https://vista.upvistadigital.com`
- [ ] Robot face loads and displays
- [ ] Voice recognition works (click mic)
- [ ] AI responds to questions

### 2. Test Settings
- [ ] Long press on face opens settings
- [ ] Can change face (1, 2, or 3)
- [ ] Can toggle theme (light/dark)
- [ ] Can change voice

### 3. Test WhatsApp (if configured)
- [ ] Open settings → Connected Apps
- [ ] Click "Connect" on WhatsApp
- [ ] QR code appears
- [ ] Can scan and connect
- [ ] Connection status shows "Connected"
- [ ] Can send messages via voice: "send hello to [contact]"

## 🐛 Troubleshooting

### Build Fails
**Error:** `Module not found: whatsapp-web.js`
- **Solution:** Already handled in `next.config.ts` - should not occur
- If it does, check `serverExternalPackages` in `next.config.ts`

**Error:** `GROQ_API_KEY not set`
- **Solution:** Add at least one AI API key in Vercel environment variables

### WhatsApp Not Working
**Issue:** QR code not showing
- Check `WHATSAPP_SERVICE_URL` is set correctly
- Verify WhatsApp service is running (check Railway/Render logs)
- Check browser console for errors

**Issue:** "WhatsApp not connected"
- Ensure WhatsApp service is deployed and running
- Check service logs for errors
- Verify session persistence is working

### Voice Not Working
**Issue:** Microphone not responding
- Check browser permissions (allow microphone)
- Use HTTPS (required for microphone access)
- Check browser console for errors

### Domain Not Working
**Issue:** Domain shows "Not Found"
- Wait for DNS propagation (can take up to 48 hours)
- Verify DNS records are correct
- Check Vercel domain settings

## 📊 Monitoring

### Vercel Analytics
- Go to Vercel Dashboard → Analytics
- Monitor:
  - Page views
  - Response times
  - Error rates

### Logs
- **Vercel:** Dashboard → Deployments → View Function Logs
- **Railway/Render:** Service Dashboard → Logs

## 🔄 Updating Production

### Automatic (Recommended)
- Push to `main` branch
- Vercel auto-deploys on push

### Manual
```bash
vercel --prod
```

## 🎯 Performance Optimization

Already implemented:
- ✅ Next.js automatic optimizations
- ✅ Serverless functions for API routes
- ✅ External packages excluded from bundle
- ✅ PWA support (production only)

## 📝 Environment Variables Reference

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| `GROQ_API_KEY` | No* | Groq AI API key | [console.groq.com](https://console.groq.com) |
| `GEMINI_API_KEY` | No* | Google Gemini API key | [ai.google.dev](https://ai.google.dev) |
| `HUGGINGFACE_API_KEY` | No* | Hugging Face API key | [huggingface.co](https://huggingface.co) |
| `WHATSAPP_SERVICE_URL` | No | WhatsApp service URL | Railway/Render deployment |

*At least one AI API key is required for the app to function.

## 🎉 You're Live!

Once deployed, your Vista AI companion is ready to use at:
- **Production URL:** `https://vista.upvistadigital.com`
- **Vercel URL:** `https://your-project.vercel.app`

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Review this guide's troubleshooting section

---

**Last Updated:** $(date)
**Version:** 1.0.0
