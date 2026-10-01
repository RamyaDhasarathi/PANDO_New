/**
 * Thin wrappers over the browser's Web Speech API. Everything runs on-device /
 * in the browser — no API calls. Callers fall back gracefully when unsupported.
 */

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  0: RecognitionAlternative;
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const canRecognizeSpeech = () => Boolean(recognitionCtor());

/**
 * Listens for one utterance. `onInterim` streams the words as they're heard;
 * `onFinal` fires once with the full sentence. Returns a function that stops listening.
 */
export function listenOnce({
  onInterim,
  onFinal,
  onFail,
}: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  /** Denied microphone, no speech heard, or recognition unavailable. */
  onFail: (reason: string) => void;
}): () => void {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    onFail("unsupported");
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  let done = false;
  let heard = "";
  /** Settles exactly once: with what was heard, or with the failure reason. */
  const settle = (reason?: string) => {
    if (done) return;
    done = true;
    window.clearTimeout(giveUp);
    if (heard && reason !== "aborted") onFinal(heard);
    else onFail(reason ?? "no-speech");
  };
  // Some browsers never fire `end` when no audio arrives; don't leave Pando listening forever.
  // 6 seconds is a natural silence timeout for a conversation.
  const giveUp = window.setTimeout(() => {
    settle();
    rec.abort();
  }, 6_000);

  rec.onresult = (e) => {
    let text = "";
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
    heard = text.trim();
    if (e.results[e.results.length - 1]?.isFinal) settle();
    else onInterim(heard);
  };
  rec.onerror = (e) => settle(e.error);
  rec.onend = () => settle();

  try {
    rec.start();
  } catch {
    settle("start-failed");
  }
  return () => {
    // Cancelled by the caller: stop quietly.
    done = true;
    window.clearTimeout(giveUp);
    rec.abort();
  };
}

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** A warm English voice if the platform has one; otherwise the default. */
function pandoVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  const preferred = [
    /Microsoft Ava Online \(Natural\)/i,
    /Microsoft Jenny Online \(Natural\)/i,
    /Microsoft Guy Online \(Natural\)/i,
    /Google US English/i,
    /Google UK English Female/i,
    /Samantha/i,
    /Aria/i,
    /Jenny/i,
    /Natural/i,
    /Premium/i,
    /female/i,
  ];
  for (const pattern of preferred) {
    const match = voices.find((v) => pattern.test(v.name));
    if (match) return match;
  }
  return voices[0];
}

/** Stamps each utterance so a cancelled line can't report "ended" over the next one. */
let current = 0;

/**
 * Pando reads a line aloud. `onStart`/`onEnd` drive the "speaking" state; onEnd also
 * fires when the line fails (e.g. the browser blocks audio). `queue` waits for the
 * current line to finish instead of cutting it off.
 */
export function speak(
  text: string,
  { onStart, onEnd, queue = false }: { onStart?: () => void; onEnd?: () => void; queue?: boolean } = {},
) {
  if (!canSpeak()) return onEnd?.();
  const synth = window.speechSynthesis;
  if (!queue) synth.cancel();
  const id = ++current;
  const utterance = new SpeechSynthesisUtterance(text.replace(/[“”]/g, ""));
  const voice = pandoVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? "en-US";
  utterance.rate = 1.0;
  utterance.pitch = 1.05;
  utterance.onstart = () => id === current && onStart?.();
  utterance.onend = utterance.onerror = () => id === current && onEnd?.();
  synth.speak(utterance);
}

export function stopSpeaking() {
  current++;
  if (canSpeak()) window.speechSynthesis.cancel();
}
