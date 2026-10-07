"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationPhase } from "@/hooks/usePandoConversation";
import { useWebGL } from "@/hooks/useWebGL";
import { useParallax } from "./Parallax";
import { OVERHANG } from "./three/mascotFrame";
import type { GazePointer, MascotMood } from "./three/PandoMascot3D";

const PandoMascot3D = dynamic(() => import("./three/PandoMascot3D"), { ssr: false });

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
  const reduce = Boolean(useReducedMotion());
  const webgl = useWebGL();
  const [ready3d, setReady3d] = useState(false);
  const [hovered, setHovered] = useState(false);
  const onReady = useCallback(() => setReady3d(true), []);

  // Where the user's pointer is, relative to Pando's eyes — what he looks at, and turns to.
  const button = useRef<HTMLButtonElement>(null);
  const pointer = useRef<GazePointer>({ x: 0, y: 0, at: -1e9 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const el = button.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const eyesY = r.top + r.height * 0.3;
      const p = pointer.current;
      p.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.45)));
      p.y = Math.max(-1, Math.min(1, -(e.clientY - eyesY) / (window.innerHeight * 0.45)));
      p.at = performance.now();
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const ctx = useParallax();
  const zero = useMotionValue(0);
  const px = ctx?.px ?? zero;
  const py = ctx?.py ?? zero;
  const on = Boolean(ctx?.enabled);

  // Pando drifts gently with the cursor; in 3D he also turns and looks toward it (inside the canvas).
  const x = useTransform(px, (v) => (on ? v * 16 : 0));
  const y = useTransform(py, (v) => (on ? v * 8 : 0));
  const rotateY = useTransform(px, (v) => (on && !ready3d ? v * 9 : 0));
  const rotateX = useTransform(py, (v) => (on && !ready3d ? v * -5 : 0));
  const shadowX = useTransform(px, (v) => (on ? v * -10 : 0));

  const thinking = phase === "understanding" || phase === "searching";
  const mood: MascotMood = thinking ? "thinking" : speaking ? "speaking" : phase === "listening" ? "listening" : "idle";

  // The flat image floats with CSS; the 3D Pando has his own idle motion.
  const float =
    reduce || ready3d
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
          ref={button}
          type="button"
          onClick={onActivate}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          aria-label={phase === "listening" ? "Stop listening" : "Talk to Pando"}
          className="pointer-events-auto relative block w-full cursor-pointer rounded-[40%] outline-offset-8"
          animate={float}
          transition={floatTransition}
          whileHover={reduce || ready3d ? undefined : { scale: 1.025 }}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          style={{ transformOrigin: "50% 90%" }}
        >
          {/* The artwork: first paint, and the fallback where WebGL isn't available */}
          <Image
            src="/pando.png"
            alt="Pando, the hi pando property companion"
            width={1190}
            height={1559}
            priority
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 70vw"
            className="pointer-events-none h-auto w-full select-none transition-opacity duration-700 [filter:drop-shadow(0_0_14px_rgba(255,244,238,0.75))_drop-shadow(0_30px_40px_rgba(120,20,10,0.4))]"
            style={{ opacity: ready3d ? 0 : 1 }}
            draggable={false}
          />
          {/* The same Pando, inflated into 3D. The canvas overhangs the artwork so he can turn;
              the camera is framed so at rest he sits exactly on the artwork's box. */}
          {webgl && (
            <div
              aria-hidden
              className="pointer-events-none absolute transition-opacity duration-700 [filter:drop-shadow(0_18px_26px_rgba(96,32,40,0.26))]"
              style={{
                left: `${-OVERHANG.x * 100}%`,
                right: `${-OVERHANG.x * 100}%`,
                top: `${-OVERHANG.y * 100}%`,
                bottom: `${-OVERHANG.y * 100}%`,
                opacity: ready3d ? 1 : 0,
              }}
            >
              <PandoMascot3D pointer={pointer} mood={mood} hovered={hovered} reduce={reduce} onReady={onReady} />
            </div>
          )}
        </motion.button>
      </motion.div>
    </>
  );
}
