"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Keyboard, Mic, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import type { VoiceState } from "@/hooks/usePandoConversation";

const EASE = [0.22, 1, 0.36, 1] as const;

const CAPTION: Record<VoiceState, string> = {
  idle: "Ready",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  muted: "Muted",
};

/** Tiny animated glyph for each state: mic, live dot, thinking dots, voice bars, keyboard. */
function Glyph({ state, reduce }: { state: VoiceState; reduce: boolean }) {
  const loop = (duration: number, delay = 0) =>
    reduce ? undefined : { duration, delay, repeat: Infinity, ease: "easeInOut" as const };

  switch (state) {
    case "listening":
      return (
        <span className="relative grid size-4 place-items-center">
          <motion.span
            className="absolute inset-0 rounded-full bg-mint"
            animate={reduce ? undefined : { scale: [1, 1.9], opacity: [0.7, 0] }}
            transition={loop(1.2)}
          />
          <span className="size-2.5 rounded-full bg-[#3fbf5c]" />
        </span>
      );
    case "thinking":
      return (
        <span className="flex h-4 items-center gap-[3px]">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-coral"
              animate={reduce ? undefined : { y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
              transition={loop(0.9, i * 0.15)}
            />
          ))}
        </span>
      );
    case "speaking":
      return (
        <span className="flex h-4 items-center gap-[2px]">
          {[0.5, 1, 0.7, 0.9].map((h, i) => (
            <motion.span
              key={i}
              className="w-[3px] origin-center rounded-full bg-coral"
              style={{ height: "100%" }}
              animate={reduce ? { scaleY: h } : { scaleY: [0.3, h, 0.45, 1, 0.3] }}
              transition={loop(0.9 + i * 0.12, i * 0.08)}
            />
          ))}
        </span>
      );
    case "muted":
      return <Keyboard className="size-4 text-ink-soft" />;
    default:
      return <Mic className="size-4 text-brown" />;
  }
}

/**
 * Active states show at once; resting ones (idle, muted) wait a beat, so the short gap
 * between "Got it…" and the results line doesn't flash "Ready".
 */
function useSettled(state: VoiceState) {
  const [shown, setShown] = useState(state);
  useEffect(() => {
    const resting = state === "idle" || state === "muted";
    const t = window.setTimeout(() => setShown(state), resting ? 450 : 0);
    return () => window.clearTimeout(t);
  }, [state]);
  return shown;
}

/**
 * Live voice state beside Pando: what he's doing, what he's hearing, and a mute toggle.
 * Unmuted, tapping Pando starts a spoken turn; muted, the conversation is typed.
 */
export default function VoiceDock({
  state: liveState,
  transcript,
  heard,
  muted,
  canType = true,
  onToggleMute,
}: {
  state: VoiceState;
  /** Words recognised so far while listening. */
  transcript: string;
  /** The last request, echoed while Pando thinks. */
  heard: string;
  muted: boolean;
  /** False on the property detail, where there's no text input. */
  canType?: boolean;
  onToggleMute: () => void;
}) {
  const reduce = Boolean(useReducedMotion());
  const state = useSettled(liveState);

  const line =
    state === "listening"
      ? transcript || "Go ahead, I'm all ears…"
      : state === "thinking"
        ? heard
          ? `“${heard}”`
          : "Working on it…"
        : state === "speaking"
          ? "Pando is answering"
          : state === "muted"
            ? canType
              ? "Type to Pando below"
              : "Unmute to talk to Pando"
            : canType
              ? "Tap Pando to talk"
              : "Tap Pando, say “go back”";

  return (
    <div className="flex items-center gap-2">
      <motion.div
        layout={!reduce}
        transition={{ layout: { duration: 0.35, ease: EASE } }}
        data-voice-state={state}
        className={`glass flex min-h-11 max-w-[calc(var(--k)*250)] items-center gap-2.5 rounded-pill py-1.5 pl-3 pr-4 max-lg:max-w-[260px] ${
          state === "listening" ? "shadow-[0_0_0_2px_#b5ffc2]" : ""
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={state}
            className="grid shrink-0 place-items-center"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <Glyph state={state} reduce={reduce} />
          </motion.span>
        </AnimatePresence>

        <span className="min-w-0">
          <span role="status" className="block text-10 font-bold uppercase leading-none tracking-[0.16em] text-brown">
            {CAPTION[state]}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              // Re-key per state, not per word, so the live transcript streams without flicker.
              key={state}
              className="mt-1 block truncate text-13 font-medium leading-tight text-ink"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: EASE }}
            >
              {line}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.div>

      <motion.button
        type="button"
        onClick={onToggleMute}
        aria-pressed={muted}
        aria-label={muted ? "Unmute Pando" : "Mute Pando"}
        title={muted ? "Unmute Pando" : "Mute Pando"}
        whileTap={reduce ? undefined : { scale: 0.88 }}
        className={`grid size-11 shrink-0 cursor-pointer place-items-center rounded-full transition-colors ${
          muted ? "bg-ink/80 text-white hover:bg-ink" : "glass text-brown hover:text-coral"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={String(muted)}
            initial={reduce ? { opacity: 0 } : { opacity: 0, rotate: -30, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, rotate: 30, scale: 0.6 }}
            transition={{ duration: 0.18 }}
            className="grid place-items-center"
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
