import { useRef } from 'react';

// Simple oscillator beep
// Frequency: 800Hz (High pitch tick)
// Duration: 50ms
// Type: sine
export function useSoundEffect() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playClick = () => {
    try {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, ctx.currentTime); // Crisp click
        oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);

        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.05);
    } catch (e) {
        // Audio playback failed (likely browser policy or no support)
    }
  };

  return { playClick };
}
