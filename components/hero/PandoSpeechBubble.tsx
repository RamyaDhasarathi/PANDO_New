"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AudioLines, Check, Sparkles } from "lucide-react";
import type {
  ConversationPhase,
  PandoAction,
  PandoMessage,
  VoiceState,
} from "@/hooks/usePandoConversation";

function ThinkingDots() {
  return (
    <span className="ml-1 inline-flex translate-y-[-2px] gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-coral"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

const STATUS: Partial<Record<ConversationPhase, string>> = {
  understanding: "Understanding",
  searching: "Searching",
  listening: "Listening",
  recommendations: "Your matches",
};

export default function PandoSpeechBubble({
  message,
  phase,
  voice,
  authForm,
  onAction,
}: {
  message: PandoMessage;
  phase: ConversationPhase;
  /** Drives the voice orb: a status light, not a control (Pando himself is the mic). */
  voice: VoiceState;
  /** Optional Pando-driven contextual auth form */
  authForm?: React.ReactNode;
  onAction: (action: PandoAction) => void;
}) {
  const reduce = useReducedMotion();
  // The sign-in form rides inside the bubble: it needs the full layout, not the intro's compact one.
  const intro = message.kind === "intro" && !authForm;
  const status = STATUS[phase];
  const listening = phase === "listening";
  // Area answers carry more to read: a wider bubble and slightly smaller type keep them compact.
  const roomy = message.kind === "advice" || Boolean(message.note) || Boolean(authForm);
  const long = message.text.length > 120;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.85, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 16, delay: 0.55 }}
      style={{ transformOrigin: "12% 100%" }}
      className={`relative w-full ${roomy ? "lg:-mr-[calc(var(--k)*40)] lg:w-[calc(var(--k)*390)]" : intro ? "lg:w-[calc(var(--k)*290)]" : "lg:w-[calc(var(--k)*320)]"}`}
    >
      <motion.div
        layout={!reduce}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className={`relative rounded-bubble border border-white/80 bg-[linear-gradient(160deg,rgb(255_255_255/0.86),rgb(255_244_242/0.7))] pl-7.5 pr-11 lg:pr-7 ${intro ? "pb-5 pt-5" : "pb-4 pt-4"} shadow-[0_calc(var(--k)*16)_calc(var(--k)*36)_calc(var(--k)*-18)_rgb(120_40_50/0.28),inset_0_1px_0_#fff] backdrop-blur-xl`}
        aria-live="polite"
      >
        {/* Tail */}
        <svg
          aria-hidden
          viewBox="0 0 40 30"
          className="absolute -bottom-[calc(var(--k)*20)] left-[calc(var(--k)*22)] h-[calc(var(--k)*24)] w-[calc(var(--k)*34)]"
        >
          <path d="M4 0 C 8 12, 6 22, 2 30 C 16 24, 26 14, 34 0 Z" fill="rgb(255 246 244 / 0.92)" />
        </svg>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={message.kind + message.text}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {intro ? (
              <p className="text-20 font-semibold leading-tight tracking-[-0.01em] text-ink">
                Hi, I&apos;m <span className="font-extrabold text-price">Pando</span>.
              </p>
            ) : (
              <p className="flex items-center gap-2 text-11 font-bold uppercase tracking-[0.14em] text-brown/80">
                {phase === "recommendations" ? (
                  <Check className="size-3.5 text-brown" strokeWidth={3} />
                ) : (
                  <Sparkles className="size-3.5 text-coral" />
                )}
                Pando{message.label ? ` · ${message.label}` : status ? ` · ${status}` : ""}
              </p>
            )}

            <p
              className={
                intro
                  ? "mt-1.5 text-15 leading-[1.45] text-[#3d2531]"
                  : `mt-1.5 ${long ? "text-13" : "text-14"} leading-[1.42] text-[#3d2531]`
              }
            >
              {message.text}
              {(phase === "searching" || phase === "understanding" || listening) && <ThinkingDots />}
            </p>
            {message.note && (
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mt-1.5 border-t border-brown/10 pt-1.5 text-13 font-medium leading-snug text-brown"
              >
                {message.note}
              </motion.p>
            )}

            {authForm && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                {authForm}
              </motion.div>
            )}

            {message.options && message.options.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {message.options.map((o, i) => (
                  <motion.button
                    key={o.label}
                    type="button"
                    onClick={() => onAction(o.action)}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.05 }}
                    whileHover={reduce ? undefined : { y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    className={
                      o.primary
                        ? "btn-coral h-7.5 cursor-pointer rounded-pill px-3.5 text-12 font-semibold text-white"
                        : "h-7.5 cursor-pointer rounded-pill border border-brown/25 bg-white/80 px-3.5 text-12 font-semibold text-plum transition-colors hover:border-coral/60 hover:bg-white"
                    }
                  >
                    {o.label}
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Voice orb: mint while listening, pulsing while Pando speaks, dimmed when muted */}
      <motion.span
        aria-hidden
        className={`pointer-events-none absolute right-[calc(var(--k)*-24)] top-[calc(var(--k)*62)] grid size-[calc(var(--k)*48)] place-items-center rounded-full border border-white/70 text-white shadow-[0_calc(var(--k)*12)_calc(var(--k)*24)_calc(var(--k)*-8)_rgb(180_40_60/0.55)] transition-opacity duration-300 ${voice === "muted" ? "opacity-50 grayscale-[0.4]" : ""}`}
        style={{
          background: listening
            ? "radial-gradient(circle at 35% 30%, #d5ffe0, #b5ffc2 45%, #6fcf8a)"
            : "radial-gradient(circle at 35% 30%, #f7c3cb, #e87d8f 50%, #c8566c)",
        }}
        animate={
          reduce
            ? { scale: 1 }
            : listening
              ? { scale: [1, 1.1, 1] }
              : voice === "speaking"
                ? { scale: [1, 1.06, 0.98, 1.05, 1] }
                : { scale: 1 }
        }
        transition={listening || voice === "speaking" ? { duration: listening ? 1.1 : 0.8, repeat: Infinity } : undefined}
      >
        <AudioLines className={listening ? "size-[calc(var(--k)*22)] text-brown" : "size-[calc(var(--k)*22)]"} />
      </motion.span>
    </motion.div>
  );
}
