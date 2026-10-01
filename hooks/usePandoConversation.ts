"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLiveVoice } from "./useLiveVoice";
import { VOICE_SAMPLES } from "@/data/questions";
import {
  describePreferences,
  hasPreferences,
  mergePreferences,
  parseIntent,
  parseListingMode,
  shortArea,
  type ListingMode,
  type SearchPreferences,
} from "@/lib/intentParser";
import {
  defaultReasons,
  recommend,
  scoreProperty,
  type Recommendation,
  type RecommendationResult,
} from "@/lib/recommend";
import { getProperty, type Property } from "@/data/properties";
import {
  compare as compareHomes,
  describe as describeHome,
  explainWhy,
  parsePropertyCommand,
  resolveRefs,
  type PropertyCommand,
} from "@/lib/propertyCommands";
import { AREAS } from "@/data/areas";
import { adviceResults, answer as answerArea, fitNote, parseAreaQuestion, type AreaQuestion } from "@/lib/advisor";
import { formatAed } from "@/lib/format";
import { mapLayerName, parseMapLayerCommand, type MapLayerId } from "@/lib/mapLayerCommand";
import { savedStore } from "@/lib/savedStore";
import { canRecognizeSpeech, listenOnce, speak, stopSpeaking } from "@/lib/speech";
import {
  countryFor,
  splitSpokenPhone,
  validateEmail,
  validateName,
  validatePhone,
} from "@/lib/authValidation";

export type ConversationPhase =
  | "idle"
  | "collecting"
  | "listening"
  | "understanding"
  | "searching"
  | "recommendations";

/** Shortcuts Pando offers in his bubble. Each is something the user could also just say. */
export type PandoAction =
  | { type: "submit"; text: string }
  | { type: "reset" }
  | { type: "listen" }
  | { type: "back" };

export interface MessageOption {
  label: string;
  action: PandoAction;
  primary?: boolean;
}

export interface PandoMessage {
  kind: "intro" | "understanding" | "searching" | "results" | "confused" | "listening" | "info" | "advice";
  text: string;
  /** Secondary line under the text, e.g. why the pinned homes fit. */
  note?: string;
  /** What Pando says aloud when it differs from what's shown. */
  speech?: string;
  /** Overrides the bubble's status label ("Area guide"). */
  label?: string;
  options?: MessageOption[];
}

/** Lines Pando reads aloud when unmuted (never "listening": he'd talk over the user). */
const SPOKEN: ReadonlySet<PandoMessage["kind"]> = new Set([
  "intro",
  "understanding",
  "results",
  "confused",
  "info",
  "advice",
]);

/** What Pando is doing right now, shown beside him. */
export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "muted";

export const INTRO_MESSAGE: PandoMessage = {
  kind: "intro",
  text: "What kind of home are you looking for?",
  // The bubble shows "Hi, I'm Pando." as its heading; spoken, it has to be one sentence.
  speech: "Hi, I'm Pando. What kind of home are you looking for?",
};

/** Loosening a search by voice, in place of filter controls: "any budget", "anywhere". */
const RELAX: Array<[RegExp, (p: SearchPreferences) => SearchPreferences]> = [
  [/\b(any|no|forget(?: about)?(?: the)?|ignore(?: the)?|without(?: a)?|drop(?: the)?)\s+(budget|price)\b/i, (p) => ({ ...p, budget: undefined, budgetMin: undefined })],
  [/\b(anywhere|any area|any location|any community|other areas?)\b/i, (p) => ({ ...p, location: undefined })],
  [/\b(any size|any number of bed(?:room)?s|any bed(?:room)?s)\b/i, (p) => ({ ...p, bedrooms: undefined })],
  [/\b(any type|apartments? or villas?|villas? or apartments?)\b/i, (p) => ({ ...p, propertyType: undefined })],
];

const START_OVER = /^\s*(?:let'?s\s+)?(start over|start again|reset|clear (?:it|everything|all)|new search|from scratch)\b/i;
const SAVED_LIST = /\b(saved|shortlist(?:ed)?|favou?rites?)\b/i;

export function usePandoConversation({
  reducedMotion,
  onOpenProperty,
  onBack,
  onAuthFieldsUpdate,
  onAuthComplete,
  authValues,
  isAuthenticated,
}: {
  reducedMotion: boolean;
  /** Open a home: the app shell shows the sign-in gate, then the detail state. */
  onOpenProperty?: (p: Property, reasons: string[], match?: number) => void;
  /** Leave the gate / detail state for the map and recommendations. */
  onBack?: () => void;
  /** Called when Gemini extracts user details from conversation. */
  onAuthFieldsUpdate?: (patch: { fullName?: string; email?: string; countryCode?: string; phoneNumber?: string }) => void;
  /** Called once the spoken details have passed validation and the server has accepted them. */
  onAuthComplete?: (verifiedName: string) => void;
  /** The live auth form values, so the voice flow validates exactly what the form would. */
  authValues?: { fullName: string; email: string; countryCode: string; phoneNumber: string };
  /** Whether the user is currently authenticated */
  isAuthenticated?: boolean;
}) {

  const [phase, setPhase] = useState<ConversationPhase>("idle");
  const [message, setMessage] = useState<PandoMessage>(INTRO_MESSAGE);
  const [prefs, setPrefs] = useState<SearchPreferences>({});
  const [mode, setMode] = useState<ListingMode>("buy");
  const [results, setResults] = useState<RecommendationResult | null>(null);
  /** The map's base layer. Pando owns it so voice, chat and the on-map control agree. */
  const [mapLayer, setMapLayer] = useState<MapLayerId>("satellite");
  const [draft, setDraft] = useState("");
  /** Sticky once the user first interacts; cleared by "Start over". Hides the hero copy. */
  const [engaged, setEngaged] = useState(false);
  /** Muted: Pando answers in text only and the mic stays off. */
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  /** The user's last request, echoed beside Pando while he thinks. */
  const [heard, setHeard] = useState("");
  /** The home(s) being talked about: what "this one" means, highlighted on the map. */
  const [focusIds, setFocusIds] = useState<string[]>([]);
  /** True while a home is open (gate or detail), so "go back" has somewhere to go. */
  const [viewing, setViewing] = useState(false);
  /** Persistent selected property ID — survives across messages. */
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  /** Auth collection step for conversational auth flow. */
  const [authStep, setAuthStep] = useState<"name" | "email" | "phone" | null>(null);
  /** Property being unlocked during conversational auth. */
  const [authTargetId, setAuthTargetId] = useState<string | null>(null);

  const isAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  /** Latest form values — the voice flow merges what it hears onto whatever is already typed. */
  const authValuesRef = useRef(authValues);
  useEffect(() => {
    authValuesRef.current = authValues;
  }, [authValues]);

  /**
   * The one place a sign-in can succeed. Voice and typed chat both land here, so neither
   * can wave through details the form would reject, or skip the server check.
   */
  const finalizeAuth = useCallback(
    async (patch: {
      fullName?: string;
      email?: string;
      countryCode?: string;
      phoneNumber?: string;
    }): Promise<{ ok: true; name: string } | { ok: false; error: string }> => {
      const current = authValuesRef.current ?? { fullName: "", email: "", countryCode: "+971", phoneNumber: "" };
      const clean = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined && v !== ""),
      ) as Partial<typeof current>;
      // Keep the visible form in step with what Pando heard.
      if (Object.keys(clean).length > 0) onAuthFieldsUpdate?.(clean);

      const merged = { ...current, ...clean };
      const country = countryFor(merged.countryCode);
      const problem =
        validateName(merged.fullName) ??
        validateEmail(merged.email) ??
        validatePhone(merged.phoneNumber, country.code, country.name);
      if (problem) return { ok: false, error: problem };

      try {
        const res = await fetch("/api/auth/authenticate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: merged.fullName.trim(),
            email: merged.email.trim(),
            mobile: `${merged.countryCode} ${merged.phoneNumber.trim()}`,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string; user?: { name: string } };
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error ?? "Something went wrong. Please try again." };
        }
        const name = data.user?.name ?? merged.fullName.trim();
        onAuthComplete?.(name);
        return { ok: true, name };
      } catch {
        return { ok: false, error: "I couldn't complete that right now. Please try again." };
      }
    },
    [onAuthComplete, onAuthFieldsUpdate],
  );

  const toolHandlersRef = useRef<any>({});

  const { isActive, isSpeaking, toggleVoice: toggleLiveVoice } = useLiveVoice({
    onToolCall: async (call) => {
      console.log("[LiveVoice] Tool called:", call.name, call.args);
      const name = call.name;
      const args = call.args;

      if (name === "searchProperties" && toolHandlersRef.current.runSearch) {
        toolHandlersRef.current.runSearch({ location: args.location, budget: args.budget, propertyType: args.propertyType, bedrooms: args.bedrooms });
        return { success: true, result: "Search started" };
      }
      
      if (name === "openProperty" && toolHandlersRef.current.openProperty) {
        const prop = getProperty(args.propertyId);
        if (prop) {
          toolHandlersRef.current.openProperty(prop);
          return { success: true, name: prop.name };
        }
      }

      if ((name === "describeProperty" || name === "whyProperty") && toolHandlersRef.current.setSelectedPropertyId) {
        const propDesc = getProperty(args.propertyId);
        if (propDesc) {
          toolHandlersRef.current.setSelectedPropertyId(propDesc.id);
          toolHandlersRef.current.setFocusIds([propDesc.id]);
          return { success: true, details: `Showing ${propDesc.name}` };
        }
      }

      if (name === "collectAuthDetails") {
        const current = authValuesRef.current ?? { fullName: "", email: "", countryCode: "+971", phoneNumber: "" };
        const patch: { fullName?: string; email?: string; countryCode?: string; phoneNumber?: string } = {};
        if (args.name) patch.fullName = args.name;
        if (args.email) patch.email = args.email;
        if (args.phone) {
          // Spoken numbers arrive with or without a country code; the form keeps the two apart.
          const { countryCode, phoneNumber } = splitSpokenPhone(args.phone, current.countryCode);
          patch.countryCode = countryCode;
          patch.phoneNumber = phoneNumber;
        }

        if (!args.isComplete) {
          if (Object.keys(patch).length > 0) onAuthFieldsUpdate?.(patch);
          return { success: true, message: "Auth details collected" };
        }

        // Gemini thinks it has everything. The finalizer decides.
        const outcome = await finalizeAuth(patch);
        if (!outcome.ok) {
          return {
            success: false,
            accepted: false,
            error: outcome.error,
            instruction: `Do not continue or claim they are signed in. Tell the user: "${outcome.error}" and ask them to repeat just that detail.`,
          };
        }
        const targetId = toolHandlersRef.current.authTargetId || toolHandlersRef.current.selectedPropertyId;
        if (targetId && toolHandlersRef.current.openProperty) {
          const prop = getProperty(targetId);
          if (prop) toolHandlersRef.current.openProperty(prop);
        }
        return { success: true, accepted: true, message: "Verified — opening the property." };
      }

      return { success: true };
    }
  });

  const savedIds = useSyncExternalStore(savedStore.subscribe, savedStore.getSnapshot, savedStore.getServerSnapshot);

  const resultSeq = useRef(0);
  const publish = useCallback((result: RecommendationResult) => {
    resultSeq.current += 1;
    setResults({ ...result, id: resultSeq.current });
    setFocusIds([]);
  }, []);
  const updateDraft = useCallback((value: string) => {
    setDraft(value);
    if (value.trim()) setEngaged(true);
  }, []);

  const timers = useRef<number[]>([]);
  const voiceIndex = useRef(0);
  const stopRecognition = useRef<(() => void) | null>(null);
  const openRef = useRef(onOpenProperty);
  const backRef = useRef(onBack);
  useEffect(() => {
    openRef.current = onOpenProperty;
    backRef.current = onBack;
  }, [onOpenProperty, onBack]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(
    () => () => {
      clearTimers();
      stopRecognition.current?.();
      stopSpeaking();
    },
    [clearTimers],
  );

  const silence = useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
  }, []);

  /** Set once Pando has said anything out loud, so replies speak without re-arming the greeting. */
  const interacted = useRef(false);

  /** Live mirrors of the current turn, for callbacks that must not re-run on every change. */
  const messageRef = useRef(message);
  const phaseRef = useRef(phase);
  useEffect(() => {
    messageRef.current = message;
    phaseRef.current = phase;
  }, [message, phase]);

  /** The turn the mic interrupted, restored when listening is cancelled rather than answered. */
  const interrupted = useRef<{ message: PandoMessage; phase: ConversationPhase }>({
    message: INTRO_MESSAGE,
    phase: "idle",
  });

  /**
   * Pando greets the visitor as soon as the landing page is up. Browsers refuse audio
   * until the page has user activation, so when the first attempt is blocked (or silently
   * dropped) we retry on the first pointer or key event and then stand down.
   */
  const greeted = useRef(false);
  useEffect(() => {
    if (greeted.current) return;
    const EVENTS = ["pointerdown", "keydown", "touchstart"] as const;
    const disarm = () => EVENTS.forEach((e) => window.removeEventListener(e, onGesture));
    const attempt = () => {
      // Muted, or the user got in first and is already talking to Pando: the greeting is moot.
      if (greeted.current || muted || phaseRef.current !== "idle" || messageRef.current.kind !== "intro") {
        return disarm();
      }
      speak(INTRO_MESSAGE.speech ?? INTRO_MESSAGE.text, {
        onStart: () => {
          greeted.current = true;
          interacted.current = true;
          disarm();
          setSpeaking(true);
        },
        onEnd: () => setSpeaking(false),
      });
    };
    // Run after the gesture's own handlers, so tapping Pando to talk wins over the greeting.
    const onGesture = () => window.setTimeout(attempt, 0);
    EVENTS.forEach((e) => window.addEventListener(e, onGesture));
    attempt();
    return disarm;
  }, [muted]);

  // Unmuted, Pando says every reply out loud (and re-reads the current line on unmute).
  useEffect(() => {
    if (message !== INTRO_MESSAGE) interacted.current = true;
    if (muted || !interacted.current || !SPOKEN.has(message.kind)) return;
    speak(message.speech ?? message.text, {
      // The results line follows "Got it…" without cutting it off.
      queue: message.kind === "results",
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
  }, [message, muted]);

  const resultsMessage = useCallback(
    (result: RecommendationResult, p: SearchPreferences): PandoMessage => {
      const n = result.items.length;
      const inArea = result.items.filter((i) => i.property.location === p.location).length;
      const area = p.location ? shortArea(p.location) : "";
      const where = !area ? "" : inArea === n ? ` in ${area}` : inArea === 0 ? ` near ${area}` : ` in and around ${area}`;
      return {
        kind: "results",
        text: result.relaxed
          ? `Nothing exact${area ? ` in ${area}` : ""}${p.budget ? ` within ${formatAed(p.budget)}` : ""}, so I've pinned the closest. Say "any budget" or "anywhere" to widen it.`
          : n === 1
            ? `I found one home${where} that fits. Ask me about it, or say "show me".`
            : `I found ${n} homes${where} that fit. Ask me about the first one, or any number on the map.`,
        options: [{ label: "Start over", action: { type: "reset" } }],
      };
    },
    [],
  );

  /** Re-rank without the "thinking" sequence, e.g. after switching buy/rent. */
  const refresh = useCallback(
    (next: SearchPreferences, nextMode: ListingMode) => {
      clearTimers();
      setPrefs(next);
      const result = recommend(next, nextMode);
      publish(result);
      setPhase("recommendations");
      setMessage(resultsMessage(result, next));
    },
    [clearTimers, publish, resultsMessage],
  );

  const runSearch = useCallback(
    (next: SearchPreferences, nextMode: ListingMode = mode) => {
      clearTimers();
      setEngaged(true);
      setPrefs(next);
      setPhase("understanding");
      setMessage({
        kind: "understanding",
        text: `Got it — you're looking for ${describePreferences(next, nextMode)}.`,
      });
      const think = reducedMotion ? 700 : 1500;
      const search = reducedMotion ? 500 : 1100;
      later(() => {
        setPhase("searching");
        setMessage({ kind: "searching", text: "Finding your matches…" });
      }, think);
      later(() => {
        const result = recommend(next, nextMode);
        publish(result);
        setPhase("recommendations");
        setMessage(resultsMessage(result, next));
      }, think + search);
    },
    [clearTimers, later, mode, publish, reducedMotion, resultsMessage],
  );

  /**
   * Area advice: Pando explains the area straight away while the map flies there, then
   * pins homes that fit and says why. What the user already asked for (type, budget…)
   * still shapes which homes appear.
   */
  const runAdvice = useCallback(
    (q: AreaQuestion, parsed: SearchPreferences, nextMode: ListingMode = mode) => {
      clearTimers();
      setEngaged(true);
      const [primary, other] = q.areas;
      const merged = mergePreferences(prefs, { ...parsed, location: undefined });
      // Comparing two areas: no single area to fly to; the map frames both sets of homes.
      const next: SearchPreferences = { ...merged, location: q.topic === "compare" ? undefined : primary.area };
      const text = answerArea(q);
      setPrefs(next);
      setPhase("understanding");
      setMessage({ kind: "advice", label: "Area guide", text });
      later(
        () => {
          const result = adviceResults(q, next, nextMode);
          publish(result);
          setPhase("recommendations");
          const note = fitNote(result, q);
          const compareTo = AREAS[other?.area ?? primary.compareWith];
          setMessage({
            kind: "results",
            label: "Area guide",
            text,
            note,
            speech: note,
            options: [
              q.topic === "compare"
                ? { label: `More on ${primary.short}`, action: { type: "submit", text: `What is ${primary.area} like?` } }
                : { label: `Compare with ${compareTo.short}`, action: { type: "submit", text: `Compare ${primary.area} and ${compareTo.area}` } },
              { label: "Start over", action: { type: "reset" } },
            ],
          });
        },
        reducedMotion ? 900 : 2800,
      );
    },
    [clearTimers, later, mode, prefs, publish, reducedMotion],
  );

  /** Opens a home as app state: the shell shows the sign-in gate, then the detail view. */
  const openProperty = useCallback(
    (p: Property, reasons?: string[], match?: number) => {
      clearTimers();
      const rec = results?.items.find((r) => r.property.id === p.id);
      setEngaged(true);
      setFocusIds([p.id]);
      setViewing(true);
      setSelectedPropertyId(p.id);
      openRef.current?.(p, reasons ?? rec?.reasons ?? defaultReasons(p), match ?? rec?.match);
      
      if (!isAuthenticatedRef.current) {
        setAuthStep("name");
        setAuthTargetId(p.id);
        setMessage({
          kind: "info",
          label: "Property Access",
          text: `To view full details, floor plans, and pricing for ${p.name}, I just need a few quick details from you. Could you provide your full name?`,
        });
      } else {
        setMessage({
          kind: "info",
          label: "Property",
          text: `Here are the details for ${p.name}. It's a ${p.bedrooms}-bed ${p.type.toLowerCase()} in ${p.location}. Let me know if you'd like to check its features or compare it.`,
          speech: `Here are the details for ${p.name}. Let me know if you want to compare it, or check the amenities.`,
        });
      }
    },
    [clearTimers, results],
  );

  useEffect(() => {
    toolHandlersRef.current.runSearch = runSearch;
    toolHandlersRef.current.openProperty = openProperty;
    toolHandlersRef.current.setSelectedPropertyId = setSelectedPropertyId;
    toolHandlersRef.current.setFocusIds = setFocusIds;
    toolHandlersRef.current.authTargetId = authTargetId;
    toolHandlersRef.current.selectedPropertyId = selectedPropertyId;
  }, [runSearch, openProperty, setSelectedPropertyId, setFocusIds, authTargetId, selectedPropertyId]);

  /** Called when the user successfully authenticates manually via the UI. */
  const notifyAuthSuccess = useCallback((p: Property) => {
    setAuthStep(null);
    setMessage({
      kind: "info",
      label: "Property",
      text: `Here are the details for ${p.name}. It's a ${p.bedrooms}-bed ${p.type.toLowerCase()} in ${p.location}. Let me know if you'd like to check its features or compare it.`,
      speech: `Here are the details for ${p.name}. Let me know if you want to compare it, or check the amenities.`,
    });
  }, []);

  /** Back to the map and the current recommendations, exactly as they were. */
  const goBack = useCallback(() => {
    clearTimers();
    setViewing(false);
    setAuthStep(null);
    backRef.current?.();
    const n = results?.items.length ?? 0;
    if (n) {
      setPhase("recommendations");
      setMessage({
        kind: "info",
        label: "Your matches",
        text: `Back to your ${n} ${n === 1 ? "match" : "matches"}. Which one next?`,
        options: [{ label: "Start over", action: { type: "reset" } }],
      });
    } else {
      setPhase("idle");
      setMessage(INTRO_MESSAGE);
    }
  }, [clearTimers, results]);

  /** "Show my saved homes": Pando pins the shortlist on the map instead of opening a grid. */
  const showSaved = useCallback(() => {
    clearTimers();
    setEngaged(true);
    // Asked from the detail view: the shortlist lives on the map, so step back to it.
    if (viewing) {
      backRef.current?.();
      setViewing(false);
    }
    const homes = savedIds.flatMap((id) => getProperty(id) ?? []);
    if (!homes.length) {
      setPhase(results ? "recommendations" : "collecting");
      setMessage({
        kind: "info",
        label: "Saved homes",
        text: "You haven't saved any homes yet. When one catches your eye, just say \u201csave this one\u201d.",
      });
      return;
    }
    const result: RecommendationResult = { relaxed: false, items: homes.map((p) => scoreProperty(p, prefs, mode)) };
    publish(result);
    setPhase("recommendations");
    const n = homes.length;
    setMessage({
      kind: "results",
      label: "Saved homes",
      text: `Here ${n === 1 ? "is your saved home" : `are your ${n} saved homes`}. Ask me about any of them.`,
      options: [{ label: "Start over", action: { type: "reset" } }],
    });
  }, [clearTimers, mode, prefs, publish, results, savedIds, viewing]);

  /** "Tell me about the first one", "why this one?", "compare 1 and 3", "show me that one". */
  const runPropertyCommand = useCallback(
    (cmd: PropertyCommand) => {
      clearTimers();
      setEngaged(true);
      const visible = results?.items ?? [];
      // A spoken command arrives mid-"listening": settle back to the current results.
      setPhase(visible.length ? "recommendations" : "collecting");
      if (cmd.intent === "back") {
        if (viewing) return goBack();
        setMessage({
          kind: "info",
          label: "Your matches",
          text: visible.length
            ? "We're on the map already. Ask me about any numbered home."
            : "We're at the start. Tell me what you're looking for.",
        });
        return;
      }

      const asRec = (id: string): Recommendation | undefined => {
        const p = getProperty(id);
        return p && { property: p, match: 0, reasons: defaultReasons(p) };
      };
      const focus = focusIds.flatMap((id) => visible.find((r) => r.property.id === id) ?? asRec(id) ?? []);
      // "Compare it with the third": the home in focus is the other half.
      const refs =
        cmd.intent === "compare" && cmd.refs.length === 1 ? [{ kind: "this" } as const, ...cmd.refs] : cmd.refs;
      const resolved = resolveRefs(refs, visible, focus, mode);
      if (!resolved.ok) {
        setMessage({ kind: "confused", label: "Your matches", text: resolved.reason });
        return;
      }
      const [item, second] = resolved.items;
      const rank = (r: Recommendation) => visible.indexOf(r) + 1;
      const showOption = (r: Recommendation, label = "Show me this one") => ({
        label,
        action: { type: "submit" as const, text: `Show me ${r.property.name}` },
        primary: true,
      });

      switch (cmd.intent) {
        case "open":
          if (!isAuthenticated) {
            setAuthStep("name");
            setAuthTargetId(item.property.id);
            setMessage({
              kind: "info",
              label: "Property Access",
              text: `I'd love to show you ${item.property.name}. To view the full details, I just need a few quick details. What's your full name?`,
              speech: `I'd love to show you ${item.property.name}. To view the full details, I just need a few quick details. What's your full name?`,
            });
            // Update app state to show the auth form alongside Pando's speech
            openProperty(item.property, item.reasons, item.match || undefined);
            return;
          }
          return openProperty(item.property, item.reasons, item.match || undefined);
        case "save":
        case "unsave": {
          const isSaved = savedIds.includes(item.property.id);
          const want = cmd.intent === "save";
          if (isSaved !== want) savedStore.toggle(item.property.id);
          setFocusIds([item.property.id]);
          setMessage({
            kind: "info",
            label: "Saved homes",
            text: want
              ? `${isSaved ? "Already saved" : "Saved"}: ${item.property.name}. Say "show my saved homes" any time.`
              : `${isSaved ? "Removed" : "It wasn't saved"}: ${item.property.name}.`,
          });
          return;
        }
        case "describe":
          setFocusIds([item.property.id]);
          setSelectedPropertyId(item.property.id);
          setMessage({
            kind: "info",
            label: "Your matches",
            text: describeHome(item, rank(item), mode),
            options: viewing ? [
              { label: "Why this one?", action: { type: "submit", text: "Why did you recommend this?" } },
            ] : [
              showOption(item),
              { label: "Why this one?", action: { type: "submit", text: "Why did you recommend this?" } },
            ],
          });
          return;
        case "why":
          setFocusIds([item.property.id]);
          setMessage({
            kind: "info",
            label: "Your matches",
            text: rank(item)
              ? explainWhy(item)
              : `${item.property.name} wasn't one of my picks for this search, but it offers ${item.property.tags
                  .slice(0, 2)
                  .join(" and ")
                  .toLowerCase()}.`,
            options: viewing ? undefined : [showOption(item)],
          });
          return;
        case "compare":
          if (!second) {
            setMessage({
              kind: "confused",
              label: "Your matches",
              text: "Which two? Say \u201ccompare the first and second\u201d.",
            });
            return;
          }
          setFocusIds([item.property.id, second.property.id]);
          setMessage({
            kind: "info",
            label: "Your matches",
            text: compareHomes(item, second, mode),
            options: [
              showOption(item, rank(item) ? `Show number ${rank(item)}` : `Show ${item.property.name}`),
              { ...showOption(second, rank(second) ? `Show number ${rank(second)}` : `Show ${second.property.name}`), primary: false },
            ],
          });
          return;
      }
    },
    [clearTimers, focusIds, goBack, mode, openProperty, results, savedIds, viewing, isAuthenticated],
  );

  const reset = useCallback(() => {
    clearTimers();
    stopRecognition.current?.();
    stopRecognition.current = null;
    silence();
    if (viewing) backRef.current?.();
    setHeard("");
    setPhase("idle");
    setMessage(INTRO_MESSAGE);
    setPrefs({});
    setResults(null);
    setEngaged(false);
    setDraft("");
    setFocusIds([]);
    setViewing(false);
    setSelectedPropertyId(null);
    setAuthStep(null);
    setAuthTargetId(null);
  }, [clearTimers, silence, viewing]);

  /**
   * "Show me the satellite view" — the map's look is Pando's job too, so the same sentence
   * works spoken or typed, and the on-map control stays in step.
   */
  const switchMapLayer = useCallback(
    (id: MapLayerId) => {
      setMapLayer(id);
      setEngaged(true);
      setPhase((p) => (p === "idle" ? "collecting" : p));
      setMessage({
        kind: "info",
        text:
          id === "standard"
            ? "Back to the default map."
            : `Here's the ${mapLayerName(id)}. Your pins stay exactly where they are.`,
        options:
          id === "standard"
            ? undefined
            : [{ label: "Default map", action: { type: "submit", text: "default view" } }],
      });
    },
    [],
  );

  /**
   * One entry point for everything the user says or types.
   * Order: map layer → relax → local property command → Gemini AI → local fallback.
   */
  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      clearTimers();
      silence();
      setHeard(trimmed);
      setDraft("");
      if (START_OVER.test(trimmed)) return reset();

      // Map layer commands are never home searches.
      const layerCommand = parseMapLayerCommand(trimmed);
      if (layerCommand) return switchMapLayer(layerCommand);

      const parsedMode = parseListingMode(trimmed);
      const nextMode = parsedMode ?? mode;
      setMode(nextMode);
      const parsed = parseIntent(trimmed);

      const relaxers = RELAX.filter(([pattern]) => pattern.test(trimmed));
      if (relaxers.length && hasPreferences(prefs)) {
        const loosened = relaxers.reduce((p, [, loosen]) => loosen(p), prefs);
        return runSearch(mergePreferences(loosened, { ...parsed, location: parsed.location ?? loosened.location }), nextMode);
      }

      // Try local property command parser first (handles ordinals, explicit names, etc.)
      const visibleItems = results?.items ?? [];
      const command = parsePropertyCommand(trimmed, visibleItems.map((r) => r.property), parsed);
      if (command) {
        // Track selected property from local resolution
        if (command.intent !== "back" && command.refs.length > 0) {
          const firstRef = command.refs[0];
          if (firstRef.kind === "id") {
            setSelectedPropertyId(firstRef.id);
          } else if (firstRef.kind === "index" && visibleItems[firstRef.index]) {
            setSelectedPropertyId(visibleItems[firstRef.index].property.id);
          }
        }
        return runPropertyCommand(command);
      }
      if (SAVED_LIST.test(trimmed) && !hasPreferences(parsed)) return showSaved();

      // Build rich context for Gemini
      const visibleProperties = visibleItems.map((r) => ({
        id: r.property.id,
        name: r.property.name,
        location: r.property.location,
        price: r.property.price,
        type: r.property.type,
        bedrooms: r.property.bedrooms,
      }));

      setEngaged(true);
      setPhase("understanding");
      setMessage({ kind: "understanding", text: "Let me check…" });

      try {
        const res = await fetch("/api/pando/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmed,
            state: {
              preferences: prefs,
              visibleProperties,
              selectedPropertyId,
              authStep,
              authTargetId,
              savedPropertyIds: savedIds,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json() as {
            intent?: string;
            reply?: string;
            speech?: string;
            targetPropertyId?: string;
            secondaryPropertyId?: string;
            extractedName?: string;
            extractedEmail?: string;
            extractedPhone?: string;
            extractedCountryCode?: string;
            searchPrefs?: { location?: string; propertyType?: string; bedrooms?: number; budget?: number };
          };

          // Always update auth form fields if Gemini extracted any
          if (onAuthFieldsUpdate) {
            const patch: { fullName?: string; email?: string; countryCode?: string; phoneNumber?: string } = {};
            if (data.extractedName) patch.fullName = data.extractedName;
            if (data.extractedEmail) patch.email = data.extractedEmail;
            if (data.extractedPhone) patch.phoneNumber = data.extractedPhone;
            if (data.extractedCountryCode) patch.countryCode = data.extractedCountryCode;
            if (Object.keys(patch).length > 0) onAuthFieldsUpdate(patch);
          }

          switch (data.intent) {
            case "open":
              if (data.targetPropertyId) {
                setSelectedPropertyId(data.targetPropertyId);
                return runPropertyCommand({ intent: "open", refs: [{ kind: "id", id: data.targetPropertyId }] });
              }
              break;

            case "describe":
              if (data.targetPropertyId) {
                setSelectedPropertyId(data.targetPropertyId);
                return runPropertyCommand({ intent: "describe", refs: [{ kind: "id", id: data.targetPropertyId }] });
              }
              break;

            case "why":
              if (data.targetPropertyId) {
                setSelectedPropertyId(data.targetPropertyId);
                setFocusIds([data.targetPropertyId]);
                setMessage({
                  kind: "info",
                  label: "Why this property",
                  text: data.reply || "This property fits your needs based on the data.",
                  speech: data.speech,
                  options: [
                    { label: "Show me this one", action: { type: "submit", text: "Show me this one" }, primary: true },
                  ],
                });
                return;
              }
              break;

            case "compare":
              if (data.targetPropertyId && data.secondaryPropertyId) {
                setSelectedPropertyId(data.targetPropertyId);
                return runPropertyCommand({
                  intent: "compare",
                  refs: [
                    { kind: "id", id: data.targetPropertyId },
                    { kind: "id", id: data.secondaryPropertyId },
                  ],
                });
              }
              break;

            case "collect_name": {
              if (data.targetPropertyId) setAuthTargetId(data.targetPropertyId);
              setAuthStep("name");
              setPhase(results ? "recommendations" : "collecting");
              setMessage({
                kind: "info",
                label: "Property Access",
                text: data.reply ?? "What's your full name?",
                speech: data.speech,
              });
              return;
            }

            case "collect_email": {
              setAuthStep("email");
              if (data.extractedName) onAuthFieldsUpdate?.({ fullName: data.extractedName });
              setPhase(results ? "recommendations" : "collecting");
              setMessage({
                kind: "info",
                label: "Property Access",
                text: data.reply ?? "Thanks! What's your email address?",
                speech: data.speech,
              });
              return;
            }

            case "collect_phone": {
              setAuthStep("phone");
              if (data.extractedEmail) onAuthFieldsUpdate?.({ email: data.extractedEmail });
              setPhase(results ? "recommendations" : "collecting");
              setMessage({
                kind: "info",
                label: "Property Access",
                text: data.reply ?? "Great. And your mobile number? Include your country code.",
                speech: data.speech,
              });
              return;
            }

            case "auth_complete": {
              // Gemini is only proposing a sign-in; the finalizer validates and verifies it.
              const outcome = await finalizeAuth({
                fullName: data.extractedName,
                email: data.extractedEmail,
                countryCode: data.extractedCountryCode,
                phoneNumber: data.extractedPhone,
              });
              if (!outcome.ok) {
                setAuthStep("phone");
                setPhase(results ? "recommendations" : "collecting");
                setMessage({
                  kind: "info",
                  label: "Property Access",
                  text: outcome.error,
                  speech: outcome.error,
                });
                return;
              }
              setAuthStep(null);
              const targetId = data.targetPropertyId ?? authTargetId ?? selectedPropertyId;
              if (targetId) {
                const prop = getProperty(targetId);
                if (prop) {
                  setPhase(results ? "recommendations" : "collecting");
                  setMessage({
                    kind: "info",
                    label: "Property Access",
                    text: data.reply ?? `Perfect! Opening ${prop.name} for you now.`,
                    speech: data.speech,
                  });
                  later(() => openProperty(prop), 600);
                  return;
                }
              }
              break;
            }

            case "back":
              return goBack();

            case "search":
              if (data.searchPrefs) {
                const sp = data.searchPrefs;
                const isFresh = [sp.location, sp.propertyType, sp.bedrooms].filter((v) => v !== undefined).length >= 2;
                const base = isFresh ? {} : prefs;
                setSelectedPropertyId(null);
                setAuthStep(null);
                return runSearch(mergePreferences(base, sp as SearchPreferences), nextMode);
              }
              break;

            case "chat":
            case "advice":
            default:
              if (data.reply) {
                setPhase(results ? "recommendations" : "collecting");
                setMessage({
                  kind: "info",
                  text: data.reply,
                  speech: data.speech ?? data.reply,
                  options: [{ label: "Start over", action: { type: "reset" } }],
                });
                return;
              }
          }
        }
      } catch (err) {
        console.error("Gemini fallback failed:", err);
      }

      // Local fallback when Gemini unavailable or returned nothing usable
      const question = parseAreaQuestion(trimmed, parsed, prefs.location);
      if (question) return runAdvice(question, parsed, nextMode);
      if (!hasPreferences(parsed) && parsedMode) {
        if (results) return refresh(prefs, nextMode);
        setPhase("collecting");
        setMessage({
          kind: "info",
          text:
            nextMode === "rent"
              ? "Renting, got it. Which area, and how many bedrooms?"
              : "Buying, got it. Which area, and what's your budget?",
        });
        return;
      }
      if (!hasPreferences(parsed)) {
        setPhase(results ? "recommendations" : "collecting");
        setMessage({
          kind: "confused",
          text: "Tell me a little more. Try \u201ca 2 bed apartment in Marina under 2M\u201d, or \u201cwhat\u2019s JVC like?\u201d",
        });
        return;
      }
      // "3 bed villa in the Ranches" is a new request; "under 3M" refines the last one.
      const fresh = [parsed.location, parsed.propertyType, parsed.bedrooms].filter((v) => v !== undefined).length >= 2;
      // A sale budget means nothing for a yearly rent (and vice versa): drop it on a switch.
      const base = fresh
        ? {}
        : nextMode !== mode
          ? { ...prefs, budget: undefined, budgetMin: undefined }
          : prefs;
      runSearch(mergePreferences(base, parsed), nextMode);
    },
    [
      authStep,
      authTargetId,
      clearTimers,
      finalizeAuth,
      goBack,
      later,
      mode,
      onAuthFieldsUpdate,
      openProperty,
      prefs,
      refresh,
      reset,
      results,
      runAdvice,
      runPropertyCommand,
      runSearch,
      savedIds,
      selectedPropertyId,
      showSaved,
      silence,
      switchMapLayer,
    ],
  );

  /** No microphone (unsupported or denied): Pando "hears" a sample request so the demo still flows. */
  const simulateVoice = useCallback(() => {
    const sample = VOICE_SAMPLES[voiceIndex.current++ % VOICE_SAMPLES.length];
    const start = reducedMotion ? 300 : 1100;
    const step = reducedMotion ? 0 : 152;
    const words = sample.split(" ");
    words.forEach((_, i) => {
      later(() => setDraft(words.slice(0, i + 1).join(" ")), start + i * step);
    });
    later(() => submit(sample), start + words.length * step + 400);
  }, [later, reducedMotion, submit]);

  const startListening = useCallback(() => {
    clearTimers();
    stopRecognition.current?.();
    // Remember where the conversation was, so cancelling the mic can return to it.
    if (phaseRef.current !== "listening") {
      interrupted.current = { message: messageRef.current, phase: phaseRef.current };
    }
    // Talking to Pando means wanting to hear him back; also stops him hearing himself.
    silence();
    setMuted(false);
    setEngaged(true);
    setDraft("");
    setPhase("listening");
    setMessage({ kind: "listening", text: "I'm listening… tell me about the home you have in mind." });

    if (!canRecognizeSpeech()) return simulateVoice();
    stopRecognition.current = listenOnce({
      onInterim: setDraft,
      onFinal: (text) => {
        stopRecognition.current = null;
        submit(text);
      },
      onFail: (reason) => {
        stopRecognition.current = null;
        if (reason === "aborted") return;
        // Blocked or offline recognition: keep the conversation going with a sample.
        if (reason === "not-allowed" || reason === "service-not-allowed" || reason === "network") {
          return simulateVoice();
        }
        setDraft("");
        setPhase(results ? "recommendations" : "collecting");
        setMessage({
          kind: "confused",
          text: "I didn't quite catch that. Tap me and try again, or type it below.",
          options: [{ label: "Try again", action: { type: "listen" }, primary: true }],
        });
      },
    });
  }, [clearTimers, results, silence, simulateVoice, submit]);

  const stopListening = useCallback(() => {
    clearTimers();
    stopRecognition.current?.();
    stopRecognition.current = null;
    setDraft("");
    // Cancelling the mic must not wipe the conversation: pick the turn back up where it was.
    const { message: prior, phase: priorPhase } = interrupted.current;
    setPhase(priorPhase === "listening" ? (results ? "recommendations" : "idle") : priorPhase);
    setMessage(prior);
  }, [clearTimers, results]);

  /** Muting silences Pando mid-sentence and closes the mic; typing still works. */
  const toggleMute = useCallback(() => {
    interacted.current = true;
    if (!muted) {
      silence();
      if (phase === "listening") stopListening();
    }
    setMuted(!muted);
  }, [muted, phase, silence, stopListening]);

  const toggleVoice = useCallback(() => {
    toggleLiveVoice();
  }, [toggleLiveVoice]);

  const voiceState: VoiceState =
    isSpeaking
      ? "speaking"
      : isActive
        ? "listening"
        : phase === "understanding" || phase === "searching"
          ? "thinking"
          : muted
            ? "muted"
            : "idle";

  const perform = useCallback(
    (action: PandoAction) => {
      switch (action.type) {
        case "submit":
          return submit(action.text);
        case "reset":
          return reset();
        case "listen":
          return startListening();
        case "back":
          return goBack();
      }
    },
    [goBack, reset, startListening, submit],
  );

  return {
    phase,
    message,
    prefs,
    mode,
    results,
    draft,
    engaged,
    muted,
    toggleMute,
    voiceState,
    heard,
    focusIds,
    selectedPropertyId,
    setDraft: updateDraft,
    perform,
    submit,
    reset,
    startListening,
    stopListening,
    openProperty,
    goBack,
    showSaved,
    mapLayer,
    /** The on-map control writes straight through, so a tap and a spoken request agree. */
    setMapLayer: switchMapLayer,
    notifyAuthSuccess,
  };
}

export type PandoConversation = ReturnType<typeof usePandoConversation>;
