"use client";

import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { ConversationPhase } from "@/hooks/usePandoConversation";
import PandoMascot from "./PandoMascot";

// Orbit geometry in scene coordinates (820×600 canvas).
const CX = 425;
const CY = 358;
const RX = 312;
const RY = 136;

const ORBIT_DOTS = [
  { offset: 3.62, color: "#b5ffc2", r: 7 },
  { offset: 4.9, color: "#ff8a70", r: 5 },
  { offset: 5.55, color: "#b5ffc2", r: 6 },
  { offset: 0.42, color: "#b5ffc2", r: 7 },
  { offset: 1.2, color: "#ff6a4a", r: 6 },
  { offset: 2.3, color: "#b5ffc2", r: 6 },
];

const PARTICLES = [
  { x: 150, y: 170, s: 4, d: 7, c: "#fff" },
  { x: 250, y: 90, s: 3, d: 9, c: "#b5ffc2" },
  { x: 610, y: 110, s: 4, d: 8, c: "#fff" },
  { x: 700, y: 250, s: 3, d: 10, c: "#ffb4a3" },
  { x: 120, y: 330, s: 3, d: 11, c: "#b5ffc2" },
  { x: 660, y: 420, s: 4, d: 7.5, c: "#fff" },
  { x: 205, y: 470, s: 3, d: 9.5, c: "#ffb4a3" },
  { x: 560, y: 40, s: 3, d: 12, c: "#fff" },
  { x: 330, y: 20, s: 2, d: 8.5, c: "#b5ffc2" },
  { x: 760, y: 150, s: 2, d: 10.5, c: "#fff" },
];

function OrbitDot({
  angle,
  offset,
  color,
  r,
}: {
  angle: MotionValue<number>;
  offset: number;
  color: string;
  r: number;
}) {
  const cx = useTransform(angle, (a) => Math.round((CX + RX * Math.cos(a + offset)) * 100) / 100);
  const cy = useTransform(angle, (a) => Math.round((CY + RY * Math.sin(a + offset)) * 100) / 100);
  return (
    <g>
      <motion.circle cx={cx} cy={cy} r={r * 2.6} fill={color} opacity={0.28} filter="url(#dotGlow)" />
      <motion.circle cx={cx} cy={cy} r={r} fill={color} stroke="#fff" strokeWidth={1.5} />
    </g>
  );
}

export default function PandoScene({
  phase,
  speaking = false,
  onActivate,
}: {
  phase: ConversationPhase;
  /** Pando is talking: soft coral waves ripple out from him. */
  speaking?: boolean;
  onActivate: () => void;
}) {
  const reduce = useReducedMotion();
  const angle = useMotionValue(0);
  const busy = phase === "understanding" || phase === "searching";
  const listening = phase === "listening";

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    // One lap every ~70s at rest, much faster while Pando is thinking.
    const speed = busy ? 0.0011 : listening ? 0.0004 : 0.00009;
    angle.set(angle.get() + delta * speed);
  });

  return (
    <div className="scene-canvas pointer-events-none">
      {/* Podium */}
      <svg
        aria-hidden
        viewBox="0 0 820 700"
        className="absolute left-0 top-0 h-[calc(var(--k)*700)] w-full overflow-visible"
      >
        <defs>
          <linearGradient id="podiumTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff6f2" />
            <stop offset="1" stopColor="#f1d9d2" />
          </linearGradient>
          <linearGradient id="podiumSide" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e8c6bc" />
            <stop offset="1" stopColor="#d5a79d" />
          </linearGradient>
          <radialGradient id="platformGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ff3319" stopOpacity="0.75" />
            <stop offset="0.45" stopColor="#ff6a4a" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffb4a3" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff3ec" stopOpacity="0.9" />
            <stop offset="0.5" stopColor="#ffd2c4" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffd2c4" stopOpacity="0" />
          </radialGradient>
          <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <filter id="ringGlow" x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Soft halo behind Pando: atmosphere, kept low so his face never sits on a white glare */}
        <motion.ellipse
          cx={410}
          cy={270}
          rx={330}
          ry={300}
          fill="url(#halo)"
          opacity={0.38}
          animate={reduce ? undefined : { opacity: busy ? [0.45, 0.7, 0.45] : [0.32, 0.44, 0.32] }}
          transition={{ duration: busy ? 1.4 : 6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Orbit ring */}
        <ellipse
          cx={CX}
          cy={CY}
          rx={RX}
          ry={RY}
          fill="none"
          stroke={busy ? "#b5ffc2" : "#ffb09c"}
          strokeWidth={6}
          opacity={0.45}
          filter="url(#ringGlow)"
        />
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="#fff" strokeWidth={1.6} opacity={0.85} />
        {ORBIT_DOTS.map((d) => (
          <OrbitDot key={d.offset} angle={angle} {...d} />
        ))}

        {/* Podium and platform rings removed — Pando floats directly over the map. */}
      </svg>

      {/* Listening pulses */}
      <AnimatePresence>
        {listening &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute rounded-full border-2 border-mint"
              style={{
                left: "calc(var(--k) * 160)",
                top: "calc(var(--k) * 40)",
                width: "calc(var(--k) * 500)",
                height: "calc(var(--k) * 500)",
              }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.15], opacity: [0.8, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
            />
          ))}
      </AnimatePresence>

      {/* Speaking waves: gentler and warmer than the listening pulses */}
      <AnimatePresence>
        {speaking &&
          !reduce &&
          [0, 1].map((i) => (
            <motion.span
              key={`speak-${i}`}
              aria-hidden
              className="absolute rounded-full border border-coral/50"
              style={{
                left: "calc(var(--k) * 210)",
                top: "calc(var(--k) * 60)",
                width: "calc(var(--k) * 400)",
                height: "calc(var(--k) * 400)",
              }}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: [0.7, 1.08], opacity: [0.5, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
            />
          ))}
      </AnimatePresence>

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-full"
          style={{
            left: `calc(var(--k) * ${p.x})`,
            top: `calc(var(--k) * ${p.y})`,
            width: `calc(var(--k) * ${p.s * 2})`,
            height: `calc(var(--k) * ${p.s * 2})`,
            background: p.c,
            boxShadow: `0 0 calc(var(--k) * 10) ${p.c}`,
          }}
          animate={reduce ? undefined : { y: [0, -22, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: p.d, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        />
      ))}

      <PandoMascot phase={phase} speaking={speaking} onActivate={onActivate} />
    </div>
  );
}
