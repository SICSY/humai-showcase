"use client";
/* eslint-disable react-hooks/immutability */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { SCULPT_LOOKS, getLookState, lookFlash } from "./looks";
import {
  blurFragmentShader,
  brightFragmentShader,
  compositeFragmentShader,
  quadVertexShader,
} from "./shaders";

function createTarget(width: number, height: number, depth: boolean, samples: number) {
  return new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: depth,
    stencilBuffer: false,
    samples,
  });
}

export default function ManualPostFX() {
  "use no memo";

  const { gl, scene, camera } = useThree();
  const bufferSize = useMemo(() => new THREE.Vector2(), []);

  const targets = useMemo(
    () => ({
      scene: createTarget(1, 1, true, 4),
      bloomA: createTarget(1, 1, false, 0),
      bloomB: createTarget(1, 1, false, 0),
    }),
    [],
  );

  const looks = useMemo(() => {
    const raw = (hex: string) =>
      new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace);

    return SCULPT_LOOKS.map((look) => ({
      bg: raw(look.env.bg),
      halo: raw(look.env.halo),
      haze: raw(look.env.haze),
      bloom: raw(look.env.bloom),
      ray: raw(look.env.ray),
      spark: raw(look.env.spark),
      streakTint: raw(look.env.streakTint),
      streak: look.env.streak,
      flash: raw(look.env.flash),
      ca: look.env.ca,
      vignette: look.env.vignette,
      exposure: look.env.exposure,
      grain: look.env.grain,
    }));
  }, []);

  const materials = useMemo(
    () => ({
      bright: new THREE.ShaderMaterial({
        vertexShader: quadVertexShader,
        fragmentShader: brightFragmentShader,
        uniforms: {
          tDiffuse: { value: null as THREE.Texture | null },
          uThreshold: { value: 0.85 },
          uKnee: { value: 0.25 },
        },
        depthTest: false,
        depthWrite: false,
      }),
      blur: new THREE.ShaderMaterial({
        vertexShader: quadVertexShader,
        fragmentShader: blurFragmentShader,
        uniforms: {
          tDiffuse: { value: null as THREE.Texture | null },
          uDirection: { value: new THREE.Vector2(1, 0) },
        },
        depthTest: false,
        depthWrite: false,
      }),
      composite: new THREE.ShaderMaterial({
        vertexShader: quadVertexShader,
        fragmentShader: compositeFragmentShader,
        uniforms: {
          tScene: { value: null as THREE.Texture | null },
          tBloom: { value: null as THREE.Texture | null },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uTime: { value: 0 },
          uBgColor: { value: looks[0].bg.clone() },
          uHaloColor: { value: looks[0].halo.clone() },
          uHazeColor: { value: looks[0].haze.clone() },
          uBloomTint: { value: looks[0].bloom.clone() },
          uRayTint: { value: looks[0].ray.clone() },
          uSparkTint: { value: looks[0].spark.clone() },
          uStreakTint: { value: looks[0].streakTint.clone() },
          uFlashTint: { value: looks[0].flash.clone() },
          uStreak: { value: looks[0].streak },
          uCA: { value: looks[0].ca },
          uVignette: { value: looks[0].vignette },
          uExposure: { value: looks[0].exposure },
          uGrain: { value: looks[0].grain },
          uFlash: { value: 0 },
          uTransition: { value: 0 },
          uTransitionOrigin: { value: new THREE.Vector2(0.5, 0.58) },
        },
        depthTest: false,
        depthWrite: false,
      }),
    }),
    [looks],
  );

  const quad = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
        3,
      ),
    );
    geometry.setAttribute(
      "uv",
      new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2),
    );

    const mesh = new THREE.Mesh(geometry, materials.composite);
    mesh.frustumCulled = false;

    const quadScene = new THREE.Scene();
    quadScene.add(mesh);

    return { geometry, mesh, scene: quadScene, camera: new THREE.Camera() };
  }, [materials]);

  useEffect(() => {
    return () => {
      targets.scene.dispose();
      targets.bloomA.dispose();
      targets.bloomB.dispose();
      materials.bright.dispose();
      materials.blur.dispose();
      materials.composite.dispose();
      quad.geometry.dispose();
    };
  }, [targets, materials, quad]);

  useFrame((state, delta) => {
    gl.getDrawingBufferSize(bufferSize);
    const width = Math.max(1, Math.floor(bufferSize.x));
    const height = Math.max(1, Math.floor(bufferSize.y));

    if (targets.scene.width !== width || targets.scene.height !== height) {
      targets.scene.setSize(width, height);
      const bloomWidth = Math.max(1, Math.floor(width / 2));
      const bloomHeight = Math.max(1, Math.floor(height / 2));
      targets.bloomA.setSize(bloomWidth, bloomHeight);
      targets.bloomB.setSize(bloomWidth, bloomHeight);
      materials.composite.uniforms.uResolution.value.set(width, height);
    }

    const renderQuad = (
      material: THREE.ShaderMaterial,
      target: THREE.WebGLRenderTarget | null,
    ) => {
      quad.mesh.material = material;
      gl.setRenderTarget(target);
      gl.render(quad.scene, quad.camera);
    };

    gl.setClearColor(0x000000, 0);
    gl.setRenderTarget(targets.scene);
    gl.clear(true, true, true);
    gl.render(scene, camera);

    materials.bright.uniforms.tDiffuse.value = targets.scene.texture;
    renderQuad(materials.bright, targets.bloomA);

    for (let i = 0; i < 4; i++) {
      const radius = 1.2 + i * 1.9;

      materials.blur.uniforms.tDiffuse.value = targets.bloomA.texture;
      materials.blur.uniforms.uDirection.value.set(radius / targets.bloomA.width, 0);
      renderQuad(materials.blur, targets.bloomB);

      materials.blur.uniforms.tDiffuse.value = targets.bloomB.texture;
      materials.blur.uniforms.uDirection.value.set(0, radius / targets.bloomB.height);
      renderQuad(materials.blur, targets.bloomA);
    }

    const uniforms = materials.composite.uniforms;
    const lookState = getLookState();
    const look = looks[lookState.index];
    const damp = 1 - Math.exp(-4 * Math.min(delta, 0.1));
    const transition = lookFlash();

    uniforms.uBgColor.value.lerp(look.bg, damp);
    uniforms.uHaloColor.value.lerp(look.halo, damp);
    uniforms.uHazeColor.value.lerp(look.haze, damp);
    uniforms.uBloomTint.value.lerp(look.bloom, damp);
    uniforms.uRayTint.value.lerp(look.ray, damp);
    uniforms.uSparkTint.value.lerp(look.spark, damp);
    uniforms.uStreakTint.value.lerp(look.streakTint, damp);
    uniforms.uFlashTint.value.lerp(look.flash, damp);
    uniforms.uStreak.value += (look.streak - uniforms.uStreak.value) * damp;
    uniforms.uCA.value += (look.ca - uniforms.uCA.value) * damp;
    uniforms.uVignette.value +=
      (look.vignette - uniforms.uVignette.value) * damp;
    uniforms.uExposure.value +=
      (look.exposure - uniforms.uExposure.value) * damp;
    uniforms.uGrain.value += (look.grain - uniforms.uGrain.value) * damp;

    uniforms.tScene.value = targets.scene.texture;
    uniforms.tBloom.value = targets.bloomA.texture;
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uTransition.value = transition;
    uniforms.uTransitionOrigin.value.set(lookState.origin.x, lookState.origin.y);
    uniforms.uFlash.value = transition * 0.14;

    renderQuad(materials.composite, null);
  }, 1);

  return null;
}
