"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The welcome canvas. Before Pando has anything to show, a live map is noise — streets and
 * labels nobody asked for — so the landing sits on brand atmosphere instead: a warm blush
 * sky, slow aurora light in coral, peach, mauve and mint, and location rings radiating from
 * under Pando's platform. It reads as "place" without pretending to be a map; the real map
 * is saved for the moment Pando starts searching, where it means something.
 */

/** Slow aurora fields. Blurred far past their own edges, so they read as light, not shapes. */
const AURORA = [
  { c: "#ffd9b8", x: "6%", y: "26%", w: "46%", h: "52%", o: 0.85, d: 26, dx: 26, dy: -18 },
  { c: "#ffb4a3", x: "68%", y: "52%", w: "48%", h: "56%", o: 0.6, d: 32, dx: -30, dy: 16 },
  { c: "#c9a6bd", x: "78%", y: "6%", w: "42%", h: "44%", o: 0.55, d: 38, dx: -18, dy: 22 },
  { c: "#b5ffc2", x: "24%", y: "62%", w: "34%", h: "36%", o: 0.3, d: 30, dx: 22, dy: 14 },
];

/** Soft bokeh, in scene coordinates of a 1536×900 stage. */
const MOTES = [
  { x: 12, y: 30, s: 5, c: "#ffffff", d: 9 },
  { x: 20, y: 62, s: 4, c: "#b5ffc2", d: 11 },
  { x: 33, y: 18, s: 3, c: "#ffffff", d: 8 },
  { x: 46, y: 9, s: 4, c: "#ffc4b2", d: 12 },
  { x: 63, y: 24, s: 3, c: "#ffffff", d: 10 },
  { x: 74, y: 15, s: 5, c: "#b5ffc2", d: 13 },
  { x: 86, y: 40, s: 4, c: "#ffffff", d: 9.5 },
  { x: 91, y: 68, s: 3, c: "#ffc4b2", d: 11.5 },
  { x: 57, y: 72, s: 3, c: "#ffffff", d: 10.5 },
  { x: 8, y: 78, s: 4, c: "#ffffff", d: 12.5 },
];

export default function LandingBackdrop() {
  const reduce = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Sky: the brand gradient, cream at the top, blush through mauve at the floor */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(58% 44% at 50% 12%, rgb(255 250 246 / 0.95) 0%, rgb(255 250 246 / 0) 72%)",
            "linear-gradient(180deg, #fdf2ec 0%, #fae6e2 26%, #f4dade 52%, #ebc9cf 76%, #ddb7c1 100%)",
          ].join(","),
        }}
      />

      {/* Aurora light, drifting */}
      {AURORA.map((a) => (
        <motion.div
          key={a.c + a.x}
          className="absolute rounded-full"
          style={{
            left: a.x,
            top: a.y,
            width: a.w,
            height: a.h,
            background: `radial-gradient(closest-side, ${a.c}, transparent 72%)`,
            opacity: a.o,
            filter: "blur(70px)",
            willChange: "transform",
          }}
          animate={reduce ? undefined : { x: [0, a.dx, 0], y: [0, a.dy, 0] }}
          transition={{ duration: a.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Location rings: Pando's signal spreading across the floor, fading out as it goes */}
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 1536 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <radialGradient id="ringFade" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0.4" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="ringMask">
            <rect width="1536" height="900" fill="url(#ringFade)" />
          </mask>
          <linearGradient id="floorGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff6f1" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff6f1" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g mask="url(#ringMask)">
          {[150, 260, 380, 510, 650, 800].map((rx, i) => (
            <ellipse
              key={rx}
              cx={768}
              cy={612}
              rx={rx}
              ry={rx * 0.3}
              stroke={i % 2 ? "#b8899c" : "#e08a6f"}
              strokeWidth={i === 0 ? 1.6 : 1.1}
              opacity={0.3 - i * 0.03}
            />
          ))}
          {/* A couple of long, shallow sweeps for depth — the horizon, not a road */}
          {[300, 420].map((y) => (
            <path
              key={y}
              d={`M-60 ${y + 120} C 320 ${y}, 1160 ${y}, 1600 ${y + 120}`}
              stroke="#c79aae"
              strokeWidth={1}
              opacity={0.18}
            />
          ))}
        </g>

        {/* Warm pool of light where Pando stands */}
        <ellipse cx={768} cy={600} rx={520} ry={190} fill="url(#floorGlow)" />
      </svg>

      {/* Bokeh */}
      {MOTES.map((m, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full max-md:hidden"
          style={{
            left: `${m.x}%`,
            top: `${m.y}%`,
            width: m.s,
            height: m.s,
            background: m.c,
            boxShadow: `0 0 12px ${m.c}`,
          }}
          animate={reduce ? undefined : { y: [0, -18, 0], opacity: [0.3, 0.85, 0.3] }}
          transition={{ duration: m.d, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
        />
      ))}

      {/* Edge fades so the navbar and the feature strip sit on quiet ground */}
      <div className="absolute inset-x-0 top-0 h-[14%] bg-[linear-gradient(180deg,rgb(255_248_244/0.75),rgb(255_248_244/0))]" />
      <div className="absolute inset-x-0 bottom-0 h-[22%] bg-[linear-gradient(0deg,rgb(232_197_204/0.8)_10%,rgb(232_197_204/0))]" />

      {/* Fine grain: large gradients band without it */}
      <div className="grain absolute inset-0" />
    </div>
  );
}
