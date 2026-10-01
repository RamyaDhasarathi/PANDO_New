"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

/** Things to say to Pando, shown where page navigation used to be: he's the way around. */
const HINTS = [
  "“2 bed apartment in Dubai Marina under 2M”",
  "“What's Dubai Hills like?”",
  "“Tell me about the first one”",
  "“Compare the first and second”",
  "“Show me this one”",
];

function AskHint() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % HINTS.length), 4200);
    return () => window.clearInterval(t);
  }, [reduce]);
  return (
    <p className="flex items-center gap-2 whitespace-nowrap text-15 leading-[1.5em] text-ink-soft" aria-hidden>
      <span className="font-semibold text-brown">Just ask Pando</span>
      <span className="text-brown/40">·</span>
      <span className="relative block h-[1.5em] w-[calc(var(--k)*330)] overflow-hidden leading-[1.5em]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={i}
            className="absolute inset-x-0 top-0 block truncate leading-[1.5em]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {HINTS[i]}
          </motion.span>
        </AnimatePresence>
      </span>
    </p>
  );
}

/**
 * Deliberately minimal: brand logo and hints. Discovery & controls happen through Pando AI.
 */
export default function Navbar({
  savedCount,
  onShowSaved,
}: {
  user?: string | null;
  savedCount: number;
  onAuth?: (m: "signin" | "signup") => void;
  onSignOut?: () => void;
  /** Asks Pando to pin the saved homes on the map. */
  onShowSaved: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-40 flex h-18 items-center px-4 md:col-span-2 md:px-8 lg:ml-[calc(50%-50cqw)] lg:h-19 lg:w-[100cqw] lg:px-6 xl:px-7"
    >
      <a href="#" className="flex shrink-0 items-center gap-1.5" aria-label="hi pando home">
        <Image
          src="/pando-logo.png"
          alt=""
          width={160}
          height={210}
          priority
          className="h-11 w-auto drop-shadow-[0_6px_8px_rgba(160,30,10,0.3)] lg:h-13"
        />
        <span className="wordmark pb-1 text-32 font-extrabold leading-none tracking-[-0.03em] lg:text-36 xl:text-38">
          hi pando
        </span>
      </a>

      <div className="absolute left-1/2 hidden -translate-x-1/2 lg:block">
        <AskHint />
      </div>

      <div className="ml-auto flex items-center gap-2 xl:gap-4">
        {savedCount > 0 && (
          <motion.button
            type="button"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={onShowSaved}
            aria-label={`Ask Pando for your ${savedCount} saved homes`}
            title="Your saved homes"
            className="relative grid size-11 cursor-pointer place-items-center rounded-full bg-white/60 text-coral backdrop-blur hover:bg-white"
          >
            <Heart className="size-5" fill="currentColor" />
            <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-coral px-1 text-11 font-bold text-white">
              {savedCount}
            </span>
          </motion.button>
        )}
      </div>
    </motion.header>
  );
}
