# Vercel WhatsApp Integration Setup

Since Vercel uses serverless functions, WhatsApp Web.js (which requires a persistent Node.js environment) cannot run directly on Vercel. This guide explains how to set up WhatsApp integration for production.

## Architecture

```
┌─────────────────┐
│   Vercel        │  (Next.js App - Frontend + API Routes)
│   vista-ai.com  │
└────────┬─────────┘
         │ HTTP API Calls
         │
┌────────▼─────────┐
│  WhatsApp Service│  (Separate Server - Railway/Render/VPS)
│  whatsapp-api    │  (Runs whatsapp-web.js)
└──────────────────┘
```

## Option 1: Separate WhatsApp Service (Recommended)

### Step 1: Deploy WhatsApp Service

Create a separate Node.js service on Railway, Render, or a VPS:

**File: `whatsapp-service/server.js`**
```javascript
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

const client = new Client({
  authStrategy: new LocalAuth(),
});

let qrCodeData = null;
let isReady = false;

client.on('qr', (qr) => {
  qrCodeData = qr;
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  isReady = true;
  qrCodeData = null;
  console.log('WhatsApp ready!');
});

client.initialize();

// API Routes
app.get('/status', (req, res) => {
  res.json({ connected: isReady, qrCode: qrCodeData });
});

app.post('/connect', async (req, res) => {
  if (isReady) {
    return res.json({ ready: true });
  }
  res.json({ qrCode: qrCodeData, ready: false });
});

app.get('/qr', (req, res) => {
  res.json({ qrCode: qrCodeData, connected: false });
});

// Add other routes (messages, send, etc.)

app.listen(3001, () => {
  console.log('WhatsApp service running on port 3001');
});
```

### Step 2: Configure Vercel Environment Variable

In your Vercel project settings, add:

```
WHATSAPP_SERVICE_URL=https://your-whatsapp-service.railway.app
```

### Step 3: Deploy

- Deploy WhatsApp service to Railway/Render
- Deploy Next.js app to Vercel
- Set environment variable in Vercel

## Option 2: Browser Extension (Alternative)

For a simpler approach that works entirely on Vercel:

1. Create a browser extension that reads WhatsApp Web DOM
2. Extension communicates with your Vercel app via messages
3. No separate server needed

## Local Development

For local development, the WhatsApp service runs directly in your Next.js app:

```bash
npm run dev
```

The service will:
- Initialize automatically
- Show QR code in terminal
- Save session locally in `.wwebjs_auth/`

## Testing

1. Start dev server: `npm run dev`
2. Open settings (long press on face)
3. Go to "Connected Apps"
4. Click "Connect" on WhatsApp
5. Scan QR code with your phone
6. Wait for connection confirmation

## Production Checklist

- [ ] Deploy WhatsApp service to Railway/Render/VPS
- [ ] Set `WHATSAPP_SERVICE_URL` in Vercel environment variables
- [ ] Test connection from production app
- [ ] Verify QR code generation works
- [ ] Test message sending/receiving
- [ ] Set up session persistence (save `.wwebjs_auth/` folder)

## Troubleshooting

**QR Code not showing:**
- Check WhatsApp service is running
- Check `WHATSAPP_SERVICE_URL` is set correctly
- Check browser console for errors

**Connection fails:**
- Verify WhatsApp service is accessible
- Check CORS settings on WhatsApp service
- Verify session files are persisted

**Messages not working:**
- Ensure WhatsApp is connected (check status)
- Verify service endpoints are correct
- Check service logs for errors
