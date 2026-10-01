"use client";

import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import type { ConversationPhase } from "@/hooks/usePandoConversation";
import { useParallax } from "./Parallax";

const FLOAT_DURATION = 5.2;

export default function PandoMascot({
  phase,
  speaking = false,
  onActivate,
}: {
  phase: ConversationPhase;
  speaking?: boolean;
  onActivate: () => void;
}) {
  const reduce = useReducedMotion();
  const ctx = useParallax();
  const zero = useMotionValue(0);
  const px = ctx?.px ?? zero;
  const py = ctx?.py ?? zero;
  const on = Boolean(ctx?.enabled);

  // Pando leans gently toward the cursor but never loses its pose.
  const x = useTransform(px, (v) => (on ? v * 16 : 0));
  const y = useTransform(py, (v) => (on ? v * 8 : 0));
  const rotateY = useTransform(px, (v) => (on ? v * 9 : 0));
  const rotateX = useTransform(py, (v) => (on ? v * -5 : 0));
  const shadowX = useTransform(px, (v) => (on ? v * -10 : 0));

  const thinking = phase === "understanding" || phase === "searching";
  // Speaking: a light, quicker bob, like nodding along to his own words.
  const float = reduce
    ? undefined
    : thinking
      ? { y: [0, -16, 0], rotate: [-2, 2, -2] }
      : speaking
        ? { y: [0, -7, 0], scale: [1, 1.012, 1], rotate: [-0.8, 0.8, -0.8] }
        : { y: [0, -10, 0], rotate: [-1.2, 1.2, -1.2] };
  const floatTransition = {
    duration: thinking ? 1.6 : speaking ? 0.9 : FLOAT_DURATION,
    repeat: Infinity,
    ease: "easeInOut" as const,
  };

  return (
    <>
      {/* Contact shadow on the platform, breathing opposite to the float. */}
      <motion.div
        aria-hidden
        className="absolute rounded-[50%] bg-[radial-gradient(closest-side,rgb(120_20_10/0.55),rgb(160_40_20/0.18)_60%,transparent)]"
        style={{
          left: "calc(var(--k) * 318)",
          top: "calc(var(--k) * 508)",
          width: "calc(var(--k) * 190)",
          height: "calc(var(--k) * 46)",
          x: shadowX,
        }}
        animate={reduce ? undefined : { scaleX: [1, 0.82, 1], opacity: [0.9, 0.6, 0.9] }}
        transition={floatTransition}
      />

      <motion.div
        className="absolute"
        style={{
          left: "calc(var(--k) * 188)",
          top: "calc(var(--k) * 30)",
          width: "calc(var(--k) * 383)",
          x,
          y,
          rotateX,
          rotateY,
          transformPerspective: 900,
        }}
        initial={reduce ? false : { opacity: 0, scale: 0.86, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 70, damping: 14, delay: 0.15 }}
      >
        <motion.button
          type="button"
          onClick={onActivate}
          aria-label={phase === "listening" ? "Stop listening" : "Talk to Pando"}
          className="pointer-events-auto block w-full cursor-pointer rounded-[40%] outline-offset-8"
          animate={float}
          transition={floatTransition}
          whileHover={reduce ? undefined : { scale: 1.025 }}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          style={{ transformOrigin: "50% 90%" }}
        >
          <Image
            src="/pando.png"
            alt="Pando, the hi pando property companion"
            width={1190}
            height={1559}
            priority
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 70vw"
            className="pointer-events-none h-auto w-full select-none [filter:drop-shadow(0_0_14px_rgba(255,244,238,0.75))_drop-shadow(0_30px_40px_rgba(120,20,10,0.4))]"
            draggable={false}
          />
        </motion.button>
      </motion.div>
    </>
  );
}
