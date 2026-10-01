import * as THREE from "three";
import type { MouthShape } from "@/lib/speechMotion";

/**
 * Pando's face rig. The mascot is a single painted image, so the face is animated where
 * it is drawn: in the texture lookup. Feature positions were measured from pando.png
 * (1190×1559 px) and everything below works in those pixels.
 *
 * - Eyes: the iris and pupil are read from a shifted position, so they really move inside
 *   the eye; whatever they uncover is filled with the sclera's own shading; the catch-lights
 *   stay put, as reflections of the light should. Eyelids are drawn from the lid skin just
 *   above each eye, with the lash line riding the lid edge.
 * - Mouth: the opening follows the painted smile line, and the lower lip and chin are
 *   warped down with the jaw (the upper lip lifts slightly), so the face deforms around
 *   the mouth instead of a shape being stamped on top. Spread and rounding pull the lips
 *   out or in.
 */

const FACE_GLSL = /* glsl */ `
uniform vec2 uGaze;
uniform float uBlink;
uniform vec3 uMouth;

const vec2 ART = vec2(1190.0, 1559.0);
// Eye openings (ellipses) and irises. Iris radii run to the outside of the dark limbal
// ring (~75px), so the whole iris travels together and no ghost ring is left behind.
const vec2 EYE_L_C = vec2(464.0, 453.0);
const vec2 EYE_L_R = vec2(98.0, 95.0);
const vec2 IRIS_L_C = vec2(486.5, 458.5);
const float IRIS_L_R = 75.0;
const vec2 EYE_R_C = vec2(826.0, 452.0);
const vec2 EYE_R_R = vec2(103.0, 95.0);
const vec2 IRIS_R_C = vec2(820.5, 461.5);
const float IRIS_R_R = 75.0;
const vec2 MOUTH_C = vec2(625.0, 681.0);
const float MOUTH_HW = 165.0;
const float MOUTH_K = 50.0;

vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec4 art(vec2 p) { return texture2D(map, vec2(p.x / ART.x, 1.0 - p.y / ART.y)); }

vec3 eyeball(vec2 p, vec3 base, vec2 c, vec2 r, vec2 ic, float ir) {
  vec2 e = (p - c) / r;
  float d = length(e);
  if (d > 1.1) return base;
  float inside = 1.0 - smoothstep(0.93, 1.0, d);

  // Lash and lid-crease pixels of the original stay on top of the moving eyeball.
  float lash = (1.0 - smoothstep(0.08, 0.2, luma(base))) * step(base.b * 1.6, base.r);

  // Iris + pupil, moved by the gaze.
  vec2 qi = p - uGaze;
  float irisMask = 1.0 - smoothstep(ir - 1.5, ir + 0.5, length(qi - ic));
  vec3 iris = art(qi).rgb;
  // The moving iris must not drag its catch-lights along: borrow the mirrored side.
  float glintMoving = smoothstep(0.7, 0.86, min(iris.r, min(iris.g, iris.b)));
  iris = mix(iris, art(vec2(2.0 * ic.x - qi.x, qi.y)).rgb, glintMoving);

  // Sclera: the original white where it was white; where the iris used to be, the white
  // read outward along the same direction (keeps the eye's own shading), with a measured
  // fallback if that read lands on lid or lash.
  // Reaches past the iris's anti-aliased edge so no hairline of it is left behind.
  float origIris = 1.0 - smoothstep(ir + 0.5, ir + 3.0, length(p - ic));
  vec2 dir = normalize(p - ic + vec2(1e-4));
  vec2 sp = ic + dir * (ir + 10.0);
  vec2 se = (sp - c) / r;
  sp = c + se / max(1.0, length(se) / 0.88) * r;
  vec3 pushed = art(sp).rgb;
  vec3 white = lin(vec3(0.93, 0.91, 0.91)) * (1.0 - 0.3 * smoothstep(0.45, 1.0, d));
  pushed = mix(pushed, white, smoothstep(0.5, 0.3, luma(pushed)));
  vec3 sclera = mix(base, pushed, origIris);

  vec3 col = mix(sclera, iris, irisMask);
  // Catch-lights stay where the light put them.
  float glintFixed = smoothstep(0.7, 0.86, min(base.r, min(base.g, base.b))) * (1.0 - smoothstep(ir - 1.5, ir + 0.5, length(p - ic)));
  col = mix(col, base, glintFixed);
  col = mix(col, base, lash);
  return mix(base, col, inside);
}

vec3 eyelids(vec2 p, vec3 col, vec2 c, vec2 r) {
  if (uBlink < 0.001) return col;
  vec2 e = (p - c) / r;
  // The painted eyes sit a little fuller below than an ellipse: give the lids more room there.
  float d = length(vec2(e.x, e.y > 0.0 ? e.y / 1.08 : e.y));
  if (d > 1.2) return col;
  // Fully past the painted eye outline before fading, so a closed eye leaves no ring.
  float region = 1.0 - smoothstep(1.06, 1.18, d);
  float ex = clamp(e.x, -1.0, 1.0);
  float s = sqrt(max(0.0, 1.0 - ex * ex));
  // The lids meet a little below centre, along a gentle curve that follows the lower lid.
  float meet = 0.3 * s + 0.14;
  // Both lids start outside the lid region, so the painted lash line is only covered once
  // the lid actually reaches it.
  float upper = mix(-s - 0.3, meet, uBlink);
  float lower = mix(s + 0.3, meet + 0.03, uBlink * uBlink);
  float aa = 1.6 / r.y;
  float upLid = 1.0 - smoothstep(upper - aa, upper + aa, e.y);
  float loLid = smoothstep(lower - aa, lower + aa, e.y);

  // Lid skin, read from just above the lash line at this x, rounding into shadow at the edge.
  vec3 skinUp = art(vec2(p.x, c.y - r.y * max(s + 0.3, 0.95))).rgb;
  float fromEdge = clamp((upper - e.y) / max(upper + s + 0.3, 0.08), 0.0, 1.0);
  skinUp *= mix(0.8, 1.0, smoothstep(0.0, 0.55, fromEdge));
  vec3 skinLo = art(vec2(p.x, c.y + r.y * max(s + 0.4, 1.12))).rgb * 0.95;

  // The lid casts a soft shadow on the eyeball just below its edge.
  float onset = smoothstep(0.02, 0.18, uBlink);
  float shade = 1.0 - 0.28 * onset * (1.0 - smoothstep(upper, upper + 0.22, e.y));
  vec3 outCol = col * shade;
  outCol = mix(outCol, skinUp, upLid);
  outCol = mix(outCol, skinLo, loLid);
  // Lash line riding the upper lid edge.
  float lashBand = smoothstep(upper - 0.11, upper - 0.06, e.y) * (1.0 - smoothstep(upper - aa, upper + aa, e.y));
  outCol = mix(outCol, lin(vec3(0.4, 0.21, 0.18)), lashBand * onset);
  return mix(col, outCol, region);
}

vec4 pandoFace(vec2 uv) {
  vec2 p = vec2(uv.x * ART.x, (1.0 - uv.y) * ART.y);
  float open = uMouth.x;
  float wide = uMouth.y;
  float rnd = uMouth.z;

  // ---- Mouth: warp the face around it, then paint the opening between the lips.
  vec2 q = p;
  vec4 mouth = vec4(0.0);
  float mx = p.x - MOUTH_C.x;
  float smileY = MOUTH_C.y - MOUTH_K * (mx / MOUTH_HW) * (mx / MOUTH_HW);
  if (abs(mx) < MOUTH_HW * 1.7 && p.y > smileY - 80.0 && p.y < smileY + 150.0) {
    float halfW = MOUTH_HW * (0.5 + 0.3 * wide - 0.24 * rnd);
    float jaw = open * 44.0;
    float lift = open * 6.0;
    float wx = 1.0 - smoothstep(0.0, 1.0, abs(mx) / (halfW * 1.7));
    if (p.y >= smileY) {
      q.y -= jaw * wx * (1.0 - smoothstep(0.0, 115.0, p.y - smileY));
    } else {
      q.y += lift * wx * (1.0 - smoothstep(0.0, 45.0, smileY - p.y));
    }
    float rad = 1.0 - smoothstep(30.0, 175.0, length(vec2(mx, (p.y - smileY) * 1.6)));
    q.x = MOUTH_C.x + mx * (1.0 + (0.2 * rnd - 0.07 * wide) * rad);

    float xn = mx / halfW;
    if (abs(xn) < 1.0 && open > 0.01) {
      float prof = pow(1.0 - xn * xn, mix(0.65, 0.4, rnd));
      float top = smileY - lift * prof + 1.0;
      float bot = smileY + jaw * prof * (1.0 + 0.2 * rnd);
      float cov = smoothstep(top - 1.2, top + 1.2, p.y) * (1.0 - smoothstep(bot - 1.2, bot + 1.2, p.y));
      if (cov > 0.0) {
        float v = (p.y - top) / max(bot - top, 0.001);
        vec3 cavity = mix(lin(vec3(0.2, 0.06, 0.07)), lin(vec3(0.34, 0.1, 0.11)), smoothstep(0.0, 0.6, v));
        float tongue = smoothstep(0.58, 0.8, v - 0.28 * xn * xn) * smoothstep(0.25, 0.5, open);
        cavity = mix(cavity, lin(vec3(0.7, 0.33, 0.33)), tongue * 0.8);
        float rim = 1.0 - smoothstep(0.0, 3.0, min(p.y - top, bot - p.y));
        cavity = mix(cavity, lin(vec3(0.55, 0.3, 0.26)), rim * 0.55);
        mouth = vec4(cavity, cov);
      }
    }
  }

  vec4 base = art(q);
  if (base.a > 0.5) {
    base.rgb = eyeball(p, base.rgb, EYE_L_C, EYE_L_R, IRIS_L_C, IRIS_L_R);
    base.rgb = eyeball(p, base.rgb, EYE_R_C, EYE_R_R, IRIS_R_C, IRIS_R_R);
    base.rgb = eyelids(p, base.rgb, EYE_L_C, EYE_L_R);
    base.rgb = eyelids(p, base.rgb, EYE_R_C, EYE_R_R);
    base.rgb = mix(base.rgb, mouth.rgb, mouth.a);
  }
  return base;
}
`;

export interface FaceUniforms {
  uGaze: { value: THREE.Vector2 };
  uBlink: { value: number };
  uMouth: { value: THREE.Vector3 };
}

/** Patch a material's texture lookup with the face rig. Returns the uniforms to drive. */
export function applyFaceRig(material: THREE.Material): FaceUniforms {
  const uniforms: FaceUniforms = {
    uGaze: { value: new THREE.Vector2() },
    uBlink: { value: 0 },
    uMouth: { value: new THREE.Vector3(0, 0.35, 0) },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <map_pars_fragment>", `#include <map_pars_fragment>\n${FACE_GLSL}`)
      .replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
          vec4 sampledDiffuseColor = pandoFace(vMapUv);
          diffuseColor *= sampledDiffuseColor;
        #endif`,
      );
  };
  material.customProgramCacheKey = () => "pando-face-rig";
  return uniforms;
}

/* ------------------------------------------------------------------ */
/* Behaviour: blinks, gaze, saccades, mouth smoothing                  */
/* ------------------------------------------------------------------ */

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const damp = THREE.MathUtils.damp;

export interface FaceInput {
  /** Where the user's pointer is relative to Pando, roughly -1…1 (x right, y up). */
  pointer: { x: number; y: number };
  /** Seconds since the pointer last moved. */
  pointerIdle: number;
  speaking: boolean;
  thinking: boolean;
  mouth: MouthShape;
}

export interface HeadPose {
  /** Where the head is pointed, same units as the gaze (x right, y up). */
  x: number;
  y: number;
  /** Speech emphasis, 0…1: small nods and bobs. */
  emphasis: number;
}

export class FaceAnimator {
  readonly head: HeadPose = { x: 0, y: 0, emphasis: 0 };
  private eye = { x: 0, y: 0 };
  private target = { x: 0, y: 0 };
  private glance: { x: number; y: number; until: number } | null = null;
  private nextGlance = rand(2.5, 5);
  private micro = { x: 0, y: 0, next: 0 };
  private blinkStart = -1;
  private blinkLen = 0.2;
  private nextBlink = rand(1.2, 3.5);
  private doubleBlink = false;
  private mouth = { open: 0, wide: 0.35, round: 0 };

  /** Development only: pin parts of the face for inspection. */
  hold: { blink?: number; gaze?: [number, number]; mouth?: [number, number, number] } | null = null;

  constructor(private readonly u: FaceUniforms) {}

  /** Dev hook: blink now. */
  blinkNow(t: number) {
    this.blinkStart = t;
  }

  update(t: number, dt: number, input: FaceInput) {
    // ---- Attention: the user (camera) by default; the cursor while it moves; the odd
    // glance away; a thoughtful look up-and-aside while Pando is working something out.
    let tx = 0;
    let ty = 0;
    if (input.pointerIdle < 1.6) {
      tx = input.pointer.x;
      ty = input.pointer.y;
    }
    if (input.thinking) {
      tx = 0.55;
      ty = 0.5;
    }
    if (!this.glance && t > this.nextGlance && !input.thinking) {
      // Talking to someone, you glance away less, and only briefly.
      const away = input.speaking ? 0.35 : 0.7;
      this.glance = {
        x: rand(-away, away),
        y: rand(-0.25, input.speaking ? 0.15 : 0.35),
        until: t + rand(0.45, input.speaking ? 0.8 : 1.4),
      };
      this.nextGlance = t + rand(input.speaking ? 3.5 : 2.5, input.speaking ? 7 : 6);
    }
    if (this.glance) {
      if (t > this.glance.until) this.glance = null;
      else if (input.pointerIdle >= 1.6) {
        tx = this.glance.x;
        ty = this.glance.y;
      }
    }
    // A big jump in attention is a saccade: often accompanied by a blink.
    const jump = Math.hypot(tx - this.target.x, ty - this.target.y);
    if (jump > 0.35 && t - this.blinkStart > 0.9 && Math.random() < 0.35) this.blinkStart = t;
    this.target.x = tx;
    this.target.y = ty;

    // Eyes: fast saccades toward the target, plus tiny fixational micro-saccades.
    if (t > this.micro.next) {
      this.micro.x = rand(-0.035, 0.035);
      this.micro.y = rand(-0.025, 0.025);
      this.micro.next = t + rand(0.35, 1.1);
    }
    this.eye.x = damp(this.eye.x, tx + this.micro.x, 22, dt);
    this.eye.y = damp(this.eye.y, ty + this.micro.y, 22, dt);

    // Head: follows the same attention, slower and only part of the way — the eyes lead.
    // Idle life: slow, non-repeating drift.
    const drift = {
      x: Math.sin(t * 0.37) * 0.05 + Math.sin(t * 0.83 + 1.3) * 0.03,
      y: Math.sin(t * 0.29 + 0.6) * 0.035 + Math.sin(t * 0.71 + 2.1) * 0.02,
    };
    this.head.x = damp(this.head.x, tx * 0.6 + drift.x, 2.6, dt);
    this.head.y = damp(this.head.y, ty * 0.5 + drift.y, 2.6, dt);

    // Eyes within the head: whatever the head hasn't turned yet, they make up for —
    // which also keeps them locked on the user while the head sways.
    const relX = this.eye.x - this.head.x;
    const relY = this.eye.y - this.head.y;
    this.u.uGaze.value.set(
      THREE.MathUtils.clamp(relX * 26, -18, 18),
      THREE.MathUtils.clamp(-relY * 12, -8, 8),
    );

    // ---- Blinks: irregular, occasionally doubled; close fast, open slower.
    if (this.blinkStart < 0 && t > this.nextBlink) {
      this.blinkStart = t;
      this.doubleBlink = Math.random() < 0.15;
    }
    let blink = 0;
    if (this.blinkStart >= 0) {
      const k = (t - this.blinkStart) / this.blinkLen;
      if (k >= 1) {
        if (this.doubleBlink) {
          this.doubleBlink = false;
          this.blinkStart = t + 0.06;
        } else {
          this.blinkStart = -1;
          this.blinkLen = rand(0.17, 0.24);
          this.nextBlink = t + rand(1.8, 5.8);
        }
      } else if (k >= 0) {
        // 35% closing (ease-in), 10% held, 55% opening (ease-out).
        blink = k < 0.35 ? (k / 0.35) ** 2 : k < 0.45 ? 1 : 1 - ((k - 0.45) / 0.55) ** 0.6;
      }
    }
    this.u.uBlink.value = blink;

    // ---- Mouth: follow the lip-sync target, opening quicker than closing (coarticulation).
    const m = input.mouth;
    const o = this.mouth;
    o.open = damp(o.open, m.open, m.open > o.open ? 30 : 16, dt);
    o.wide = damp(o.wide, m.wide, 16, dt);
    o.round = damp(o.round, m.round, 16, dt);
    this.u.uMouth.value.set(o.open, o.wide, o.round);
    this.head.emphasis = damp(this.head.emphasis, o.open, 6, dt);

    const h = this.hold;
    if (h) {
      if (h.blink !== undefined) this.u.uBlink.value = h.blink;
      if (h.gaze) this.u.uGaze.value.set(h.gaze[0], h.gaze[1]);
      if (h.mouth) this.u.uMouth.value.set(...h.mouth);
    }
  }
}
