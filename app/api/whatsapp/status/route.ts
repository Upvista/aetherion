import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL;

    // If external service URL is configured, use it
    if (whatsappServiceUrl) {
      try {
        const response = await fetch(`${whatsappServiceUrl}/status`, {
          method: 'GET',
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch (fetchError) {
        // Service unavailable
        return NextResponse.json({
          connected: false,
          qrCode: null,
          serviceUnavailable: true,
        });
      }
    }

    // Local development: try to use local service
    try {
      const { getWhatsAppService } = await import('../../../../lib/whatsapp-service');
      const service = getWhatsAppService();
      
      // Check connection status with error handling
      let isConnected = false;
      let qrCode = null;
      
      try {
        isConnected = service.isConnected();
        qrCode = service.getQRCode();
      } catch (statusError: any) {
        console.error('[WhatsApp Status] Error checking status:', statusError);
        // If status check fails, assume not connected
        isConnected = false;
        qrCode = null;
      }

      console.log('[WhatsApp Status] Local service:', { 
        isConnected, 
        hasQrCode: !!qrCode 
      });

      return NextResponse.json({
        connected: isConnected,
        qrCode: qrCode || null,
      });
    } catch (localError: any) {
      console.error('[WhatsApp Status] Local service error:', localError);
      
      // Local service not available (e.g., in Vercel)
      return NextResponse.json({
        connected: false,
        qrCode: null,
        requiresExternalService: true,
        error: process.env.NODE_ENV === 'production'
          ? 'WhatsApp service cannot run on Vercel. Please set WHATSAPP_SERVICE_URL.'
          : localError.message || 'Local WhatsApp service unavailable',
      });
    }
  } catch (error: any) {
    console.error('WhatsApp status error:', error);
    return NextResponse.json(
      { 
        connected: false,
        qrCode: null,
        error: error.message || 'Failed to get WhatsApp status' 
      },
      { status: 500 }
    );
  }
}
