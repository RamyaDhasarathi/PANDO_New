/**
 * One set of auth rules, shared by every way in: the typed form, Pando's voice flow,
 * and the server route. They used to disagree — voice let through numbers the form
 * rejected — so this module is the single source of truth.
 */

import { isValidPhoneNumber } from "libphonenumber-js";

export const COUNTRY_CODES = [
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

export type CountryEntry = (typeof COUNTRY_CODES)[number];

/** Dial code without the disambiguating suffix: "+1 (CA)" → "+1". */
export const dialCode = (code: string) => code.split(" ")[0];

export const MAX_PHONE_LENGTH: Record<string, number> = {
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

export const PHONE_HINT =
  "That mobile number doesn't look valid. Please give the full number including the country code (e.g. +971 50 123 4567).";

export function countryFor(code: string): CountryEntry {
  const dial = dialCode(code);
  return COUNTRY_CODES.find((c) => dialCode(c.code) === dial) ?? COUNTRY_CODES[0];
}

export function validateName(v: string): string | null {
  const t = (v ?? "").trim();
  if (!t) return "Please enter your full name.";
  if (t.length < 2) return "Name must be at least 2 characters.";
  if (/^\d+$/.test(t)) return "Name should not be only numbers.";
  return null;
}

export function validateEmail(v: string): string | null {
  const t = (v ?? "").trim();
  if (!t) return "Please enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return "That doesn't look like a valid email.";
  return null;
}

/** The form's shape: national digits plus a separately chosen country code. */
export function validatePhone(digits: string, countryCode: string, countryName: string): string | null {
  const d = (digits ?? "").trim();
  if (!d) return "Please enter your mobile number.";
  if (!/^\d+$/.test(d)) return "Please enter digits only — no letters or symbols.";
  try {
    if (!isValidPhoneNumber(`${dialCode(countryCode)}${d}`)) {
      return `Please enter a valid mobile number for ${countryName}.`;
    }
  } catch {
    return `Please enter a valid mobile number for ${countryName}.`;
  }
  return null;
}

/**
 * The server's and the voice flow's shape: one string that already carries its country
 * code, however it was spaced or punctuated along the way.
 */
export function validateFullPhone(mobile: string): string | null {
  const raw = (mobile ?? "").trim();
  if (!raw) return "Please enter your mobile number.";
  if (/[a-zA-Z]/.test(raw)) return PHONE_HINT;
  const compact = raw.replace(/[\s\-().]/g, "");
  const e164 = compact.startsWith("+") ? compact : `+${compact}`;
  if (!/^\+[1-9]\d{6,14}$/.test(e164)) return PHONE_HINT;
  try {
    if (!isValidPhoneNumber(e164)) return PHONE_HINT;
  } catch {
    return PHONE_HINT;
  }
  return null;
}

/**
 * Splits whatever Gemini heard into the form's two fields. Speech often arrives with the
 * country code attached ("plus nine one, seven six three…"), and sometimes without.
 */
export function splitSpokenPhone(spoken: string, fallbackCode: string): { countryCode: string; phoneNumber: string } {
  const compact = (spoken ?? "").replace(/[\s\-().]/g, "");
  if (compact.startsWith("+")) {
    // Longest dial code wins: +971 before +97, +1 last.
    const match = [...COUNTRY_CODES]
      .map((c) => dialCode(c.code))
      .sort((a, b) => b.length - a.length)
      .find((d) => compact.startsWith(d));
    if (match) return { countryCode: match, phoneNumber: compact.slice(match.length).replace(/\D/g, "") };
  }
  return { countryCode: dialCode(fallbackCode), phoneNumber: compact.replace(/\D/g, "") };
}
