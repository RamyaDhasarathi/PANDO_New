import { useSyncExternalStore } from "react";

let supported: boolean | null = null;

function detect() {
  if (supported === null) {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") ?? c.getContext("webgl");
      supported = Boolean(gl);
      // Release the probe context so it doesn't count against the browser's limit.
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      supported = false;
    }
  }
  return supported;
}

const noop = () => () => {};

/** True once on the client when the browser can render WebGL; false during SSR. */
export function useWebGL() {
  return useSyncExternalStore(noop, detect, () => false);
}
