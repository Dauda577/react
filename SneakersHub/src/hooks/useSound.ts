import { useCallback, useRef } from "react";

// All sounds as base64 data URIs — no network requests, no file loading delays
// These are tiny synthetic sounds generated via Web Audio API

type SoundType = "save" | "unsave" | "cart" | "success" | "error" | "pop";

const playTone = (
  type: SoundType,
  volume = 0.3
): void => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);

    switch (type) {
      case "save":
        // Heart pop — two ascending tones
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        oscillator.frequency.setValueAtTime(900, ctx.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
        oscillator.type = "sine";
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.25);
        break;

      case "unsave":
        // Descending tone
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        oscillator.frequency.setValueAtTime(400, ctx.currentTime + 0.15);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
        oscillator.type = "sine";
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;

      case "cart":
        // Short satisfying pop
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        oscillator.type = "sine";
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
        break;

      case "success":
        // Three ascending tones — like a completion chime
        oscillator.frequency.setValueAtTime(523, ctx.currentTime);        // C
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);  // E
        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);  // G
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
        oscillator.type = "sine";
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
        break;

      case "error":
        // Low descending buzz
        oscillator.frequency.setValueAtTime(300, ctx.currentTime);
        oscillator.frequency.setValueAtTime(200, ctx.currentTime + 0.15);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
        oscillator.type = "sawtooth";
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;

      case "pop":
        // Generic soft pop for UI interactions
        oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
        oscillator.type = "sine";
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.08);
        break;
    }

    // Clean up context after sound finishes
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Silent fail — sound is non-critical
  }
};

export const useSound = () => {
  const lastPlayed = useRef<Record<string, number>>({});

  const play = useCallback((type: SoundType, volume?: number) => {
    // Debounce — don't play same sound more than once per 100ms
    const now = Date.now();
    if (lastPlayed.current[type] && now - lastPlayed.current[type] < 100) return;
    lastPlayed.current[type] = now;
    playTone(type, volume);
  }, []);

  return { play };
};