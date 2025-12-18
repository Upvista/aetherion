import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL;

    // If external service URL is configured, use it
    if (whatsappServiceUrl) {
      try {
        const response = await fetch(`${whatsappServiceUrl}/qr`, {
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
      const qrCode = service.getQRCode();

      if (!qrCode) {
        // Try to initialize if not already done
        await service.initialize();
        const newQrCode = service.getQRCode();
        
        if (!newQrCode) {
          return NextResponse.json(
            { error: 'QR code not available. WhatsApp may already be connected.' },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          qrCode: newQrCode,
          connected: false,
        });
      }

      return NextResponse.json({
        qrCode,
        connected: false,
      });
    } catch (localError) {
      return NextResponse.json(
        { error: 'WhatsApp service requires a separate server for production.' },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error('WhatsApp QR code error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get QR code' },
      { status: 500 }
    );
  }
}
