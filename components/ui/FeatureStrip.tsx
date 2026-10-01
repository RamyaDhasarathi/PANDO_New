"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Heart, MessageCircle, Sparkle, Target, type LucideIcon } from "lucide-react";
import type { RefObject } from "react";

const FEATURES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  { icon: MessageCircle, title: "Talk naturally", body: "Just like a conversation" },
  { icon: Sparkle, title: "Personalised recommendations", body: "Matched to your lifestyle" },
  { icon: Target, title: "Save time", body: "Fewer, better options" },
  { icon: Heart, title: "Find your home", body: "With confidence" },
];

export default function FeatureStrip({
  highlight,
  sectionRef,
}: {
  /** Increments each time "How it works" is chosen, replaying the highlight. */
  highlight: number;
  sectionRef: RefObject<HTMLElement | null>;
}) {
  const reduce = useReducedMotion();
  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      aria-label="How hi pando works"
      className="relative z-10 mt-2 flex-none lg:mt-[calc(var(--k)*16)]"
    >
      <svg
        aria-hidden
        viewBox="0 0 1536 40"
        preserveAspectRatio="none"
        className="block h-10 w-full lg:h-[calc(var(--k)*20)]"
      >
        <path d="M0 22 C 260 4, 520 2, 768 14 C 1016 26, 1280 30, 1536 8 L1536 40 L0 40 Z" fill="#f5e4e1" />
        <path d="M0 22 C 260 4, 520 2, 768 14 C 1016 26, 1280 30, 1536 8" fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={1.5} />
      </svg>
      <div className="bg-[linear-gradient(180deg,rgb(245_228_225/0.97),rgb(241_223_220/0.97))] pb-8 pt-2 backdrop-blur-md lg:flex lg:h-[calc(var(--k)*64)] lg:items-center lg:py-0">
        <ul className="mx-auto grid w-full grid-cols-1 gap-5 px-5 sm:grid-cols-2 md:px-10 lg:w-[calc(var(--k)*1200)] lg:grid-cols-[calc(var(--k)*262)_calc(var(--k)*372)_calc(var(--k)*268)_1fr] lg:gap-0 lg:pl-[calc(var(--k)*40)] lg:pr-0 xl:w-[calc(var(--k)*1536)] xl:grid-cols-[calc(var(--k)*319)_calc(var(--k)*456)_calc(var(--k)*333)_1fr] xl:pl-[calc(var(--k)*101)]">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <motion.li
              key={`${title}-${highlight}`}
              className="flex items-center gap-3.5"
              initial={highlight && !reduce ? { scale: 1 } : false}
              animate={highlight && !reduce ? { scale: [1, 1.06, 1] } : undefined}
              transition={{ delay: 0.5 + i * 0.25, duration: 0.6 }}
            >
              <span
                className="grid size-12 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fbeeec,#ecd5d3)] text-[#b62a12] shadow-[inset_0_1px_0_#fff,0_calc(var(--k)*8)_calc(var(--k)*18)_calc(var(--k)*-10)_rgb(160_60_60/0.4)]"
              >
                <Icon className="size-5.5" strokeWidth={1.8} />
              </span>
              <div>
                <h3 className="text-16 font-semibold leading-tight tracking-[-0.01em] text-ink">{title}</h3>
                <p className="mt-0.5 text-14 leading-tight text-ink-soft">{body}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
