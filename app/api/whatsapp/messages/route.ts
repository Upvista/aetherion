import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactName = searchParams.get('contact');
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL;

    // If external service URL is configured, use it
    if (whatsappServiceUrl) {
      try {
        const params = new URLSearchParams();
        if (contactName) params.append('contact', contactName);
        if (unreadOnly) params.append('unread', 'true');
        params.append('limit', limit.toString());

        const response = await fetch(`${whatsappServiceUrl}/messages?${params.toString()}`, {
          method: 'GET',
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

      let messages;

      if (unreadOnly) {
        messages = await service.getUnreadMessages();
      } else if (contactName) {
        messages = await service.getMessagesFromContact(contactName, limit);
      } else {
        messages = await service.getRecentMessages(undefined, limit);
      }

      return NextResponse.json({
        success: true,
        messages,
        count: messages.length,
      });
    } catch (localError: any) {
      return NextResponse.json(
        { error: localError.message || 'Failed to get messages' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('WhatsApp get messages error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get messages' },
      { status: 500 }
    );
  }
}
