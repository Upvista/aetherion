'use client';

import { useEffect, useRef, useState } from 'react';

interface RobotFaceProps {
  emotion: 'neutral' | 'happy' | 'sad' | 'surprised' | 'excited' | 'sleepy' | 'angry' | 'confused' | 'love' | 'wink' | 'listening' | 'thinking' | 'talking' | 'smiling' | 'looking-left' | 'looking-right';
  isActive?: boolean;
  onFaceClick?: () => void;
  autoAnimate?: boolean;
}

const AUTO_EMOTIONS: Array<'happy' | 'sad' | 'surprised' | 'excited' | 'sleepy' | 'confused' | 'love' | 'wink' | 'smiling'> = [
  'happy', 'sad', 'surprised', 'excited', 'sleepy', 'confused', 'love', 'wink', 'smiling'
];

export default function RobotFace({ emotion, isActive = false, onFaceClick, autoAnimate = false }: RobotFaceProps) {
  const leftEyeRef = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [currentAutoEmotion, setCurrentAutoEmotion] = useState<string | null>(null);
  const [lookDirection, setLookDirection] = useState<'center' | 'left' | 'right'>('center');

  // Eye tracking and random looking around - allow during listening/thinking/talking too
  useEffect(() => {
    if (!containerRef.current || !isActive || !autoAnimate) return;
    
    // Don't do random eye movements during active emotion animations
    if (currentAutoEmotion !== null && 
        emotion !== 'neutral' && 
        emotion !== 'listening' && 
        emotion !== 'thinking' && 
        emotion !== 'talking') {
      return;
    }
    
    // Random eye movement (looking around)
    const lookInterval = setInterval(() => {
      // Don't interrupt if user is actively tracking mouse/touch
      if (lookDirection !== 'center') return;
      
      const directions: Array<'left' | 'right' | 'center'> = ['left', 'right', 'center'];
      const randomDir = directions[Math.floor(Math.random() * directions.length)];
      setLookDirection(randomDir);
      
      // Return to center after a moment
      setTimeout(() => {
        setLookDirection('center');
      }, 1500 + Math.random() * 1000);
    }, 3000 + Math.random() * 3000); // Look around every 3-6 seconds

    return () => clearInterval(lookInterval);
  }, [emotion, isActive, autoAnimate, currentAutoEmotion, lookDirection]);

  // Mouse/touch tracking - allow during listening/thinking/talking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !isActive) return;
      
      // Allow tracking during neutral, listening, thinking, talking states
      const allowTracking = emotion === 'neutral' || 
                           emotion === 'listening' || 
                           emotion === 'thinking' || 
                           emotion === 'talking';
      
      if (!allowTracking || currentAutoEmotion) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = (e.clientX - centerX) * 0.15;
      const deltaY = (e.clientY - centerY) * 0.15;
      
      const maxMove = 8;
      setEyePosition({
        x: Math.max(-maxMove, Math.min(maxMove, deltaX)),
        y: Math.max(-maxMove, Math.min(maxMove, deltaY)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current || !isActive || e.touches.length === 0) return;
      
      // Allow tracking during neutral, listening, thinking, talking states
      const allowTracking = emotion === 'neutral' || 
                           emotion === 'listening' || 
                           emotion === 'thinking' || 
                           emotion === 'talking';
      
      if (!allowTracking || currentAutoEmotion) return;
      
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = (touch.clientX - centerX) * 0.15;
      const deltaY = (touch.clientY - centerY) * 0.15;
      
      const maxMove = 8;
      setEyePosition({
        x: Math.max(-maxMove, Math.min(maxMove, deltaX)),
        y: Math.max(-maxMove, Math.min(maxMove, deltaY)),
      });
    };

    const allowTracking = (emotion === 'neutral' || 
                          emotion === 'listening' || 
                          emotion === 'thinking' || 
                          emotion === 'talking') && 
                          isActive && 
                          lookDirection === 'center' &&
                          !currentAutoEmotion;
    
    if (allowTracking) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleTouchMove);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
      };
    } else {
      // When looking left/right, override mouse tracking
      if (lookDirection === 'left') {
        setEyePosition({ x: -10, y: 0 });
      } else if (lookDirection === 'right') {
        setEyePosition({ x: 10, y: 0 });
      } else if (!currentAutoEmotion && emotion !== 'listening' && emotion !== 'thinking' && emotion !== 'talking') {
        setEyePosition({ x: 0, y: 0 });
      }
    }
  }, [emotion, isActive, lookDirection, currentAutoEmotion]);

  // Auto blinking - should work in all states except during actual emotion animations
  useEffect(() => {
    if (!isActive || !autoAnimate) return;
    
    // Don't blink during emotion animations, but allow blinking during listening/thinking/talking
    const shouldSkipBlink = currentAutoEmotion !== null && 
                           emotion !== 'listening' && 
                           emotion !== 'thinking' && 
                           emotion !== 'talking';
    
    if (shouldSkipBlink) return;

    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, [emotion, isActive, autoAnimate, currentAutoEmotion]);

  // Auto emotion animation
  useEffect(() => {
    if (!autoAnimate || !isActive) return;
    
    // Don't auto-animate if user is interacting (listening, thinking, talking)
    if (emotion === 'listening' || emotion === 'thinking' || emotion === 'talking') {
      return;
    }

    const autoEmotionInterval = setInterval(() => {
      // Only show auto emotions when in neutral state
      if (emotion === 'neutral') {
        const randomEmotion = AUTO_EMOTIONS[Math.floor(Math.random() * AUTO_EMOTIONS.length)];
        setCurrentAutoEmotion(randomEmotion);
        
        // Show emotion for 2-3 seconds
        setTimeout(() => {
          setCurrentAutoEmotion(null);
        }, 2000 + Math.random() * 1000);
      }
    }, 4000 + Math.random() * 3000); // Random interval between 4-7 seconds

    return () => clearInterval(autoEmotionInterval);
  }, [emotion, isActive, autoAnimate]);

  // Get emotion class - prioritize user emotion over auto emotion
  const getEmotionClass = () => {
    if (!isActive) return '';
    
    // User emotions take priority
    if (emotion === 'listening' || emotion === 'thinking' || emotion === 'talking') {
      switch (emotion) {
        case 'listening':
          return 'listening';
        case 'thinking':
          return 'thinking';
        case 'talking':
          return 'talking';
        default:
          return '';
      }
    }
    
    // Show auto emotion if active
    if (currentAutoEmotion) {
      return currentAutoEmotion;
    }
    
    // Otherwise show user emotion
    switch (emotion) {
      case 'happy':
        return 'happy';
      case 'sad':
        return 'sad';
      case 'surprised':
        return 'surprised';
      case 'excited':
        return 'excited';
      case 'sleepy':
        return 'sleepy';
      case 'angry':
        return 'angry';
      case 'confused':
        return 'confused';
      case 'love':
        return 'love';
      case 'wink':
        return 'wink';
      case 'smiling':
        return 'smiling';
      default:
        return '';
    }
  };

  const getEyeColor = () => {
    if (emotion === 'angry' || currentAutoEmotion === 'angry') return '#ff0000';
    if (emotion === 'love' || currentAutoEmotion === 'love') return '#ff0080';
    if (emotion === 'sleepy' || currentAutoEmotion === 'sleepy') return '#88ccff';
    return '#00ffff';
  };

  const shouldShowEyeAnimation = () => {
    // Show animation for auto emotions or user emotions (except listening/thinking/talking)
    if (currentAutoEmotion) return true;
    if (emotion === 'listening' || emotion === 'thinking' || emotion === 'talking') return false;
    return emotion !== 'neutral';
  };

  // Calculate eye transform based on look direction or mouse position
  const getEyeTransform = () => {
    if (!isActive) return undefined;
    
    // Don't apply transform during emotion animations (except listening/thinking/talking)
    if (currentAutoEmotion && 
        emotion !== 'listening' && 
        emotion !== 'thinking' && 
        emotion !== 'talking') {
      return undefined;
    }
    
    // Allow eye movement during neutral, listening, thinking, talking
    const allowMovement = emotion === 'neutral' || 
                         emotion === 'listening' || 
                         emotion === 'thinking' || 
                         emotion === 'talking';
    
    if (!allowMovement) return undefined;
    
    if (lookDirection === 'left') {
      return 'translate(-10px, 0px)';
    } else if (lookDirection === 'right') {
      return 'translate(10px, 0px)';
    } else if (lookDirection === 'center') {
      return `translate(${eyePosition.x}px, ${eyePosition.y}px)`;
    }
    
    return `translate(${eyePosition.x}px, ${eyePosition.y}px)`;
  };

  return (
    <div className="robot-container">
      <div 
        className={`robot-face ${getEmotionClass()}`} 
        ref={containerRef}
        onClick={onFaceClick}
        style={{ cursor: onFaceClick ? 'pointer' : 'default' }}
      >
        <div className="eyes-container">
          <div 
            className={`eye ${emotion === 'wink' || currentAutoEmotion === 'wink' ? 'wink' : ''} ${isBlinking ? 'blinking' : ''} ${shouldShowEyeAnimation() ? getEmotionClass() : ''}`}
            ref={leftEyeRef}
            style={{
              background: getEyeColor(),
              transform: getEyeTransform(),
            }}
          />
          <div 
            className={`eye ${isBlinking ? 'blinking' : ''} ${shouldShowEyeAnimation() ? getEmotionClass() : ''}`}
            ref={rightEyeRef}
            style={{
              background: getEyeColor(),
              transform: getEyeTransform(),
            }}
          />
        </div>
      </div>
    </div>
  );
}
