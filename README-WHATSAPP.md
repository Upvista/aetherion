# WhatsApp Integration Guide

Vista AI now supports WhatsApp Web integration! You can check messages, send replies, and more using natural language voice commands.

## Features

- ✅ Check for new/unread messages
- ✅ Read messages from specific contacts
- ✅ Send messages to contacts
- ✅ Reply to messages
- ✅ Natural language command parsing

## Setup

### 1. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install whatsapp-web.js qrcode-terminal
```

### 2. Connect WhatsApp

**First Time Setup:**
1. Start your development server: `npm run dev`
2. The WhatsApp service will automatically initialize
3. Check the terminal/console for a QR code
4. Open WhatsApp on your phone
5. Go to Settings > Linked Devices > Link a Device
6. Scan the QR code shown in the terminal

**Note:** The session is saved locally, so you only need to scan once (unless you log out).

### 3. Using WhatsApp Commands

Once connected, you can use natural language commands:

#### Check Messages
- "Hey Vista, are there any new messages in my WhatsApp?"
- "Check my WhatsApp messages"
- "Do I have any unread messages?"
- "Any new messages from John?"

#### Read Messages from Contact
- "Read messages from Sarah"
- "Show me messages from Mike"
- "What did John say?"

#### Send Messages
- "Send a message to John saying hello"
- "Text Sarah: How are you?"
- "Message Mike with: See you tomorrow"

#### Reply to Messages
- "Reply to John with: No, I haven't done it yet"
- "Reply saying: Yes, I'll be there"
- "Reply to Sarah: Thanks!"

## API Endpoints

### Connect WhatsApp
```
POST /api/whatsapp/connect
```

### Check Status
```
GET /api/whatsapp/status
```

### Get QR Code
```
GET /api/whatsapp/qr
```

### Get Messages
```
GET /api/whatsapp/messages?unread=true
GET /api/whatsapp/messages?contact=John
GET /api/whatsapp/messages?limit=10
```

### Send Message
```
POST /api/whatsapp/send
Body: {
  "contact": "John",
  "message": "Hello!"
}
```

## Important Notes

### Deployment Considerations

⚠️ **WhatsApp Web.js requires a persistent Node.js environment**

- **Vercel Serverless**: This won't work on Vercel's serverless functions because:
  - Puppeteer requires a full Node.js environment
  - Sessions need persistent storage
  - Long-running connections aren't supported

**Solutions:**
1. **Separate Service**: Run WhatsApp service on a separate server (Railway, Render, DigitalOcean)
2. **Vercel Edge Functions**: Not suitable (no Puppeteer support)
3. **Dedicated Server**: Use a VPS or dedicated server for the WhatsApp service

### Recommended Architecture

```
┌─────────────┐
│  Next.js    │  (Vercel - Frontend + API Routes)
│  (Vista AI) │
└──────┬──────┘
       │ HTTP API
       │
┌──────▼──────┐
│  WhatsApp   │  (Separate Server - Railway/Render)
│  Service    │
└─────────────┘
```

### Alternative: Browser Extension

For a simpler approach that works with Vercel:
- Create a browser extension that reads WhatsApp Web DOM
- Extension communicates with your Next.js app
- No server-side WhatsApp service needed

## Troubleshooting

### QR Code Not Showing
- Check terminal/console for QR code
- Make sure WhatsApp service initialized
- Try disconnecting and reconnecting

### Messages Not Loading
- Ensure WhatsApp is connected (check status endpoint)
- Verify you're logged into WhatsApp Web on your phone
- Check browser console for errors

### Session Expired
- Delete `.wwebjs_auth` folder
- Re-scan QR code
- Session will be saved for future use

## Security

- WhatsApp session is stored locally in `.wwebjs_auth/`
- Never commit session files to git (already in .gitignore)
- Keep your session files secure
- Consider encrypting session storage for production

## Future Enhancements

- [ ] Email integration (Gmail, Outlook)
- [ ] Calendar integration (Google Calendar)
- [ ] System notifications
- [ ] Multiple WhatsApp accounts
- [ ] Message scheduling
- [ ] Group chat support
