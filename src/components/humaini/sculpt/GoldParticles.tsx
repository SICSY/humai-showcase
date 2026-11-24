"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { SCULPT_LOOKS, getLookState } from "./looks";

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function createParticles(count: number, seed: number, sizeMin: number, sizeMax: number) {
  const random = seeded(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  const stretches = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 0.36 + Math.pow(random(), 0.7) * 0.95;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = random() * 2 - 1;
    positions[i * 3 + 2] = Math.sin(angle) * radius * 0.45 + (random() - 0.5) * 0.5;
    sizes[i] = sizeMin + random() * (sizeMax - sizeMin);
    seeds[i] = random();
    stretches[i] = random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aStretch", new THREE.BufferAttribute(stretches, 1));
  return geometry;
}

const particleVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSizeFactor;
  uniform float uMaxSize;
  uniform float uSpeed;
  uniform vec2 uPointer;

  attribute float aSize;
  attribute float aSeed;
  attribute float aStretch;

  varying float vTwinkle;
  varying float vSeed;
  varying float vStretch;
  varying float vFade;

  void main() {
    vec3 p = position;
    float seed = aSeed;
    float speed = (0.04 + seed * 0.1) * uSpeed;

    p.y = mod(p.y + 1.0 + uTime * speed, 2.0) - 1.0;
    p.x += sin(uTime * (0.2 + seed * 0.4) + seed * 40.0) * 0.08;
    p.x += sin(uTime * 0.6 + p.y * 3.0 + seed * 10.0) * 0.035;
    p.z += cos(uTime * (0.16 + seed * 0.3) + seed * 30.0) * 0.06;
    p.x += uPointer.x * 0.08 * (0.3 + seed);
    p.y += uPointer.y * 0.04 * (0.3 + seed);

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float twinkle = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (1.1 + seed * 2.6) + seed * 60.0), 3.0);
    float dist = max(-mvPosition.z, 0.1);
    float nearFade = smoothstep(0.8, 2.6, dist);
    float farFade = 1.0 - smoothstep(7.0, 12.0, dist);
    vFade = nearFade * farFade;

    float size = aSize * (1.0 + aStretch * 0.5) * (0.7 + 0.6 * twinkle);
    gl_PointSize = clamp(size * uPixelRatio * (uSizeFactor / dist), 1.0, uMaxSize);

    vTwinkle = twinkle;
    vSeed = seed;
    vStretch = aStretch;
  }
`;

const dustFragmentShader = /* glsl */ `
  uniform vec3 uTint;
  uniform float uTintMix;

  varying float vTwinkle;
  varying float vSeed;
  varying float vStretch;
  varying float vFade;

  void main() {
    vec2 coord = gl_PointCoord - 0.5;
    float dist = length(coord);
    float core = smoothstep(0.5, 0.12, dist);
    float glow = exp(-dist * dist * 22.0);
    float alpha = (core * 0.55 + glow * 0.3) * vTwinkle * vFade;

    if (alpha < 0.01) discard;

    vec3 cold = vec3(1.0, 0.44, 0.1);
    vec3 hot = vec3(1.0, 0.76, 0.36);
    vec3 color = mix(cold, hot, core);
    color = mix(color, uTint * (0.75 + 0.25 * core), uTintMix);

    gl_FragColor = vec4(color * alpha * 1.35, alpha);
  }
`;

const streakFragmentShader = /* glsl */ `
  uniform vec3 uTint;
  uniform float uTintMix;

  varying float vTwinkle;
  varying float vSeed;
  varying float vStretch;
  varying float vFade;

  void main() {
    float angle = (vSeed - 0.5) * 0.4;
    float sinA = sin(angle);
    float cosA = cos(angle);
    vec2 coord = gl_PointCoord - 0.5;
    coord = mat2(cosA, -sinA, sinA, cosA) * coord;

    float stretch = 1.0 + vStretch * 1.2;
    float dist = length(vec2(coord.x * 8.0, coord.y * 1.8 / stretch));
    float core = smoothstep(0.5, 0.1, dist);
    float glow = exp(-dist * dist * 5.0);
    float alpha = (core * 0.5 + glow * 0.22) * vTwinkle * vFade;

    if (alpha < 0.01) discard;

    vec3 color = mix(vec3(1.0, 0.48, 0.1), vec3(1.0, 0.82, 0.48), core);
    color = mix(color, uTint * (0.8 + 0.2 * core), uTintMix);
    gl_FragColor = vec4(color * alpha * 1.25, alpha);
  }
`;

const bokehFragmentShader = /* glsl */ `
  uniform vec3 uTint;
  uniform float uTintMix;

  varying float vTwinkle;
  varying float vSeed;
  varying float vStretch;
  varying float vFade;

  void main() {
    vec2 coord = gl_PointCoord - 0.5;
    float dist = length(coord);
    float glow = exp(-dist * dist * 10.0) * smoothstep(0.5, 0.22, dist);
    float alpha = glow * (0.03 + vTwinkle * 0.09) * vFade;

    if (alpha < 0.01) discard;

    vec3 color = mix(vec3(1.0, 0.4, 0.08), vec3(1.0, 0.7, 0.3), vSeed);
    color = mix(color, uTint * 0.85, uTintMix);
    gl_FragColor = vec4(color * alpha * 0.7, alpha);
  }
`;

type ParticleLayer = {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
};

function useParticleLayer(
  count: number,
  seed: number,
  sizeMin: number,
  sizeMax: number,
  fragmentShader: string,
  sizeFactor: number,
  maxSize: number,
  speed: number,
): ParticleLayer {
  return useMemo(() => {
    const geometry = createParticles(count, seed, sizeMin, sizeMax);
    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uSizeFactor: { value: sizeFactor },
        uMaxSize: { value: maxSize },
        uSpeed: { value: speed },
        uPointer: { value: new THREE.Vector2() },
        uTint: { value: new THREE.Color("#ffffff") },
        uTintMix: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry, material };
  }, [count, seed, sizeMin, sizeMax, fragmentShader, sizeFactor, maxSize, speed]);
}

export default function GoldParticles() {
  "use no memo";

  const gl = useThree((state) => state.gl);
  const viewport = useThree((state) => state.viewport);

  const dust = useParticleLayer(320, 7301, 0.9, 2.1, dustFragmentShader, 20, 18, 0.8);
  const streaks = useParticleLayer(48, 9137, 3.0, 6.0, streakFragmentShader, 24, 24, 1.4);
  const bokeh = useParticleLayer(12, 4517, 8, 14, bokehFragmentShader, 46, 48, 0.3);

  const tints = useMemo(
    () =>
      SCULPT_LOOKS.map((look) => ({
        color: new THREE.Color(look.particles.tint),
        mix: look.particles.mix,
      })),
    []
  );

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const pixelRatio = gl.getPixelRatio();
    const tint = tints[getLookState().index];
    const damp = 1 - Math.exp(-4 * Math.min(delta, 0.1));

    for (const layer of [dust, streaks, bokeh]) {
      layer.material.uniforms.uTime.value = time;
      layer.material.uniforms.uPixelRatio.value = pixelRatio;
      layer.material.uniforms.uPointer.value.set(state.pointer.x, state.pointer.y);
      (layer.material.uniforms.uTint.value as THREE.Color).lerp(tint.color, damp);
      layer.material.uniforms.uTintMix.value +=
        (tint.mix - layer.material.uniforms.uTintMix.value) * damp;
    }
  });

  return (
    <group scale={[viewport.width * 0.95, viewport.height * 0.95, 1.25]}>
      <points geometry={bokeh.geometry} material={bokeh.material} frustumCulled={false} />
      <points geometry={dust.geometry} material={dust.material} frustumCulled={false} />
      <points geometry={streaks.geometry} material={streaks.material} frustumCulled={false} />
    </group>
  );
}
