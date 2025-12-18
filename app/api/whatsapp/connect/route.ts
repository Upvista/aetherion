import { NextRequest, NextResponse } from 'next/server';

// Note: WhatsApp Web.js requires a persistent Node.js environment
// For Vercel deployment, use a separate service (Railway, Render, etc.)
// Set WHATSAPP_SERVICE_URL environment variable to point to your WhatsApp service

export async function POST(request: NextRequest) {
  try {
    const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL;

    // If external service URL is configured, use it
    if (whatsappServiceUrl) {
      const response = await fetch(`${whatsappServiceUrl}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('WhatsApp service unavailable');
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // Local development: try to use local service
    try {
      const { getWhatsAppService } = await import('../../../../lib/whatsapp-service');
      const service = getWhatsAppService();
      
      console.log('[WhatsApp Connect] Initializing local service...');
      
      // If service is not connected, try to reset first (in case of logout)
      if (!service.isConnected()) {
        console.log('[WhatsApp Connect] Not connected, attempting to initialize...');
      }
      
      const result = await service.initialize();
      
      console.log('[WhatsApp Connect] Result:', { 
        ready: result.ready, 
        hasQrCode: !!result.qrCode 
      });

      // If no QR code and not ready, wait a bit more and check status
      if (!result.qrCode && !result.ready) {
        console.log('[WhatsApp Connect] No QR code yet, waiting a bit more...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check status again
        const qrCode = service.getQRCode();
        const isReady = service.isConnected();
        
        if (qrCode || isReady) {
          return NextResponse.json({
            success: true,
            ready: isReady,
            qrCode: qrCode || null,
            message: isReady
              ? 'WhatsApp is already connected'
              : 'Scan the QR code with WhatsApp to connect',
          });
        }
      }

      return NextResponse.json({
        success: true,
        ready: result.ready,
        qrCode: result.qrCode || null,
        message: result.ready
          ? 'WhatsApp is already connected'
          : result.qrCode
          ? 'Scan the QR code with WhatsApp to connect'
          : 'Initializing WhatsApp connection... Please wait, QR code will appear shortly.',
      });
    } catch (localError: any) {
      console.error('[WhatsApp Connect] Local service error:', localError);
      
      // If local service fails (e.g., in Vercel), return helpful message
      const errorMessage = localError.message || 'WhatsApp service initialization failed';
      
      return NextResponse.json({
        error: `WhatsApp service requires a separate server. ${errorMessage}. For production, deploy the WhatsApp service separately and set WHATSAPP_SERVICE_URL environment variable.`,
        requiresExternalService: true,
        details: process.env.NODE_ENV === 'production' 
          ? 'This is a production environment. WhatsApp Web.js cannot run on Vercel serverless functions.'
          : errorMessage,
      }, { status: 503 });
    }
  } catch (error: any) {
    console.error('WhatsApp connect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect WhatsApp' },
      { status: 500 }
    );
  }
}
