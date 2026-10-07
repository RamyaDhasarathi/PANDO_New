"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Box, Layers, Map as MapIcon, Mountain, Satellite } from "lucide-react";
import { useCallback, useRef, useState, type ComponentType } from "react";
import { useDismiss } from "@/hooks/useDismiss";
import { MAP_LAYERS, type MapLayerId } from "@/lib/mapLayerCommand";
import { canShowPhotoreal } from "./photoreal3d";

const ICONS: Record<MapLayerId, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  standard: MapIcon,
  satellite: Satellite,
  terrain: Mountain,
  photoreal: Box,
};

/**
 * Compact base-layer picker, the way a map app does it: a single glass chip that opens into
 * the three choices. It lives in the map's corner and uses the same glass, coral and pill
 * language as the rest of Hi Pando.
 */
export default function MapLayerControl({
  layer,
  onChange,
}: {
  layer: MapLayerId;
  onChange: (id: MapLayerId) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const active = MAP_LAYERS.find((l) => l.id === layer) ?? MAP_LAYERS[0];
  // Photoreal 3D needs a Google key; without one the option is never offered.
  const choices = MAP_LAYERS.filter((l) => l.id !== "photoreal" || canShowPhotoreal());

  return (
    <div
      ref={ref}
      className="pointer-events-auto absolute bottom-[calc(var(--k)*110)] left-[calc(var(--k)*24)] z-[6] max-lg:bottom-4 max-lg:left-4"
    >
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Map layer"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="glass absolute bottom-full left-0 mb-2 w-[calc(var(--k)*168)] min-w-[168px] rounded-m p-1.5"
          >
            {choices.map((l) => {
              const Icon = ICONS[l.id];
              const selected = l.id === layer;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(l.id);
                      setOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-s px-2.5 py-2 text-left text-14 font-medium transition-colors ${
                      selected ? "bg-coral/12 text-brown" : "text-ink hover:bg-white/60"
                    }`}
                  >
                    <Icon className={`size-4.5 ${selected ? "text-coral" : "text-ink-soft"}`} strokeWidth={1.8} />
                    {l.label}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Map layer: ${active.label}`}
        className="glass flex h-11 cursor-pointer items-center gap-2 rounded-pill px-3.5 text-14 font-semibold text-ink transition-transform hover:-translate-y-0.5"
      >
        <Layers className="size-4.5 text-coral" strokeWidth={1.9} />
        <span className="max-sm:hidden">{active.label}</span>
        <span className="sm:hidden">{active.shortLabel}</span>
      </button>
    </div>
  );
}
