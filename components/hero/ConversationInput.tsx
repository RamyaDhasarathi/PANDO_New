"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LoaderCircle, Mic, Navigation } from "lucide-react";
import type { RefObject } from "react";
import type { ConversationPhase } from "@/hooks/usePandoConversation";

function Waveform() {
  return (
    <span className="flex h-6 items-center gap-[3px]" aria-hidden>
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-coral/70"
          animate={{ height: ["20%", `${40 + ((i * 37) % 60)}%`, "20%"] }}
          transition={{ duration: 0.6 + (i % 5) * 0.12, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

export default function ConversationInput({
  value,
  onChange,
  onSubmit,
  onMic,
  phase,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  onMic: () => void;
  phase: ConversationPhase;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const reduce = useReducedMotion();
  const listening = phase === "listening";
  const busy = phase === "understanding" || phase === "searching";

  return (
    <motion.form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
      initial={reduce ? false : { opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 90, damping: 16, delay: 0.4 }}
      className="rounded-pill border border-white/70 bg-white/25 p-1.5 shadow-[0_calc(var(--k)*18)_calc(var(--k)*40)_calc(var(--k)*-22)_rgb(130_40_40/0.35),inset_0_1px_0_#fff] backdrop-blur-md"
    >
      <div
        className={`flex h-15 items-center gap-2.5 rounded-pill bg-white/90 pl-2 pr-2 shadow-[inset_0_calc(var(--k)*-2)_calc(var(--k)*8)_rgb(200_150_150/0.18)] transition-shadow duration-300 focus-within:shadow-[0_0_0_2px_rgb(255_51_25/0.35)] max-md:h-16 ${
          listening ? "shadow-[0_0_0_2px_#b5ffc2]" : ""
        }`}
      >
        <motion.button
          type="button"
          onClick={onMic}
          aria-pressed={listening}
          aria-label={listening ? "Stop listening" : "Speak to Pando"}
          whileHover={reduce ? undefined : { scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          className={`relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full transition-colors max-md:size-11 ${
            listening ? "bg-mint text-ink" : "bg-[#f7e1de] text-price hover:bg-[#f4d3ce]"
          }`}
        >
          {listening && !reduce && (
            <motion.span
              className="absolute inset-0 rounded-full bg-mint"
              animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
              transition={{ duration: 1.3, repeat: Infinity }}
            />
          )}
          <Mic className="relative size-5" strokeWidth={1.8} />
        </motion.button>

        <div className="relative flex min-w-0 flex-1 items-center">
          <label htmlFor="pando-query" className="sr-only">
            Tell Pando what you&apos;re looking for
          </label>
          <input
            ref={inputRef}
            id="pando-query"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={listening ? "Listening…" : "Tell Pando what you're looking for..."}
            autoComplete="off"
            className="w-full min-w-0 bg-transparent px-2.5 text-15 text-ink outline-none placeholder:text-transparent max-md:text-15"
          />
          {!value && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-2.5 line-clamp-2 text-15 leading-tight text-[#7d6671] max-md:text-14"
            >
              {listening ? "Listening…" : "Tell Pando what you're looking for..."}
            </span>
          )}
          <AnimatePresence>
            {listening && !value && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute right-3"
              >
                <Waveform />
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          type="submit"
          aria-label="Send to Pando"
          disabled={busy}
          whileHover={reduce || busy ? undefined : { scale: 1.07, rotate: -6 }}
          whileTap={{ scale: 0.9 }}
          className="btn-coral grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-white disabled:cursor-wait max-md:size-11"
        >
          {busy ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : (
            <Navigation className="size-5 rotate-[20deg] fill-white/10" strokeWidth={2.2} />
          )}
        </motion.button>
      </div>
    </motion.form>
  );
}
