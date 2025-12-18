'use client';

import { useEffect, useState } from 'react';
import WhatsAppQRModal from './WhatsAppQRModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFace: number;
  onFaceChange: (faceNumber: number) => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  selectedVoice: string;
  onVoiceChange: (voiceName: string) => void;
}

export default function SettingsModal({ isOpen, onClose, selectedFace, onFaceChange, theme, onThemeChange, selectedVoice, onVoiceChange }: SettingsModalProps) {
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isWhatsAppQROpen, setIsWhatsAppQROpen] = useState(false);
  const [whatsAppConnected, setWhatsAppConnected] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Load available voices when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Filter to only English US voices
        const enUSVoices = voices.filter(v => v.lang.startsWith('en-US'));
        
        // Prioritize high-quality, natural voices (both male and female)
        const highQualityVoices = [
          // macOS - Premium natural voices
          'Samantha',           // Female - sweet, natural, clear
          'Allison',            // Female - young, cheerful, natural
          'Victoria',           // Female - gentle, warm, natural
          'Karen',             // Female - soft, natural
          'Alex',              // Male - natural, clear, professional
          'Daniel',            // Male - British accent, natural
          'Tom',              // Male - natural, clear
          'Fiona',            // Female - Scottish accent, natural
          'Moira',            // Female - Irish accent, natural
          'Tessa',            // Female - South African accent, natural
          'Veena',            // Female - Indian accent, natural
          'Google US English Female',  // Chrome - natural, pleasant
          'Google US English Male',    // Chrome - natural, clear
          'Microsoft Aria',   // Windows - natural, female
          'Microsoft Zira',   // Windows - clear, female
          'Microsoft David',  // Windows - natural, male
          'Microsoft Mark',   // Windows - natural, male
          'Microsoft Jenny',  // Windows - natural, female
          'Microsoft Guy',    // Windows - natural, male
        ];
        
        // Sort voices: high-quality first, then others
        const sortedVoices = enUSVoices.sort((a, b) => {
          const aIndex = highQualityVoices.findIndex(name => 
            a.name.includes(name) || a.name.toLowerCase().includes(name.toLowerCase())
          );
          const bIndex = highQualityVoices.findIndex(name => 
            b.name.includes(name) || b.name.toLowerCase().includes(name.toLowerCase())
          );
          
          // High-quality voices first
          if (aIndex !== -1 && bIndex === -1) return -1;
          if (aIndex === -1 && bIndex !== -1) return 1;
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          
          // Then prioritize default voices
          if (a.default && !b.default) return -1;
          if (!a.default && b.default) return 1;
          
          // Finally, sort alphabetically
          return a.name.localeCompare(b.name);
        });
        
        setAvailableVoices(sortedVoices);
      };

      loadVoices();
      
      // Voices might load asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
      
      // Try again after a delay
      setTimeout(loadVoices, 500);
    }
  }, [isOpen]);

  // Check WhatsApp connection status
  useEffect(() => {
    if (isOpen) {
      // Check immediately when modal opens
      checkWhatsAppStatus();
      // Then check every 2 seconds for real-time updates
      const interval = setInterval(checkWhatsAppStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status');
      const data = await response.json();
      const isConnected = data.connected === true;
      setWhatsAppConnected(isConnected);
      
      // If connected, close QR modal if it's open
      if (isConnected && isWhatsAppQROpen) {
        setIsWhatsAppQROpen(false);
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      setWhatsAppConnected(false);
    }
  };

  const handleWhatsAppConnect = () => {
    setIsWhatsAppQROpen(true);
    // Check status immediately when opening QR modal
    checkWhatsAppStatus();
  };

  const handleWhatsAppConnected = () => {
    // Update status immediately when connection is confirmed
    setWhatsAppConnected(true);
    setIsWhatsAppQROpen(false);
    // Also trigger a status check to ensure it's synced
    setTimeout(() => {
      checkWhatsAppStatus();
    }, 500);
  };

  // Also check status when QR modal closes (in case user scanned QR and closed modal)
  useEffect(() => {
    if (!isWhatsAppQROpen && isOpen) {
      // When QR modal closes, check status immediately
      checkWhatsAppStatus();
    }
  }, [isWhatsAppQROpen, isOpen]);

  if (!isOpen) return null;

  const faces = [
    { number: 1, name: 'Classic', description: 'Round eyes with dual reflections' },
    { number: 2, name: 'Soft', description: 'Oval eyes with crescent reflections' },
    { number: 3, name: 'Digital', description: 'Square cyan glowing eyes' },
  ];

  return (
    <div 
      className="settings-modal-overlay"
      onClick={onClose}
    >
      <div 
        className="settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-modal-header">
          <h2>Companion Settings</h2>
          <button className="settings-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          <div className="settings-section">
            <h3>Change Companion</h3>
            <div className="face-selection">
              {faces.map((face) => (
                <div
                  key={face.number}
                  className={`face-option ${selectedFace === face.number ? 'selected' : ''}`}
                  onClick={() => {
                    onFaceChange(face.number);
                    onClose();
                  }}
                >
                  <div className="face-preview">
                    <div className={`face-preview-face face-${face.number}`}>
                      <div className="face-preview-eye"></div>
                      <div className="face-preview-eye"></div>
                      <div className="face-preview-mouth"></div>
                    </div>
                  </div>
                  <div className="face-info">
                    <div className="face-name">{face.name}</div>
                    <div className="face-description">{face.description}</div>
                  </div>
                  {selectedFace === face.number && (
                    <div className="face-checkmark">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <h3>Theme</h3>
            <div className="theme-toggle-container">
              <button
                className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => onThemeChange('light')}
              >
                <span className="theme-icon">☀️</span>
                <span className="theme-label">Light</span>
              </button>
              <button
                className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => onThemeChange('dark')}
              >
                <span className="theme-icon">🌙</span>
                <span className="theme-label">Dark</span>
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h3>Voice</h3>
            <select
              className="voice-select"
              value={selectedVoice || ''}
              onChange={(e) => {
                console.log('[Settings] Voice changed to:', e.target.value);
                onVoiceChange(e.target.value);
              }}
            >
              <option value="">Default (Auto-select best voice)</option>
              {availableVoices.map((voice) => {
                // Determine gender for display
                const isFemale = voice.name.toLowerCase().includes('female') ||
                                voice.name.toLowerCase().includes('samantha') ||
                                voice.name.toLowerCase().includes('allison') ||
                                voice.name.toLowerCase().includes('victoria') ||
                                voice.name.toLowerCase().includes('karen') ||
                                voice.name.toLowerCase().includes('aria') ||
                                voice.name.toLowerCase().includes('zira') ||
                                voice.name.toLowerCase().includes('jenny') ||
                                voice.name.toLowerCase().includes('fiona') ||
                                voice.name.toLowerCase().includes('moira') ||
                                voice.name.toLowerCase().includes('tessa') ||
                                voice.name.toLowerCase().includes('veena');
                
                const isMale = voice.name.toLowerCase().includes('male') ||
                              voice.name.toLowerCase().includes('alex') ||
                              voice.name.toLowerCase().includes('david') ||
                              voice.name.toLowerCase().includes('mark') ||
                              voice.name.toLowerCase().includes('guy') ||
                              voice.name.toLowerCase().includes('daniel') ||
                              voice.name.toLowerCase().includes('tom');
                
                const genderLabel = isFemale ? ' (Female)' : isMale ? ' (Male)' : '';
                const defaultLabel = voice.default ? ' ⭐' : '';
                
                return (
                  <option key={voice.name} value={voice.name}>
                    {voice.name}{genderLabel}{defaultLabel}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="settings-section">
            <h3>Connected Apps</h3>
            <div className="connected-apps-list">
              <div className="connected-app-item">
                <div className="app-info">
                  <div className="app-icon">💬</div>
                  <div className="app-details">
                    <div className="app-name">WhatsApp</div>
                    <div className="app-status">
                      {whatsAppConnected ? (
                        <span className="app-status-connected">✓ Connected</span>
                      ) : (
                        <span className="app-status-disconnected">Not connected</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  className="app-connect-btn"
                  onClick={handleWhatsAppConnect}
                >
                  {whatsAppConnected ? 'Manage' : 'Connect'}
                </button>
              </div>

              <div className="connected-app-item">
                <div className="app-info">
                  <div className="app-icon">🤖</div>
                  <div className="app-details">
                    <div className="app-name">Vista AI</div>
                    <div className="app-status">
                      <span className="app-status-connected">✓ Always Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <WhatsAppQRModal
        isOpen={isWhatsAppQROpen}
        onClose={() => setIsWhatsAppQROpen(false)}
        onConnected={handleWhatsAppConnected}
      />
    </div>
  );
}
