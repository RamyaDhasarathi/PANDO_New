"use client";
/* eslint-disable react-hooks/immutability -- three.js objects (uniforms, cameras, materials) are mutated per frame by design. */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

/**
 * Dubai at dusk, in real 3D: a fogged skyline of glass towers with lit windows, a
 * stepped supertall with a beacon, a mirror-calm creek, a terrace in the foreground,
 * drifting light motes and a few air taxis. The camera breathes on its own and leans
 * with the pointer; the tower under the cursor lights up in mint.
 */

const C = {
  skyTop: "#fbefe9",
  skyMid: "#f6d4cf",
  horizon: "#f4b9a6",
  fog: "#f2c0b2",
  towerDark: "#9d7386",
  towerLight: "#d3a9b4",
  rim: "#ff7a55",
  window: "#fff0dc",
  mint: "#b5ffc2",
  coral: "#ff3319",
};

/** Deterministic PRNG: the same skyline on every load. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shared pointer, in normalised device coordinates of the window. */
function usePointer() {
  const p = useRef({ x: 0, y: 0, active: false });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      p.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
      p.current.active = true;
    };
    const leave = () => (p.current.active = false);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);
  return p;
}

/* ------------------------------------------------------------------ */
/* Sky                                                                 */
/* ------------------------------------------------------------------ */

function Sky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color(C.skyTop) },
          uMid: { value: new THREE.Color(C.skyMid) },
          uHorizon: { value: new THREE.Color(C.horizon) },
          uSun: { value: new THREE.Color("#ffe2c4") },
          uSunDir: { value: new THREE.Vector3(0.32, 0.05, -1).normalize() },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop, uMid, uHorizon, uSun, uSunDir;
          varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y, 0.0, 1.0);
            vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.12, h));
            col = mix(col, uTop, smoothstep(0.12, 0.5, h));
            float sun = max(dot(normalize(vDir), uSunDir), 0.0);
            col += uSun * (pow(sun, 18.0) * 0.55 + pow(sun, 400.0) * 0.6);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  return (
    <mesh material={material} renderOrder={-1}>
      <sphereGeometry args={[480, 32, 16]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Towers                                                              */
/* ------------------------------------------------------------------ */

interface TowerSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

function buildTowers(): TowerSpec[] {
  const r = rng(11);
  const towers: TowerSpec[] = [];
  for (let i = 0; i < 320; i++) {
    const x = -230 + r() * 460;
    const z = -75 - r() * 190;
    // Keep the left (behind the headline) low, let the skyline rise behind Pando.
    const side = THREE.MathUtils.smoothstep(x, -90, 40);
    const tall = r() < 0.15 ? 2 : 1;
    const h = (6 + r() * 20) * (0.3 + side * 0.9) * tall * (1 + (-z - 75) / 200);
    towers.push({ x, z, w: 3 + r() * 7, d: 3 + r() * 7, h });
  }
  return towers;
}

/** The signature supertall: stepped tiers narrowing to a needle. Stylised, not a replica. */
const SUPERTALL_X = 58;
const SUPERTALL_Z = -150;
const SUPERTALL_TIERS = [
  { w: 9, h: 18 },
  { w: 7.2, h: 15 },
  { w: 5.6, h: 13 },
  { w: 4.2, h: 11 },
  { w: 3, h: 10 },
  { w: 1.8, h: 8 },
  { w: 0.6, h: 18 },
];
const SUPERTALL_TOP = SUPERTALL_TIERS.reduce((s, t) => s + t.h, 0);

function towerMaterial() {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uDark: { value: new THREE.Color(C.towerDark) },
        uLight: { value: new THREE.Color(C.towerLight) },
        uRim: { value: new THREE.Color(C.rim) },
        uWindow: { value: new THREE.Color(C.window) },
        uMint: { value: new THREE.Color(C.mint) },
        uSunDir: { value: new THREE.Vector3(0.45, 0.25, -1).normalize() },
        uHover: { value: -1 },
        uHoverAmt: { value: 0 },
        uTime: { value: 0 },
      },
    ]),
    vertexShader: /* glsl */ `
      attribute float aId;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vId;
      #include <fog_pars_vertex>
      void main() {
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = modelMatrix * instanceMatrix;
          vId = aId;
        #else
          vId = -10.0;
        #endif
        vec4 world = m * vec4(position, 1.0);
        vWorldPos = world.xyz;
        vNormal = normalize(mat3(m) * normal);
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uDark, uLight, uRim, uWindow, uMint, uSunDir;
      uniform float uHover, uHoverAmt, uTime;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vId;
      #include <fog_pars_fragment>

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

      void main() {
        vec3 n = normalize(vNormal);
        float roof = step(0.9, n.y);
        vec2 facade = abs(n.x) > 0.5 ? vWorldPos.zy : vWorldPos.xy;

        // Glass: darker at street level, lifting toward the sky
        vec3 col = mix(uDark, uLight, clamp(vWorldPos.y / 70.0, 0.0, 1.0));
        // Backlit by the low sun: warm rim on faces turned toward it
        float rim = pow(max(dot(n, normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0), 2.0);
        col = mix(col, uRim, rim * 0.45);
        // Sky reflection: faces toward the camera pick up a soft cream sheen
        col += vec3(0.06, 0.04, 0.05) * max(n.z, 0.0);

        // Windows, on a world-space grid so tall towers keep square floors
        vec2 cell = facade / vec2(1.7, 1.35);
        vec2 f = fract(cell);
        vec2 id = floor(cell);
        // Fade the grid out where a window gets smaller than a couple of pixels (no shimmer).
        vec2 fw = fwidth(cell);
        float detail = 1.0 - smoothstep(0.25, 0.6, max(fw.x, fw.y));
        float pane = step(0.16, f.x) * step(f.x, 0.84) * step(0.22, f.y) * step(f.y, 0.82);
        float slab = 1.0 - step(0.07, f.y);
        // Lit in runs along a floor, like occupied offices, rather than as random noise.
        float r = hash(vec2(floor(id.x / 4.0), id.y) + vec2(vId * 3.7, vId * 1.3));
        float rr = hash(id + vId);
        float lit = step(0.7, r) * step(0.2, rr) * (0.8 + 0.2 * sin(uTime * 0.5 + r * 40.0));
        // Far away, windows blend into an even glow instead of noise.
        pane = mix(0.55, pane, detail);
        lit = mix(0.2, lit, detail);
        slab *= detail;
        vec3 winCol = mix(uWindow, uMint, step(0.97, r));

        float hovered = (1.0 - step(0.5, abs(vId - uHover))) * uHoverAmt;
        lit = mix(lit, 1.0, hovered * step(0.2, r));
        winCol = mix(winCol, uMint, hovered);

        col = mix(col, col * 0.93, pane * (1.0 - lit) * (1.0 - roof));
        col = mix(col, winCol, pane * lit * 0.45 * (1.0 - roof));
        col += vec3(0.035) * slab * (1.0 - roof);
        col = mix(col, uLight * 1.08, roof);
        col += uMint * hovered * 0.12;

        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

function Towers({ pointer }: { pointer: React.RefObject<{ x: number; y: number; active: boolean }> }) {
  const material = useMemo(() => towerMaterial(), []);
  const specs = useMemo(() => buildTowers(), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.translate(0, 0.5, 0);
    g.setAttribute(
      "aId",
      new THREE.InstancedBufferAttribute(Float32Array.from(specs.map((_, i) => i)), 1),
    );
    return g;
  }, [specs]);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new THREE.Object3D();
    specs.forEach((t, i) => {
      o.position.set(t.x, 0, t.z);
      o.scale.set(t.w, t.h, t.d);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [specs]);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const frame = useRef(0);
  const current = useRef(-1);

  useFrame(({ camera, clock }, delta) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    const m = mesh.current;
    if (!m) return;
    // Hover: raycast a few times a second, then ease the glow in and out.
    if (++frame.current % 4 === 0) {
      let hit = -1;
      if (pointer.current.active) {
        ndc.set(pointer.current.x, pointer.current.y);
        raycaster.setFromCamera(ndc, camera);
        hit = raycaster.intersectObject(m, false)[0]?.instanceId ?? -1;
      }
      if (hit !== current.current) {
        if (hit >= 0) {
          material.uniforms.uHover.value = hit;
          material.uniforms.uHoverAmt.value = 0;
        }
        current.current = hit;
      }
    }
    const target = current.current >= 0 ? 1 : 0;
    const u = material.uniforms.uHoverAmt;
    u.value = THREE.MathUtils.damp(u.value, target, 6, delta);
  });

  return (
    <>
      <instancedMesh ref={mesh} args={[geometry, material, specs.length]} frustumCulled={false} />
      {/* Supertall */}
      <group position={[SUPERTALL_X, 0, SUPERTALL_Z]}>
        {SUPERTALL_TIERS.reduce<{ y: number; els: React.ReactNode[] }>(
          (acc, t, i) => {
            acc.els.push(
              <mesh key={i} material={material} position={[0, acc.y + t.h / 2, 0]}>
                <boxGeometry args={[t.w, t.h, t.w]} />
              </mesh>,
            );
            acc.y += t.h;
            return acc;
          },
          { y: 0, els: [] },
        ).els}
      </group>
    </>
  );
}

function Beacon() {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (!mat.current) return;
    const t = clock.elapsedTime % 2.6;
    mat.current.opacity = t > 2.0 && t < 2.3 ? 1 : 0.2;
  });
  return (
    <mesh position={[SUPERTALL_X, SUPERTALL_TOP + 0.4, SUPERTALL_Z]}>
      <sphereGeometry args={[0.6, 12, 12]} />
      <meshBasicMaterial ref={mat} color={C.coral} transparent fog={false} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Water and terrace                                                   */
/* ------------------------------------------------------------------ */

function Water() {
  const { size, viewport } = useThree();
  const mirror = useMemo(() => {
    const r = new Reflector(new THREE.PlaneGeometry(900, 320), {
      color: new THREE.Color("#f0b6a8"),
      textureWidth: Math.round((size.width * viewport.dpr) / 2),
      textureHeight: Math.round((size.height * viewport.dpr) / 2),
    });
    r.rotation.x = -Math.PI / 2;
    r.position.set(0, 0, -160);
    return r;
    // Rebuilt only on mount; a lower-res reflection is part of the soft look.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => mirror.dispose(), [mirror]);

  return (
    <>
      <primitive object={mirror} />
      {/* Haze over the water so the reflection reads as dusk-calm water, not a mirror */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, -160]}>
        <planeGeometry args={[900, 320]} />
        <meshBasicMaterial color="#f3c1b4" transparent opacity={0.5} />
      </mesh>
    </>
  );
}

function tileTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#efcdc8";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(255,246,242,0.55)";
  g.lineWidth = 2;
  g.strokeRect(1, 1, 254, 254);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(150, 12);
  t.anisotropy = 8;
  return t;
}

function Terrace() {
  const map = useMemo(() => tileTexture(), []);
  const rail = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (rail.current) rail.current.opacity = 0.65 + Math.sin(clock.elapsedTime * 0.8) * 0.15;
  });
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.6, 20]}>
        <planeGeometry args={[600, 48]} />
        <meshStandardMaterial map={map} color="#fff1ee" emissive="#6e4448" emissiveIntensity={0.35} roughness={0.7} metalness={0} />
      </mesh>
      {/* Slab edge */}
      <mesh position={[0, 0.3, -4]}>
        <boxGeometry args={[600, 0.6, 0.4]} />
        <meshStandardMaterial color="#d9adb0" roughness={0.5} />
      </mesh>
      {/* Glass rail with a mint light line */}
      <mesh position={[0, 1.15, -3.9]}>
        <planeGeometry args={[600, 1.1]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0} transparent opacity={0.14} roughness={0.1} />
      </mesh>
      <mesh position={[0, 1.72, -3.9]}>
        <boxGeometry args={[600, 0.05, 0.05]} />
        <meshBasicMaterial ref={rail} color={C.mint} transparent fog={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Atmosphere                                                          */
/* ------------------------------------------------------------------ */

function Motes({ reduce }: { reduce: boolean }) {
  const { geometry, material } = useMemo(() => {
    const r = rng(5);
    const n = 260;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const tint = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = -60 + r() * 120;
      pos[i * 3 + 1] = 0.5 + r() * 26;
      pos[i * 3 + 2] = 18 - r() * 90;
      seed[i] = r();
      tint[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aTint", new THREE.BufferAttribute(tint, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPx: { value: Math.min(window.devicePixelRatio, 2) },
        uMint: { value: new THREE.Color(C.mint) },
        uCream: { value: new THREE.Color("#fff3e6") },
        uCoral: { value: new THREE.Color("#ff9a7a") },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        attribute float aTint;
        uniform float uTime, uPx;
        varying float vTint;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.y += sin(uTime * 0.25 + aSeed * 30.0) * 1.2;
          p.x += cos(uTime * 0.18 + aSeed * 20.0) * 0.8;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (2.0 + aSeed * 4.0) * uPx * (30.0 / -mv.z);
          vTint = aTint;
          vAlpha = 0.35 + 0.45 * (0.5 + 0.5 * sin(uTime * 0.9 + aSeed * 50.0));
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uMint, uCream, uCoral;
        varying float vTint;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          vec3 col = vTint < 0.3 ? uMint : vTint < 0.8 ? uCream : uCoral;
          gl_FragColor = vec4(col, a * vAlpha);
          #include <colorspace_fragment>
        }`,
    });
    return { geometry: g, material: m };
  }, []);
  useFrame(({ clock }) => {
    if (!reduce) material.uniforms.uTime.value = clock.elapsedTime;
  });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

/** Air taxis gliding over the creek on long, lazy loops. */
const FLYERS = [
  { r: 90, y: 26, speed: 0.035, phase: 0, color: C.mint },
  { r: 120, y: 36, speed: -0.025, phase: 2, color: "#fff3e6" },
  { r: 70, y: 18, speed: 0.045, phase: 4, color: "#ffb4a3" },
];

function Flyers({ reduce }: { reduce: boolean }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = reduce ? 0 : clock.elapsedTime;
    FLYERS.forEach((f, i) => {
      const g = refs.current[i];
      if (!g) return;
      const a = f.phase + t * f.speed;
      g.position.set(Math.cos(a) * f.r, f.y + Math.sin(t * 0.4 + i) * 0.6, -120 + Math.sin(a) * 45);
      g.rotation.y = -a + (f.speed > 0 ? 0 : Math.PI);
    });
  });
  return (
    <>
      {FLYERS.map((f, i) => (
        <group key={i} ref={(g) => void (refs.current[i] = g)}>
          <mesh>
            <sphereGeometry args={[0.35, 10, 10]} />
            <meshBasicMaterial color={f.color} fog={false} />
          </mesh>
          <mesh position={[0, 0, 2.2]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.02, 0.22, 4.4, 8, 1, true]} />
            <meshBasicMaterial color={f.color} transparent opacity={0.35} fog={false} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Camera rig                                                          */
/* ------------------------------------------------------------------ */

function CameraRig({
  pointer,
  reduce,
}: {
  pointer: React.RefObject<{ x: number; y: number; active: boolean }>;
  reduce: boolean;
}) {
  const look = useMemo(() => new THREE.Vector3(), []);
  const smooth = useRef({ x: 0, y: 0 });
  useFrame(({ camera, clock }, delta) => {
    const t = reduce ? 0 : clock.elapsedTime;
    const s = smooth.current;
    s.x = THREE.MathUtils.damp(s.x, pointer.current.active ? pointer.current.x : 0, 2.2, delta);
    s.y = THREE.MathUtils.damp(s.y, pointer.current.active ? pointer.current.y : 0, 2.2, delta);
    // Slow dolly + slider drift, plus a lean toward the pointer (the parallax is real depth).
    camera.position.set(
      Math.sin(t * 0.06) * 2.4 + s.x * 2.6,
      4.2 + Math.sin(t * 0.045) * 0.35 + s.y * 0.9,
      30 - Math.sin(t * 0.035) * 1.6,
    );
    look.set(s.x * 4 + 4, 9 + s.y * 1.5, -40);
    camera.lookAt(look);
  });
  return null;
}

function Scene({ reduce, onReady }: { reduce: boolean; onReady: () => void }) {
  const pointer = usePointer();
  const ready = useRef(false);
  useFrame(() => {
    if (ready.current) return;
    ready.current = true;
    // Let the first frame paint before the canvas fades in over the static poster.
    requestAnimationFrame(onReady);
  });

  return (
    <>
      <fog attach="fog" args={[C.fog, 50, 300]} />
      <hemisphereLight args={["#fff4ee", "#e2b2b4", 2.2]} />
      <directionalLight position={[40, 30, -60]} intensity={1.2} color="#ffd2b8" />
      <Sky />
      <Towers pointer={pointer} />
      <Beacon />
      <Water />
      <Terrace />
      <Motes reduce={reduce} />
      <Flyers reduce={reduce} />
      <CameraRig pointer={pointer} reduce={reduce} />
    </>
  );
}

export default function DubaiCity3D({ reduce, onReady }: { reduce: boolean; onReady: () => void }) {
  return (
    <Canvas
      flat
      dpr={[1, 1.75]}
      camera={{ fov: 38, near: 0.5, far: 1000, position: [0, 4.2, 30] }}
      // Layout size, like the mascot canvas: never let a CSS transform resize the buffer.
      resize={{ offsetSize: true }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Scene reduce={reduce} onReady={onReady} />
    </Canvas>
  );
}
