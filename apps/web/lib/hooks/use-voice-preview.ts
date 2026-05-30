"use client";

import { useRef, useState } from "react";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

export function useVoicePreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  async function playPreview(voiceId: string, text?: string) {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/voice-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: voiceId, text }),
      });

      if (!response.ok) throw new Error("Preview failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      await audio.play();
      setPlaying(true);
      trackEvent(AnalyticsEvents.VOICE_PREVIEW, { voice_id: voiceId });
    } catch {
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }

  return { playPreview, playing, loading };
}
