"use client";
/* eslint-disable react-hooks/immutability -- the R3F scene is a mutable three.js object by design. */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { speechMotion } from "@/lib/speechMotion";
import { OVERHANG } from "./mascotFrame";
import { applyFaceRig, FaceAnimator } from "./pandoFace";

/**
 * Pando in 3D, made from the mascot artwork itself: the image's silhouette is inflated
 * into a rounded relief (a distance field from the edge, given a circular profile), so
 * the character is exactly the supplied Pando, only now with real depth — he turns
 * toward the cursor, catches the dusk light of the city behind him, and floats with an
 * idle sway. His face is rigged in the texture lookup (`pandoFace.ts`): he blinks, looks
 * at you, glances away and lip-syncs to whatever he's saying (`lib/speechMotion.ts`).
 */

const SRC = "/pando.png";
/** pando.png is 1190×1559; the artwork runs to within 2px of every edge. */
const ART_ASPECT = 1559 / 1190;
const COLS = 150;
const WIDTH = 2;
const HEIGHT = WIDTH * ART_ASPECT;
const DEPTH = 0.36;
const CAMERA_Z = 7.4;

export type MascotMood = "idle" | "listening" | "thinking" | "speaking";

/** The user's pointer relative to Pando's eyes (-1…1, y up) and when it last moved. */
export interface GazePointer {
  x: number;
  y: number;
  /** performance.now() of the last move. */
  at: number;
}

/** Height field from the image alpha: chamfer distance to the edge → round "inflated" profile. */
function relief(img: HTMLImageElement, cols: number) {
  const rows = Math.round((cols * img.naturalHeight) / img.naturalWidth);
  const c = document.createElement("canvas");
  c.width = cols;
  c.height = rows;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, cols, rows);
  const data = g.getImageData(0, 0, cols, rows).data;

  const n = cols * rows;
  const BIG = 1e6;
  const d = new Float32Array(n);
  for (let i = 0; i < n; i++) d[i] = data[i * 4 + 3] > 127 ? BIG : 0;

  // Two-pass 3-4 chamfer distance transform.
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows ? 0 : d[y * cols + x]);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4);
    }
  for (let y = rows - 1; y >= 0; y--)
    for (let x = cols - 1; x >= 0; x--) {
      const i = y * cols + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4);
    }

  let max = 0;
  for (let i = 0; i < n; i++) max = Math.max(max, d[i]);
  const R = max || 1;
  let h = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const k = Math.min(d[i], R);
    h[i] = Math.sqrt(Math.max(0, 2 * R * k - k * k)) / R;
  }

  // Carry the surface a few cells past the silhouette. Without this the relief drops to
  // zero in a single cell at the edge, and that wall stretches the artwork's anti-aliased
  // outline pixels into a visible band when Pando turns. With it, the silhouette is cut
  // only by the texture's alpha, on a smooth surface.
  const inside = Uint8Array.from(d, (v) => (v > 0 ? 1 : 0));
  for (let pass = 0; pass < 3; pass++) {
    const grown = h.slice();
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (inside[i]) continue;
        let m = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue;
            m = Math.max(m, h[yy * cols + xx]);
          }
        grown[i] = m * 0.9;
      }
    h = grown;
  }

  // Soften the chamfer facets.
  for (let pass = 0; pass < 3; pass++) {
    const out = new Float32Array(n);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        let s = 0;
        let w = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue;
            s += h[yy * cols + xx];
            w++;
          }
        out[y * cols + x] = s / w;
      }
    h = out;
  }

  const geo = new THREE.PlaneGeometry(WIDTH, (WIDTH * rows) / cols, cols - 1, rows - 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, h[i] * DEPTH);
  geo.computeVertexNormals();
  return geo;
}

/** Frame the camera so the relief maps exactly onto the artwork's box inside the overhang. */
function Framing() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useEffect(() => {
    const visible = HEIGHT * (1 + 2 * OVERHANG.y);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(visible / 2 / CAMERA_Z));
    camera.position.set(0, 0, CAMERA_Z);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

/**
 * Dusk environment matching the city: cream sky, peach horizon, mauve ground and a low
 * warm sun behind Pando on the screen-right side, where the city's sun sits. Reflections
 * and soft fill come from this, so he's lit by the same light as the skyline.
 */
function useDuskEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const envScene = new THREE.Scene();
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(10, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          uTop: { value: new THREE.Color("#fbefe9") },
          uHorizon: { value: new THREE.Color("#f2b4a2") },
          uGround: { value: new THREE.Color("#9c7284") },
          uSun: { value: new THREE.Color("#ffc9a3") },
          uSunDir: { value: new THREE.Vector3(0.6, 0.2, -0.78).normalize() },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop, uHorizon, uGround, uSun, uSunDir;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            vec3 col = d.y > 0.0
              ? mix(uHorizon, uTop, smoothstep(0.0, 0.6, d.y))
              : mix(uHorizon, uGround, smoothstep(0.0, 0.35, -d.y));
            col += uSun * pow(max(dot(d, uSunDir), 0.0), 24.0) * 3.0;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    envScene.add(sky);
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(envScene, 0.02).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.6;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
      sky.geometry.dispose();
      (sky.material as THREE.Material).dispose();
    };
  }, [gl, scene]);
}

function Pando({
  pointer,
  mood,
  hovered,
  reduce,
  onReady,
}: {
  pointer: RefObject<GazePointer>;
  mood: MascotMood;
  hovered: boolean;
  reduce: boolean;
  onReady: () => void;
}) {
  useDuskEnvironment();
  const [assets, setAssets] = useState<{ geo: THREE.BufferGeometry; map: THREE.Texture } | null>(null);
  const group = useRef<THREE.Group>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const mint = useRef<THREE.PointLight>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.src = SRC;
    img.onload = () => {
      if (cancelled) return;
      const map = new THREE.Texture(img);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 8;
      map.needsUpdate = true;
      setAssets({ geo: relief(img, COLS), map });
    };
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!assets) return;
    const id = requestAnimationFrame(onReady);
    return () => {
      cancelAnimationFrame(id);
      assets.geo.dispose();
      assets.map.dispose();
    };
  }, [assets, onReady]);

  // The artwork's material, with the face rig patched into its texture lookup.
  const rig = useMemo(() => {
    if (!assets) return null;
    const material = new THREE.MeshPhysicalMaterial({
      map: assets.map,
      // Blend the artwork's own anti-aliased edge instead of alpha-to-coverage, which
      // dithers the outline wherever MSAA is weak or missing.
      transparent: true,
      alphaTest: 0.04,
      roughness: 0.44,
      specularIntensity: 0.5,
      clearcoat: 0.35,
      clearcoatRoughness: 0.3,
    });
    return { material, face: new FaceAnimator(applyFaceRig(material)) };
  }, [assets]);
  useEffect(() => () => rig?.material.dispose(), [rig]);

  const clockT = useRef(0);
  // Development hook for checking the rig by hand: __pando.say("…"), __pando.blink().
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !rig) return;
    const w = window as unknown as { __pando?: object };
    w.__pando = {
      say: (text: string, rate = 1) => speechMotion.startText(text, rate),
      stop: () => speechMotion.stopText(),
      blink: () => rig.face.blinkNow(clockT.current),
      hold: (h: FaceAnimator["hold"]) => (rig.face.hold = h),
      state: () => ({ speaking: speechMotion.speaking, ...speechMotion.sample() }),
    };
    return () => {
      delete w.__pando;
    };
  }, [rig]);

  const scale = useRef(1);
  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g || !rig) return;
    const t = clock.elapsedTime;
    clockT.current = t;
    const now = performance.now();
    const thinking = mood === "thinking";

    // Face first: attention, blinks and the lip-sync target for this instant.
    rig.face.update(t, delta, {
      pointer: pointer.current,
      pointerIdle: (now - pointer.current.at) / 1000,
      speaking: speechMotion.speaking || mood === "speaking",
      thinking,
      mouth: speechMotion.sample(now),
    });
    const head = rig.face.head;

    // The head (all of Pando) follows the same attention as the eyes, a beat behind them,
    // nodding lightly on stressed syllables. Limited so the relief stays inside the canvas.
    const amp = reduce ? 0.35 : 1;
    const tt = reduce ? 0 : t;
    const fast = thinking ? 2.6 : 1;
    scale.current = THREE.MathUtils.damp(scale.current, hovered ? 1.04 : 1, 6, delta);
    g.rotation.set(
      (-head.y * 0.16 + head.emphasis * 0.035) * amp,
      THREE.MathUtils.clamp(head.x * 0.42, -0.45, 0.45) * amp,
      (Math.sin(tt * 0.7 * fast) * 0.02 + Math.sin(tt * 0.31 + 1) * 0.008) * amp,
    );
    g.position.y = Math.sin(tt * 1.15 * fast) * (thinking ? 0.06 : 0.035) + head.emphasis * 0.012 * amp;
    // Breathing: a hair of squash and stretch.
    const breathe = 1 + Math.sin(tt * 2.1) * 0.006;
    g.scale.set(scale.current / breathe, scale.current * breathe, scale.current);

    if (rim.current) rim.current.intensity = THREE.MathUtils.damp(rim.current.intensity, hovered ? 3.4 : 2.2, 5, delta);
    if (mint.current)
      mint.current.intensity = THREE.MathUtils.damp(mint.current.intensity, mood === "listening" ? 7 : 0, 4, delta);
  });

  return (
    <>
      <Framing />
      {/* Soft key from the front-left: keeps the face at its true, artwork brightness */}
      <directionalLight position={[-2, 3, 5]} intensity={2.3} color="#fffaf5" />
      {/* Low dusk sun from behind, on the city's sun side: a warm rim, not a glow */}
      <directionalLight ref={rim} position={[3.2, 1.4, -2.6]} intensity={2.2} color="#ffa47c" />
      {/* Mint "listening" light, off at rest */}
      <pointLight ref={mint} position={[-1.8, -0.8, 1.6]} intensity={0} color="#b5ffc2" distance={6} />
      <group ref={group}>{assets && rig && <mesh geometry={assets.geo} material={rig.material} />}</group>
    </>
  );
}

export default function PandoMascot3D(props: {
  pointer: RefObject<GazePointer>;
  mood: MascotMood;
  hovered: boolean;
  reduce: boolean;
  onReady: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      // Measure the layout box, not the transformed one: the dock scales Pando with CSS,
      // and a transformed measurement oversizes the canvas inside R3F's overflow-hidden
      // wrapper — which is what cropped his right arm and the tip of his base.
      resize={{ offsetSize: true }}
      camera={{ position: [0, 0, CAMERA_Z] }}
      gl={{ antialias: true, alpha: true, premultipliedAlpha: true, toneMapping: THREE.NeutralToneMapping }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <Pando {...props} />
    </Canvas>
  );
}
