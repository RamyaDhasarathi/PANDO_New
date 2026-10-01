"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useDismiss } from "@/hooks/useDismiss";

const LANGUAGES = [
  { code: "EN", name: "English", available: true },
  { code: "AR", name: "العربية", available: false },
  { code: "RU", name: "Русский", available: false },
  { code: "ZH", name: "中文", available: false },
];

export default function LanguageSelect({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("EN");
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${lang}`}
        className="flex h-12 cursor-pointer items-center gap-2.5 rounded-pill px-2 text-16 font-medium text-ink transition-colors hover:bg-white/40"
      >
        <Globe className="size-6 text-ink" strokeWidth={1.7} />
        {lang}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""} ${compact ? "max-xl:hidden" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Language"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-50 mt-2 w-52 rounded-m border border-white/80 bg-white/95 p-1.5 shadow-[0_20px_40px_-16px_rgb(80_20_30/0.4)] backdrop-blur-xl"
          >
            {LANGUAGES.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={lang === l.code}
                  disabled={!l.available}
                  onClick={() => {
                    setLang(l.code);
                    setOpen(false);
                  }}
                  className="flex w-full cursor-pointer items-center justify-between rounded-s px-3 py-2.5 text-left text-14 text-ink hover:bg-blush disabled:cursor-not-allowed disabled:text-ink-soft/70 disabled:hover:bg-transparent"
                >
                  <span>{l.name}</span>
                  {lang === l.code ? (
                    <Check className="size-4 text-coral" strokeWidth={2.5} />
                  ) : (
                    !l.available && <span className="text-11 font-semibold uppercase tracking-wider">Soon</span>
                  )}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
