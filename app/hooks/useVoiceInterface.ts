'use client';

import { useState, useEffect, useRef } from 'react';

export function useVoiceInterface(
  onTranscript: (text: string) => void,
  onStatusChange: (status: 'idle' | 'listening' | 'processing' | 'speaking') => void
) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const isStartingRef = useRef(false);

  useEffect(() => {
    // Check for Speech Recognition support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Single utterance mode (click to talk)
      recognitionRef.current.interimResults = false; // Only final results
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
        isStartingRef.current = false;
        onStatusChange('listening');
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          }
        }

        // Process the transcript
        const cleanedText = finalTranscript.trim();
        if (cleanedText) {
          console.log('[Voice] Transcript:', cleanedText);
          onTranscript(cleanedText);
          onStatusChange('processing');
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        setError(event.error);
        isStartingRef.current = false;
        console.log('[Recognition] Error:', event.error, '| Details:', event);
        
        // Don't reset on these errors - they're expected
        if (event.error === 'aborted') {
          // Recognition was stopped intentionally
          console.log('[Recognition] Aborted (intentional)');
          return;
        }
        
        if (event.error === 'no-speech') {
          // No speech detected - might be on mobile, keep listening for a bit
          console.log('[Recognition] No speech detected');
          // Don't immediately reset - let it time out naturally
          return;
        }
        
        // For other errors, reset
        console.log('[Recognition] Error occurred, resetting:', event.error);
        setIsListening(false);
        onStatusChange('idle');
      };

      recognitionRef.current.onend = () => {
        console.log('[Recognition] Ended', '| isStarting:', isStartingRef.current, '| isListening:', isListening);
        setIsListening(false);
        isStartingRef.current = false;
        
        // Only change to idle if we're not in the process of starting again
        // This prevents flickering on mobile
        setTimeout(() => {
          if (!isStartingRef.current && !isListening) {
            onStatusChange('idle');
          }
        }, 100);
      };
    }

    // Text-to-Speech
    synthesisRef.current = window.speechSynthesis;

    // Function to find and select a beautiful female American voice
    const selectFemaleVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log('[Voice] Available voices:', voices.length);
      
      // Preferred female voices (in order of preference)
      const preferredNames = [
        'Samantha',           // macOS - very natural
        'Karen',              // macOS - clear and pleasant
        'Victoria',           // macOS - warm
        'Google US English Female',  // Chrome - good quality
        'Microsoft Zira - English (United States)',  // Windows Edge
        'Microsoft Zira',    // Windows
        'en-US-Female',       // Generic
        'en_US-female',       // Generic
      ];
      
      // First, try to find a preferred voice by name
      for (const preferredName of preferredNames) {
        const voice = voices.find(v => 
          v.name.includes(preferredName) || 
          v.name.toLowerCase().includes(preferredName.toLowerCase())
        );
        if (voice && voice.lang.startsWith('en-US')) {
          selectedVoiceRef.current = voice;
          console.log('[Voice] Selected preferred voice:', voice.name, voice.lang);
          return;
        }
      }
      
      // Fallback: find any female en-US voice
      const femaleVoice = voices.find(v => {
        const isEnUS = v.lang.startsWith('en-US');
        const isFemale = v.name.toLowerCase().includes('female') || 
                        v.name.toLowerCase().includes('samantha') ||
                        v.name.toLowerCase().includes('karen') ||
                        v.name.toLowerCase().includes('victoria') ||
                        v.name.toLowerCase().includes('zira') ||
                        v.name.toLowerCase().includes('susan') ||
                        v.name.toLowerCase().includes('linda');
        return isEnUS && isFemale;
      });
      
      if (femaleVoice) {
        selectedVoiceRef.current = femaleVoice;
        console.log('[Voice] Selected female voice:', femaleVoice.name, femaleVoice.lang);
        return;
      }
      
      // Last resort: any en-US voice
      const enUSVoice = voices.find(v => v.lang.startsWith('en-US'));
      if (enUSVoice) {
        selectedVoiceRef.current = enUSVoice;
        console.log('[Voice] Selected fallback voice:', enUSVoice.name, enUSVoice.lang);
      } else {
        console.log('[Voice] No suitable voice found, using default');
      }
    };

    // Load voices (they might not be available immediately)
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = selectFemaleVoice;
    }
    
    // Try to select voice immediately (might work on some browsers)
    selectFemaleVoice();
    
    // Also try after a short delay (voices might load asynchronously)
    setTimeout(selectFemaleVoice, 500);

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, [onTranscript, onStatusChange]);

  const startListening = () => {
    if (!recognitionRef.current) {
      console.log('[Voice] Recognition not available');
      return;
    }
    
    console.log('[Voice] Starting listening...', 'isListening:', isListening, 'isStarting:', isStartingRef.current);
    
    // Stop any existing recognition first
    if (isListening || isStartingRef.current) {
      try {
        console.log('[Voice] Stopping existing recognition...');
        recognitionRef.current.stop();
        // Wait a bit before starting new recognition on desktop
        // But on mobile, start immediately after stopping
      } catch (e) {
        console.log('[Voice] Error stopping recognition:', e);
      }
    }
    
    // For mobile, start immediately (no delay) to maintain user gesture context
    // For desktop, small delay is okay
    const delay = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 50 : 300;
    
    setTimeout(() => {
      if (recognitionRef.current && !isStartingRef.current) {
        try {
          isStartingRef.current = true;
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = false;
          console.log('[Voice] Starting recognition now...');
          recognitionRef.current.start();
        } catch (err: any) {
          isStartingRef.current = false;
          console.error('[Voice] Error starting recognition:', err);
          // For mobile, if "already started" error, wait and try again
          if (err.message?.includes('already started') || err.message?.includes('started')) {
            console.log('[Voice] Recognition already started, will try to stop and restart...');
            setTimeout(() => {
              try {
                recognitionRef.current?.stop();
                setTimeout(() => {
                  if (recognitionRef.current && !isStartingRef.current) {
                    try {
                      isStartingRef.current = true;
                      recognitionRef.current.start();
                    } catch (e2: any) {
                      isStartingRef.current = false;
                      console.error('[Voice] Retry failed:', e2);
                    }
                  }
                }, 100);
              } catch (e) {
                console.error('[Voice] Error stopping for retry:', e);
              }
            }, 200);
          }
        }
      }
    }, delay);
  };


  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
        isStartingRef.current = false;
        onStatusChange('idle');
      } catch (e) {
        // Ignore errors
      }
    }
  };

  const speak = (text: string, onEnd?: () => void) => {
    if (!synthesisRef.current) return;

    // Cancel any ongoing speech
    synthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Use the selected female voice if available
    if (selectedVoiceRef.current) {
      utterance.voice = selectedVoiceRef.current;
      console.log('[Voice] Using voice:', selectedVoiceRef.current.name);
    } else {
      // Fallback: try to select voice again
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => 
        v.lang.startsWith('en-US') && 
        (v.name.toLowerCase().includes('female') || 
         v.name.toLowerCase().includes('samantha') ||
         v.name.toLowerCase().includes('karen'))
      );
      if (femaleVoice) {
        utterance.voice = femaleVoice;
        selectedVoiceRef.current = femaleVoice;
      }
      utterance.lang = 'en-US';
    }
    
    // Optimized settings for natural, beautiful female voice
    utterance.rate = 0.95;      // Slightly slower for clarity
    utterance.pitch = 1.1;      // Slightly higher pitch (more feminine)
    utterance.volume = 0.9;     // Clear volume

    utterance.onstart = () => {
      onStatusChange('speaking');
      // Pause listening while speaking
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors
        }
      }
    };

    utterance.onend = () => {
      onStatusChange('idle');
      if (onEnd) onEnd();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      onStatusChange('idle');
    };

    synthesisRef.current.speak(utterance);
  };

  return {
    startListening,
    stopListening,
    speak,
    isSupported,
    isListening,
    error,
  };
}
