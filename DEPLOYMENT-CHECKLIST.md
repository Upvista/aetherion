# 🚀 Production Deployment Checklist

Use this checklist to ensure a smooth deployment to production.

## ✅ Pre-Deployment

### Code Quality
- [x] Build succeeds locally (`npm run build`)
- [x] No TypeScript errors
- [x] No critical linter errors
- [x] All features tested locally

### Environment Variables (Set in Vercel)
- [ ] **GROQ_API_KEY** (recommended) - Get from [console.groq.com](https://console.groq.com/keys)
- [ ] **GEMINI_API_KEY** (optional fallback) - Get from [ai.google.dev](https://ai.google.dev)
- [ ] **HUGGINGFACE_API_KEY** (optional) - Get from [huggingface.co](https://huggingface.co/settings/tokens)
- [ ] **WHATSAPP_SERVICE_URL** (optional) - Only if deploying WhatsApp service separately

**Note:** At least one AI API key (GROQ, GEMINI, or HUGGINGFACE) is required for the app to function properly.

### WhatsApp Service (Optional)
- [ ] WhatsApp service deployed to Railway/Render (if using WhatsApp features)
- [ ] WhatsApp service URL obtained and added to Vercel env vars
- [ ] WhatsApp service is running and accessible

## 📦 Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Via Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New Project" (or select existing project)
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next` (auto-detected)
5. Add all environment variables (see above)
6. Click "Deploy"

#### Option B: Via Vercel CLI
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod
```

### 3. Configure Custom Domain
1. Go to Vercel Project → Settings → Domains
2. Add domain: `vista.upvistadigital.com`
3. Follow DNS instructions:
   - **CNAME Record:** `vista` → `cname.vercel-dns.com`
   - Or use A record as instructed
4. Wait for DNS propagation (5-60 minutes)

## 🧪 Post-Deployment Testing

### Basic Functionality
- [ ] Visit production URL: `https://vista.upvistadigital.com`
- [ ] Robot face loads and displays correctly
- [ ] Page is responsive (test mobile/desktop)
- [ ] No console errors in browser

### Voice Features
- [ ] Click robot face to start conversation
- [ ] Microphone permission prompt appears
- [ ] Voice recognition works (speak and see transcript)
- [ ] AI responds with voice (text-to-speech works)
- [ ] Robot face shows emotions

### Settings
- [ ] Long press on face opens settings
- [ ] Can change face (1, 2, or 3)
- [ ] Can toggle theme (light/dark)
- [ ] Can change voice
- [ ] Settings close properly

### WhatsApp (if configured)
- [ ] Open settings → Connected Apps
- [ ] WhatsApp shows "Disconnected" initially
- [ ] Click "Connect" opens QR modal
- [ ] QR code displays correctly
- [ ] Can scan QR code with phone
- [ ] Connection status updates to "Connected"
- [ ] Can send messages: "send hello to [contact]"
- [ ] Can check messages: "check new messages"
- [ ] Can reply: "reply to [contact] with [message]"

### AI Responses
- [ ] AI responds intelligently to questions
- [ ] Responses are natural and conversational
- [ ] No "API key not set" errors
- [ ] Fallback works if primary API fails

## 🔍 Monitoring

### Vercel Dashboard
- [ ] Check deployment status (should be "Ready")
- [ ] Review function logs for errors
- [ ] Check analytics (page views, response times)

### Browser Console
- [ ] No JavaScript errors
- [ ] No network errors (404s, 500s)
- [ ] API calls succeed

### Performance
- [ ] Page loads quickly (< 3 seconds)
- [ ] Voice recognition responds quickly
- [ ] AI responses are fast (< 5 seconds)

## 🐛 Common Issues & Fixes

### Build Fails
**Error:** `Module not found: whatsapp-web.js`
- ✅ Already handled in `next.config.ts` - should not occur

**Error:** `GROQ_API_KEY not set`
- **Fix:** Add at least one AI API key in Vercel environment variables

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
- Try different browser (Chrome/Edge recommended)

### Domain Not Working
**Issue:** Domain shows "Not Found"
- Wait for DNS propagation (can take up to 48 hours)
- Verify DNS records are correct in Namecheap
- Check Vercel domain settings

## 📊 Performance Optimization

Already implemented:
- ✅ Next.js automatic optimizations
- ✅ Serverless functions for API routes
- ✅ External packages excluded from bundle
- ✅ PWA support (production only)
- ✅ Static page generation where possible

## 🔄 Updating Production

### Automatic (Recommended)
- Push to `main` branch
- Vercel auto-deploys on push

### Manual
```bash
vercel --prod
```

## 📝 Environment Variables Reference

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| `GROQ_API_KEY` | No* | Groq AI API key | [console.groq.com](https://console.groq.com) |
| `GEMINI_API_KEY` | No* | Google Gemini API key | [ai.google.dev](https://ai.google.dev) |
| `HUGGINGFACE_API_KEY` | No* | Hugging Face API key | [huggingface.co](https://huggingface.co) |
| `WHATSAPP_SERVICE_URL` | No | WhatsApp service URL | Railway/Render deployment |

*At least one AI API key is required for the app to function.

## 🎉 Success Criteria

Your deployment is successful when:
- ✅ App loads at production URL
- ✅ All core features work (voice, AI, emotions)
- ✅ Settings work correctly
- ✅ WhatsApp works (if configured)
- ✅ No console errors
- ✅ Fast response times
- ✅ Custom domain works (if configured)

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Review `PRODUCTION-DEPLOYMENT.md` for detailed guide
5. Check service logs (Railway/Render for WhatsApp)

---

**Ready to deploy?** Follow the steps above and check off each item as you complete it! 🚀
