"use client";

import dynamic from "next/dynamic";
import { motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useCallback, useState, type ReactNode } from "react";
import { useWebGL } from "@/hooks/useWebGL";
import { HERO_MEDIA } from "@/lib/heroMedia";
import { useParallax } from "./Parallax";

const DubaiCity3D = dynamic(() => import("./three/DubaiCity3D"), { ssr: false });

/**
 * The landing scene: Dubai at dusk, seen from a terrace where Pando stands.
 *
 * The live scene is the WebGL city (`three/DubaiCity3D`). This SVG version — depth layers
 * in one 1536×900 space, each moving with the pointer by its own depth — is its poster:
 * it paints instantly, stays as the fallback without WebGL, and is dropped once the 3D
 * city has faded in over it.
 */

const W = 1536;
const HORIZON = 520;
const TERRACE = 600;

type Shape = "flat" | "taper" | "spire" | "slant";
interface Tower {
  x: number;
  w: number;
  h: number;
  shape: Shape;
}

/** Deterministic PRNG so server and client draw the same skyline. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SHAPES: Shape[] = ["flat", "taper", "spire", "slant", "flat", "taper"];

function skyline(seed: number, minH: number, maxH: number, minW: number, maxW: number, gap: number): Tower[] {
  const r = rng(seed);
  const towers: Tower[] = [];
  let x = -40;
  while (x < W + 40) {
    const w = Math.round(minW + r() * (maxW - minW));
    // Lower on the left so the headline sits on open sky; tallest behind and right of Pando.
    const lift = x < 560 ? 0.26 + 0.24 * Math.max(0, x / 560) : 0.72 + 0.28 * ((x - 560) / (W - 560));
    const h = Math.round((minH + r() * (maxH - minH)) * lift);
    towers.push({ x, w, h, shape: SHAPES[Math.floor(r() * SHAPES.length)] });
    x += w + Math.round(r() * gap);
  }
  return towers;
}

const FAR = skyline(7, 60, 210, 22, 54, 10);
const MID = skyline(23, 120, 300, 34, 78, 46);

function towerPath({ x, w, h, shape }: Tower, base = HORIZON) {
  const top = base - h;
  switch (shape) {
    case "taper":
      return `M${x} ${base}L${x + w * 0.16} ${top}H${x + w * 0.84}L${x + w} ${base}Z`;
    case "spire":
      return `M${x} ${base}V${top}H${x + w * 0.42}L${x + w / 2} ${top - h * 0.22}L${x + w * 0.58} ${top}H${x + w}V${base}Z`;
    case "slant":
      return `M${x} ${base}V${top + h * 0.14}L${x + w} ${top}V${base}Z`;
    default:
      return `M${x} ${base}V${top}H${x + w}V${base}Z`;
  }
}

/** The signature supertall: stepped tiers narrowing to a needle. Stylised, not a replica. */
function supertall(cx: number, base: number) {
  const tiers = [74, 58, 44, 32, 22, 12];
  const tierH = 58;
  const left: string[] = [];
  const right: string[] = [];
  tiers.forEach((tw, i) => {
    const y0 = base - i * tierH;
    const y1 = y0 - tierH;
    left.push(`L${cx - tw / 2} ${y0}L${cx - tw / 2} ${y1}`);
    right.unshift(`L${cx + tw / 2} ${y1}L${cx + tw / 2} ${y0}`);
  });
  const needleTop = base - tiers.length * tierH - 130;
  return `M${cx - tiers[0] / 2} ${base}${left.join("")}L${cx - 2} ${base - tiers.length * tierH}L${cx} ${needleTop}L${cx + 2} ${base - tiers.length * tierH}${right.join("")}Z`;
}

const SUPERTALL = supertall(1188, HORIZON);
const SUPERTALL_TIP = HORIZON - 6 * 58 - 130;

/** Mid layer, reused for its own reflection in the water. */
function MidTowers() {
  return (
    <>
      {MID.map((t) => (
        <g key={t.x}>
          <path d={towerPath(t)} fill="url(#midTower)" />
          <path d={towerPath(t)} fill="url(#windows)" opacity={0.7} />
        </g>
      ))}
      {/* A ring-shaped building right of Pando, kept low and quiet */}
      <ellipse cx={1420} cy={HORIZON - 104} rx={46} ry={64} fill="none" stroke="url(#midTower)" strokeWidth={20} />
      <ellipse cx={1420} cy={HORIZON - 104} rx={46} ry={64} fill="none" stroke="url(#windows)" strokeWidth={20} opacity={0.7} />
      <path d={`M1386 ${HORIZON}L1400 ${HORIZON - 46}H1440L1454 ${HORIZON}Z`} fill="url(#midTower)" />
      <path d={SUPERTALL} fill="url(#supertall)" />
      <path d={SUPERTALL} fill="url(#windows)" opacity={0.85} />
    </>
  );
}

/** Air taxis gliding across the haze: tiny lights with a soft trail. */
const FLYERS = [
  { y: 236, d: 46, delay: 0, c: "#b5ffc2" },
  { y: 172, d: 62, delay: 18, c: "#fff4e8" },
  { y: 300, d: 54, delay: 32, c: "#ffb4a3" },
];

function Layer({ depth, children }: { depth: number; children: ReactNode }) {
  const ctx = useParallax();
  const zero = useMotionValue(0);
  const x = useTransform(ctx?.px ?? zero, (v) => (ctx?.enabled ? -v * depth : 0));
  const y = useTransform(ctx?.py ?? zero, (v) => (ctx?.enabled ? -v * depth * 0.4 : 0));
  return (
    <motion.div className="absolute inset-[-3%]" style={{ x, y }}>
      <svg className="size-full" viewBox={`0 0 ${W} 900`} preserveAspectRatio="xMidYMid slice" fill="none">
        {children}
      </svg>
    </motion.div>
  );
}

function Defs() {
  return (
    <svg aria-hidden className="absolute size-0">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbf0ec" />
          <stop offset="0.3" stopColor="#f6dcd8" />
          <stop offset="0.5" stopColor="#f3c2b6" />
          <stop offset="0.58" stopColor="#f6a98f" />
          <stop offset="0.62" stopColor="#f0b4a4" />
        </linearGradient>
        <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff6e6" />
          <stop offset="0.18" stopColor="#ffd0a8" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#ff7a55" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ff3319" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mauveVeil" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#b08699" stopOpacity="0.5" />
          <stop offset="1" stopColor="#b08699" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="farTower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d7b3bd" />
          <stop offset="1" stopColor="#e9b9ad" />
        </linearGradient>
        <linearGradient id="midTower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b08699" />
          <stop offset="1" stopColor="#c99a9b" />
        </linearGradient>
        <linearGradient id="supertall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9c7286" />
          <stop offset="0.5" stopColor="#c595a2" />
          <stop offset="1" stopColor="#a67a8c" />
        </linearGradient>
        {/* Floor slabs with a scatter of lit windows: reads as glass towers, not dots */}
        <pattern id="windows" width="28" height="11" patternUnits="userSpaceOnUse">
          <rect y="10" width="28" height="0.8" fill="#fff4ec" opacity="0.32" />
          <rect x="3" y="3" width="6" height="5" fill="#fff1dc" opacity="0.32" />
          <rect x="17" y="3" width="4" height="5" fill="#b5ffc2" opacity="0.18" />
        </pattern>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3b3a0" />
          <stop offset="1" stopColor="#d9a4ad" />
        </linearGradient>
        <linearGradient id="terrace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2d2cc" />
          <stop offset="0.45" stopColor="#e6bfc0" />
          <stop offset="1" stopColor="#d6a9b2" />
        </linearGradient>
        <radialGradient id="pandoPool" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff3ea" stopOpacity="0.9" />
          <stop offset="0.4" stopColor="#ff8a6a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ff3319" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b5ffc2" stopOpacity="0" />
          <stop offset="0.5" stopColor="#b5ffc2" stopOpacity="0.9" />
          <stop offset="1" stopColor="#b5ffc2" stopOpacity="0" />
        </linearGradient>
        <clipPath id="waterClip">
          <rect x="-100" y={HORIZON} width={W + 200} height={TERRACE - HORIZON} />
        </clipPath>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
    </svg>
  );
}

/** Perspective lines on the terrace, converging on the horizon behind Pando. */
const FLOOR_LINES = [-900, -560, -300, -110, 60, 230, 420, 680, 1020].map((dx) => {
  const xb = 768 + dx;
  const xt = 768 + (dx * (TERRACE - HORIZON)) / (900 - HORIZON);
  return `M${Math.round(xt)} ${TERRACE}L${xb} 900`;
});

export default function DubaiScene() {
  const reduce = Boolean(useReducedMotion());
  const media = HERO_MEDIA.video || HERO_MEDIA.image;
  const webgl = useWebGL();
  const live = webgl && !media;
  const [cityReady, setCityReady] = useState(false);
  const [posterGone, setPosterGone] = useState(false);
  const onCityReady = useCallback(() => setCityReady(true), []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#f6dcd8]">
      <Defs />

      {/* The camera rig: a slow push-in and lateral slide, forever */}
      {!posterGone && (
      <motion.div
        className="absolute inset-0"
        initial={reduce ? false : { scale: 1.12, opacity: 0 }}
        animate={reduce ? { opacity: 1 } : { scale: [1.06, 1.1, 1.06], x: ["-1.2%", "1.2%", "-1.2%"], opacity: 1 }}
        transition={
          reduce
            ? { duration: 0.6 }
            : {
                scale: { duration: 48, repeat: Infinity, ease: "easeInOut" },
                x: { duration: 48, repeat: Infinity, ease: "easeInOut" },
                opacity: { duration: 1.6, ease: "easeOut" },
              }
        }
      >
        {media ? (
          <div className="absolute inset-[-3%]">
            {HERO_MEDIA.video ? (
              <video
                className="size-full object-cover"
                src={HERO_MEDIA.video}
                poster={HERO_MEDIA.image}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="size-full object-cover" src={HERO_MEDIA.image} alt="" />
            )}
          </div>
        ) : (
          <>
            {/* Sky, sun and a mauve veil high on the right */}
            <Layer depth={2}>
              <rect width={W} height={900} fill="url(#sky)" />
              <circle cx={1010} cy={HORIZON - 30} r={260} fill="url(#sun)" />
              <ellipse cx={1320} cy={120} rx={420} ry={220} fill="url(#mauveVeil)" />
              <ellipse cx={200} cy={80} rx={360} ry={160} fill="#fff8f4" opacity={0.55} filter="url(#soft)" />
            </Layer>

            {/* Far haze towers */}
            <Layer depth={5}>
              <g opacity={0.75}>
                {FAR.map((t) => (
                  <path key={t.x} d={towerPath(t)} fill="url(#farTower)" />
                ))}
              </g>
              {/* Haze settling over the base of the city */}
              <rect x={-60} y={HORIZON - 70} width={W + 120} height={80} fill="#f6b6a2" opacity={0.35} filter="url(#soft)" />
            </Layer>

            {/* Mid towers, the supertall and air taxis */}
            <Layer depth={11}>
              <MidTowers />
              <circle className="beacon" cx={1188} cy={SUPERTALL_TIP} r={3.2} fill="#ff3319" />
              <circle className="beacon beacon-late" cx={1188} cy={SUPERTALL_TIP} r={12} fill="#ff3319" opacity={0.25} />
              {!reduce &&
                FLYERS.map((f) => (
                  <motion.g
                    key={f.y}
                    initial={{ x: -120 }}
                    animate={{ x: W + 120 }}
                    transition={{ duration: f.d, repeat: Infinity, ease: "linear", delay: f.delay }}
                  >
                    <rect x={-42} y={f.y - 0.6} width={42} height={1.2} fill={f.c} opacity={0.5} filter="url(#soft)" />
                    <circle cx={0} cy={f.y} r={2.4} fill={f.c} />
                  </motion.g>
                ))}
            </Layer>

            {/* Creek: the sky and city mirrored, with drifting shimmer */}
            <Layer depth={15}>
              <rect x={-100} y={HORIZON} width={W + 200} height={TERRACE - HORIZON} fill="url(#water)" />
              <g clipPath="url(#waterClip)" opacity={0.28}>
                <g transform={`matrix(1 0 0 -1 0 ${HORIZON * 2})`}>
                  <MidTowers />
                </g>
              </g>
              <ellipse cx={1010} cy={HORIZON + 22} rx={180} ry={8} fill="#fff1dc" opacity={0.55} filter="url(#soft)" />
              {[536, 552, 570, 586].map((y, i) => (
                <motion.path
                  key={y}
                  d={`M${180 + i * 140} ${y}H${520 + i * 160}`}
                  stroke="#fff4ea"
                  strokeWidth={1}
                  opacity={0.4}
                  animate={reduce ? undefined : { x: [0, 60, 0], opacity: [0.15, 0.5, 0.15] }}
                  transition={{ duration: 9 + i * 2, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}
            </Layer>
          </>
        )}

        {/* Terrace: Pando's stage, closest to camera */}
        <Layer depth={24}>
          <rect x={-100} y={TERRACE} width={W + 200} height={900 - TERRACE + 60} fill="url(#terrace)" />
          <g stroke="#fff6f2" strokeWidth={1} opacity={0.35}>
            {FLOOR_LINES.map((d) => (
              <path key={d} d={d} />
            ))}
            {[640, 700, 790].map((y) => (
              <path key={y} d={`M-100 ${y}H${W + 100}`} />
            ))}
          </g>
          {/* Glass rail catching mint light */}
          <rect x={-100} y={TERRACE - 1} width={W + 200} height={2} fill="url(#rail)" />
          <rect x={-100} y={TERRACE - 4} width={W + 200} height={8} fill="url(#rail)" opacity={0.3} filter="url(#soft)" />
          {/* Warm pool of light Pando stands in */}
          <ellipse cx={768} cy={640} rx={330} ry={70} fill="url(#pandoPool)" />
        </Layer>
      </motion.div>
      )}

      {/* The live 3D city, faded in over the poster once its first frame is drawn */}
      {live && (
        <motion.div
          // A touch softer and lower in contrast than the raw render: the city sets the
          // scene, Pando carries it.
          className="absolute inset-0 [filter:saturate(0.9)_contrast(0.9)_blur(0.4px)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: cityReady ? 1 : 0 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          onAnimationComplete={() => cityReady && setPosterGone(true)}
        >
          <DubaiCity3D reduce={reduce} onReady={onCityReady} />
        </motion.div>
      )}

      {/* Atmosphere between Pando and the skyline: quiets the towers right behind him so he
          separates from the background (desktop stage only — he's centred below 1024px) */}
      <div className="absolute inset-0 bg-[radial-gradient(26%_40%_at_64%_47%,rgb(250_226_220/0.5)_0%,rgb(250_226_220/0.22)_55%,transparent_100%)] max-lg:hidden" />

      {/* Morning-haze wash on the left: open sky for the headline */}
      <div className="absolute inset-y-0 left-0 w-[46%] bg-[linear-gradient(90deg,rgb(252_240_236/0.82)_0%,rgb(252_240_236/0.55)_45%,transparent_100%)] max-lg:w-full max-lg:bg-[linear-gradient(180deg,rgb(252_240_236/0.8)_0%,transparent_60%)]" />

      {/* Edge grading: quiet ground for the navbar and a vignette that holds focus on Pando */}
      <div className="absolute inset-x-0 top-0 h-[16%] bg-[linear-gradient(180deg,rgb(255_248_244/0.8),rgb(255_248_244/0))]" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgb(120_60_80/0.22)_100%)]" />
      <div className="grain absolute inset-0" />
    </div>
  );
}
