# WhatsApp Service URL - Complete Explanation

## What is WHATSAPP_SERVICE_URL?

`WHATSAPP_SERVICE_URL` is an **environment variable** that points to a **separate server** running your WhatsApp connection service. It's the URL where your WhatsApp Web.js service is hosted.

## Why Do We Need It?

### The Problem:
- **Vercel** uses **serverless functions** (stateless, short-lived)
- **WhatsApp Web.js** needs a **persistent Node.js process** (long-running, stateful)
- These two don't work together directly!

### The Solution:
Run WhatsApp on a **separate server** that stays alive, and your Vercel app calls it via HTTP.

## Architecture Diagram

```
┌─────────────────────────────────┐
│   Your Vercel App              │
│   (vista.upvistadigital.com)   │
│                                 │
│   - Frontend (React)            │
│   - API Routes (Next.js)        │
│   - Calls WhatsApp Service      │
└──────────────┬──────────────────┘
               │
               │ HTTP API Calls
               │ (WHATSAPP_SERVICE_URL)
               │
┌──────────────▼──────────────────┐
│   WhatsApp Service Server       │
│   (Separate Hosting)            │
│                                 │
│   - Runs whatsapp-web.js        │
│   - Maintains WhatsApp session  │
│   - Provides API endpoints      │
│   - Always running              │
└─────────────────────────────────┘
```

## How to Get WHATSAPP_SERVICE_URL

### Step 1: Create WhatsApp Service

Create a new folder `whatsapp-service/` with these files:

**`whatsapp-service/package.json`**
```json
{
  "name": "vista-whatsapp-service",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "whatsapp-web.js": "^1.34.2",
    "qrcode-terminal": "^0.12.0",
    "cors": "^2.8.5"
  }
}
```

**`whatsapp-service/server.js`**
```javascript
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
  authStrategy: new LocalAuth(),
});

let qrCodeData = null;
let isReady = false;

client.on('qr', (qr) => {
  qrCodeData = qr;
  qrcode.generate(qr, { small: true });
  console.log('QR Code generated. Scan with WhatsApp.');
});

client.on('ready', () => {
  isReady = true;
  qrCodeData = null;
  console.log('WhatsApp Client is ready!');
});

client.on('authenticated', () => {
  console.log('WhatsApp authenticated');
});

client.on('auth_failure', (msg) => {
  console.error('WhatsApp auth failure:', msg);
});

client.initialize();

// API Routes
app.get('/status', (req, res) => {
  res.json({ 
    connected: isReady, 
    qrCode: qrCodeData 
  });
});

app.post('/connect', async (req, res) => {
  if (isReady) {
    return res.json({ 
      success: true,
      ready: true,
      message: 'WhatsApp is already connected' 
    });
  }
  
  if (qrCodeData) {
    return res.json({ 
      success: true,
      ready: false,
      qrCode: qrCodeData,
      message: 'Scan the QR code with WhatsApp to connect' 
    });
  }
  
  // Re-initialize if needed
  if (!client.info) {
    await client.initialize();
  }
  
  res.json({ 
    success: true,
    ready: false,
    qrCode: qrCodeData,
    message: 'Initializing WhatsApp connection...' 
  });
});

app.get('/qr', (req, res) => {
  res.json({ 
    qrCode: qrCodeData, 
    connected: isReady 
  });
});

app.get('/messages', async (req, res) => {
  if (!isReady) {
    return res.status(400).json({ error: 'WhatsApp not connected' });
  }
  
  const contact = req.query.contact;
  const unread = req.query.unread === 'true';
  const limit = parseInt(req.query.limit || '10', 10);
  
  try {
    let messages = [];
    
    if (unread) {
      const chats = await client.getChats();
      for (const chat of chats) {
        if (chat.unreadCount > 0) {
          const msgs = await chat.fetchMessages({ limit: chat.unreadCount });
          messages.push(...msgs);
        }
      }
    } else if (contact) {
      const chats = await client.getChats();
      const targetChat = chats.find(c => 
        c.name === contact || c.id.user === contact
      );
      if (targetChat) {
        messages = await targetChat.fetchMessages({ limit });
      }
    } else {
      const chats = await client.getChats();
      for (const chat of chats.slice(0, 5)) {
        const msgs = await chat.fetchMessages({ limit: 2 });
        messages.push(...msgs);
      }
    }
    
    res.json({
      success: true,
      messages: messages.map(msg => ({
        id: msg.id._serialized,
        from: msg.from,
        body: msg.body,
        timestamp: new Date(msg.timestamp * 1000),
      })),
      count: messages.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/send', async (req, res) => {
  if (!isReady) {
    return res.status(400).json({ error: 'WhatsApp not connected' });
  }
  
  const { contact, message, replyTo } = req.body;
  
  try {
    if (replyTo) {
      const msg = await client.getMessageById(replyTo);
      await msg.reply(message);
    } else if (contact) {
      const chats = await client.getChats();
      const targetChat = chats.find(c => 
        c.name === contact || c.id.user === contact
      );
      if (targetChat) {
        await targetChat.sendMessage(message);
      } else {
        return res.status(404).json({ error: 'Contact not found' });
      }
    } else {
      return res.status(400).json({ error: 'Contact or replyTo required' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`WhatsApp service running on port ${PORT}`);
});
```

### Step 2: Deploy to Railway (Easiest Option)

1. **Sign up**: Go to [railway.app](https://railway.app)
2. **New Project**: Click "New Project"
3. **Deploy from GitHub**: Connect your GitHub repo
4. **Select folder**: Choose `whatsapp-service/` folder
5. **Deploy**: Railway will auto-detect Node.js and deploy
6. **Get URL**: Railway gives you a URL like `https://your-app.railway.app`

**Your WHATSAPP_SERVICE_URL = `https://your-app.railway.app`**

### Step 3: Deploy to Render (Alternative)

1. **Sign up**: Go to [render.com](https://render.com)
2. **New Web Service**: Click "New" → "Web Service"
3. **Connect GitHub**: Link your repository
4. **Settings**:
   - Root Directory: `whatsapp-service`
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. **Deploy**: Render will deploy and give you a URL

**Your WHATSAPP_SERVICE_URL = `https://your-app.onrender.com`**

### Step 4: Set Environment Variable in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add new variable:
   - **Name**: `WHATSAPP_SERVICE_URL`
   - **Value**: `https://your-app.railway.app` (or your Render URL)
4. **Redeploy** your Vercel app

## What It Does

When you set `WHATSAPP_SERVICE_URL`, your Vercel app will:

1. **Skip local WhatsApp service** (which doesn't work on Vercel)
2. **Call your external service** via HTTP
3. **Get QR codes** from the external service
4. **Send/receive messages** through the external service
5. **Check connection status** from the external service

## Testing Locally

For local development, you can:

1. **Run WhatsApp service locally**:
   ```bash
   cd whatsapp-service
   npm install
   node server.js
   ```

2. **Set local environment variable**:
   Create `.env.local`:
   ```
   WHATSAPP_SERVICE_URL=http://localhost:3001
   ```

3. **Or don't set it** - the app will try to use local whatsapp-service.ts (but this may fail in some cases)

## Summary

- **WHATSAPP_SERVICE_URL** = URL of your separate WhatsApp server
- **Why needed**: Vercel can't run persistent WhatsApp connections
- **How to get**: Deploy WhatsApp service to Railway/Render/VPS
- **What it does**: Routes all WhatsApp operations to external service

## Quick Start Checklist

- [ ] Create `whatsapp-service/` folder with server.js
- [ ] Deploy to Railway or Render
- [ ] Copy the deployment URL
- [ ] Add `WHATSAPP_SERVICE_URL` in Vercel environment variables
- [ ] Redeploy Vercel app
- [ ] Test connection from your app!
