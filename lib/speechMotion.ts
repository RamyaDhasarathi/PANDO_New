/**
 * Lip-sync driver: turns whatever Pando is saying into mouth shapes, sampled every frame
 * by the mascot renderer. Two sources, whichever is live:
 *
 * - Text-to-speech (`lib/speech.ts`): the line is broken into visemes with estimated
 *   durations, then re-anchored on every word-boundary event the browser reports, so the
 *   mouth tracks the real voice rather than a guess. If the voice reports no boundaries
 *   and outlasts the estimate, a soft generic articulation carries on until it ends.
 * - Live voice (`lib/live-api/AudioStreamer.ts`): the played audio runs through an
 *   AnalyserNode; loudness opens the jaw, and the spectral balance picks spread ("ee",
 *   "s") or rounded ("oo", "o") lips.
 *
 * Nothing here touches React: the renderer pulls a sample in its frame loop.
 */

export interface MouthShape {
  /** Jaw opening, 0 closed … 1 wide open. */
  open: number;
  /** Lip spread (smile/"ee"), 0 … 1. */
  wide: number;
  /** Lip rounding ("oo"), 0 … 1. */
  round: number;
}

export const REST: MouthShape = { open: 0, wide: 0.35, round: 0 };

const V = {
  rest: REST,
  aa: { open: 0.78, wide: 0.5, round: 0.05 },
  eh: { open: 0.5, wide: 0.72, round: 0 },
  ee: { open: 0.28, wide: 0.95, round: 0 },
  oh: { open: 0.6, wide: 0.2, round: 0.8 },
  oo: { open: 0.24, wide: 0.08, round: 1 },
  mbp: { open: 0, wide: 0.3, round: 0.05 },
  fv: { open: 0.1, wide: 0.55, round: 0 },
  th: { open: 0.2, wide: 0.6, round: 0 },
  st: { open: 0.16, wide: 0.75, round: 0 },
  kg: { open: 0.34, wide: 0.45, round: 0.1 },
  sh: { open: 0.22, wide: 0.25, round: 0.6 },
  l: { open: 0.3, wide: 0.55, round: 0 },
  r: { open: 0.26, wide: 0.3, round: 0.45 },
} satisfies Record<string, MouthShape>;
type Vis = keyof typeof V;

interface Seg {
  /** Offset from the line's start, ms. */
  at: number;
  dur: number;
  vis: Vis;
  /** Character index in the spoken text where this segment begins. */
  char: number;
}

const DIGRAPHS: [string, Vis, number][] = [
  ["th", "th", 1],
  ["sh", "sh", 1],
  ["ch", "sh", 1],
  ["ph", "fv", 1],
  ["oo", "oo", 1.6],
  ["ou", "oh", 1.6],
  ["ow", "oh", 1.6],
  ["ee", "ee", 1.5],
  ["ea", "ee", 1.5],
  ["ai", "eh", 1.5],
  ["ay", "eh", 1.5],
  ["ng", "kg", 1],
];

const LETTER: Record<string, [Vis, number]> = {
  a: ["aa", 1.25], e: ["eh", 1.1], i: ["ee", 1], o: ["oh", 1.25], u: ["oo", 1.1], y: ["ee", 0.9],
  b: ["mbp", 0.8], m: ["mbp", 0.9], p: ["mbp", 0.8],
  f: ["fv", 0.85], v: ["fv", 0.8],
  s: ["st", 0.9], z: ["st", 0.85], t: ["st", 0.7], d: ["st", 0.7], n: ["st", 0.75], x: ["st", 1],
  c: ["kg", 0.75], k: ["kg", 0.75], g: ["kg", 0.75], q: ["kg", 0.8], h: ["kg", 0.5], j: ["sh", 0.8],
  l: ["l", 0.75], r: ["r", 0.75], w: ["oo", 0.8],
};

/** ~14.5 characters per second at rate 1 — a typical neural TTS pace. */
const UNIT_MS = 70;

function timeline(text: string, rate: number): Seg[] {
  const segs: Seg[] = [];
  const unit = UNIT_MS / Math.max(0.5, rate);
  let at = 0;
  const push = (vis: Vis, weight: number, char: number) => {
    const dur = weight * unit;
    segs.push({ at, dur, vis, char });
    at += dur;
  };
  const lower = text.toLowerCase();
  for (let i = 0; i < lower.length; ) {
    const ch = lower[i];
    if (/[.!?]/.test(ch)) {
      push("rest", 5.2, i);
      i++;
      continue;
    }
    if (/[,;:—–-]/.test(ch)) {
      push("rest", 3, i);
      i++;
      continue;
    }
    if (/\s/.test(ch)) {
      // Between words the mouth relaxes but rarely shuts.
      push("rest", 0.55, i);
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      // Digits are read as words ("two", "five"): a vowel-led syllable or two.
      push("kg", 0.6, i);
      push("oh", 1.6, i);
      i++;
      continue;
    }
    const di = DIGRAPHS.find(([d]) => lower.startsWith(d, i));
    if (di) {
      push(di[1], di[2], i);
      i += 2;
      continue;
    }
    const l = LETTER[ch];
    if (l) push(l[0], l[1], i);
    i++;
  }
  push("rest", 2, lower.length);
  return segs;
}

interface TextLine {
  id: number;
  segs: Seg[];
  /** performance.now() at which segment time 0 plays. Moved by boundary events. */
  origin: number;
  boundaries: number;
  end: number;
}

class SpeechMotion {
  private line: TextLine | null = null;
  private lines = 0;
  private analyser: AnalyserNode | null = null;
  private timeData: Float32Array<ArrayBuffer> | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private audioActiveUntil = 0;

  /** A TTS line started playing. Returns its id, for the boundary/stop calls of that line. */
  startText(text: string, rate = 1) {
    const segs = timeline(text, rate);
    const last = segs[segs.length - 1];
    const id = ++this.lines;
    this.line = { id, segs, origin: performance.now(), boundaries: 0, end: last.at + last.dur };
    return id;
  }

  /** Word boundary from SpeechSynthesisUtterance: re-anchor so that word starts now. */
  boundary(charIndex: number, id?: number) {
    const line = this.line;
    if (!line || (id !== undefined && id !== line.id)) return;
    const seg = line.segs.find((s) => s.char >= charIndex);
    if (!seg) return;
    line.origin = performance.now() - seg.at;
    line.boundaries++;
  }

  /** End a line (or, without an id, whatever is playing). */
  stopText(id?: number) {
    if (id === undefined || id === this.line?.id) this.line = null;
  }

  /** Live audio: everything Pando plays passes through this analyser. */
  attachAnalyser(analyser: AnalyserNode) {
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.35;
    this.analyser = analyser;
    this.timeData = new Float32Array(analyser.fftSize);
    this.freqData = new Uint8Array(analyser.frequencyBinCount);
  }

  get speaking() {
    return this.line !== null || performance.now() < this.audioActiveUntil;
  }

  /** Target mouth shape right now (the renderer smooths between targets). */
  sample(now = performance.now()): MouthShape {
    const audio = this.sampleAudio(now);
    if (audio) return audio;
    const line = this.line;
    if (!line) return REST;
    const t = now - line.origin;
    if (t < line.end) {
      // Binary search the active segment.
      const segs = line.segs;
      let lo = 0;
      let hi = segs.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (segs[mid].at <= t) lo = mid;
        else hi = mid - 1;
      }
      const seg = segs[lo];
      const shape = V[seg.vis];
      // Syllables peak mid-segment rather than holding a flat pose.
      const k = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - seg.at) / seg.dur)));
      const swell = seg.vis === "rest" ? 1 : 0.8 + 0.2 * k;
      return { open: shape.open * swell, wide: shape.wide, round: shape.round };
    }
    // Past the estimate with no end event yet: the voice is slower than guessed and gave
    // no boundaries to correct it. Keep articulating softly until onend.
    const s = (now - line.origin) / 1000;
    const syll = Math.max(0, Math.sin(s * 9.4) * 0.6 + Math.sin(s * 5.3 + 1.1) * 0.4);
    return { open: 0.15 + 0.4 * syll, wide: 0.45 + 0.25 * Math.sin(s * 3.1), round: 0.2 + 0.2 * Math.sin(s * 2.3 + 2) };
  }

  private sampleAudio(now: number): MouthShape | null {
    const a = this.analyser;
    if (!a || !this.timeData || !this.freqData) return null;
    a.getFloatTimeDomainData(this.timeData);
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) sum += this.timeData[i] * this.timeData[i];
    const rms = Math.sqrt(sum / this.timeData.length);
    if (rms < 0.008) {
      // Short gaps inside a phrase still count as speaking (for idle behaviour).
      return now < this.audioActiveUntil ? REST : null;
    }
    this.audioActiveUntil = now + 400;
    a.getByteFrequencyData(this.freqData);
    const hz = a.context.sampleRate / a.fftSize;
    const band = (lo: number, hi: number) => {
      let e = 0;
      for (let i = Math.floor(lo / hz); i < Math.min(this.freqData!.length, Math.ceil(hi / hz)); i++) e += this.freqData![i];
      return e;
    };
    const low = band(150, 900);
    const mid = band(900, 2500);
    const high = band(2500, 7000);
    const total = low + mid + high || 1;
    const open = Math.min(1, Math.max(0, (rms - 0.01) * 7.5));
    return {
      open,
      // Bright, hissy spectra spread the lips; dark, low-heavy ones round them.
      wide: Math.min(1, 0.25 + ((high + mid * 0.5) / total) * 1.2),
      round: Math.min(1, Math.max(0, (low / total - 0.55) * 2.4)),
    };
  }
}

export const speechMotion = new SpeechMotion();
