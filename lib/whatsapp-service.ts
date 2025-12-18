/**
 * WhatsApp Web Service
 * Handles WhatsApp Web connection and operations
 * 
 * Note: This requires a persistent Node.js environment (not serverless)
 * For Vercel deployment, consider using a separate service or Edge Functions
 */

import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

interface WhatsAppMessage {
  id: string;
  from: string;
  body: string;
  timestamp: Date;
  isGroup: boolean;
  contactName?: string;
}

class WhatsAppService {
  private client: Client | null = null;
  private isReady: boolean = false;
  private isAuthenticated: boolean = false;
  private qrCode: string | null = null;
  private sessionPath: string = '.wwebjs_auth';

  constructor() {
    // Initialize client with local auth (saves session to .wwebjs_auth folder)
    // LocalAuth automatically persists session to disk - no need for manual JSON storage
    // Session is saved in .wwebjs_auth/ folder and will persist across server restarts
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: this.sessionPath,
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Helps with file locking issues on Windows
        ],
      },
    });

    this.setupEventHandlers();
    
    // Try to auto-initialize if we have a saved session
    // This ensures connection persists across server restarts
    this.autoInitialize();
  }

  /**
   * Auto-initialize if we have a saved session
   */
  private async autoInitialize(): Promise<void> {
    // Wait a bit before auto-initializing to avoid blocking constructor
    setTimeout(async () => {
      if (this.client && !this.isReady && !this.isClientInitialized()) {
        try {
          console.log('[WhatsApp] Auto-initializing with saved session...');
          await this.initialize();
        } catch (error) {
          // Silently fail - user can manually connect if needed
          console.log('[WhatsApp] Auto-initialize failed (this is normal if no session exists):', error);
        }
      }
    }, 2000);
  }

  private setupEventHandlers() {
    if (!this.client) return;

    // QR Code generation
    this.client.on('qr', (qr) => {
      console.log('QR Code received, scan with WhatsApp');
      this.qrCode = qr;
      qrcode.generate(qr, { small: true });
    });

    // Ready event
    this.client.on('ready', () => {
      console.log('WhatsApp client is ready!');
      this.isReady = true;
      this.isAuthenticated = true;
      this.qrCode = null;
    });

    // Authentication
    this.client.on('authenticated', () => {
      console.log('WhatsApp authenticated');
      // Set a flag that we're authenticated (even if not fully ready yet)
      // This helps with connection status checks
      this.isAuthenticated = true;
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      console.error('WhatsApp authentication failed:', msg);
      this.isReady = false;
      this.isAuthenticated = false;
    });

    // Disconnected
    this.client.on('disconnected', (reason) => {
      console.log('[WhatsApp] Disconnected:', reason);
      this.isReady = false;
      this.isAuthenticated = false;
      this.qrCode = null;
      
      // If logged out, we need to clear the session and get a new QR code
      if (reason === 'LOGOUT') {
        console.log('[WhatsApp] Logged out - session cleared, will need new QR code on next connect');
        // Don't destroy client here - let it be reinitialized
        // The LocalAuth will handle session clearing
      } else {
        // For other disconnects, try to reconnect automatically
        console.log('[WhatsApp] Disconnected, will attempt to reconnect...');
        // Auto-reconnect after a delay
        setTimeout(() => {
          if (!this.isReady && this.client) {
            console.log('[WhatsApp] Attempting auto-reconnect...');
            this.initialize().catch(err => {
              console.error('[WhatsApp] Auto-reconnect failed:', err);
            });
          }
        }, 3000);
      }
    });

    // Message received
    this.client.on('message', async (message: Message) => {
      // You can handle incoming messages here if needed
      console.log('New message received:', message.body);
    });
  }

  /**
   * Check if client is already initialized
   */
  private isClientInitialized(): boolean {
    if (!this.client) return false;
    try {
      // Check if client has been initialized (has a page or info)
      const clientState = (this.client as any).pupPage || (this.client as any).info;
      return clientState !== null && clientState !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Initialize and connect to WhatsApp Web
   */
  async initialize(): Promise<{ qrCode?: string; ready: boolean }> {
    if (!this.client) {
      throw new Error('WhatsApp client not initialized');
    }

    // If already ready, return immediately
    if (this.isReady) {
      return { ready: true };
    }

    try {
      // Check if client is already initialized
      const alreadyInitialized = this.isClientInitialized();
      
      if (!alreadyInitialized) {
        console.log('[WhatsApp] Initializing client...');
        // Initialize the client (this will trigger QR code event if needed)
        await this.client.initialize();
      } else {
        console.log('[WhatsApp] Client already initialized, checking state...');
        // Client is initialized, just check if we're ready or need QR
        if (this.isReady) {
          return { ready: true };
        }
        // If we have a QR code stored, return it
        if (this.qrCode) {
          return {
            qrCode: this.qrCode,
            ready: false,
          };
        }
      }
      
      // Reset QR code to null before waiting (in case we get a new one)
      // But only if we're not already initialized
      if (!alreadyInitialized) {
        this.qrCode = null;
      }
      
      // Wait for QR code to be generated (it's async via event)
      // Poll for up to 20 seconds for QR code or ready state
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        // Check if ready
        if (this.isReady) {
          console.log('[WhatsApp] Client is ready!');
          return { ready: true };
        }
        
        // Check if QR code is available
        if (this.qrCode) {
          console.log('[WhatsApp] QR code generated successfully');
          return {
            qrCode: this.qrCode,
            ready: false,
          };
        }
        
        // Log progress every 5 seconds
        if (i > 0 && i % 5 === 0) {
          console.log(`[WhatsApp] Still waiting for QR code or ready state... (${i}s)`);
        }
      }
      
      // After 20 seconds, return whatever state we have
      console.log('[WhatsApp] Initialize timeout - state:', { 
        hasQrCode: !!this.qrCode, 
        isReady: this.isReady,
        isAuthenticated: this.isAuthenticated 
      });
      return {
        qrCode: this.qrCode || undefined,
        ready: this.isReady,
      };
    } catch (error: any) {
      console.error('[WhatsApp] Error initializing:', error);
      
      // If error is about destroyed client or session, try to recreate
      if (error.message?.includes('destroyed') || error.message?.includes('Session') || error.message?.includes('Target closed')) {
        console.log('[WhatsApp] Client in bad state, recreating...');
        try {
          if (this.client) {
            try {
              await this.client.destroy();
            } catch (destroyError) {
              // Ignore destroy errors
              console.log('[WhatsApp] Destroy error (ignored):', destroyError);
            }
          }
          
          // Recreate client with same session path (LocalAuth will restore session)
          this.client = new Client({
            authStrategy: new LocalAuth({
              dataPath: this.sessionPath,
            }),
            puppeteer: {
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox'],
            },
          });
          
          this.setupEventHandlers();
          
          // Try to initialize again
          await this.client.initialize();
          
          // Wait a bit for QR or ready
          for (let i = 0; i < 10; i++) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            if (this.isReady) return { ready: true };
            if (this.qrCode) return { qrCode: this.qrCode, ready: false };
          }
          
          return {
            qrCode: this.qrCode || undefined,
            ready: this.isReady,
          };
        } catch (recreateError) {
          console.error('[WhatsApp] Error recreating client:', recreateError);
          throw recreateError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Check if WhatsApp is ready
   * Also checks if authenticated as a fallback (handles delay between authenticated and ready events)
   * This method is safe to call frequently and won't throw errors
   */
  isConnected(): boolean {
    if (!this.client) {
      return false;
    }
    
    // If ready flag is set, definitely connected
    if (this.isReady) {
      return true;
    }
    
    // If authenticated but not yet ready, also consider connected
    // This handles the delay between 'authenticated' and 'ready' events
    if (this.isAuthenticated) {
      // Double-check by trying to access client info safely
      try {
        // Check if client has info property (means it's authenticated)
        const clientInfo = (this.client as any).info;
        if (clientInfo !== null && clientInfo !== undefined) {
          // If we have info but isReady is false, we're in the gap between authenticated and ready
          // Consider this as connected
          return true;
        }
        // Even if info is not available yet, if authenticated flag is set, consider connected
        // This handles the brief moment between authenticated and ready events
        return true;
      } catch (e) {
        // If accessing info throws an error, check if we're authenticated
        // If authenticated flag is set, we're likely connected (just not fully ready)
        // This is safe to return true as the authenticated event has fired
        return this.isAuthenticated;
      }
    }
    
    // Also check if client is initialized and has a page (means it's working)
    try {
      if (this.isClientInitialized()) {
        // Client is initialized, check if it has info (authenticated)
        const clientInfo = (this.client as any).info;
        if (clientInfo) {
          // Has info but flags not set - might be a state sync issue
          // Set flags to match reality
          this.isAuthenticated = true;
          // Don't set isReady yet - wait for ready event
          return true;
        }
      }
    } catch (e) {
      // Ignore errors in state checking
    }
    
    return false;
  }

  /**
   * Get QR code for authentication
   */
  getQRCode(): string | null {
    return this.qrCode;
  }

  /**
   * Get recent messages from a contact or all contacts
   */
  async getRecentMessages(contactName?: string, limit: number = 10): Promise<WhatsAppMessage[]> {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp not connected. Please scan QR code first.');
    }

    try {
      const chats = await this.client.getChats();
      const messages: WhatsAppMessage[] = [];

      for (const chat of chats.slice(0, limit)) {
        // Use chat.name directly - it's always available and doesn't require getContact()
        // chat.name contains the contact/group name
        const displayName = chat.name || (chat.id as any)?.user || 'Unknown';
        
        // Filter by contact name if provided (only if contactName parameter was passed)
        if (contactName && displayName.toLowerCase() && !displayName.toLowerCase().includes(contactName.toLowerCase())) {
          continue;
        }

        const chatMessages = await chat.fetchMessages({ limit: 1 });
        
        if (chatMessages.length > 0) {
          const lastMessage = chatMessages[0];
          messages.push({
            id: lastMessage.id.id,
            from: displayName || 'Unknown',
            body: lastMessage.body,
            timestamp: new Date(lastMessage.timestamp * 1000),
            isGroup: chat.isGroup,
            contactName: displayName !== 'Unknown' ? displayName : undefined,
          });
        }
      }

      // Sort by timestamp (newest first)
      messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return messages.slice(0, limit);
    } catch (error: any) {
      console.error('Error getting messages:', error);
      // Don't disconnect on error - just throw it
      // Check if error is about connection
      if (error.message?.includes('not connected') || error.message?.includes('Session')) {
        // Connection issue - reset flags but don't destroy client
        this.isReady = false;
        this.isAuthenticated = false;
      }
      throw error;
    }
  }

  /**
   * Get unread messages
   * Uses a workaround to avoid getContact() which is broken in current WhatsApp Web
   */
  async getUnreadMessages(): Promise<WhatsAppMessage[]> {
    if (!this.client || !this.isConnected()) {
      throw new Error('WhatsApp not connected. Please scan QR code first.');
    }

    try {
      const chats = await this.client.getChats();
      const unreadMessages: WhatsAppMessage[] = [];

      for (const chat of chats) {
        if (chat.unreadCount > 0) {
          try {
            // Get chat name using only safe properties that don't trigger getContact()
            // Access chat.name directly without any method calls
            const chatId = chat.id._serialized;
            const chatName = (chat as any).name; // Direct property access, no method call
            
            // Get unread messages - this might internally call getContact(), so wrap it
            let chatMessages: any[] = [];
            try {
              chatMessages = await chat.fetchMessages({ limit: chat.unreadCount });
            } catch (fetchError: any) {
              // If fetchMessages fails due to getContact() error, skip this chat
              if (fetchError.message?.includes('getIsMyContact') || fetchError.message?.includes('ContactMethods')) {
                console.warn(`[WhatsApp] Skipping chat ${chatId} due to getContact() error - this is a known WhatsApp Web.js issue`);
                continue;
              }
              throw fetchError;
            }
            
            // Process messages - use message properties directly
            for (const message of chatMessages.slice(0, chat.unreadCount)) {
              // Extract sender info from message directly
              // message.from contains the sender ID (phone number format)
              // message.notifyName might contain display name
              const messageFrom = (message as any).from || '';
              const messageNotifyName = (message as any).notifyName || '';
              const messageFromName = (message as any).fromName || '';
              
              // Use notifyName or fromName if available, otherwise use from, otherwise use chat name
              const senderName = messageNotifyName || messageFromName || chatName || messageFrom || 'Unknown';
              
              unreadMessages.push({
                id: message.id.id,
                from: senderName,
                body: message.body,
                timestamp: new Date(message.timestamp * 1000),
                isGroup: chat.isGroup,
                contactName: senderName !== 'Unknown' && senderName !== messageFrom ? senderName : undefined,
              });
            }
          } catch (chatError: any) {
            // If this specific chat fails, log and continue with next chat
            // Don't let one broken chat stop us from getting other messages
            if (chatError.message?.includes('getIsMyContact') || chatError.message?.includes('ContactMethods')) {
              console.warn(`[WhatsApp] Skipping chat due to getContact() error - continuing with other chats`);
            } else {
              console.warn(`[WhatsApp] Error processing chat:`, chatError.message);
            }
            continue;
          }
        }
      }

      // Sort by timestamp (newest first)
      unreadMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      if (unreadMessages.length === 0) {
        console.log('[WhatsApp] No unread messages found (or all chats had getContact() errors)');
      }

      return unreadMessages;
    } catch (error: any) {
      console.error('Error getting unread messages:', error);
      // Don't disconnect on error - just throw it
      // Check if error is about connection
      if (error.message?.includes('not connected') || error.message?.includes('Session')) {
        // Connection issue - reset flags but don't destroy client
        this.isReady = false;
        this.isAuthenticated = false;
      }
      throw error;
    }
  }

  /**
   * Send a message to a contact
   */
  async sendMessage(contactName: string, message: string): Promise<boolean> {
    if (!this.client || !this.isConnected()) {
      throw new Error('WhatsApp not connected. Please scan QR code first.');
    }

    try {
      // First, try to find chat by name (more reliable than getContacts)
      const chats = await this.client.getChats();
      const lowerContactName = contactName.toLowerCase();
      
      // Find chat by name
      let targetChat = chats.find(
        (chat) => chat.name?.toLowerCase().includes(lowerContactName)
      );

      // If not found by name, try to get contact and find by ID
      if (!targetChat) {
        try {
          const contacts = await this.client.getContacts();
          const contact = contacts.find(
            (c) =>
              c.pushname?.toLowerCase().includes(lowerContactName) ||
              c.number.includes(contactName)
          );

          if (contact) {
            targetChat = await this.client.getChatById(contact.id._serialized);
          }
        } catch (contactError) {
          console.log('[WhatsApp] getContacts() failed, using chat search only:', contactError);
        }
      }

      if (!targetChat) {
        throw new Error(`Contact "${contactName}" not found`);
      }

      // Send message using chat ID
      const chatId = targetChat.id._serialized;
      await this.client.sendMessage(chatId, message);

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Reply to a specific message
   */
  async replyToMessage(messageId: string, replyText: string): Promise<boolean> {
    if (!this.client || !this.isConnected()) {
      throw new Error('WhatsApp not connected. Please scan QR code first.');
    }

    try {
      const chats = await this.client.getChats();
      
      for (const chat of chats) {
        const messages = await chat.fetchMessages({ limit: 50 });
        const message = messages.find((m) => m.id.id === messageId);
        
        if (message) {
          await message.reply(replyText);
          return true;
        }
      }

      throw new Error(`Message with ID "${messageId}" not found`);
    } catch (error) {
      console.error('Error replying to message:', error);
      throw error;
    }
  }

  /**
   * Get messages from a specific contact
   */
  async getMessagesFromContact(contactName: string, limit: number = 10): Promise<WhatsAppMessage[]> {
    if (!this.client || !this.isConnected()) {
      throw new Error('WhatsApp not connected. Please scan QR code first.');
    }

    try {
      // First, try to find chat by name (more reliable)
      const chats = await this.client.getChats();
      const lowerContactName = contactName.toLowerCase();
      
      // Find chat by name
      let targetChat = chats.find(
        (chat) => chat.name?.toLowerCase().includes(lowerContactName)
      );

      // If not found by name, try to get contact and find by ID
      if (!targetChat) {
        try {
          const contacts = await this.client.getContacts();
          const contact = contacts.find(
            (c) =>
              c.pushname?.toLowerCase().includes(lowerContactName) ||
              c.number.includes(contactName)
          );

          if (contact) {
            targetChat = await this.client.getChatById(contact.id._serialized);
          }
        } catch (contactError) {
          console.log('[WhatsApp] getContacts() failed, using chat search only:', contactError);
        }
      }

      if (!targetChat) {
        throw new Error(`Contact "${contactName}" not found`);
      }

      const messages = await targetChat.fetchMessages({ limit });
      const chatName = targetChat.name || contactName;

      return messages.map((msg) => ({
        id: msg.id.id,
        from: chatName,
        body: msg.body,
        timestamp: new Date(msg.timestamp * 1000),
        isGroup: targetChat.isGroup,
        contactName: chatName !== 'Unknown' ? chatName : undefined,
      }));
    } catch (error) {
      console.error('Error getting messages from contact:', error);
      throw error;
    }
  }

  /**
   * Reset client (useful after logout)
   */
  async resetClient(): Promise<void> {
    console.log('Resetting WhatsApp client...');
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (error) {
        // Ignore errors during destroy (might already be destroyed)
        console.log('Destroy error (ignored):', error);
      }
    }
    
    // Reset state
    this.isReady = false;
    this.isAuthenticated = false;
    this.qrCode = null;
    
    // Recreate client
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: this.sessionPath,
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });
    
    this.setupEventHandlers();
  }

  /**
   * Disconnect WhatsApp client
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (error) {
        console.log('Disconnect error (ignored):', error);
      }
      this.client = null;
      this.isReady = false;
      this.isAuthenticated = false;
      this.qrCode = null;
    }
  }
}

// Global singleton instance (persists across hot reloads and API routes)
declare global {
  // eslint-disable-next-line no-var
  var __whatsappService: WhatsAppService | undefined;
}

// Singleton instance - use global to persist across Next.js hot reloads
let whatsappService: WhatsAppService | null = null;

export function getWhatsAppService(): WhatsAppService {
  // In development, use global to persist across hot reloads
  if (process.env.NODE_ENV === 'development') {
    if (!global.__whatsappService) {
      global.__whatsappService = new WhatsAppService();
    }
    return global.__whatsappService;
  }
  
  // In production, use module-level singleton
  if (!whatsappService) {
    whatsappService = new WhatsAppService();
  }
  return whatsappService;
}

export type { WhatsAppMessage };
