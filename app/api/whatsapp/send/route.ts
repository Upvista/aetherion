import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contact, message, replyTo } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL;

    // If external service URL is configured, use it
    if (whatsappServiceUrl) {
      try {
        const response = await fetch(`${whatsappServiceUrl}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contact, message, replyTo }),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch (fetchError) {
        return NextResponse.json(
          { error: 'WhatsApp service unavailable' },
          { status: 503 }
        );
      }
    }

    // Local development: try to use local service
    try {
      const { getWhatsAppService } = await import('../../../../lib/whatsapp-service');
      const service = getWhatsAppService();

      if (!service.isConnected()) {
        return NextResponse.json(
          { error: 'WhatsApp not connected. Please connect first.' },
          { status: 400 }
        );
      }

      let success = false;

      if (replyTo) {
        // Reply to a specific message
        success = await service.replyToMessage(replyTo, message);
      } else if (contact) {
        // Send to a contact
        success = await service.sendMessage(contact, message);
      } else {
        return NextResponse.json(
          { error: 'Either contact or replyTo is required' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success,
        message: success
          ? `Message sent${contact ? ` to ${contact}` : ''}`
          : 'Failed to send message',
      });
    } catch (localError: any) {
      return NextResponse.json(
        { error: localError.message || 'Failed to send message' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('WhatsApp send message error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
