"use client";
/* eslint-disable react-hooks/immutability */

import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import GoldParticles from "./sculpt/GoldParticles";
import ManualPostFX from "./sculpt/ManualPostFX";
import { SCULPT_LOOKS, cycleLook, getLookIndex, getLookState, subscribeLooks } from "./sculpt/looks";
import { beamFragmentShader, beamVertexShader, ringFragmentShader, ringHaloFragmentShader, ringHaloVertexShader, ringVertexShader, sculptVertexShader } from "./sculpt/shaders";
import { useQualityTier } from "@/hooks/useQualityTier";

const FILL_HEIGHT = 1.05;
const FILL_WIDTH = 0.98;
const DROP = 0.006;
const ROTATION_Y = 0;
const RING_ROTATION: [number, number, number] = [Math.PI / 2 - 0.26, 0.18, 0.14];
const BEAM_ROTATION: [number, number, number] = [0, 0, 0];

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}

function easeInOutCubic(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function addShatterAttributes(geometry: THREE.BufferGeometry, center: THREE.Vector3) {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const count = position.count;
  const centers = new Float32Array(count * 3);
  const dirs = new Float32Array(count * 3);
  const axes = new Float32Array(count * 3);
  const rands = new Float32Array(count);

  let seed = 9277;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const centroid = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const axis = new THREE.Vector3();

  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);
    centroid
      .copy(a)
      .add(b)
      .add(c)
      .multiplyScalar(1 / 3);

    dir.copy(centroid).sub(center);
    if (dir.lengthSq() < 1e-6) dir.set(rand() - 0.5, rand() - 0.5, rand() - 0.5);
    dir.normalize();
    dir.x += (rand() - 0.5) * 0.7;
    dir.y += (rand() - 0.5) * 0.7 + 0.2;
    dir.z += (rand() - 0.5) * 0.7;
    dir.normalize();

    axis.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
    if (axis.lengthSq() < 1e-6) axis.set(0, 1, 0);
    axis.normalize();

    const spread = 0.4 + rand() * 1.05;

    for (let v = 0; v < 3; v++) {
      const offset = (i + v) * 3;
      centers[offset] = centroid.x;
      centers[offset + 1] = centroid.y;
      centers[offset + 2] = centroid.z;
      dirs[offset] = dir.x;
      dirs[offset + 1] = dir.y;
      dirs[offset + 2] = dir.z;
      axes[offset] = axis.x;
      axes[offset + 1] = axis.y;
      axes[offset + 2] = axis.z;
      rands[i + v] = spread;
    }
  }

  geometry.setAttribute("aCenter", new THREE.BufferAttribute(centers, 3));
  geometry.setAttribute("aDir", new THREE.BufferAttribute(dirs, 3));
  geometry.setAttribute("aAxis", new THREE.BufferAttribute(axes, 3));
  geometry.setAttribute("aSpread", new THREE.BufferAttribute(rands, 1));
}

type BeamConfig = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  seed: number;
  boost: number;
};

function LightBeams({ beams }: { beams: BeamConfig[] }) {
  "use no memo";

  const materials = useMemo(
    () =>
      beams.map(
        (beam) =>
          new THREE.ShaderMaterial({
            vertexShader: beamVertexShader,
            fragmentShader: beamFragmentShader,
            uniforms: {
              uColor: { value: new THREE.Color(1.0, 0.72, 0.36) },
              uIntensity: { value: 1.6 * beam.boost },
              uTime: { value: 0 },
              uSeed: { value: beam.seed }
            },
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
          })
      ),
    [beams]
  );

  const beamColors = useMemo(
    () =>
      SCULPT_LOOKS.map((look) => {
        if (look.id === "prism") return new THREE.Color(0.78, 0.9, 1.0);
        if (look.id === "chrome") return new THREE.Color(0.7, 0.85, 1.0);
        return new THREE.Color(1.0, 0.72, 0.36);
      }),
    []
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const color = beamColors[getLookState().index];
    const damp = 1 - Math.exp(-4 * Math.min(delta, 0.1));

    for (const material of materials) {
      material.uniforms.uTime.value = t;
      (material.uniforms.uColor.value as THREE.Color).lerp(color, damp);
    }
  });

  useEffect(() => {
    return () => {
      materials.forEach((material) => material.dispose());
    };
  }, [materials]);

  return (
    <group>
      {beams.map((beam, index) => (
        <mesh key={`${beam.seed}-${index}`} position={[beam.x, beam.y, beam.z]} rotation={BEAM_ROTATION} renderOrder={5}>
          <planeGeometry args={[beam.width, beam.height]} />
          <primitive object={materials[index]} attach='material' />
        </mesh>
      ))}
    </group>
  );
}

export function SculptModel() {
  "use no memo";

  const { scene } = useGLTF("/man_sculpt.glb");
  const { viewport, gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const activeLook = useRef(SCULPT_LOOKS[0].id);
  const shatter = useRef({ start: -1, queued: false });

  const lookColors = useMemo(
    () =>
      SCULPT_LOOKS.map((look) => ({
        gold: new THREE.Color(look.mesh.gold),
        hot: new THREE.Color(look.mesh.hot)
      })),
    []
  );

  const ringLightColors = useMemo(
    () =>
      SCULPT_LOOKS.map((look) => {
        if (look.id === "prism") return new THREE.Color(0.86, 0.92, 1.0);
        if (look.id === "chrome") return new THREE.Color(0.74, 0.86, 1.0);
        return new THREE.Color(1.0, 0.9, 0.72);
      }),
    []
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: sculptVertexShader,
        fragmentShader: SCULPT_LOOKS[0].fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uModelCenter: { value: new THREE.Vector3() },
          uModelScale: { value: 1 },
          uGold: { value: lookColors[0].gold.clone() },
          uHot: { value: lookColors[0].hot.clone() },
          uPointer: { value: new THREE.Vector2() },
          uRingCenter: { value: new THREE.Vector3() },
          uRingNormal: { value: new THREE.Vector3(0, 1, 0) },
          uRingRadius: { value: 0.35 },
          uRingColor: { value: new THREE.Color(1.0, 0.97, 0.92) },
          uRingIntensity: { value: 0 },
          uShatter: { value: 0 },
          uShatterDistance: { value: 1 }
        },
        side: THREE.DoubleSide
      }),
    [lookColors]
  );

  const ringMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ringVertexShader,
        fragmentShader: ringFragmentShader,
        uniforms: {
          uColor: { value: new THREE.Color(1.0, 0.96, 0.9) },
          uIntensity: { value: 3.0 },
          uTime: { value: 0 }
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }),
    []
  );

  const ringHaloMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ringHaloVertexShader,
        fragmentShader: ringHaloFragmentShader,
        uniforms: {
          uColor: { value: new THREE.Color(1.0, 0.96, 0.9) },
          uIntensity: { value: 0.5 },
          uTime: { value: 0 },
          uRadius: { value: 0.69 }
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      }),
    []
  );

  const ringRef = useRef<THREE.Mesh>(null);
  const ringTemp = useMemo(
    () => ({
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      normal: new THREE.Vector3(),
      scale: new THREE.Vector3()
    }),
    []
  );

  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.updateMatrixWorld(true);

    const meshes: THREE.Mesh[] = [];
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) meshes.push(mesh);
    });

    let baseScale = Infinity;
    let baseMatrix: THREE.Matrix4 | null = null;
    for (const mesh of meshes) {
      const worldScale = mesh.getWorldScale(new THREE.Vector3());
      const largest = Math.max(Math.abs(worldScale.x), Math.abs(worldScale.y), Math.abs(worldScale.z));
      if (largest > 0 && largest < baseScale) {
        baseScale = largest;
        baseMatrix = mesh.matrixWorld.clone();
      }
    }

    if (baseMatrix && baseScale < 0.5) {
      const parentInverse = new THREE.Matrix4();
      for (const mesh of meshes) {
        const worldScale = mesh.getWorldScale(new THREE.Vector3());
        const largest = Math.max(Math.abs(worldScale.x), Math.abs(worldScale.y), Math.abs(worldScale.z));
        if (largest < 0.5) continue;

        mesh.geometry.computeBoundingBox();
        const geometryBox = mesh.geometry.boundingBox;
        if (!geometryBox) continue;
        const geometrySize = geometryBox.getSize(new THREE.Vector3());
        if (Math.max(geometrySize.x, geometrySize.y, geometrySize.z) < 100) continue;

        if (mesh.parent) {
          mesh.parent.updateWorldMatrix(true, false);
          parentInverse.copy(mesh.parent.matrixWorld).invert();
        } else {
          parentInverse.identity();
        }

        mesh.matrixAutoUpdate = false;
        mesh.matrix.copy(parentInverse).multiply(baseMatrix);
        mesh.matrixWorldNeedsUpdate = true;
      }
      clone.updateMatrixWorld(true);
    }

    const hasVertexColors = meshes.some((mesh) => mesh.geometry.attributes.color);
    const activeMeshes = hasVertexColors ? meshes.filter((mesh) => mesh.geometry.attributes.color) : meshes;
    if (hasVertexColors) {
      for (const mesh of meshes) {
        if (!mesh.geometry.attributes.color) mesh.removeFromParent();
      }
    }

    const rootInverse = new THREE.Matrix4().copy(clone.matrixWorld).invert();
    const meshMatrix = new THREE.Matrix4();
    for (const mesh of activeMeshes) {
      mesh.updateWorldMatrix(true, false);
      meshMatrix.copy(rootInverse).multiply(mesh.matrixWorld);
      mesh.geometry = mesh.geometry.clone();
      mesh.geometry.applyMatrix4(meshMatrix);
    }

    clone.traverse((child) => {
      if (child === clone) return;
      child.position.set(0, 0, 0);
      child.quaternion.identity();
      child.scale.set(1, 1, 1);
      child.matrixAutoUpdate = true;
      child.updateMatrix();
    });
    clone.updateMatrixWorld(true);

    const shatterCenter = new THREE.Box3().setFromObject(clone).getCenter(new THREE.Vector3());

    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.geometry.index) {
        mesh.geometry = mesh.geometry.toNonIndexed();
      }
      addShatterAttributes(mesh.geometry, shatterCenter);
      mesh.material = material;
      mesh.frustumCulled = false;
    });

    return clone;
  }, [scene, material]);

  const bounds = useMemo(() => {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    return {
      size: box.getSize(new THREE.Vector3()),
      center: box.getCenter(new THREE.Vector3())
    };
  }, [model]);

  const pattern = useMemo(() => {
    const largest = Math.max(bounds.size.x, bounds.size.y, bounds.size.z, 0.001);
    return { center: bounds.center, scale: 1 / largest };
  }, [bounds]);

  const halo = useMemo(() => {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const sliceY = box.min.y + size.y * 0.8;
    const band = size.y * 0.05;
    const vertex = new THREE.Vector3();
    const samples: THREE.Vector3[] = [];

    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const position = mesh.geometry.attributes.position as THREE.BufferAttribute | undefined;
      if (!position) return;

      for (let i = 0; i < position.count; i += 4) {
        vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        if (Math.abs(vertex.y - sliceY) <= band) {
          samples.push(vertex.clone());
        }
      }
    });

    let cx = 0;
    let cz = 0;
    for (const sample of samples) {
      cx += sample.x;
      cz += sample.z;
    }
    if (samples.length > 0) {
      cx /= samples.length;
      cz /= samples.length;
    }

    let radius = 0;
    for (const sample of samples) {
      radius = Math.max(radius, Math.hypot(sample.x - cx, sample.z - cz));
    }
    if (!Number.isFinite(radius) || radius <= 0.001) {
      radius = Math.min(size.x, size.z) * 0.35;
    }

    return {
      center: new THREE.Vector3(cx, sliceY, cz),
      radius: radius * 1.16,
      tube: Math.max(radius * 0.016, size.y * 0.0016)
    };
  }, [model]);

  useLayoutEffect(() => {
    material.uniforms.uModelCenter.value.copy(pattern.center);
    material.uniforms.uModelScale.value = pattern.scale;
    material.uniforms.uShatterDistance.value = 0.85 / Math.max(pattern.scale, 1e-6);
  }, [material, pattern]);

  const beams = useMemo(() => {
    const frontZ = bounds.center.z + bounds.size.z * 0.52;
    const eyeY = halo.center.y - bounds.size.y * 0.035;
    const eyeX = bounds.size.x * 0.07;
    const width = bounds.size.x * 1.15;
    const depth = bounds.size.z * 0.06;

    return [
      { x: halo.center.x - eyeX, y: eyeY, z: frontZ, width, height: bounds.size.x * 0.18, seed: 0.13, boost: 1 },
      { x: halo.center.x + eyeX, y: eyeY, z: frontZ, width, height: bounds.size.x * 0.18, seed: 0.61, boost: 1 },
      { x: halo.center.x, y: eyeY - bounds.size.y * 0.03, z: frontZ - depth * 0.4, width: width * 1.2, height: bounds.size.x * 0.1, seed: 0.37, boost: 0.6 },
      { x: halo.center.x, y: eyeY - bounds.size.y * 0.07, z: frontZ - depth * 0.8, width: width * 1.05, height: bounds.size.x * 0.07, seed: 0.82, boost: 0.4 },
      { x: halo.center.x, y: eyeY + bounds.size.y * 0.02, z: frontZ - depth * 0.6, width: width * 0.9, height: bounds.size.x * 0.06, seed: 0.29, boost: 0.35 }
    ];
  }, [bounds, halo]);

  useEffect(() => {
    return () => {
      material.dispose();
      ringMaterial.dispose();
      ringHaloMaterial.dispose();
    };
  }, [material, ringMaterial, ringHaloMaterial]);

  const displayedWidth = Math.abs(Math.cos(ROTATION_Y)) * bounds.size.x + Math.abs(Math.sin(ROTATION_Y)) * bounds.size.z;

  const scale = Math.min((viewport.height * FILL_HEIGHT) / Math.max(bounds.size.y, 0.001), (viewport.width * FILL_WIDTH) / Math.max(displayedWidth, 0.001));

  const y = -viewport.height * 0.5 + (bounds.size.y * scale) / 2 - viewport.height * DROP;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const lookState = getLookState();
    const look = SCULPT_LOOKS[lookState.index];
    const damp = 1 - Math.exp(-6 * Math.min(delta, 0.1));

    material.uniforms.uTime.value = t;
    material.uniforms.uModelCenter.value.copy(pattern.center);
    material.uniforms.uModelScale.value = pattern.scale;
    material.uniforms.uPointer.value.set(state.pointer.x, state.pointer.y);

    if (shatter.current.queued) {
      shatter.current.queued = false;
      shatter.current.start = t;
    }

    let shatterValue = 0;
    if (shatter.current.start >= 0) {
      const elapsed = t - shatter.current.start;
      const burst = 0.28;
      const hold = 0.1;
      const reform = 1.05;
      if (elapsed < burst) {
        shatterValue = easeOutCubic(elapsed / burst);
      } else if (elapsed < burst + hold) {
        shatterValue = 1;
      } else if (elapsed < burst + hold + reform) {
        shatterValue = 1 - easeInOutCubic((elapsed - burst - hold) / reform);
      } else {
        shatter.current.start = -1;
      }
    }
    material.uniforms.uShatter.value = shatterValue;

    (material.uniforms.uGold.value as THREE.Color).lerp(lookColors[lookState.index].gold, damp);
    (material.uniforms.uHot.value as THREE.Color).lerp(lookColors[lookState.index].hot, damp);

    if (look.id !== activeLook.current && lookState.blend >= 0.5) {
      material.fragmentShader = look.fragmentShader;
      material.needsUpdate = true;
      activeLook.current = look.id;
    }

    ringMaterial.uniforms.uTime.value = t;
    ringHaloMaterial.uniforms.uTime.value = t;

    const ring = ringRef.current;
    if (ring) {
      ring.updateWorldMatrix(true, false);
      ring.getWorldPosition(ringTemp.position);
      ring.getWorldQuaternion(ringTemp.quaternion);
      ring.getWorldScale(ringTemp.scale);
      ringTemp.normal.set(0, 0, 1).applyQuaternion(ringTemp.quaternion).normalize();

      material.uniforms.uRingCenter.value.copy(ringTemp.position);
      material.uniforms.uRingNormal.value.copy(ringTemp.normal);
      material.uniforms.uRingRadius.value = halo.radius * ringTemp.scale.x;
    }

    const ringLightTarget = look.id === "prism" ? 1.5 : look.id === "chrome" ? 1.1 : 1.2;
    const ringLightUniform = material.uniforms.uRingIntensity;
    ringLightUniform.value += (ringLightTarget - ringLightUniform.value) * damp;
    (material.uniforms.uRingColor.value as THREE.Color).lerp(ringLightColors[lookState.index], damp);

    if (group.current) {
      group.current.rotation.y = ROTATION_Y + Math.sin(t * 0.3) * 0.05 + state.pointer.x * 0.08;
      group.current.rotation.x = state.pointer.y * 0.035 + Math.sin(t * 0.45) * 0.008;
      group.current.rotation.z = Math.sin(t * 0.37) * 0.012;
      group.current.position.y = y + Math.sin(t * 0.7) * 0.012;
      group.current.scale.setScalar(scale * (1 + Math.sin(t * 0.9) * 0.004));
    }
  });

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    shatter.current.queued = true;
  }, []);

  const handleHover = useCallback(
    (hovering: boolean) => {
      gl.domElement.style.cursor = hovering ? "pointer" : "";
    },
    [gl]
  );

  return (
    <group ref={group} castShadow receiveShadow position={[0, y, 0]} scale={scale} rotation={[0, ROTATION_Y, 0]} onClick={handleClick} onPointerOver={() => handleHover(true)} onPointerOut={() => handleHover(false)}>
      <group castShadow receiveShadow position={[-bounds.center.x, -bounds.center.y, -bounds.center.z]}>
        <primitive castShadow receiveShadow object={model} />

        <mesh castShadow receiveShadow position={[halo.center.x, halo.center.y, halo.center.z]} rotation={RING_ROTATION} renderOrder={2}>
          <planeGeometry args={[halo.radius * 2.9, halo.radius * 2.9]} />
          <primitive object={ringHaloMaterial} attach='material' />
        </mesh>

        <mesh castShadow receiveShadow ref={ringRef} position={[halo.center.x, halo.center.y, halo.center.z]} rotation={RING_ROTATION} renderOrder={3}>
          <torusGeometry args={[halo.radius, halo.tube, 16, 240]} />
          <primitive object={ringMaterial} attach='material' />
        </mesh>

        <LightBeams beams={beams} />
      </group>
    </group>
  );
}

const SCRAMBLE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#/";

function ScrambleText({ text }: { text: string }) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const span = spanRef.current;
    if (!span) return;

    const duration = 680;
    const start = performance.now();
    let raf = 0;
    let cancelled = false;

    span.dataset.scrambling = "true";
    span.textContent = text;

    const tick = (now: number) => {
      if (cancelled) return;

      const progress = Math.min(1, (now - start) / duration);
      const settled = Math.floor(progress * text.length);
      let next = "";

      for (let i = 0; i < text.length; i++) {
        if (i < settled || text[i] === " ") {
          next += text[i];
        } else {
          next += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }

      span.textContent = progress < 1 ? next : text;

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        span.dataset.scrambling = "false";
      }
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [text]);

  return (
    <span ref={spanRef} className='jj-scramble' aria-label={text}>
      {text}
    </span>
  );
}

const SectionSculpt = () => {
  const lookIndex = useSyncExternalStore(subscribeLooks, getLookIndex, () => getLookIndex());
  const look = SCULPT_LOOKS[lookIndex];
  const tier = useQualityTier();

  return (
    <section className='relative h-[100svh] w-full overflow-hidden bg-[#050301]'>
      <Canvas className='h-full w-full' dpr={tier === "high" ? [1, 1.75] : [1, 1.25]} gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }} camera={{ position: [0, 0, 4], fov: 35 }}>
        <SculptModel />

        <GoldParticles />

        <ManualPostFX />
      </Canvas>

      <div className='pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between md:p-8'>
        <div>
          <p className='jj-mono text-[9px] uppercase tracking-[0.35em] text-white/40'>Bahan / Lingkungan Visual</p>
          <p className='jj-display mt-1 text-2xl uppercase tracking-wide text-white md:text-3xl'>
            <ScrambleText text={look.label} />
          </p>
          <p className='jj-mono mt-1.5 text-[9px] uppercase tracking-[0.24em] text-white/40'>Toél Pikeun Ngarobah</p>
        </div>

        <div className='pointer-events-auto flex items-center gap-3'>
          <div className='flex items-center gap-1.5 font-mono'>
            {SCULPT_LOOKS.map((item, index) => (
              <span key={item.id} aria-hidden='true' className={`h-1.5 rounded-full transition-all duration-500 ${index === lookIndex ? "w-6 bg-jj-gold-bright" : "w-1.5 bg-white/25"}`} />
            ))}
          </div>
          <button
            type='button'
            onClick={() => cycleLook()}
            className='group flex items-center gap-2 rounded-full border border-jj-gold-bright/40 bg-black/45 px-4 py-2 jj-mono text-[9px] uppercase tracking-[0.24em] text-jj-gold-bright backdrop-blur-md transition-colors hover:border-jj-gold-bright hover:bg-jj-gold/20 active:scale-95'
          >
            Pintonan Séjén
            <span className='transition-transform duration-300 group-hover:translate-x-0.5'>→</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default SectionSculpt;
