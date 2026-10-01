import { useState, useRef, useCallback, useEffect } from "react";
import { AudioRecorder } from "../lib/live-api/AudioRecorder";
import { AudioStreamer } from "../lib/live-api/AudioStreamer";
import { LiveAPIClient } from "../lib/live-api/LiveClient";
import { properties } from "../data/properties";

export function useLiveVoice({
  onToolCall,
}: {
  onToolCall: (call: any) => Promise<any>;
}) {
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const clientRef = useRef<LiveAPIClient | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const silenceTimerRef = useRef<number | null>(null);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = window.setTimeout(() => {
      // User has been silent for 15 seconds
      if (clientRef.current) {
        clientRef.current.sendTextMessage(
          "[SYSTEM]: The user has been silent. Check in with them warmly and ask if they need help exploring the properties on the map. Keep it very brief."
        );
      }
    }, 15000);
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startVoice = useCallback(async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY || "";
      if (!apiKey) {
        console.warn("Missing Gemini API Key for Live Voice");
        return;
      }

      streamerRef.current = new AudioStreamer();
      recorderRef.current = new AudioRecorder();
      
      const compactInventory = JSON.stringify(
        properties.map(p => ({ id: p.id, name: p.name, location: p.location }))
      );

      clientRef.current = new LiveAPIClient({
        apiKey,
        systemInstruction: `You are Pando, a warm and professional AI real-estate guide for Dubai.
Use the provided tools to interact with the map and UI.
CRITICAL: If the user names a specific property (e.g., "Parkway Vistas Villa", "Parkway", "Burj Vista"), you MUST match the name to the ID in this catalog:
${compactInventory}
Do not ask "which one?" if they provided any part of the name. Just call the relevant tool (describeProperty or openProperty) with the correct propertyId.
When collecting sign-in details, call collectAuthDetails as you learn each of the name, email and phone, and set isComplete only once you believe you have all three.
You do NOT decide whether the details are valid: the collectAuthDetails tool checks them and verifies them with the server.
If its response has accepted: false, the user is NOT signed in — read the "error" message back to them, ask them to repeat only that one detail, and call collectAuthDetails again. Never say they are signed in or that you are opening the property unless the response has accepted: true.`,
        onAudioData: (base64Pcm) => {
          setIsSpeaking(true);
          clearSilenceTimer();
          streamerRef.current?.playPcm(base64Pcm);
        },
        onToolCall,
        onSetupComplete: () => {
          setIsActive(true);
          resetSilenceTimer();
        },
        onTurnComplete: () => {
          setIsSpeaking(false);
          resetSilenceTimer();
        }
      });

      recorderRef.current.onData = (base64Pcm) => {
        clientRef.current?.sendAudioChunk(base64Pcm);
        
        // Very basic activity detection to reset timer could go here
        // For now we rely on the timer resetting after Pando finishes speaking.

        // If the user speaks, interrupt the agent
        if (isSpeaking) {
          streamerRef.current?.stopAndClear();
          setIsSpeaking(false);
          clearSilenceTimer();
        }
      };

      await recorderRef.current.start();
      clientRef.current.connect();
    } catch (e) {
      console.error("Failed to start voice", e);
    }
  }, [onToolCall, isSpeaking]);

  const stopVoice = useCallback(() => {
    clearSilenceTimer();
    recorderRef.current?.stop();
    streamerRef.current?.stopAndClear();
    clientRef.current?.disconnect();
    setIsActive(false);
    setIsSpeaking(false);
  }, [clearSilenceTimer]);

  const toggleVoice = useCallback(() => {
    if (isActive) {
      stopVoice();
    } else {
      startVoice();
    }
  }, [isActive, startVoice, stopVoice]);

  useEffect(() => {
    return () => {
      stopVoice();
    };
  }, [stopVoice]);

  return {
    isActive,
    isSpeaking,
    toggleVoice,
  };
}
