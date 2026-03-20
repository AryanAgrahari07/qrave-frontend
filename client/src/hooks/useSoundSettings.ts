import { useState, useEffect } from "react";

const SOUND_PREFERENCE_KEY = "qrave_notification_sound_enabled";

export function useSoundSettings() {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SOUND_PREFERENCE_KEY);
    if (saved !== null) {
      setSoundEnabled(saved === "true");
    }
  }, []);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_PREFERENCE_KEY, String(next));
      return next;
    });
  };

  const playNotificationSound = () => {
    if (!soundEnabled) return;
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error("Failed to play sound snippet:", e);
    }
  };

  return {
    soundEnabled,
    toggleSound,
    playNotificationSound
  };
}
