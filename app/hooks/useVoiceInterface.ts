'use client';

import { useState, useEffect, useRef } from 'react';

export function useVoiceInterface(
  onTranscript: (text: string) => void,
  onStatusChange: (status: 'idle' | 'listening' | 'processing' | 'speaking') => void,
  selectedVoiceName?: string
) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const isStartingRef = useRef(false);
  const startTimeRef = useRef<number>(0); // Track when recognition started
  const ignoreEndRef = useRef(false); // Flag to ignore premature ends

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
        console.log('[Recognition] Started successfully!');
        startTimeRef.current = Date.now();
        ignoreEndRef.current = false; // Reset ignore flag
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
        console.log('[Recognition] Error:', event.error, '| Details:', event);
        
        // Don't reset on these errors - they're expected
        if (event.error === 'aborted') {
          // Recognition was stopped intentionally
          console.log('[Recognition] Aborted (intentional)');
          isStartingRef.current = false;
          // Don't reset state - let onend handle it
          return;
        }
        
        if (event.error === 'no-speech') {
          // No speech detected - this is normal, keep listening
          console.log('[Recognition] No speech detected - this is normal, continuing...');
          // Don't reset anything - recognition will continue or end naturally
          isStartingRef.current = false;
          return;
        }
        
        if (event.error === 'network') {
          // Network error - might be temporary
          console.log('[Recognition] Network error');
          isStartingRef.current = false;
          return;
        }
        
        // For other errors, only reset if it's not starting
        console.log('[Recognition] Error occurred:', event.error);
        isStartingRef.current = false;
        
        // Only reset to idle after a delay, not immediately
        setTimeout(() => {
          if (!isStartingRef.current && !isListening) {
            setIsListening(false);
            onStatusChange('idle');
          }
        }, 300);
      };

      recognitionRef.current.onend = () => {
        const timeElapsed = Date.now() - startTimeRef.current;
        console.log('[Recognition] Ended', '| Time elapsed:', timeElapsed, 'ms', '| isStarting:', isStartingRef.current, '| isListening:', isListening);
        
        // Ignore ends that happen too quickly (less than 500ms) - these are likely false starts
        if (timeElapsed < 500 && !ignoreEndRef.current) {
          console.log('[Recognition] End ignored - too quick (<500ms), likely false start on mobile');
          ignoreEndRef.current = true;
          // Try to restart immediately
          setTimeout(() => {
            if (recognitionRef.current && !isStartingRef.current) {
              try {
                console.log('[Recognition] Retrying after quick end...');
                isStartingRef.current = true;
                recognitionRef.current.start();
              } catch (e: any) {
                isStartingRef.current = false;
                console.log('[Recognition] Retry failed:', e);
              }
            }
          }, 100);
          return;
        }
        
        const wasListening = isListening;
        setIsListening(false);
        isStartingRef.current = false;
        
        // Only change to idle after a delay, and only if we were actually listening
        setTimeout(() => {
          if (!isStartingRef.current && !isListening && wasListening && timeElapsed >= 500) {
            console.log('[Recognition] Actually ended, going to idle');
            onStatusChange('idle');
          } else {
            console.log('[Recognition] End ignored - might be restarting');
          }
        }, 500);
      };
    }

    // Text-to-Speech
    synthesisRef.current = window.speechSynthesis;

    // Function to find and select a voice
    const selectVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log('[Voice] Available voices:', voices.length);
      
      // If a specific voice name is provided, use it
      if (selectedVoiceName) {
        const voice = voices.find(v => v.name === selectedVoiceName);
        if (voice && voice.lang.startsWith('en-US')) {
          selectedVoiceRef.current = voice;
          console.log('[Voice] Selected user-chosen voice:', voice.name, voice.lang);
          return;
        }
      }
      
      // Preferred high-quality natural voices (both male and female) - natural, clear, amazing
      const preferredNames = [
        // macOS - Premium natural voices
        'Samantha',           // Female - sweet, natural, clear, amazing
        'Allison',            // Female - young, cheerful, natural, clear
        'Victoria',           // Female - gentle, warm, natural, clear
        'Alex',              // Male - natural, clear, professional, amazing
        'Karen',             // Female - soft, natural, clear
        'Daniel',            // Male - British accent, natural, clear
        'Tom',               // Male - natural, clear
        'Fiona',             // Female - Scottish accent, natural
        'Moira',             // Female - Irish accent, natural
        'Tessa',             // Female - South African accent, natural
        'Veena',             // Female - Indian accent, natural
        // Chrome - Natural voices
        'Google US English Female',  // Female - natural, pleasant, clear
        'Google US English Male',    // Male - natural, clear, professional
        // Windows - Natural voices
        'Microsoft Aria',   // Female - natural, clear, amazing
        'Microsoft Zira',  // Female - clear, natural
        'Microsoft David',  // Male - natural, clear, amazing
        'Microsoft Mark',   // Male - natural, clear
        'Microsoft Jenny', // Female - natural, clear
        'Microsoft Guy',    // Male - natural, clear
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
      
      // Fallback: find any high-quality natural en-US voice (male or female)
      const naturalVoice = voices.find(v => {
        const isEnUS = v.lang.startsWith('en-US');
        const isHighQuality = v.name.toLowerCase().includes('female') || 
                             v.name.toLowerCase().includes('male') ||
                             v.name.toLowerCase().includes('samantha') ||
                             v.name.toLowerCase().includes('allison') ||
                             v.name.toLowerCase().includes('alex') ||
                             v.name.toLowerCase().includes('aria') ||
                             v.name.toLowerCase().includes('david') ||
                             v.name.toLowerCase().includes('victoria') ||
                             v.name.toLowerCase().includes('karen') ||
                             v.name.toLowerCase().includes('zira') ||
                             v.name.toLowerCase().includes('mark') ||
                             v.name.toLowerCase().includes('jenny') ||
                             v.name.toLowerCase().includes('guy') ||
                             v.name.toLowerCase().includes('daniel') ||
                             v.name.toLowerCase().includes('tom');
        return isEnUS && isHighQuality;
      });
      
      if (naturalVoice) {
        selectedVoiceRef.current = naturalVoice;
        console.log('[Voice] Selected natural voice:', naturalVoice.name, naturalVoice.lang);
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
    const voiceChangeHandler = () => {
      selectVoice();
    };
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = voiceChangeHandler;
    }
    
    // Try to select voice immediately (might work on some browsers)
    selectVoice();
    
    // Also try after a short delay (voices might load asynchronously)
    setTimeout(selectVoice, 500);
    
    // Also try after a longer delay to catch late-loading voices
    setTimeout(selectVoice, 1500);

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, [onTranscript, onStatusChange, selectedVoiceName]);

  const startListening = () => {
    if (!recognitionRef.current) {
      console.log('[Voice] Recognition not available');
      return;
    }
    
    console.log('[Voice] Starting listening...', 'isListening:', isListening, 'isStarting:', isStartingRef.current);
    
    // Stop any existing recognition first, but only if it's actually running
    if (isListening) {
      try {
        console.log('[Voice] Stopping existing recognition...');
        recognitionRef.current.stop();
        // Wait a bit for it to fully stop
        setTimeout(() => {
          actuallyStartListening();
        }, 100);
        return;
      } catch (e) {
        console.log('[Voice] Error stopping recognition:', e);
      }
    }
    
    // If not already listening, start immediately
    actuallyStartListening();
  };

  const actuallyStartListening = () => {
    if (!recognitionRef.current || isStartingRef.current) {
      return;
    }

    // For mobile, start immediately (no delay) to maintain user gesture context
    // For desktop, small delay is okay
    const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
    const delay = isMobile ? 0 : 100; // Zero delay on mobile!
    
    setTimeout(() => {
      if (recognitionRef.current && !isStartingRef.current) {
        try {
          isStartingRef.current = true;
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = false;
          console.log('[Voice] Actually starting recognition now... (delay:', delay, 'ms)');
          recognitionRef.current.start();
          console.log('[Voice] Recognition.start() called successfully');
        } catch (err: any) {
          isStartingRef.current = false;
          console.error('[Voice] Error starting recognition:', err, err.message);
          
          // If already started, that's okay - it means it's running
          if (err.message?.includes('already started') || err.message?.includes('started')) {
            console.log('[Voice] Recognition already started - that\'s okay!');
            isStartingRef.current = false; // Don't block future starts
          }
        }
      } else {
        console.log('[Voice] Cannot start - recognition not available or already starting');
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
    
    // Get available voices (always get fresh list)
    const voices = window.speechSynthesis.getVoices();
    
    // Always try to use the selected voice name if provided
    if (selectedVoiceName) {
      const voice = voices.find(v => v.name === selectedVoiceName);
      if (voice && voice.lang.startsWith('en-US')) {
        utterance.voice = voice;
        selectedVoiceRef.current = voice;
        console.log('[Voice] Using user-selected voice:', voice.name, voice.lang);
      } else {
        console.log('[Voice] Selected voice not found:', selectedVoiceName, '- trying fallback');
        // Fallback to selectedVoiceRef if user selection not found
        if (selectedVoiceRef.current) {
          utterance.voice = selectedVoiceRef.current;
          console.log('[Voice] Using cached voice:', selectedVoiceRef.current.name);
        } else {
          // Last resort: find any en-US voice
          const enUSVoice = voices.find(v => v.lang.startsWith('en-US'));
          if (enUSVoice) {
            utterance.voice = enUSVoice;
            selectedVoiceRef.current = enUSVoice;
            console.log('[Voice] Using fallback voice:', enUSVoice.name);
          }
        }
      }
    } else if (selectedVoiceRef.current) {
      // Use the cached voice if no specific selection
      utterance.voice = selectedVoiceRef.current;
      console.log('[Voice] Using cached voice (auto-selected):', selectedVoiceRef.current.name);
    } else {
      // Fallback: try to select voice again
      // Look for high-quality natural voices (male or female)
      const naturalVoice = voices.find(v => 
        v.lang.startsWith('en-US') && 
        (v.name.toLowerCase().includes('female') || 
         v.name.toLowerCase().includes('male') ||
         v.name.toLowerCase().includes('samantha') ||
         v.name.toLowerCase().includes('allison') ||
         v.name.toLowerCase().includes('alex') ||
         v.name.toLowerCase().includes('aria') ||
         v.name.toLowerCase().includes('david') ||
         v.name.toLowerCase().includes('karen') ||
         v.name.toLowerCase().includes('victoria') ||
         v.name.toLowerCase().includes('mark') ||
         v.name.toLowerCase().includes('jenny') ||
         v.name.toLowerCase().includes('guy'))
      );
      if (naturalVoice) {
        utterance.voice = naturalVoice;
        selectedVoiceRef.current = naturalVoice;
        console.log('[Voice] Using auto-selected natural voice:', naturalVoice.name);
      } else {
        // Last resort: any en-US voice
        const enUSVoice = voices.find(v => v.lang.startsWith('en-US'));
        if (enUSVoice) {
          utterance.voice = enUSVoice;
          selectedVoiceRef.current = enUSVoice;
          console.log('[Voice] Using fallback voice:', enUSVoice.name);
        }
      }
      utterance.lang = 'en-US';
    }
    
    // Optimized settings for cute, beautiful, sweet voice
    utterance.rate = 0.9;       // Slower for gentle, cute delivery
    utterance.pitch = 1.15;     // Higher pitch for cute, sweet sound
    utterance.volume = 0.85;    // Soft, gentle volume

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

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      // Extract error information
      const errorType = event.error || 'unknown';
      const errorMessage = event.type || 'Speech synthesis error';
      
      // Only log actual errors (not warnings or empty events)
      if (errorType !== 'interrupted' && errorType !== 'canceled') {
        // Check if event has meaningful information
        if (event.error || event.type) {
          console.warn('[Speech Synthesis] Error:', errorMessage, 'Type:', errorType);
        }
        // If event is empty or just {}, don't log it as an error
        // This often happens with browser quirks and isn't a real problem
      }
      
      onStatusChange('idle');
    };

    synthesisRef.current.speak(utterance);
  };

  // Expose a function to manually update voice selection
  const updateVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    if (selectedVoiceName) {
      const voice = voices.find(v => v.name === selectedVoiceName);
      if (voice && voice.lang.startsWith('en-US')) {
        selectedVoiceRef.current = voice;
        console.log('[Voice] Manually updated to:', voice.name);
        return true;
      }
    }
    return false;
  };

  // Update voice when selectedVoiceName changes (in addition to useEffect)
  useEffect(() => {
    if (selectedVoiceName) {
      // Try to update voice immediately
      updateVoice();
      // Also try after a delay in case voices are still loading
      const timeout = setTimeout(updateVoice, 500);
      return () => clearTimeout(timeout);
    }
  }, [selectedVoiceName]);

  return {
    startListening,
    stopListening,
    speak,
    isSupported,
    isListening,
    error,
    updateVoice,
  };
}
