"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useState } from "react";
import Modal from "./Modal";

export type AuthMode = "signin" | "signup";

export default function AuthModal({
  mode,
  onModeChange,
  onClose,
  onAuthenticated,
}: {
  mode: AuthMode | null;
  onModeChange: (m: AuthMode) => void;
  onClose: () => void;
  onAuthenticated: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const current = mode ?? "signin";

  const close = () => {
    setError("");
    setDone(null);
    onClose();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (current === "signup" && name.trim().length < 2) return setError("Please tell Pando your name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("That email doesn't look quite right.");
    if (password.length < 6) return setError("Passwords need at least 6 characters.");
    setError("");
    const display = current === "signup" ? name.trim().split(" ")[0] : email.split("@")[0];
    const pretty = display.charAt(0).toUpperCase() + display.slice(1);
    setDone(pretty);
    onAuthenticated(pretty);
    window.setTimeout(() => {
      setDone(null);
      setPassword("");
      onClose();
    }, 1300);
  };

  const field =
    "h-12 w-full rounded-2xl border border-brown/15 bg-white px-4 text-[15px] text-ink outline-none transition-shadow placeholder:text-ink-soft/60 focus:border-coral/50 focus:shadow-[0_0_0_3px_rgb(255_51_25/0.15)]";

  return (
    <Modal open={mode !== null} onClose={close} labelledBy="auth-title" className="max-w-[440px]">
      <div className="relative p-7 sm:p-8">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-5 top-5 grid size-10 cursor-pointer place-items-center rounded-full bg-white text-plum shadow-sm hover:bg-blush"
        >
          <X className="size-5" />
        </button>

        <Image src="/pando-logo.png" alt="" width={160} height={210} className="h-14 w-auto" />
        <h2 id="auth-title" className="mt-4 text-[26px] font-extrabold tracking-[-0.02em] text-ink">
          {current === "signup" ? "Create your account" : "Welcome back"}
        </h2>
        <p className="mt-1 text-[15px] text-ink-soft">
          {current === "signup"
            ? "Save homes and let Pando remember what you love."
            : "Sign in to pick up your conversation with Pando."}
        </p>

        <div className="mt-5 grid grid-cols-2 rounded-full bg-blush p-1" role="tablist">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={current === m}
              onClick={() => {
                setError("");
                onModeChange(m);
              }}
              className={`h-10 cursor-pointer rounded-full text-sm font-semibold transition-colors ${
                current === m ? "bg-white text-price shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {m === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 flex flex-col items-center rounded-2xl bg-mint/50 p-6 text-center"
            >
              <span className="grid size-12 place-items-center rounded-full bg-mint">
                <Check className="size-6 text-ink" strokeWidth={3} />
              </span>
              <p className="mt-3 text-lg font-bold text-ink">Hi {done}!</p>
              <p className="text-sm text-plum">Pando is ready when you are.</p>
            </motion.div>
          ) : (
            <motion.form
              key={current}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onSubmit={submit}
              className="mt-5 space-y-3"
              noValidate
            >
              {current === "signup" && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-plum">Name</span>
                  <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
                </label>
              )}
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-plum">Email</span>
                <input
                  className={field}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-plum">Password</span>
                <input
                  className={field}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete={current === "signup" ? "new-password" : "current-password"}
                />
              </label>
              {error && (
                <p role="alert" className="text-sm font-medium text-price">
                  {error}
                </p>
              )}
              <button type="submit" className="btn-coral mt-2 h-12 w-full cursor-pointer rounded-full text-[15px] font-semibold text-white">
                {current === "signup" ? "Create account" : "Sign in"}
              </button>
              <p className="pt-1 text-center text-xs text-ink-soft">
                Demo only — nothing leaves your browser.
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
