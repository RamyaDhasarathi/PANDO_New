"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Bath, BedDouble, Check, Heart, MapPin, Maximize2 } from "lucide-react";
import type { Property } from "@/data/properties";
import { bedroomLabel, formatAed, formatArea } from "@/lib/format";
import type { ListingMode } from "@/lib/intentParser";
import { priceFor } from "@/lib/recommend";

export function PriceLabel({ property, mode }: { property: Property; mode: ListingMode }) {
  return (
    <>
      {formatAed(priceFor(property, mode))}
      {mode === "rent" && <span className="text-[0.7em] font-semibold opacity-70">/yr</span>}
    </>
  );
}

export function SaveButton({
  saved,
  onToggle,
  name,
  className = "",
}: {
  saved: boolean;
  onToggle: () => void;
  name: string;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved homes` : `Save ${name}`}
      whileTap={{ scale: 0.8 }}
      className={`grid cursor-pointer place-items-center rounded-full bg-white/90 text-coral shadow-[0_calc(var(--k)*6)_calc(var(--k)*14)_rgb(80_20_20/0.25)] backdrop-blur transition-colors hover:bg-white ${className}`}
    >
      <motion.span
        key={String(saved)}
        initial={{ scale: 0.4 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 14 }}
        className="grid place-items-center"
      >
        <Heart className="size-[55%] min-h-4 min-w-4" fill={saved ? "currentColor" : "none"} strokeWidth={2} />
      </motion.span>
    </motion.button>
  );
}

/** The tilted cards that float beside Pando in the hero. */
export function ShowcaseCard({
  property,
  mode,
  side,
  saved,
  match,
  onToggleSave,
  onOpen,
}: {
  property: Property;
  mode: ListingMode;
  side: "left" | "right";
  saved: boolean;
  match?: number;
  onToggleSave: () => void;
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  const tilt =
    side === "left"
      ? { rotate: -4, rotateY: 12, rotateX: 2 }
      : { rotate: 4.5, rotateY: -14, rotateX: 2 };

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 40, scale: 0.9, ...tilt }}
      animate={{ opacity: 1, y: 0, scale: 1, ...tilt }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.9 }}
      whileHover={reduce ? undefined : { y: -8, scale: 1.03, rotate: tilt.rotate * 0.5, rotateY: tilt.rotateY * 0.4 }}
      transition={{ type: "spring", stiffness: 120, damping: 17 }}
      style={{ transformPerspective: 1100 }}
      className="group relative w-full overflow-hidden rounded-card border border-white/80 bg-white/40 shadow-[0_calc(var(--k)*30)_calc(var(--k)*50)_calc(var(--k)*-20)_rgb(110_30_30/0.45)] backdrop-blur-md"
    >
      <div className="relative h-38 overflow-hidden rounded-t-[calc(var(--k)*22)] max-md:h-36 lg:h-34">
        <Image
          src={property.image}
          alt={`${property.name} in ${property.location}`}
          fill
          unoptimized
          sizes="330px"
          loading="eager"
          className="object-cover transition-transform duration-700 ease-premium group-hover:scale-105"
        />
        {match !== undefined && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-pill bg-mint px-2.5 py-1 text-11 font-bold text-ink shadow">
            <Check className="size-3" strokeWidth={3} />
            {match}% match
          </span>
        )}
      </div>

      <div className="relative -mt-4 rounded-card border-t border-white/90 bg-[linear-gradient(160deg,rgb(255_255_255/0.96),rgb(255_246_244/0.9))] px-5 pb-4.5 pt-4">
        <h3 className="text-17 font-bold leading-tight tracking-[-0.01em] text-ink">{property.location}</h3>
        <p className="mt-1 text-14 text-ink-soft">
          {bedroomLabel(property.bedrooms)} {property.type}
        </p>
        <p className="mt-2 text-20 font-extrabold tracking-[-0.01em] text-price">
          <PriceLabel property={property} mode={mode} />
        </p>
        <span className="absolute bottom-6 right-5 grid size-10 place-items-center rounded-full bg-[#fbeeec] text-price transition-transform duration-300 group-hover:translate-x-1">
          <ArrowRight className="size-5" strokeWidth={2.2} />
        </span>
      </div>

      {/* Whole-card hit area */}
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 z-10 cursor-pointer rounded-card"
        aria-label={`View ${property.name}, ${bedroomLabel(property.bedrooms)} ${property.type} in ${property.location}`}
      />
      <SaveButton
        saved={saved}
        onToggle={onToggleSave}
        name={property.name}
        className="absolute right-3 top-3 z-20 size-9"
      />
    </motion.article>
  );
}

/** Result card: carries Pando's explanation of why it matches. */
export function RecommendationCard({
  property,
  mode,
  reasons,
  match,
  saved,
  index,
  onToggleSave,
  onOpen,
}: {
  property: Property;
  mode: ListingMode;
  reasons: string[];
  match?: number;
  saved: boolean;
  index: number;
  onToggleSave: () => void;
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 40, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 120, damping: 18, delay: reduce ? 0 : index * 0.08 }}
      className="group relative flex flex-col overflow-hidden rounded-card border border-white/80 bg-white/70 shadow-[0_24px_50px_-24px_rgb(110_30_30/0.45)] backdrop-blur-md"
    >
      <div className="relative h-44 overflow-hidden">
        <Image
          src={property.image}
          alt={`${property.name} in ${property.location}`}
          fill
          unoptimized
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="object-cover transition-transform duration-700 ease-premium group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[rgb(40_10_20/0.45)] to-transparent" />
        {match !== undefined && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-pill bg-mint px-2.5 py-1 text-12 font-bold text-ink shadow">
            <Check className="size-3.5" strokeWidth={3} />
            {match}% match
          </span>
        )}
        {property.offPlan && (
          <span className="absolute bottom-3 left-3 rounded-pill bg-white/90 px-2.5 py-1 text-11 font-bold uppercase tracking-wider text-brown">
            Off plan · {property.handover}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1 text-13 font-medium text-ink-soft">
          <MapPin className="size-3.5 text-coral" />
          {property.location}
        </p>
        <h3 className="mt-1 text-18 font-bold tracking-[-0.01em] text-ink">{property.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-13 text-ink-soft">
          <span className="flex items-center gap-1">
            <BedDouble className="size-4" /> {property.bedrooms} bed
          </span>
          <span className="flex items-center gap-1">
            <Bath className="size-4" /> {property.bathrooms} bath
          </span>
          <span className="flex items-center gap-1">
            <Maximize2 className="size-3.5" /> {formatArea(property.areaSqft)}
          </span>
        </div>
        <p className="mt-3 text-22 font-extrabold tracking-[-0.01em] text-price">
          <PriceLabel property={property} mode={mode} />
        </p>

        <div className="mt-4 rounded-m bg-[#fbf0ee] p-3.5">
          <p className="text-11 font-bold uppercase tracking-[0.14em] text-brown">Why this matches</p>
          <ul className="mt-2 space-y-1.5">
            {reasons.map((r) => (
              <li key={r} className="flex items-start gap-2 text-13 text-plum">
                <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-mint">
                  <Check className="size-2.5 text-ink" strokeWidth={3.5} />
                </span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-4">
          <span className="flex items-center gap-1.5 text-14 font-semibold text-price">
            View details
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 z-10 cursor-pointer rounded-card"
        aria-label={`View details for ${property.name}`}
      />
      <SaveButton
        saved={saved}
        onToggle={onToggleSave}
        name={property.name}
        className="absolute right-3 top-3 z-20 size-10"
      />
    </motion.article>
  );
}

/** Compact match card that sits beside Pando in the recommendations state. */
export function MatchCard({
  property,
  mode,
  reasons,
  match,
  saved,
  onToggleSave,
  onOpen,
}: {
  property: Property;
  mode: ListingMode;
  reasons: string[];
  match: number;
  saved: boolean;
  onToggleSave: () => void;
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      whileHover={reduce ? undefined : { y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group relative flex h-42.5 w-full overflow-hidden rounded-card border border-white/80 bg-[linear-gradient(160deg,rgb(255_255_255/0.95),rgb(255_246_244/0.88))] shadow-[0_calc(var(--k)*26)_calc(var(--k)*44)_calc(var(--k)*-20)_rgb(110_30_30/0.5)] backdrop-blur-md"
    >
      <div className="relative w-26 shrink-0 overflow-hidden lg:max-xl:w-20">
        <Image
          src={property.image}
          alt={`${property.name} in ${property.location}`}
          fill
          unoptimized
          loading="eager"
          sizes="120px"
          className="object-cover transition-transform duration-700 ease-premium group-hover:scale-105"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col px-3.5 py-3 [&>*]:shrink-0">
        <span className="flex w-fit items-center gap-1 rounded-pill bg-mint px-2 py-0.5 text-10 font-bold text-ink">
          <Check className="size-2.5" strokeWidth={3.5} />
          {match}% match
        </span>
        <h3 className="mt-1.5 truncate text-15 font-bold leading-tight tracking-[-0.01em] text-ink">{property.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 truncate text-12 text-ink-soft">
          <MapPin className="size-3 shrink-0 text-coral" />
          {property.location}
        </p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="whitespace-nowrap text-17 font-extrabold tracking-[-0.01em] text-price">
            <PriceLabel property={property} mode={mode} />
          </span>
          <span className="truncate text-12 text-ink-soft">
            {bedroomLabel(property.bedrooms).replace(" Bedroom", " bed")} · {property.type}
          </span>
        </p>
        <p className="mt-1.5 whitespace-nowrap text-10 font-bold uppercase tracking-[0.12em] text-brown">Why this matches</p>
        <ul className="mt-0.5 space-y-0.5">
          {reasons.slice(0, 2).map((r) => (
            <li key={r} className="flex items-center gap-1.5 truncate text-12 text-plum">
              <Check className="size-3 shrink-0 text-brown" strokeWidth={3} />
              <span className="truncate">{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 z-10 cursor-pointer rounded-card"
        aria-label={`View ${property.name}, ${bedroomLabel(property.bedrooms)} ${property.type} in ${property.location}`}
      />
      <SaveButton
        saved={saved}
        onToggle={onToggleSave}
        name={property.name}
        className="absolute bottom-2.5 right-2.5 z-20 size-8"
      />
    </motion.article>
  );
}
