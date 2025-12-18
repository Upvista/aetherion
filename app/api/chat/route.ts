import { NextRequest, NextResponse } from 'next/server';
import { parseCommand, ParsedCommand } from '../../../lib/command-parser';
import { getWhatsAppService } from '../../../lib/whatsapp-service';

// Simple emotion detection based on keywords
function detectEmotion(text: string): string {
  const lowerText = text.toLowerCase();
  
  const emotions = {
    happy: ['happy', 'joy', 'excited', 'great', 'awesome', 'wonderful', 'amazing', 'love', 'laugh', 'good', 'nice'],
    sad: ['sad', 'sorrow', 'depressed', 'unhappy', 'cry', 'tears', 'lonely', 'bad', 'sorry'],
    angry: ['angry', 'mad', 'furious', 'annoyed', 'hate', 'rage', 'frustrated'],
    surprised: ['surprised', 'shocked', 'wow', 'unexpected', 'really', 'seriously'],
    confused: ['confused', 'dont understand', 'what', 'huh', 'puzzled', 'dont know'],
    excited: ['excited', 'thrilled', 'cant wait', 'awesome', 'yeah'],
    love: ['love', 'like', 'adore', 'heart', 'beautiful'],
  };

  for (const [emotion, keywords] of Object.entries(emotions)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return emotion;
    }
  }

  return 'neutral';
}

// Get AI response using Groq API (Fast and Free - PRIMARY)
async function getAIResponseGroq(message: string): Promise<string> {
  // Groq provides free API with very fast inference
  // Sign up: https://console.groq.com/
  // Get API key: https://console.groq.com/keys
  // Free tier: 14,400 requests/day
  
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not set');
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Fast and free - alternatives: 'mixtral-8x7b-32768', 'llama-3.3-70b-versatile'
        messages: [
          {
            role: 'system',
            content: 'You are Vista AI, a friendly AI companion robot created by Hamza Hafeez. You have emotions and personality. Keep responses short (1-2 sentences), natural, and conversational. Express emotions in your responses. Be helpful, engaging, and remember your name is Vista AI.',
          },
          {
            role: 'user',
            content: message,
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      
      // Handle rate limiting
      if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      }
      
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error: any) {
    if (error.message === 'RATE_LIMIT') {
      throw error; // Re-throw rate limit to try next API
    }
    console.error('Groq API error:', error);
    throw error;
  }
}

// Get AI response using Google Gemini API (SECONDARY)
async function getAIResponseGemini(message: string): Promise<string> {
  // Google Gemini has good free tier
  // Get API key: https://makersuite.google.com/app/apikey
  // Free tier: 1,500 requests/day
  // Models: gemini-pro, gemini-1.5-flash
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set');
  }

  try {
    // Use Gemini 1.5 Flash (faster and free tier friendly)
    const model = 'gemini-1.5-flash'; // or 'gemini-pro' for better quality
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are Vista AI, a friendly AI companion robot created by Hamza Hafeez. You have emotions and personality. Keep responses short (1-2 sentences), natural, and conversational. Express emotions in your responses. Be helpful, engaging, and remember your name is Vista AI.

User said: "${message}"

Respond naturally as Vista AI:`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0.7,
            topP: 0.9,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      // Handle rate limiting
      if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid Gemini response format');
    }
    
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error: any) {
    if (error.message === 'RATE_LIMIT') {
      throw error; // Re-throw rate limit to try next API
    }
    console.error('Gemini API error:', error);
    throw error;
  }
}

// Get AI response using Hugging Face Inference API (TERTIARY FALLBACK)
async function getAIResponseHF(message: string): Promise<string> {
  // Using Hugging Face Inference API - FREE tier
  // Works without API key (but slower)
  // With API key: faster and higher limits
  // Model: Microsoft DialoGPT-medium (good for conversations)
  
  const HF_API_URL = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';
  
  // Alternative free models you can try:
  // - 'mistralai/Mistral-7B-Instruct-v0.2' (better but requires API key)
  // - 'google/flan-t5-large' (good for simple responses)
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add API key if available (optional, but recommended)
  if (process.env.HUGGINGFACE_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.HUGGINGFACE_API_KEY}`;
  }
  
  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: {
          past_user_inputs: [],
          generated_responses: [],
          text: message,
        },
        parameters: {
          max_length: 100,
          temperature: 0.7,
          top_p: 0.9,
        },
      }),
    });

    if (!response.ok) {
      // If model is loading, wait and retry
      if (response.status === 503) {
        const waitTime = response.headers.get('estimated-time') || '10';
        console.log(`HF model loading, waiting ${waitTime}s...`);
        await new Promise(resolve => setTimeout(resolve, parseInt(waitTime) * 1000));
        // Retry once
        return getAIResponseHF(message);
      }
      throw new Error(`HF API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract generated text from response (HF responses vary by model)
    if (data.generated_text) {
      return data.generated_text.trim();
    }
    
    if (data[0] && data[0].generated_text) {
      return data[0].generated_text.trim();
    }

    // Fallback if response format is unexpected
    throw new Error('Unexpected HF response format');
  } catch (error) {
    console.error('Hugging Face API error:', error);
    throw error;
  }
}

// Fallback: Simple pattern-based responses
function getSimpleResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hello! I'm Vista AI, your AI companion robot created by Hamza Hafeez. How can I help you today?";
  }
  
  if (lowerMessage.includes('how are you')) {
    return "I'm doing great! Thanks for asking. I'm Vista AI, always here to help. How about you?";
  }
  
  if (lowerMessage.includes('what') && lowerMessage.includes('your name')) {
    return "I'm Vista AI! I'm an AI companion robot created by Hamza Hafeez. Nice to meet you!";
  }
  
  if (lowerMessage.includes('who made you') || lowerMessage.includes('who created you')) {
    return "I'm Vista AI, and I was created by Hamza Hafeez. He's my developer!";
  }
  
  if (lowerMessage.includes('vista')) {
    return "Yes, that's me! I'm Vista AI, your friendly AI companion. How can I help you?";
  }
  
  if (lowerMessage.includes('goodbye') || lowerMessage.includes('bye')) {
    return "Goodbye! It was nice talking to you. I'm Vista AI, and I'll be here whenever you need me!";
  }
  
  if (lowerMessage.includes('thank')) {
    return "You're welcome! I'm Vista AI, always here to help.";
  }
  
  // Default response
  return `I heard you say: "${message}". That's interesting! I'm Vista AI, tell me more about it.`;
}

// Main function to get AI response (tries multiple APIs with smart fallback)
async function getAIResponse(message: string): Promise<string> {
  // Priority order with smart fallback:
  // 1. Groq (fastest, 14,400 req/day) - PRIMARY
  // 2. Gemini (good quality, 1,500 req/day) - SECONDARY
  // 3. Hugging Face (works without key, slower) - TERTIARY
  // 4. Simple fallback (always works) - LAST RESORT
  
  const errors: string[] = [];
  
  // Try Groq first (if API key is set)
  if (process.env.GROQ_API_KEY) {
    try {
      console.log('Trying Groq API...');
      const response = await getAIResponseGroq(message);
      console.log('✓ Groq API success');
      return response;
    } catch (error: any) {
      errors.push(`Groq: ${error.message}`);
      console.log('✗ Groq API failed:', error.message);
      
      // If rate limited, don't wait - try next API immediately
      if (error.message !== 'RATE_LIMIT') {
        // For other errors, still try next API
      }
    }
  }
  
  // Try Gemini second (if API key is set)
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('Trying Gemini API...');
      const response = await getAIResponseGemini(message);
      console.log('✓ Gemini API success');
      return response;
    } catch (error: any) {
      errors.push(`Gemini: ${error.message}`);
      console.log('✗ Gemini API failed:', error.message);
    }
  }
  
  // Try Hugging Face third (works without key, but may be slow)
  try {
    console.log('Trying Hugging Face API...');
    const response = await getAIResponseHF(message);
    console.log('✓ Hugging Face API success');
    return response;
  } catch (error: any) {
    errors.push(`HF: ${error.message}`);
    console.log('✗ Hugging Face API failed:', error.message);
  }
  
  // Last resort: Simple fallback (always works)
  console.log('Using simple fallback response');
  console.log('All API attempts failed:', errors);
  return getSimpleResponse(message);
}

/**
 * Handle WhatsApp commands
 */
async function handleWhatsAppCommand(
  command: ParsedCommand,
  originalMessage: string
): Promise<string> {
  let service;
  try {
    service = getWhatsAppService();
  } catch (error: any) {
    return 'WhatsApp service is not available. Please connect WhatsApp first.';
  }

  // Check connection status
  const isConnected = service.isConnected();
  if (!isConnected) {
    return 'WhatsApp is not connected. Please connect WhatsApp first by saying "connect WhatsApp" or scanning the QR code in settings.';
  }

  try {
    if (command.action === 'check') {
      // Check for new/unread messages
      try {
        const messages = command.filters?.unread
          ? await service.getUnreadMessages()
          : await service.getRecentMessages(command.filters?.contact, command.filters?.limit || 10);

        if (messages.length === 0) {
          return "You don't have any new messages right now.";
        }

        // Format response
        let response = `You have ${messages.length} new message${messages.length > 1 ? 's' : ''}:\n\n`;
        
        for (const msg of messages.slice(0, 5)) {
          const timeAgo = getTimeAgo(msg.timestamp);
          response += `From ${msg.from}: "${msg.body}" (${timeAgo})\n`;
        }

        if (messages.length > 5) {
          response += `\nAnd ${messages.length - 5} more message${messages.length - 5 > 1 ? 's' : ''}.`;
        }

        return response;
      } catch (error: any) {
        // Handle getContact() errors gracefully
        if (error.message?.includes('getIsMyContact') || error.message?.includes('ContactMethods')) {
          return "I'm having trouble reading some messages due to a WhatsApp Web update. Some chats may not be accessible, but I can still help with sending and replying to messages. Please try asking about specific contacts or use send/reply commands.";
        }
        throw error;
      }
    }

    if (command.action === 'send' && command.target) {
      if (!command.message) {
        // No message provided - ask user what to send
        return `What would you like to send to ${command.target}? Please tell me the message content. For example: "send hello to ${command.target}" or "send to ${command.target} saying hello there".`;
      }
      // Send message
      await service.sendMessage(command.target, command.message);
      return `Message sent to ${command.target}: "${command.message}"`;
    }

    if (command.action === 'reply' && command.message) {
      // Reply to message
      if (command.target) {
        // Reply to latest message from contact
        const messages = await service.getMessagesFromContact(command.target, 1);
        if (messages.length > 0) {
          await service.replyToMessage(messages[0].id, command.message);
          return `Replied to ${command.target}: "${command.message}"`;
        } else {
          return `No recent messages from ${command.target} to reply to.`;
        }
      } else {
        return 'Please specify who to reply to.';
      }
    }

    if (command.action === 'read' && command.target) {
      // Read messages from contact
      const messages = await service.getMessagesFromContact(command.target, 10);
      
      if (messages.length === 0) {
        return `No messages found from ${command.target}.`;
      }

      let response = `Messages from ${command.target}:\n\n`;
      for (const msg of messages) {
        const timeAgo = getTimeAgo(msg.timestamp);
        response += `"${msg.body}" (${timeAgo})\n`;
      }

      return response;
    }

    return "I'm not sure what you want me to do with WhatsApp. Try asking to check messages, send a message, or reply to someone.";
  } catch (error: any) {
    if (error.message.includes('not connected')) {
      return 'WhatsApp is not connected. Please connect WhatsApp first by saying "connect WhatsApp" or scanning the QR code.';
    }
    return `Sorry, I couldn't complete that WhatsApp action: ${error.message}`;
  }
}

/**
 * Get human-readable time ago
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Parse command to check if it's a WhatsApp/email/calendar command
    const command = parseCommand(message);

    let response: string;
    let emotion = detectEmotion(message);

    if (command && command.type === 'whatsapp') {
      // Handle WhatsApp command
      response = await handleWhatsAppCommand(command, message);
      emotion = 'listening'; // Show listening emotion for commands
    } else {
      // Regular AI chat
      response = await getAIResponse(message);
    }

    return NextResponse.json({
      response,
      emotion,
      command: command || null,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        response: getSimpleResponse('error'), // Fallback response
        emotion: 'sad'
      },
      { status: 500 }
    );
  }
}
