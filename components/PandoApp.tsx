"use client";

import { MotionConfig, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import type { Property } from "@/data/properties";
import { usePandoConversation } from "@/hooks/usePandoConversation";
import { deriveAppState, flowReducer, initialFlow } from "@/lib/appState";
import { savedStore } from "@/lib/savedStore";
import Navbar from "./Navbar";
import Hero from "./hero/Hero";
import PropertyDetail from "./properties/PropertyDetail";
import AuthModal, { type AuthMode } from "./ui/AuthModal";
import FeatureStrip from "./ui/FeatureStrip";
import PandoAuthForm, { type AuthFormValues } from "./ui/PandoAuthForm";
import { canShowPhotoreal } from "./map/photoreal3d";

const DEFAULT_AUTH_VALUES: AuthFormValues = {
  fullName: "",
  email: "",
  countryCode: "+971",
  phoneNumber: "",
};

/**
 * One screen, driven by Pando: talk → the map moves and pins homes → ask about one →
 * contextual Pando auth → detail → "go back". Every step is app state; nothing navigates.
 */
export default function PandoApp() {
  const reduce = Boolean(useReducedMotion());
  const inputRef = useRef<HTMLInputElement>(null);
  const featuresRef = useRef<HTMLElement>(null);

  const [flow, dispatch] = useReducer(flowReducer, initialFlow);
  const [user, setUser] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);

  /**
   * Lifted auth form state — Pando can populate these fields conversationally
   * via hook callbacks; the user can also edit them manually at any time.
   */
  const [authValues, setAuthValues] = useState<AuthFormValues>(DEFAULT_AUTH_VALUES);

  /** Selecting a home is app state, not a route: contextual auth first if unauthenticated, then the detail view. */
  const selectProperty = useCallback(
    (property: Property, reasons: string[], match?: number) => {
      // Reset form fields (keep country code preference)
      setAuthValues((prev) => ({
        ...DEFAULT_AUTH_VALUES,
        countryCode: prev.countryCode,
      }));
      dispatch({ type: "select", selection: { property, reasons, match }, signedIn: user !== null });
    },
    [user],
  );
  const back = useCallback(() => dispatch({ type: "back" }), []);

  /**
   * Called by the conversation hook when Gemini extracts user details from speech.
   * Only updates fields that have new values so user edits aren't overwritten.
   */
  const updateAuthFromConversation = useCallback(
    (patch: Partial<AuthFormValues>) => {
      setAuthValues((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(patch).filter(([, v]) => v !== undefined && v !== "")
        ),
      }));
    },
    [],
  );

  /** Reached only after the details passed validation and the server accepted them. */
  const onAuthCompleteVoice = useCallback((verifiedName: string) => {
    setUser(verifiedName);
    dispatch({ type: "signedIn" });
  }, []);

  // Pando drives selection: voice ("show me the second one") and pin taps both go through him.
  const conv = usePandoConversation({
    reducedMotion: reduce,
    isAuthenticated: user !== null,
    onOpenProperty: selectProperty,
    onBack: back,
    onAuthFieldsUpdate: updateAuthFromConversation,
    onAuthComplete: onAuthCompleteVoice,
    authValues,
  });
  const appState = deriveAppState(conv.phase, flow, conv.draft.trim() !== "");

  const savedIds = useSyncExternalStore(savedStore.subscribe, savedStore.getSnapshot, savedStore.getServerSnapshot);
  const saved = useMemo(() => new Set(savedIds), [savedIds]);
  const selected = flow.selection;
  const backLabel = conv.results ? "Back to recommendations" : "Back to Pando";

  const nav = (
    <Navbar
      user={user}
      savedCount={savedIds.length}
      onAuth={setAuthMode}
      onSignOut={() => {
        setUser(null);
        if (appState === "property") conv.goBack();
      }}
      onShowSaved={conv.showSaved}
    />
  );

  return (
    <MotionConfig reducedMotion="user">
      <main className="k-root relative min-h-svh" data-app-state={appState}>
        <Hero
          nav={nav}
          strip={<FeatureStrip highlight={0} sectionRef={featuresRef} />}
          conv={conv}
          appState={appState}
          authProperty={selected?.property ?? null}
          authForm={
            appState === "auth" && selected?.property ? (
              <PandoAuthForm
                propertyName={selected.property.name}
                values={authValues}
                onValuesChange={setAuthValues}
                onSuccess={(name) => {
                  setUser(name);
                  dispatch({ type: "signedIn" });
                  if (selected.property) conv.notifyAuthSuccess(selected.property);
                }}
                onCancel={conv.goBack}
              />
            ) : undefined
          }
          detail={
            selected && (
              <PropertyDetail
                property={selected.property}
                reasons={selected.reasons}
                match={selected.match}
                mode={conv.mode}
                saved={saved.has(selected.property.id)}
                backLabel={backLabel}
                onToggleSave={() => savedStore.toggle(selected.property.id)}
                onBack={conv.goBack}
                photoreal={conv.mapLayer === "photoreal"}
                onTogglePhotoreal={
                  canShowPhotoreal()
                    ? () => conv.setMapLayer(conv.mapLayer === "photoreal" ? "satellite" : "photoreal")
                    : undefined
                }
              />
            )
          }
          saved={saved}
          inputRef={inputRef}
          onSelectProperty={conv.openProperty}
          onBack={conv.goBack}
        />
      </main>

      <AuthModal
        mode={authMode}
        onModeChange={setAuthMode}
        onClose={() => setAuthMode(null)}
        onAuthenticated={setUser}
      />
    </MotionConfig>
  );
}
