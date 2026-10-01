"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Bath, BedDouble, Building2, Check, Heart, MapPin, Maximize2 } from "lucide-react";
import type { Property } from "@/data/properties";
import { bedroomLabel, formatArea } from "@/lib/format";
import type { ListingMode } from "@/lib/intentParser";
import { PriceLabel } from "./PropertyCard";

/** Full property view shown in place of the hero content after the sign-in gate. */
export default function PropertyDetail({
  property,
  reasons,
  match,
  mode,
  saved,
  backLabel,
  onToggleSave,
  onBack,
}: {
  property: Property;
  reasons: string[];
  match?: number;
  mode: ListingMode;
  saved: boolean;
  backLabel: string;
  onToggleSave: () => void;
  onBack: () => void;
}) {
  const reduce = useReducedMotion();
  const stats = [
    { icon: BedDouble, label: bedroomLabel(property.bedrooms) },
    { icon: Bath, label: `${property.bathrooms} Bathrooms` },
    { icon: Maximize2, label: formatArea(property.areaSqft) },
    { icon: Building2, label: property.type },
  ];

  return (
    <motion.section
      aria-labelledby="detail-title"
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 110, damping: 20 }}
      className="grid h-full overflow-hidden rounded-[calc(var(--k)*30)] border border-white/80 bg-[linear-gradient(160deg,rgb(255_255_255/0.94),rgb(255_246_244/0.86))] shadow-[0_calc(var(--k)*40)_calc(var(--k)*80)_calc(var(--k)*-30)_rgb(100_30_30/0.5)] backdrop-blur-xl md:grid-cols-[0.92fr_1.08fr]"
    >
      <div className="relative min-h-64 overflow-hidden md:min-h-0">
        <Image
          src={property.image}
          alt={`${property.name} in ${property.location}`}
          fill
          unoptimized
          priority
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgb(40_10_20/0.5)] via-transparent to-transparent" />
        {match !== undefined && (
          <span className="absolute left-4 top-4 flex items-center gap-1 rounded-pill bg-mint px-3 py-1 text-12 font-bold text-ink shadow">
            <Check className="size-3.5" strokeWidth={3} />
            {match}% match
          </span>
        )}
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-1.5">
          {property.tags.map((t) => (
            <span key={t} className="rounded-pill bg-white/90 px-3 py-1 text-11 font-semibold text-plum backdrop-blur">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="no-scrollbar flex min-h-0 flex-col overflow-y-auto p-6">
        {/* One way back on screen (below); "go back" works by voice too. */}
        <p className="flex items-center gap-1.5 text-13 font-medium text-ink-soft">
          <MapPin className="size-3.5 text-coral" /> {property.location}
        </p>
        <h2 id="detail-title" className="mt-0.5 text-28 font-extrabold leading-tight tracking-[-0.02em] text-ink">
          {property.name}
        </h2>
        <p className="mt-1 flex items-baseline gap-3">
          <span className="text-28 font-extrabold tracking-[-0.02em] text-price">
            <PriceLabel property={property} mode={mode} />
          </span>
          <span className="text-13 text-ink-soft">
            {property.offPlan ? `Off plan · handover ${property.handover}` : "Ready to move in"} · AED{" "}
            {Math.round(property.price / property.areaSqft).toLocaleString("en-US")}/sq ft
          </span>
        </p>

        <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 rounded-m bg-white px-1.5 py-2.5 text-center text-12 font-semibold text-plum shadow-[0_1px_0_rgb(169_52_0/0.06)]"
            >
              <Icon className="size-4.5 text-brown" />
              {label}
            </div>
          ))}
        </div>

        <p className="mt-4 text-11 font-bold uppercase tracking-[0.14em] text-brown">Amenities</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {property.amenities.map((a) => (
            <li key={a} className="rounded-pill border border-brown/15 bg-white/80 px-3 py-1 text-12 font-medium text-plum">
              {a}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-14 leading-relaxed text-ink-soft">{property.description}</p>

        <div className="mt-4 rounded-m bg-[linear-gradient(135deg,rgb(181_255_194/0.5),rgb(255_255_255/0.85))] p-3.5">
          <p className="flex items-center gap-2 text-11 font-bold uppercase tracking-[0.14em] text-brown">
            <Image src="/pando-logo.png" alt="" width={160} height={210} className="h-4.5 w-auto" />
            Why Pando recommended this
          </p>
          <ul className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {reasons.map((r) => (
              <li key={r} className="flex items-start gap-2 text-13 text-plum">
                <Check className="mt-0.5 size-3.5 shrink-0 text-brown" strokeWidth={3} /> {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex flex-wrap gap-2.5 pt-4">
          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={saved}
            className={`flex h-11 cursor-pointer items-center gap-2 rounded-pill px-5 text-14 font-semibold transition-colors ${
              saved ? "bg-mint text-ink" : "border border-brown/25 bg-white text-plum hover:border-coral/50"
            }`}
          >
            <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="btn-coral flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-pill px-5 text-14 font-semibold text-white"
          >
            <ArrowLeft className="size-4" /> {backLabel}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
