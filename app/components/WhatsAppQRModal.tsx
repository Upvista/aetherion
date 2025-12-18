'use client';

import { useEffect, useState } from 'react';

interface WhatsAppQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export default function WhatsAppQRModal({ isOpen, onClose, onConnected }: WhatsAppQRModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      connectWhatsApp();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const connectWhatsApp = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      // Initialize WhatsApp connection
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to connect`);
      }

      const data = await response.json();

      // Check for errors in response
      if (data.error) {
        throw new Error(data.error);
      }

      // If already ready, mark as connected
      if (data.ready === true) {
        setIsConnected(true);
        setIsConnecting(false);
        if (onConnected) onConnected();
        return;
      }

      // If QR code is provided, generate image
      if (data.qrCode) {
        try {
          const QRCode = (await import('qrcode')).default;
          const qrImage = await QRCode.toDataURL(data.qrCode, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });
          setQrCode(qrImage);
          setIsConnecting(false);
        } catch (qrError) {
          console.error('QR code generation error:', qrError);
          throw new Error('Failed to generate QR code image');
        }
      } else {
        // No QR code yet, but no error - might be initializing
        // The status check will pick it up
        console.log('No QR code yet, will check status...');
        setIsConnecting(false);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect WhatsApp';
      setError(errorMessage);
      setIsConnecting(false);
      console.error('WhatsApp connection error:', err);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status');
      
      if (!response.ok) {
        console.error('Status check failed:', response.status);
        return;
      }

      const data = await response.json();
      
      // Check if connected (explicitly check for true)
      if (data.connected === true) {
        setIsConnected(true);
        setQrCode(null);
        setError(null);
        setIsConnecting(false);
        // Call onConnected callback to update parent component
        if (onConnected) {
          onConnected();
        }
        return;
      }

      // Check for QR code
      if (data.qrCode && !qrCode && !isConnected) {
        try {
          // Generate QR code image
          const QRCode = (await import('qrcode')).default;
          const qrImage = await QRCode.toDataURL(data.qrCode, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });
          setQrCode(qrImage);
          setIsConnecting(false);
          setError(null);
        } catch (qrError) {
          console.error('QR code generation error in status check:', qrError);
        }
      }

      // Check for service errors
      if (data.requiresExternalService || data.serviceUnavailable) {
        if (!error) {
          setError('WhatsApp service requires a separate server. Please set up the WhatsApp service and configure WHATSAPP_SERVICE_URL.');
        }
        setIsConnecting(false);
      }
    } catch (err) {
      console.error('Status check error:', err);
      // Don't set error here, as it might be a temporary network issue
    }
  };

  // Poll for connection status more frequently when QR is shown
  useEffect(() => {
    if (isOpen && !isConnected) {
      // Check immediately
      checkStatus();
      // Then check every 1.5 seconds for faster response
      const interval = setInterval(checkStatus, 1500);
      return () => clearInterval(interval);
    }
  }, [isOpen, isConnected]);

  if (!isOpen) return null;

  return (
    <div 
      className="whatsapp-qr-overlay"
      onClick={onClose}
    >
      <div 
        className="whatsapp-qr-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="whatsapp-qr-header">
          <h2>Connect WhatsApp</h2>
          <button className="whatsapp-qr-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="whatsapp-qr-content">
          {isConnected ? (
            <div className="whatsapp-qr-success">
              <div className="success-icon">✓</div>
              <h3>Connected!</h3>
              <p>WhatsApp is now connected. You can use voice commands to check messages, send replies, and more.</p>
              <button className="whatsapp-qr-btn" onClick={onClose}>Done</button>
            </div>
          ) : error ? (
            <div className="whatsapp-qr-error">
              <div className="error-icon">⚠</div>
              <h3>Connection Error</h3>
              <p>{error}</p>
              <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                {error.includes('separate server') 
                  ? 'For production, you need to deploy a separate WhatsApp service. See VERCEL-WHATSAPP-SETUP.md for instructions.'
                  : 'Check the browser console for more details.'}
              </p>
              <button className="whatsapp-qr-btn" onClick={connectWhatsApp}>Retry</button>
            </div>
          ) : qrCode ? (
            <div className="whatsapp-qr-code-container">
              <p className="whatsapp-qr-instructions">
                Scan this QR code with WhatsApp to connect:
              </p>
              <ol className="whatsapp-qr-steps">
                <li>Open WhatsApp on your phone</li>
                <li>Go to Settings → Linked Devices</li>
                <li>Tap "Link a Device"</li>
                <li>Scan this QR code</li>
              </ol>
              <div className="whatsapp-qr-image-container">
                <img src={qrCode} alt="WhatsApp QR Code" className="whatsapp-qr-image" />
              </div>
              <p className="whatsapp-qr-waiting">Waiting for connection...</p>
            </div>
          ) : (
            <div className="whatsapp-qr-loading">
              <div className="loading-spinner"></div>
              <p>Initializing WhatsApp connection...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
