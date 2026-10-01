"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Minimal brand tint over the map — only at the very edges, never over the centre.
 * The map stays at full contrast; warmth lives only in a thin top band (so the navbar
 * reads cleanly) and a thin bottom band (so the feature strip reads cleanly).
 * The Pando glow is tightly localised around the mascot so it never creates a
 * full-screen colour wash over the satellite or terrain imagery.
 */
export default function HeroBackdrop({ copyVisible }: { copyVisible: boolean }) {
  const reduce = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Thin top fade: only the top 8% — keeps the navbar readable without tinting the map */}
      <div className="absolute inset-x-0 top-0 h-[8%] bg-[linear-gradient(180deg,rgb(246_226_223/0.7),transparent)]" />

      {/* Thin bottom fade: only the bottom 10% — keeps the feature strip readable */}
      <div className="absolute inset-x-0 bottom-0 h-[10%] bg-[linear-gradient(0deg,rgb(241_223_220/0.75)_5%,transparent)]" />

      {/* Headline readability: localized left-side wash only while the welcome copy is visible */}
      <AnimatePresence>
        {copyVisible && (
          <motion.div
            key="copy-wash"
            className="absolute inset-y-0 left-0 w-[36%] bg-[linear-gradient(90deg,rgb(252_238_234/0.68)_0%,transparent_100%)] max-lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
          />
        )}
      </AnimatePresence>

      {/* Localized Pando glow — tight around the mascot centre, NOT a full-screen wash */}
      <div className="absolute left-1/2 top-[28%] h-[32%] w-[14%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_240_232/0.38),transparent)] max-lg:top-[20%] max-lg:h-[22%] max-lg:w-[60%]" />

      {/* Soft mint AI glow under the platform — tight, not a wash */}
      <motion.div
        className="absolute bottom-[19%] left-1/2 h-[6%] w-[14%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(181_255_194/0.22),transparent)] max-lg:hidden"
        animate={reduce ? undefined : { opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
