"use client";

import Image from "next/image";
import { Heart } from "lucide-react";
import type { Property } from "@/data/properties";
import type { ListingMode } from "@/lib/intentParser";
import { PriceLabel } from "../properties/PropertyCard";

/** default: browsing · muted: Pando is searching · match: recommended · hidden: filtered out */
export type PinState = "default" | "match" | "muted" | "hidden";

/** A Hi Pando map marker: Pando's face, the price, and the match score once Pando has picked it. */
export default function PropertyPin({
  property,
  mode,
  state,
  match,
  rank,
  focused = false,
  saved,
  onOpen,
}: {
  property: Property;
  mode: ListingMode;
  state: PinState;
  match?: number;
  /** Position in Pando's list: what "the second one" refers to. */
  rank?: number;
  /** The home Pando is talking about right now. */
  focused?: boolean;
  saved: boolean;
  onOpen: () => void;
}) {
  const isMatch = state === "match";
  return (
    <button
      type="button"
      onClick={onOpen}
      data-state={state}
      data-focused={focused || undefined}
      inert={state === "hidden"}
      aria-label={`${rank ? `Number ${rank}: ` : ""}${property.name}, ${property.location}${match ? `, ${match}% match` : ""}`}
      className="pando-pin group relative flex cursor-pointer flex-col items-center"
    >
      {/* Property Name Badge: always displayed above the pin */}
      <span className="pointer-events-none absolute bottom-[calc(100%+var(--k)*6)] whitespace-nowrap rounded-s border border-white/30 bg-ink/90 px-2.5 py-1.5 text-left text-12 font-semibold leading-tight text-white opacity-100 shadow-float backdrop-blur-md">
        {property.name}
        <span className="block text-11 font-medium text-white/75">
          <PriceLabel property={property} mode={mode} /> · {property.location}
          {property.offPlan ? " · Off plan" : ""}
        </span>
      </span>

      {isMatch ? (
        // Pando's picks: rank, price and match, but compact.
        <span className="pin-body btn-coral flex h-7.5 items-center gap-1 rounded-pill py-0.5 pl-0.5 pr-2.5 text-12 font-extrabold tracking-[-0.01em] text-white">
          <span className="relative grid size-6.5 shrink-0 place-items-center rounded-full bg-cream">
            <Image src="/pando-logo.png" alt="" width={160} height={210} className="h-4.5 w-auto" />
            {rank !== undefined && (
              <span
                aria-hidden
                className="absolute -left-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-ink text-10 font-extrabold leading-none text-white shadow-[0_0_0_1.5px_#fff]"
              >
                {rank}
              </span>
            )}
          </span>
          <span className="whitespace-nowrap">
            <PriceLabel property={property} mode={mode} />
          </span>
          {match !== undefined && (
            <span className="rounded-pill bg-mint px-1 py-px text-10 font-bold text-ink">{match}%</span>
          )}
          {saved && <Heart className="size-3 shrink-0" fill="currentColor" strokeWidth={2} aria-label="Saved" />}
        </span>
      ) : (
        // Browsing: a small Pando-face marker, so the overview reads as a map, not a price list.
        <span className="pin-body relative grid size-7 place-items-center rounded-full border-2 border-white bg-cream shadow-[0_calc(var(--k)*4)_calc(var(--k)*10)_rgb(110_30_20/0.35)]">
          <Image src="/pando-logo.png" alt="" width={160} height={210} className="h-4.5 w-auto" />
          {saved && (
            <Heart
              className="absolute -right-1 -top-1 size-3.5 rounded-full bg-white p-0.5 text-coral"
              fill="currentColor"
              strokeWidth={2}
              aria-label="Saved"
            />
          )}
        </span>
      )}
      <span
        aria-hidden
        className={`-mt-1 size-2 rotate-45 rounded-[1px] ${isMatch ? "bg-[#e3310f]" : "bg-white"}`}
      />
      <span aria-hidden className={`mt-0.5 size-1.5 rounded-full ${isMatch ? "bg-mint" : "bg-coral"} shadow-[0_0_0_2px_rgb(255_255_255/0.85)]`} />
    </button>
  );
}
