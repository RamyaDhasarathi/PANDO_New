"use client";

const KEY = "hi-pando:saved";
const listeners = new Set<() => void>();
const EMPTY: string[] = [];
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

/** Saved homes live in localStorage so hearts survive a refresh. */
export const savedStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: read,
  getServerSnapshot: () => EMPTY,
  toggle(id: string) {
    const current = read();
    cache = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    try {
      window.localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
      // Storage unavailable (private mode): keep the in-memory list.
    }
    listeners.forEach((l) => l());
  },
};
