/**
 * Command Parser for WhatsApp and other integrations
 * Parses natural language commands and extracts intent
 */

export interface ParsedCommand {
  type: 'whatsapp' | 'email' | 'calendar' | 'general';
  action: 'check' | 'send' | 'reply' | 'read' | 'unknown';
  target?: string; // contact name, email, etc.
  message?: string; // message to send
  replyTo?: string; // message ID to reply to
  filters?: {
    unread?: boolean;
    contact?: string;
    limit?: number;
  };
}

export function parseCommand(userMessage: string): ParsedCommand | null {
  const lowerMessage = userMessage.toLowerCase().trim();

  // WhatsApp commands
  if (
    lowerMessage.includes('whatsapp') ||
    lowerMessage.includes('message') ||
    lowerMessage.includes('text') ||
    lowerMessage.includes('chat')
  ) {
    return parseWhatsAppCommand(lowerMessage, userMessage);
  }

  // Email commands (future)
  if (lowerMessage.includes('email') || lowerMessage.includes('mail')) {
    return parseEmailCommand(lowerMessage, userMessage);
  }

  // Calendar commands (future)
  if (
    lowerMessage.includes('calendar') ||
    lowerMessage.includes('event') ||
    lowerMessage.includes('meeting')
  ) {
    return parseCalendarCommand(lowerMessage, userMessage);
  }

  return null; // Not a command, treat as general chat
}

function parseWhatsAppCommand(
  lowerMessage: string,
  originalMessage: string
): ParsedCommand {
  const command: ParsedCommand = {
    type: 'whatsapp',
    action: 'unknown',
  };

  // Check for new messages
  if (
    lowerMessage.includes('new message') ||
    lowerMessage.includes('any message') ||
    lowerMessage.includes('check message') ||
    lowerMessage.includes('unread') ||
    lowerMessage.includes('new text') ||
    lowerMessage.includes('read message') ||
    (lowerMessage.includes('read') && lowerMessage.includes('whatsapp'))
  ) {
    command.action = 'check';
    command.filters = { unread: true };

    // Extract contact name if mentioned
    const contactMatch = extractContactName(originalMessage);
    if (contactMatch) {
      command.filters.contact = contactMatch;
      command.target = contactMatch;
    }

    return command;
  }

  // Send message
  if (
    lowerMessage.includes('send') ||
    (lowerMessage.includes('text') && !lowerMessage.includes('read')) ||
    lowerMessage.includes('message to') ||
    (lowerMessage.includes('send') && lowerMessage.includes('to'))
  ) {
    command.action = 'send';

    // Extract contact name
    const contactMatch = extractContactName(originalMessage);
    if (contactMatch) {
      command.target = contactMatch;
    }

    // Extract message to send
    const messageMatch = extractMessageToSend(originalMessage);
    if (messageMatch) {
      command.message = messageMatch;
    }

    return command;
  }

  // Reply to message
  if (
    lowerMessage.includes('reply') ||
    lowerMessage.includes('respond') ||
    (lowerMessage.includes('reply') && lowerMessage.includes('with'))
  ) {
    command.action = 'reply';

    // Extract contact name
    const contactMatch = extractContactName(originalMessage);
    if (contactMatch) {
      command.target = contactMatch;
    }

    // Extract reply message
    const replyMatch = extractReplyMessage(originalMessage);
    if (replyMatch) {
      command.message = replyMatch;
    }

    return command;
  }

  // Read messages from contact (more specific - must have contact name)
  if (
    (lowerMessage.includes('read') && !lowerMessage.includes('new')) ||
    lowerMessage.includes('show message') ||
    lowerMessage.includes('get message') ||
    lowerMessage.includes('messages from')
  ) {
    // Extract contact name first
    const contactMatch = extractContactName(originalMessage);
    
    // Only treat as 'read' if we have a contact name
    // Otherwise it might be a 'check' command
    if (contactMatch) {
      command.action = 'read';
      command.target = contactMatch;
      command.filters = { contact: contactMatch };
      return command;
    }
  }

  return command;
}

function parseEmailCommand(
  lowerMessage: string,
  originalMessage: string
): ParsedCommand {
  // Future implementation
  return {
    type: 'email',
    action: 'unknown',
  };
}

function parseCalendarCommand(
  lowerMessage: string,
  originalMessage: string
): ParsedCommand {
  // Future implementation
  return {
    type: 'calendar',
    action: 'unknown',
  };
}

/**
 * Extract contact name from message
 * Examples:
 * - "message from john" -> "john"
 * - "send to sarah" -> "sarah"
 * - "reply to mike" -> "mike"
 */
function extractContactName(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();

  // Patterns to extract contact names
  const patterns = [
    /(?:from|to|with)\s+([a-z]+(?:\s+[a-z]+)?)/i,
    /(?:contact|person)\s+([a-z]+(?:\s+[a-z]+)?)/i,
    /(?:friend|buddy)\s+([a-z]+(?:\s+[a-z]+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      // Filter out common words
      const name = match[1].trim();
      const commonWords = [
        'the',
        'a',
        'an',
        'your',
        'my',
        'his',
        'her',
        'their',
        'this',
        'that',
        'message',
        'text',
        'chat',
      ];
      if (!commonWords.includes(name.toLowerCase())) {
        return name;
      }
    }
  }

  // Try to find names after common phrases
  const afterPhrases = [
    'message from',
    'text from',
    'chat with',
    'send to',
    'reply to',
    'message to',
  ];

  for (const phrase of afterPhrases) {
    const index = lowerMessage.indexOf(phrase);
    if (index !== -1) {
      const after = message.substring(index + phrase.length).trim();
      const words = after.split(/\s+/);
      if (words.length > 0) {
        const potentialName = words[0];
        if (potentialName.length > 2 && /^[a-z]+$/i.test(potentialName)) {
          return potentialName;
        }
      }
    }
  }

  return undefined;
}

/**
 * Extract message to send from command
 * Examples:
 * - "send hello to john" -> "hello"
 * - "text sarah saying hi there" -> "hi there"
 * - "send a message to dawar" -> undefined (needs clarification)
 * - "send hello to dawar" -> "hello"
 */
function extractMessageToSend(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();

  // Filler phrases that indicate no actual message was provided
  const fillerPhrases = [
    /^send\s+(?:a|the|an)\s+message\s+to/i,
    /^text\s+(?:a|the|an)\s+message\s+to/i,
    /^send\s+(?:a|the|an)\s+text\s+to/i,
    /^message\s+(?:a|the|an)\s+message\s+to/i,
  ];

  // Check if it's just "send a message to X" without actual content
  for (const fillerPattern of fillerPhrases) {
    if (fillerPattern.test(message)) {
      // Check if there's actual message content after "to [name]"
      const afterTo = message.replace(fillerPattern, '').trim();
      const contactMatch = extractContactName(message);
      if (contactMatch) {
        const afterContact = lowerMessage.split(contactMatch.toLowerCase())[1]?.trim();
        // If nothing meaningful after contact name, return undefined
        if (!afterContact || afterContact.length < 3) {
          return undefined;
        }
      } else {
        return undefined;
      }
    }
  }

  // Look for explicit message indicators: "saying", "with", "that says", etc.
  const explicitPatterns = [
    /(?:saying|with|that says|which says|message is|text is)\s+(.+?)(?:\s+to\s+|\s+from\s+|$)/i,
    /(?:send|text)\s+(.+?)\s+(?:saying|with|that says)/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      let text = match[1].trim();
      // Remove quotes if present
      text = text.replace(/^["']|["']$/g, '');
      // Remove contact name if it's at the end
      text = text.replace(/\s+to\s+[a-z]+$/i, '');
      if (text.length > 0 && !isFillerPhrase(text)) {
        return text;
      }
    }
  }

  // Pattern: "send [message] to [contact]" - extract message between send and to
  const sendToPattern = /(?:send|text)\s+(.+?)\s+to\s+([a-z]+(?:\s+[a-z]+)?)/i;
  const sendToMatch = message.match(sendToPattern);
  if (sendToMatch && sendToMatch[1]) {
    let text = sendToMatch[1].trim();
    // Remove quotes
    text = text.replace(/^["']|["']$/g, '');
    // Skip if it's just filler words
    if (!isFillerPhrase(text) && text.length > 0) {
      return text;
    }
  }

  // Pattern: "send to [contact] [message]" - extract message after contact
  const sendToContactPattern = /(?:send|text)\s+to\s+([a-z]+(?:\s+[a-z]+)?)\s+(.+?)$/i;
  const sendToContactMatch = message.match(sendToContactPattern);
  if (sendToContactMatch && sendToContactMatch[2]) {
    let text = sendToContactMatch[2].trim();
    text = text.replace(/^["']|["']$/g, '');
    if (!isFillerPhrase(text) && text.length > 0) {
      return text;
    }
  }

  // If no pattern matches, try to extract after "send" or "text"
  const afterSend = lowerMessage.indexOf('send');
  const afterText = lowerMessage.indexOf('text');

  const indices = [afterSend, afterText].filter((i) => i !== -1);
  if (indices.length > 0) {
    const startIndex = Math.min(...indices);
    const after = message.substring(startIndex).trim();
    const words = after.split(/\s+/);

    // Skip action words and filler words
    const skipWords = ['send', 'text', 'message', 'to', 'with', 'saying', 'that', 'a', 'an', 'the'];
    let messageStart = -1;

    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase();
      if (!skipWords.includes(word) && word.length > 1) {
        messageStart = i;
        break;
      }
    }

    if (messageStart !== -1) {
      // Find where message ends (before "to", "from", etc.)
      let messageEnd = words.length;
      for (let i = messageStart; i < words.length; i++) {
        if (['to', 'from', 'contact', 'in', 'whatsapp'].includes(words[i].toLowerCase())) {
          messageEnd = i;
          break;
        }
      }

      const messageWords = words.slice(messageStart, messageEnd);
      if (messageWords.length > 0) {
        const extracted = messageWords.join(' ');
        // Don't return if it's just filler
        if (!isFillerPhrase(extracted)) {
          return extracted;
        }
      }
    }
  }

  return undefined;
}

/**
 * Check if a phrase is just filler (like "a message", "the message", etc.)
 */
function isFillerPhrase(text: string): boolean {
  const lowerText = text.toLowerCase().trim();
  const fillerPatterns = [
    /^(a|an|the)\s+message$/i,
    /^(a|an|the)\s+text$/i,
    /^(a|an|the)\s+chat$/i,
    /^message$/i,
    /^text$/i,
    /^chat$/i,
  ];
  
  return fillerPatterns.some(pattern => pattern.test(lowerText));
}

/**
 * Extract reply message
 * Examples:
 * - "reply with no" -> "no"
 * - "reply saying yes" -> "yes"
 */
function extractReplyMessage(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();

  // Patterns for reply messages
  const patterns = [
    /(?:reply|respond)\s+(?:with|saying)\s+(.+?)$/i,
    /(?:reply|respond)\s+(.+?)$/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      let text = match[1].trim();
      // Remove "to [name]" if present
      text = text.replace(/\s+to\s+[a-z]+$/i, '');
      // Remove quotes
      text = text.replace(/^["']|["']$/g, '');
      if (text.length > 0) {
        return text;
      }
    }
  }

  return undefined;
}
