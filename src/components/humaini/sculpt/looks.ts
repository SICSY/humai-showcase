import gsap from "gsap";
import { sculptFragmentShader, sculptFragmentShaderChrome, sculptFragmentShaderPrism } from "./shaders";

export type SculptLook = {
  id: string;
  label: string;
  fragmentShader: string;
  mesh: { gold: string; hot: string };
  env: {
    bg: string;
    halo: string;
    haze: string;
    bloom: string;
    ray: string;
    spark: string;
    streakTint: string;
    flash: string;
    streak: number;
    ca: number;
    vignette: number;
    exposure: number;
    grain: number;
  };
  particles: { tint: string; mix: number };
};

export const SCULPT_LOOKS: SculptLook[] = [
  {
    id: "molten",
    label: "Emas Dilebur",
    fragmentShader: sculptFragmentShader,
    mesh: { gold: "#ffb52e", hot: "#fff0b8" },
    env: {
      bg: "#000000",
      halo: "#080401",
      haze: "#0d0601",
      bloom: "#ffb34d",
      ray: "#ffa33d",
      spark: "#ffc761",
      streakTint: "#ffc98a",
      flash: "#ffd9a0",
      streak: 0.85,
      ca: 0.0016,
      vignette: 0.74,
      exposure: 0.09,
      grain: 0.02
    },
    particles: { tint: "#ffffff", mix: 0 }
  },
  {
    id: "prism",
    label: "Prisma Gaib",
    fragmentShader: sculptFragmentShaderPrism,
    mesh: { gold: "#b9a6ff", hot: "#ffffff" },
    env: {
      bg: "#000000",
      halo: "#050308",
      haze: "#070a14",
      bloom: "#cfe0ff",
      ray: "#b9c8ff",
      spark: "#e8f2ff",
      streakTint: "#d5e6ff",
      flash: "#ffffff",
      streak: 0.145,
      ca: 0.01048,
      vignette: 0.84,
      exposure: 0.92,
      grain: 0.012
    },
    particles: { tint: "#cfe6ff", mix: 0.92 }
  },
  {
    id: "chrome",
    label: "Krom Cair",
    fragmentShader: sculptFragmentShaderChrome,
    mesh: { gold: "#F7F7F7", hot: "#FFFFFF" },
    env: {
      bg: "#000000",
      halo: "#060b12",
      haze: "#0a1220",
      bloom: "#bcd8ff",
      ray: "#9fc4ff",
      spark: "#dcecff",
      streakTint: "#bfd8ff",
      flash: "#e6f4ff",
      streak: 0.4,
      ca: 0.10022,
      vignette: 5.78,
      exposure: 0.9,
      grain: 0.016
    },
    particles: { tint: "#d7ecff", mix: 0.85 }
  }
];

type LookState = {
  index: number;
  blend: number;
  tween: gsap.core.Tween | null;
  origin: { x: number; y: number };
};

const state: LookState = {
  index: 1,
  blend: 1,
  tween: null,
  origin: { x: 0.5, y: 0.58 }
};

const listeners = new Set<() => void>();

export function getLookState() {
  return state;
}

export function getLookIndex() {
  return state.index;
}

export function subscribeLooks(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function cycleLook(direction = 1, origin?: { x: number; y: number }) {
  state.index = (state.index + direction + SCULPT_LOOKS.length) % SCULPT_LOOKS.length;
  state.origin.x = origin?.x ?? 0.5;
  state.origin.y = origin?.y ?? 0.58;
  state.tween?.kill();
  state.blend = 0;
  state.tween = gsap.to(state, {
    blend: 1,
    duration: 0.95,
    ease: "power2.inOut",
    overwrite: true
  });
  listeners.forEach((listener) => listener());
}

export function lookFlash() {
  const clamped = Math.min(1, Math.max(0, state.blend));
  return Math.sin(Math.PI * clamped);
}
