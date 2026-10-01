"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Check, ChevronDown, LoaderCircle, Lock, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isValidPhoneNumber } from "libphonenumber-js";

/* ------------------------------------------------------------------ */
/* Country codes                                                        */
/* ------------------------------------------------------------------ */
const COUNTRY_CODES = [
  { flag: "🇦🇪", name: "UAE", code: "+971" },
  { flag: "🇮🇳", name: "India", code: "+91" },
  { flag: "🇺🇸", name: "USA", code: "+1" },
  { flag: "🇬🇧", name: "UK", code: "+44" },
  { flag: "🇨🇦", name: "Canada", code: "+1 (CA)" },
  { flag: "🇦🇺", name: "Australia", code: "+61" },
  { flag: "🇸🇬", name: "Singapore", code: "+65" },
  { flag: "🇸🇦", name: "Saudi Arabia", code: "+966" },
  { flag: "🇶🇦", name: "Qatar", code: "+974" },
  { flag: "🇰🇼", name: "Kuwait", code: "+965" },
  { flag: "🇴🇲", name: "Oman", code: "+968" },
  { flag: "🇧🇭", name: "Bahrain", code: "+973" },
  { flag: "🇩🇪", name: "Germany", code: "+49" },
  { flag: "🇫🇷", name: "France", code: "+33" },
  { flag: "🇷🇺", name: "Russia", code: "+7" },
  { flag: "🇨🇳", name: "China", code: "+86" },
  { flag: "🇵🇰", name: "Pakistan", code: "+92" },
  { flag: "🇧🇩", name: "Bangladesh", code: "+880" },
  { flag: "🇵🇭", name: "Philippines", code: "+63" },
  { flag: "🇿🇦", name: "South Africa", code: "+27" },
  { flag: "🇪🇬", name: "Egypt", code: "+20" },
  { flag: "🇱🇧", name: "Lebanon", code: "+961" },
  { flag: "🇯🇴", name: "Jordan", code: "+962" },
] as const;

type CountryEntry = (typeof COUNTRY_CODES)[number];

const MAX_PHONE_LENGTH: Record<string, number> = {
  "+971": 9, // UAE
  "+91": 10, // India
  "+1": 10,  // USA/Canada
  "+44": 10, // UK
  "+61": 9,  // Australia
  "+65": 8,  // Singapore
  "+966": 9, // Saudi Arabia
  "+974": 8, // Qatar
  "+965": 8, // Kuwait
  "+968": 8, // Oman
  "+973": 8, // Bahrain
  "+86": 11, // China
};

/* ------------------------------------------------------------------ */
/* Validation helpers                                                   */
/* ------------------------------------------------------------------ */
function validateName(v: string): string | null {
  const t = v.trim();
  if (!t) return "Please enter your full name.";
  if (t.length < 2) return "Name must be at least 2 characters.";
  if (/^\d+$/.test(t)) return "Name should not be only numbers.";
  return null;
}
function validateEmail(v: string): string | null {
  if (!v.trim()) return "Please enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "That doesn't look like a valid email.";
  return null;
}
function validatePhone(digits: string, countryCode: string, countryName: string): string | null {
  if (!digits) return "Please enter your mobile number.";
  if (!/^\d+$/.test(digits)) return "Please enter digits only — no letters or symbols.";
  try {
    const fullNumber = `${countryCode}${digits}`;
    if (!isValidPhoneNumber(fullNumber)) return `Please enter a valid mobile number for ${countryName}.`;
  } catch (e) {
    return `Please enter a valid mobile number for ${countryName}.`;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Controlled props                                                     */
/* ------------------------------------------------------------------ */
export interface AuthFormValues {
  fullName: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
}

export default function PandoAuthForm({
  propertyName,
  values,
  onValuesChange,
  onSuccess,
  onCancel,
}: {
  propertyName: string;
  /** Controlled from parent — Pando can fill these via conversation. */
  values: AuthFormValues;
  onValuesChange: (next: AuthFormValues) => void;
  onSuccess: (userName: string) => void;
  onCancel: () => void;
}) {
  const { fullName, email, countryCode, phoneNumber } = values;

  const [errors, setErrors] = useState<Partial<Record<keyof AuthFormValues, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof AuthFormValues, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Country dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedCountry: CountryEntry =
    COUNTRY_CODES.find((c) => c.code === countryCode || c.code.startsWith(countryCode)) ??
    COUNTRY_CODES[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredCountries = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search)
  );

  const set = (field: keyof AuthFormValues, val: string) => {
    onValuesChange({ ...values, [field]: val });
    // Re-validate on change if already touched
    if (touched[field]) {
      const err =
        field === "fullName"
          ? validateName(val)
          : field === "email"
            ? validateEmail(val)
            : field === "phoneNumber"
              ? validatePhone(val, selectedCountry.code.split(" ")[0], selectedCountry.name)
              : null;
      setErrors((prev) => ({ ...prev, [field]: err ?? undefined }));
    }
  };

  const touch = (field: keyof AuthFormValues) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = values[field];
    const err =
      field === "fullName"
        ? validateName(val)
        : field === "email"
          ? validateEmail(val)
          : field === "phoneNumber"
            ? validatePhone(val, selectedCountry.code.split(" ")[0], selectedCountry.name)
            : null;
    if (err) setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const isValid =
    !validateName(fullName) &&
    !validateEmail(email) &&
    !validatePhone(phoneNumber, selectedCountry.code.split(" ")[0], selectedCountry.name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    // Touch all fields to show errors
    const allTouched = { fullName: true, email: true, countryCode: true, phoneNumber: true };
    setTouched(allTouched);
    const nameErr = validateName(fullName);
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phoneNumber, selectedCountry.code.split(" ")[0], selectedCountry.name);
    setErrors({ fullName: nameErr ?? undefined, email: emailErr ?? undefined, phoneNumber: phoneErr ?? undefined });
    if (nameErr || emailErr || phoneErr) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          mobile: `${countryCode} ${phoneNumber.trim()}`,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; user?: { name: string } };
      if (!res.ok || !data.ok) {
        setGlobalError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
      setTimeout(() => onSuccess(data.user?.name ?? fullName.trim()), 700);
    } catch {
      setGlobalError("I couldn't complete that right now. Please try again.");
      setLoading(false);
    }
  };

  const fieldBase =
    "h-10 w-full rounded-2xl border border-brown/20 bg-white/90 px-3.5 text-[13px] text-ink outline-none transition-all placeholder:text-ink-soft/40 focus:border-coral focus:bg-white focus:shadow-[0_0_0_3px_rgb(255_74_38/0.12)] disabled:opacity-60";
  const fieldError = "border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgb(239_68_68/0.12)]";

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3.5 text-[13px] font-semibold text-ink"
      >
        <Check className="size-5 text-emerald-600 shrink-0" strokeWidth={3} />
        <span>Just a moment, I&apos;m opening {propertyName}…</span>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-3 flex flex-col gap-2.5">
      {/* Global error */}
      <AnimatePresence>
        {globalError && (
          <motion.div
            key="global-err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/10 p-2.5 text-[12px] font-medium text-price"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-coral" />
            <span>{globalError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Name */}
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-brown/70">
          Full Name
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => set("fullName", e.target.value)}
          onBlur={() => touch("fullName")}
          placeholder="e.g. Sarah Mansoor"
          disabled={loading}
          autoComplete="name"
          className={`${fieldBase} ${touched.fullName && errors.fullName ? fieldError : ""}`}
        />
        <AnimatePresence>
          {touched.fullName && errors.fullName && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1 text-[11px] text-red-500"
            >
              {errors.fullName}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Email */}
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-brown/70">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => set("email", e.target.value)}
          onBlur={() => touch("email")}
          placeholder="sarah@example.com"
          disabled={loading}
          autoComplete="email"
          className={`${fieldBase} ${touched.email && errors.email ? fieldError : ""}`}
        />
        <AnimatePresence>
          {touched.email && errors.email && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1 text-[11px] text-red-500"
            >
              {errors.email}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Phone row: country code + digits */}
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-brown/70">
          Mobile Number
        </label>
        <div className="flex gap-2">
          {/* Country code dropdown */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              disabled={loading}
              className="flex h-10 items-center gap-1.5 rounded-2xl border border-brown/20 bg-white/90 px-2.5 text-[13px] text-ink hover:border-brown/40 focus:outline-none focus:border-coral focus:shadow-[0_0_0_3px_rgb(255_74_38/0.12)] transition-all disabled:opacity-60 whitespace-nowrap"
              aria-label="Select country code"
            >
              <span>{selectedCountry.flag}</span>
              <span className="font-medium">{selectedCountry.code.split(" ")[0]}</span>
              <ChevronDown className={`size-3.5 text-brown/60 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 bottom-full z-50 mb-1.5 w-52 overflow-hidden rounded-2xl border border-brown/15 bg-white shadow-xl"
                >
                  {/* Search box */}
                  <div className="flex items-center gap-2 border-b border-brown/10 px-3 py-2">
                    <Search className="size-3.5 shrink-0 text-brown/50" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search country…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full text-[12px] text-ink outline-none placeholder:text-ink-soft/50"
                    />
                  </div>
                  <ul className="max-h-48 overflow-y-auto py-1" role="listbox">
                    {filteredCountries.map((c) => (
                      <li key={`${c.name}-${c.code}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={c.code === selectedCountry.code}
                          onClick={() => {
                            onValuesChange({ ...values, countryCode: c.code.split(" ")[0] });
                            setDropdownOpen(false);
                            setSearch("");
                          }}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors hover:bg-blush ${c.code === selectedCountry.code ? "bg-blush/60 font-semibold" : ""}`}
                        >
                          <span>{c.flag}</span>
                          <span className="flex-1 text-ink">{c.name}</span>
                          <span className="text-brown/60">{c.code.split(" ")[0]}</span>
                        </button>
                      </li>
                    ))}
                    {filteredCountries.length === 0 && (
                      <li className="px-3 py-3 text-center text-[12px] text-ink-soft/60">No match found</li>
                    )}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Phone digits only */}
          <div className="flex-1">
            <input
              type="tel"
              inputMode="numeric"
              maxLength={MAX_PHONE_LENGTH[selectedCountry.code.split(" ")[0]] || 12}
              value={phoneNumber}
              onChange={(e) => {
                // Accept digits only
                const digitsOnly = e.target.value.replace(/\D/g, "");
                set("phoneNumber", digitsOnly);
              }}
              onBlur={() => touch("phoneNumber")}
              placeholder="50 123 4567"
              disabled={loading}
              autoComplete="tel-national"
              className={`${fieldBase} ${touched.phoneNumber && errors.phoneNumber ? fieldError : ""}`}
            />
          </div>
        </div>
        <AnimatePresence>
          {touched.phoneNumber && errors.phoneNumber && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1 text-[11px] text-red-500"
            >
              {errors.phoneNumber}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 pt-0.5">
        <button
          type="submit"
          disabled={loading || !isValid}
          className="btn-coral flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-pill text-[13px] font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              <span>Opening details…</span>
            </>
          ) : (
            <>
              <Lock className="size-3.5" />
              <span>Continue to {propertyName}</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="h-8 w-full cursor-pointer rounded-pill text-[12px] font-semibold text-brown/80 transition-colors hover:bg-brown/10 hover:text-ink"
        >
          Not now, back to map
        </button>
      </div>
    </form>
  );
}
