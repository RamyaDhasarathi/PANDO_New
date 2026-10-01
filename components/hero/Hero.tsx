"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { Property } from "@/data/properties";
import type { PandoConversation } from "@/hooks/usePandoConversation";
import type { AppState } from "@/lib/appState";
import PropertyMap from "../map/PropertyMap";
import ConversationInput from "./ConversationInput";
import HeroBackdrop from "./HeroBackdrop";
import LandingBackdrop from "./LandingBackdrop";
import { ParallaxLayer, ParallaxProvider, useParallaxPointer } from "./Parallax";
import PandoScene from "./PandoScene";
import PandoSpeechBubble from "./PandoSpeechBubble";
import VoiceDock from "./VoiceDock";

type Box = [x: number, y: number, w?: number];

/**
 * Stage placement: `wide` is the 1536×800 layout (1280px+), `narrow` the 1200×800
 * layout used from 1024px. Below 1024px elements flow normally.
 */
const at = (wide: Box, narrow: Box) => {
  const [x, y, w] = wide;
  const [nx, ny, nw] = narrow;
  return {
    "--x": x,
    "--y": y,
    "--nx": nx,
    "--ny": ny,
    ...(w ? { "--w": w } : {}),
    ...(nw ? { "--nw": nw } : {}),
  } as CSSProperties;
};

const LAYOUT = {
  copy: at([130, 120, 380], [40, 104, 330]),
  bubble: at([880, 96, 350], [730, 94, 350]),
  /** Pando, sized to occupy ~⅓ of the stage width — prominent but leaves the map visible. */
  scene: at([500, 258, 540], [370, 274, 480]),
  search: at([428, 668, 680], [310, 668, 580]),
  /** Voice state + mute, tucked beside Pando's right hand. */
  voice: at([876, 560], [720, 564]),
  /** On the property detail, under Pando where he steps aside: "go back" stays one tap away. */
  voiceDocked: at([1110, 668], [850, 668]),
  /** Property detail replaces the copy and the text input; Pando steps aside. */
  detail: at([90, 100, 990], [30, 104, 770]),
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Hero({
  nav,
  strip,
  conv,
  appState,
  detail,
  saved,
  inputRef,
  authForm,
  authProperty,
  onSelectProperty,
  onBack,
}: {
  nav: ReactNode;
  /** Feature strip: part of the single-screen composition from 1024px. */
  strip: ReactNode;
  conv: PandoConversation;
  saved: Set<string>;
  inputRef: RefObject<HTMLInputElement | null>;
  appState: AppState;
  /** Property detail panel, rendered in place of the hero content in the "property" state. */
  detail: ReactNode;
  authForm?: ReactNode;
  authProperty?: Property | null;
  onSelectProperty: (p: Property, reasons: string[], match?: number) => void;
  onBack: () => void;
}) {
  const reduce = useReducedMotion();
  const { value, onPointerMove, onPointerLeave } = useParallaxPointer();

  const isAuth = appState === "auth";
  const inProperty = appState === "property";
  const showCopy = !conv.engaged && !inProperty && !isAuth;
  // The map stays visible once results exist or during auth/property details.
  const showMap =
    conv.results !== null ||
    appState === "understanding" ||
    appState === "recommendations" ||
    appState === "auth" ||
    appState === "property";

  // Layout computations for Pando, Speech Bubble, Voice Dock, and Search Input
  // handling Landing, Map, and Property Detail views cleanly.
  const sceneLayout = useMemo(() => {
    if (inProperty) return at([1020, 258, 480], [760, 274, 420]);
    if (showMap) return at([780, 258, 540], [580, 274, 480]);
    return LAYOUT.scene;
  }, [inProperty, showMap]);

  const bubbleLayout = useMemo(() => {
    if (inProperty) return at([1110, 80, 310], [830, 80, 280]);
    if (showMap) return at([1100, 96, 330], [860, 94, 300]);
    return LAYOUT.bubble;
  }, [inProperty, showMap]);

  const voiceLayout = useMemo(() => {
    if (inProperty) return at([1120, 668], [830, 668]);
    if (showMap) return at([1060, 560], [830, 564]);
    return LAYOUT.voice;
  }, [inProperty, showMap]);

  // Search bar layout: centered underneath Pando's center line
  const searchLayout = useMemo(
    () => (showMap ? at([800, 690, 500], [600, 690, 440]) : LAYOUT.search),
    [showMap],
  );

  // Pando is the only way in: tap him (or the mic) to talk, type when muted.
  const toggleVoice = () => {
    if (conv.phase === "listening") conv.stopListening();
    else conv.startListening();
  };

  return (
    <ParallaxProvider value={value}>
      <section
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="hero-screen relative isolate overflow-hidden"
        data-app-state={appState}
        aria-label="Talk to Pando"
      >
        {/* Base atmosphere: only on the landing page — the map page is fully transparent */}
        {!showMap && (
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background: [
                "radial-gradient(42% 38% at 4% 36%, #ffecd8 0%, rgb(255 236 216 / 0) 70%)",
                "radial-gradient(34% 30% at 76% 60%, rgb(255 170 130 / 0.55) 0%, rgb(255 170 130 / 0) 70%)",
                "radial-gradient(40% 40% at 50% 18%, rgb(255 228 222 / 0.9) 0%, rgb(255 228 222 / 0) 70%)",
                "linear-gradient(90deg, rgb(253 240 232 / 0.9) 0%, rgb(253 240 232 / 0) 32%, rgb(206 178 198 / 0) 70%, rgb(206 178 198 / 0.55) 100%)",
                "linear-gradient(180deg, #f3d9da 0%, #ebc8cf 32%, #eabfbd 58%, #e9c4b9 72%, #e2b8b0 100%)",
              ].join(","),
            }}
          />
        )}
        {/* The map is the recommendation canvas, graded into the brand atmosphere */}
        <PropertyMap
          mode={conv.mode}
          results={conv.results}
          searching={conv.phase === "understanding" || conv.phase === "searching"}
          area={conv.phase === "understanding" ? (conv.prefs.location ?? null) : null}
          focusIds={conv.focusIds}
          saved={saved}
          onSelectProperty={onSelectProperty}
          showControls={showMap}
          layer={conv.mapLayer}
          onLayerChange={conv.setMapLayer}
        >
          {/* HeroBackdrop edge fades: only on the landing page, never tint the map */}
          {!showMap && <HeroBackdrop copyVisible={showCopy} />}
          {/* Welcome canvas: covers the map (and its pins) until the search begins, then
              dissolves so the map arrives as Pando's answer rather than as wallpaper. */}
          <AnimatePresence>
            {!showMap && (
              <motion.div
                key="landing-backdrop"
                className="absolute inset-0 z-[5]"
                initial={false}
                exit={{ opacity: 0, transition: { duration: 1.1, ease: EASE } }}
              >
                <LandingBackdrop />
              </motion.div>
            )}
          </AnimatePresence>
        </PropertyMap>

        <div className="stage map-stage relative md:max-lg:grid md:max-lg:grid-cols-2 md:max-lg:items-end">

          {/* Navbar: visible only on the landing page (welcome/conversation), hidden on the map */}
          {!showMap && nav}

          {/* Left copy */}
          <AnimatePresence>
          {showCopy && (
          <motion.div
            key="copy"
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -18, transition: { duration: 0.32, ease: EASE } }}
            className="place relative z-20 px-5 pt-6 md:px-10 md:pt-8 lg:p-0"
            style={LAYOUT.copy}
            initial={reduce ? false : { opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          >
            <p className="text-13 font-semibold uppercase tracking-[0.2em] text-[#8c5a6b] lg:text-14 lg:tracking-[0.18em] xl:text-16 xl:tracking-[0.19em]">
              Your AI property companion
            </p>
            <h1 className="mt-3 text-[clamp(38px,11vw,48px)] md:text-[52px] font-extrabold leading-[1.02] tracking-[-0.02em] text-ink lg:mt-2.5 lg:text-[calc(var(--k)*46)] lg:leading-[calc(var(--k)*46)] xl:text-[calc(var(--k)*50)] xl:leading-[calc(var(--k)*50)]">
              Find a place <br />
              that feels like <br />
              <span className="text-home">home.</span>
            </h1>
            <p className="mt-4 max-w-[calc(var(--k)*326)] text-16 leading-[1.45] text-[#5e4650] max-lg:max-w-md lg:mt-3.5 lg:text-[calc(var(--k)*16.5)]">
              Tell Pando what you&apos;re looking for, and get personalised property recommendations in Dubai.
            </p>
          </motion.div>
          )}
          </AnimatePresence>

          {/* Speech bubble: grows upward from its tail on desktop */}
          <div
            className="place place-slide bubble-dock relative z-30 mt-6 flex justify-end px-5 max-md:mx-auto max-md:max-w-[440px] md:mt-0 md:pr-12 lg:min-h-[calc(var(--k)*186)] lg:flex-col lg:items-end lg:justify-end lg:px-0"
            style={bubbleLayout}
          >
            <ParallaxLayer depth={10} className="w-full pr-7 lg:w-auto lg:pr-0">
              <PandoSpeechBubble
                message={conv.message}
                phase={inProperty ? "collecting" : conv.phase}
                voice={conv.voiceState}
                authForm={isAuth ? authForm : undefined}
                onAction={(a) => (a.type === "back" ? onBack() : conv.perform(a))}
              />
            </ParallaxLayer>
          </div>

          {/* Pando */}
          <div
            className={`place place-slide scene pando-dock z-10 max-lg:-mt-2 md:max-lg:col-span-2 ${inProperty ? "max-lg:hidden" : ""}`}
            style={sceneLayout}
          >
            <PandoScene
              phase={conv.phase}
              speaking={conv.voiceState === "speaking"}
              onActivate={() => {
                // Unmuted, Pando himself is the microphone; muted, he hands over to the keyboard.
                if (!conv.muted) return toggleVoice();
                inputRef.current?.focus({ preventScroll: true });
              }}
            />
          </div>

          {/* Live voice state + mute, beside Pando (also on the detail view, for "go back") */}
          <div
            className={`place place-slide relative z-30 mx-auto mt-3 flex w-fit justify-center px-4 md:col-span-2 lg:mt-0 lg:px-0 ${inProperty ? "max-lg:hidden" : ""}`}
            style={voiceLayout}
          >
            <ParallaxLayer depth={12}>
              <VoiceDock
                state={conv.voiceState}
                transcript={conv.draft}
                heard={conv.heard}
                muted={conv.muted}
                canType={!inProperty}
                onToggleMute={conv.toggleMute}
              />
            </ParallaxLayer>
          </div>

          {/* Property detail (after the sign-in gate) */}
          <AnimatePresence>
            {inProperty && (
              <div key="detail" className="place relative z-30 px-4 pb-6 pt-4 lg:h-[calc(var(--k)*690)] lg:p-0" style={LAYOUT.detail}>
                {detail}
              </div>
            )}
          </AnimatePresence>

          {/* Conversational input: typing to Pando (the fallback when muted) */}
          {!inProperty && (
            <div className="place place-slide relative z-30 mx-auto mt-2 w-full max-w-[760px] px-4 md:col-span-2 lg:mt-0 lg:max-w-none lg:px-0" style={searchLayout}>
              <ConversationInput
                value={conv.draft}
                onChange={conv.setDraft}
                onSubmit={conv.submit}
                onMic={toggleVoice}
                phase={conv.phase}
                inputRef={inputRef}
              />
            </div>
          )}
        </div>

        {/* Feature strip: visible only on the landing page, hidden on the map */}
        {!showMap && strip}
      </section>
    </ParallaxProvider>
  );
}
