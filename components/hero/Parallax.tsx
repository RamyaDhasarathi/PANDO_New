"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface ParallaxValues {
  /** Pointer position relative to the hero centre, -1…1. */
  px: MotionValue<number>;
  py: MotionValue<number>;
  enabled: boolean;
}

const ParallaxContext = createContext<ParallaxValues | null>(null);

export function useParallaxPointer() {
  const reduce = useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const px = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.6 });
  const py = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.6 });

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)");
    const update = () => setFinePointer(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const enabled = finePointer && !reduce;

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      const r = e.currentTarget.getBoundingClientRect();
      rawX.set(((e.clientX - r.left) / r.width) * 2 - 1);
      rawY.set(((e.clientY - r.top) / r.height) * 2 - 1);
    },
    [enabled, rawX, rawY],
  );
  const onPointerLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  const value = useMemo(() => ({ px, py, enabled }), [px, py, enabled]);
  return { value, onPointerMove, onPointerLeave };
}

export function ParallaxProvider({
  value,
  children,
}: {
  value: ParallaxValues;
  children: React.ReactNode;
}) {
  return <ParallaxContext.Provider value={value}>{children}</ParallaxContext.Provider>;
}

export function useParallax() {
  return useContext(ParallaxContext);
}

/** Shifts its children by `depth` px at the pointer extremes. Negative depth moves against the cursor. */
export function ParallaxLayer({
  depth,
  className,
  children,
}: {
  depth: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useParallax();
  const fallback = useMotionValue(0);
  const x = useTransform(ctx?.px ?? fallback, (v) => (ctx?.enabled ? v * depth : 0));
  const y = useTransform(ctx?.py ?? fallback, (v) => (ctx?.enabled ? v * depth * 0.6 : 0));
  return (
    <motion.div className={className} style={{ x, y }}>
      {children}
    </motion.div>
  );
}
