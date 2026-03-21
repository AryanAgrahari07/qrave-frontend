import { useState, useEffect, useCallback } from "react";

const SOUND_PREFERENCE_KEY = "qrave_notification_sound_enabled";

let sharedAudioContext: any = null;

export function useSoundSettings() {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SOUND_PREFERENCE_KEY);
    if (saved !== null) {
      setSoundEnabled(saved === "true");
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_PREFERENCE_KEY, String(next));
      return next;
    });
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      if (!sharedAudioContext) {
        sharedAudioContext = new AudioContextClass();
      }
      
      const ctx = sharedAudioContext;
      
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const t = ctx.currentTime;

      // --- Fundamental bell tone (830 Hz) ---
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.value = 830;
      gain1.gain.setValueAtTime(0, t);
      gain1.gain.linearRampToValueAtTime(0.4, t + 0.005);   // sharp attack
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.6); // smooth decay
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.6);

      // --- Harmonic overtone (1660 Hz, softer) ---
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = 1660;
      gain2.gain.setValueAtTime(0, t);
      gain2.gain.linearRampToValueAtTime(0.15, t + 0.003);  // very short attack
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.35); // faster decay
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t);
      osc2.stop(t + 0.35);
    } catch (e) {
      console.error("Failed to play sound snippet:", e);
    }
  }, [soundEnabled]);

  return {
    soundEnabled,
    toggleSound,
    playNotificationSound
  };
}
