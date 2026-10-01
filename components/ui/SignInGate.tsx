"use client";

import Image from "next/image";
import { Check, LoaderCircle, Lock, MapPin, X } from "lucide-react";
import { useState } from "react";
import type { Property } from "@/data/properties";
import { formatAed } from "@/lib/format";
import Modal from "./Modal";

/** Mock sign-in gate shown before a property's details. No real authentication happens. */
export default function SignInGate({
  property,
  open,
  onCancel,
  onSignedIn,
}: {
  property: Property | null;
  open: boolean;
  onCancel: () => void;
  onSignedIn: (name: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "signing" | "done">("idle");

  const signIn = () => {
    if (status !== "idle") return;
    setStatus("signing");
    window.setTimeout(() => setStatus("done"), 650);
    window.setTimeout(() => {
      setStatus("idle");
      onSignedIn("Guest");
    }, 1150);
  };

  return (
    <Modal open={open && property !== null} onClose={onCancel} labelledBy="gate-title" className="max-w-[420px]">
      {property && (
        <div className="relative">
          <div className="relative h-40 overflow-hidden">
            <Image src={property.image} alt="" fill unoptimized sizes="420px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgb(40_10_20/0.6)] to-transparent" />
            <div className="absolute bottom-4 left-5 right-5 text-white">
              <p className="flex items-center gap-1 text-xs font-medium opacity-90">
                <MapPin className="size-3.5" /> {property.location}
              </p>
              <p className="text-lg font-bold">{property.name}</p>
            </div>
            <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-extrabold text-price">
              {formatAed(property.price)}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="absolute left-4 top-4 grid size-9 cursor-pointer place-items-center rounded-full bg-white/90 text-plum hover:bg-white"
          >
            <X className="size-4.5" />
          </button>

          <div className="p-6 pt-5 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-blush text-brown">
              <Lock className="size-5" />
            </span>
            <h2 id="gate-title" className="mt-3 text-[22px] font-extrabold tracking-[-0.02em] text-ink">
              Sign in to view this property
            </h2>
            <p className="mt-1.5 text-sm text-ink-soft">
              Pando keeps full details, floor plans and your shortlist for signed-in members.
            </p>

            <button
              type="button"
              onClick={signIn}
              disabled={status !== "idle"}
              className="btn-coral mt-5 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-white disabled:cursor-wait"
            >
              {status === "signing" && <LoaderCircle className="size-4.5 animate-spin" />}
              {status === "done" && <Check className="size-4.5" strokeWidth={3} />}
              {status === "idle" ? "Sign In" : status === "signing" ? "Signing in…" : "Signed in"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="mt-2 h-10 w-full cursor-pointer rounded-full text-sm font-semibold text-ink-soft hover:bg-blush"
            >
              Not now
            </button>
            <p className="mt-2 text-xs text-ink-soft/80">Demo sign-in — no account or data needed.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
