"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three/webgpu";
import {
  attribute,
  positionGeometry,
  uv,
  uniform,
  vec2,
  vec3,
  float,
  mix,
  step,
  smoothstep,
  sin,
  cos,
  abs,
  sign,
  cross,
  floor,
  fract,
  clamp,
  pow,
  exp,
  min,
  select,
  frontFacing,
  mx_noise_float
} from "three/tsl";

interface ArcaneButterfliesOverlayProps {
  className?: string;
  enableBackground?: boolean;
}

export default function ArcaneButterfliesOverlay({
  className = "pointer-events-none absolute inset-0 z-[12]",
  enableBackground = false
}: ArcaneButterfliesOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    let disposed = false;
    let renderer: THREE.WebGPURenderer | null = null;

    const V3 = THREE.Vector3;
    const R = Math.random;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 12);

    const uTime = uniform(0);
    const uGlow = uniform(0);
    const uAsp = uniform(1);
    const uPtr = uniform(new THREE.Vector2(0.5, 0.5));

    // Palet Arcane: teal hextech, magenta, amber, violet
    function palette(s: THREE.Node<"float">) {
      const A = vec3(0.05, 0.85, 0.85);
      const B = vec3(1.0, 0.12, 0.5);
      const C = vec3(1.0, 0.62, 0.1);
      const D = vec3(0.5, 0.22, 1.0);
      const col = mix(mix(mix(A, B, step(0.25, s)), C, step(0.5, s)), D, step(0.75, s));
      const acc = mix(col.zxy, vec3(1.0, 0.9, 0.5), 0.5);
      return { col, acc };
    }

    // Number of butterflies based on screen width
    const N = window.innerWidth < 700 ? 24 : 42;
    const aPos = new Float32Array(N * 3);
    const aFwd = new Float32Array(N * 3);
    const aUp = new Float32Array(N * 3);
    const aData = new Float32Array(N * 4);

    const mk = (arr: Float32Array, n: number) => {
      const a = new THREE.InstancedBufferAttribute(arr, n);
      a.setUsage(THREE.DynamicDrawUsage);
      return a;
    };

    const bPos = mk(aPos, 3);
    const bFwd = mk(aFwd, 3);
    const bUp = mk(aUp, 3);
    const bData = mk(aData, 4);

    function instGeo(base: THREE.BufferGeometry, count: number) {
      const g = new THREE.InstancedBufferGeometry();
      g.index = base.index;
      g.setAttribute("position", base.attributes.position);
      g.setAttribute("uv", base.attributes.uv);
      g.instanceCount = count;
      return g;
    }

    function wingBase() {
      const nx = 8;
      const nz = 6;
      const pos: number[] = [];
      const uvs: number[] = [];
      const idx: number[] = [];
      for (let side = -1; side <= 1; side += 2) {
        const b = pos.length / 3;
        for (let j = 0; j <= nz; j++) {
          for (let i = 0; i <= nx; i++) {
            pos.push((side * i) / nx, 0, j / nz - 0.5);
            uvs.push(i / nx, j / nz);
          }
        }
        for (let j = 0; j < nz; j++) {
          for (let i = 0; i < nx; i++) {
            const a = b + j * (nx + 1) + i;
            const c = a + nx + 1;
            idx.push(a, c, a + 1, a + 1, c, c + 1);
          }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx);
      return g;
    }

    function setInstanceAttrs(g: THREE.InstancedBufferGeometry) {
      g.setAttribute("iPos", bPos);
      g.setAttribute("iFwd", bFwd);
      g.setAttribute("iUp", bUp);
      g.setAttribute("iData", bData);
    }

    const iPos = attribute("iPos", "vec3");
    const iFwd = attribute("iFwd", "vec3");
    const iUp = attribute("iUp", "vec3");
    const iData = attribute("iData", "vec4");
    const seed = iData.x;
    const phase = iData.y;
    const energy = iData.z;
    const size = iData.w;
    const right = cross(iUp, iFwd).normalize();
    const toWorld = (x: THREE.Node<"float">, y: THREE.Node<"float">, z: THREE.Node<"float">) => iPos.add(right.mul(x).add(iUp.mul(y)).add(iFwd.mul(z)).mul(size));

    // Wing material with TSL painterly styling
    const wingMat = new THREE.MeshBasicNodeMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false
    });

    const px = positionGeometry.x;
    const pz = positionGeometry.z;
    const u = abs(px);
    const s = sign(px);
    const amp = energy.mul(0.45).add(0.5);
    const fl = sin(phase);
    const a = fl.mul(amp).add(0.35).add(u.mul(0.45).mul(sin(phase.sub(1.1))).mul(amp));
    const lx = s.mul(u).mul(cos(a));
    const ly = u.mul(sin(a)).add(sin(pz.mul(3).add(phase)).mul(0.03).mul(u));
    const lz = pz.sub(u.mul(0.12).mul(fl).mul(amp));
    wingMat.positionNode = toWorld(lx, ly, lz);

    const ell = (p: ReturnType<typeof uv>, c: [number, number], r: [number, number], rot: number) => {
      const q = p.sub(vec2(c[0], c[1]));
      const cs = Math.cos(rot);
      const sn = Math.sin(rot);
      return vec2(q.x.mul(cs).add(q.y.mul(sn)).div(r[0]), q.x.mul(-sn).add(q.y.mul(cs)).div(r[1])).length();
    };

    const w = uv();
    const fw = ell(w, [0.5, 0.62], [0.55, 0.3], -0.4);
    const hw = ell(w, [0.33, 0.34], [0.4, 0.3], 0.2);
    const root = w.sub(vec2(0, 0.46)).div(vec2(0.22, 0.28)).length();
    const q = w.sub(vec2(0, 0.5));
    const rr = q.length();
    const sa = q.y.div(rr.add(0.001));
    const d = min(min(fw, hw), root).add(mx_noise_float(vec3(w.mul(14), seed.mul(13))).mul(0.05));
    wingMat.opacityNode = float(1).sub(smoothstep(0.93, 1.0, d));

    const { col, acc } = palette(seed);
    const stroke = mx_noise_float(vec3(sa.mul(12), rr.mul(4), seed.mul(9)));
    const shade = clamp(d.add(stroke.mul(0.22)), 0, 1);
    const t = floor(shade.mul(4).add(0.5)).div(4);
    let c = mix(acc, col, t);
    c = mix(c, vec3(0.05, 0.02, 0.12), smoothstep(0.76, 0.9, d));
    const rim = float(1).sub(smoothstep(0, 0.035, abs(d.sub(0.7))));
    c = c.add(acc.mul(rim).mul(1.4));
    const shimmer = sin(uTime.mul(3).add(d.mul(8)).add(seed.mul(20))).mul(0.5).add(0.5);
    const veins = smoothstep(0.88, 1.0, sin(sa.mul(16).add(rr.mul(3))))
      .mul(smoothstep(0.1, 0.25, d))
      .mul(float(1).sub(smoothstep(0.5, 0.68, d)));
    c = c.add(vec3(0.4, 1.0, 1.0).mul(veins).mul(shimmer.mul(0.6).add(0.4)));
    const hatch = step(0.62, fract(w.x.mul(26).add(w.y.mul(18)).add(stroke.mul(2))));
    c = c.mul(float(1).sub(hatch.mul(0.25).mul(smoothstep(0.3, 0.8, d))));
    c = c.mul(shimmer.mul(0.25).add(1)).mul(select(frontFacing, float(1), float(0.7)));
    wingMat.colorNode = c;

    const baseWingGeom = wingBase();
    const wingsGeom = instGeo(baseWingGeom, N);
    setInstanceAttrs(wingsGeom);
    const wingsMesh = new THREE.Mesh(wingsGeom, wingMat);
    wingsMesh.frustumCulled = false;
    scene.add(wingsMesh);

    // Body
    const cyl = new THREE.CylinderGeometry(0.03, 0.018, 0.55, 8);
    cyl.rotateX(Math.PI / 2);
    const bodyGeom = instGeo(cyl, N);
    setInstanceAttrs(bodyGeom);
    const bodyMat = new THREE.MeshBasicNodeMaterial({ color: 0x140a24 });
    bodyMat.positionNode = toWorld(positionGeometry.x, positionGeometry.y, positionGeometry.z);
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    bodyMesh.frustumCulled = false;
    scene.add(bodyMesh);

    // Trail particles
    const P = 2400;
    const pPosA = new Float32Array(P * 3);
    const pDataA = new Float32Array(P * 4);
    for (let i = 0; i < P; i++) pDataA[i * 4] = -100;
    const pPosB = mk(pPosA, 3);
    const pDataB = mk(pDataA, 4);

    const plane = new THREE.PlaneGeometry(1, 1);
    const ptsGeom = instGeo(plane, P);
    ptsGeom.setAttribute("pPos", pPosB);
    ptsGeom.setAttribute("pData", pDataB);

    const ptsMat = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const pPos = attribute("pPos", "vec3");
    const pd = attribute("pData", "vec4");
    const age = clamp(uTime.sub(pd.x).div(pd.w), 0, 1);
    const sz = pd.y.mul(float(1).sub(age.mul(0.6)));
    const drift = vec3(sin(pd.z.mul(40).add(uTime)).mul(age).mul(0.4), age.mul(0.5), 0);
    ptsMat.positionNode = pPos.add(drift).add(vec3(positionGeometry.xy.mul(sz), 0));
    const rPart = uv().sub(0.5).length().mul(2);
    const glowPart = exp(rPart.mul(rPart).mul(-4));
    const { acc: pAcc, col: pCol } = palette(pd.z);
    ptsMat.colorNode = mix(mix(pCol, pAcc, 0.6), vec3(1), pow(glowPart, 4).mul(0.5)).mul(1.6);
    ptsMat.opacityNode = glowPart.mul(pow(float(1).sub(age), 1.5));

    const ptsMesh = new THREE.Mesh(ptsGeom, ptsMat);
    ptsMesh.frustumCulled = false;
    ptsMesh.renderOrder = 2;
    scene.add(ptsMesh);

    let pi = 0;
    function spawn(x: number, y: number, z: number, s: number, szVal: number, life: number) {
      const i = pi++ % P;
      pPosA.set([x, y, z], i * 3);
      pDataA.set([uTime.value as number, szVal, s, life], i * 4);
    }

    // Butterfly Agents
    const agents: Array<{
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      fwd: THREE.Vector3;
      phase: number;
      bank: number;
      en: number;
      seed: number;
      r: number;
      k: number;
      kick: number;
      size: number;
      f: [number, number, number];
      p: [number, number, number];
    }> = [];

    for (let i = 0; i < N; i++) {
      agents.push({
        pos: new V3((R() - 0.5) * 14, (R() - 0.5) * 8, (R() - 0.5) * 5),
        vel: new V3((R() - 0.5) * 2, (R() - 0.5) * 2, (R() - 0.5) * 2),
        fwd: new V3(1, 0, 0),
        phase: R() * 6.28,
        bank: 0,
        en: 0,
        seed: R(),
        r: 1.2 + R() * 2.2,
        k: 1.6 + R() * 1.6,
        kick: 0.4 + R() * 0.9,
        size: 0.42 + R() * 0.25,
        f: [0.4 + R() * 0.8, 0.5 + R() * 0.9, 0.3 + R() * 0.7],
        p: [R() * 6.28, R() * 6.28, R() * 6.28]
      });
    }

    // Pointer Interaction
    const ndc = new THREE.Vector2();
    let seen = false;
    let lastMove = -10;
    let glow = 0;
    const clock = new THREE.Clock();

    function onPtr(e: PointerEvent | MouseEvent) {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
      ndc.set(nx, ny);
      seen = true;
      lastMove = clock.elapsedTime;
      setHintVisible(false);
    }

    window.addEventListener("pointermove", onPtr, { passive: true });
    window.addEventListener("pointerdown", onPtr, { passive: true });

    const ray = new V3();
    const ptrW = new V3();
    const target = new V3();
    const prevT = new V3();
    const pvel = new V3();
    const pvelS = new V3();
    const desired = new V3();
    const acc3 = new V3();
    const tmpF = new V3();
    const prevF = new V3();
    const up = new V3();

    function updateSize() {
      if (!container || !renderer) return;
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      uAsp.value = camera.aspect;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);

    // Initialize WebGPURenderer
    async function start() {
      try {
        renderer = new THREE.WebGPURenderer({
          antialias: true,
          alpha: true
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);

        await renderer.init();
        if (disposed || !container) {
          renderer.dispose();
          return;
        }

        container.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.pointerEvents = "none";

        updateSize();

        renderer.setAnimationLoop(() => {
          if (disposed) return;
          const dt = Math.min(clock.getDelta(), 0.05);
          const t = clock.elapsedTime;
          uTime.value = t;

          const idle = t - lastMove > 3 || !seen;
          const nx = idle ? Math.sin(t * 0.3) * 0.6 : ndc.x;
          const ny = idle ? Math.cos(t * 0.22) * 0.4 : ndc.y;

          ray.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize();
          ptrW.copy(camera.position).addScaledVector(ray, -camera.position.z / ray.z);
          ptrW.z = Math.sin(t * 0.4) * 1.5;

          prevT.copy(target);
          target.lerp(ptrW, 1 - Math.exp(-8 * dt));

          if (dt > 0) {
            pvel.copy(target).sub(prevT).divideScalar(dt);
            if (pvel.length() > 30) pvel.setLength(30);
            pvelS.lerp(pvel, 1 - Math.exp(-10 * dt));
          }

          const sf = Math.min(pvelS.length() / 12, 1);
          glow += ((idle ? 0 : 1) - glow) * (1 - Math.exp(-3 * dt));
          uGlow.value = glow;
          uPtr.value.set(nx * 0.5 + 0.5, 1 - (ny * 0.5 + 0.5));

          const width = container.clientWidth || window.innerWidth;
          const height = container.clientHeight || window.innerHeight;

          for (let i = 0; i < N; i++) {
            const a = agents[i];
            const r = a.r * (1 + sf * 1.2);
            desired.set(
              target.x + Math.sin(t * a.f[0] + a.p[0]) * r,
              target.y + Math.sin(t * a.f[1] + a.p[1]) * r * 0.7,
              target.z + Math.sin(t * a.f[2] + a.p[2]) * r * 0.8
            );

            acc3.copy(desired).sub(a.pos).multiplyScalar(a.k);
            acc3.y += Math.sin(a.phase) * 4.5;
            acc3.x += Math.sin(t * 2.3 + a.p[1] * 7) * 1.2;
            acc3.z += Math.cos(t * 1.9 + a.p[2] * 5);
            acc3.addScaledVector(pvelS, a.kick * 0.5);

            a.vel.addScaledVector(acc3, dt).multiplyScalar(Math.exp(-1.6 * dt));
            const sp = a.vel.length();
            if (sp > 7) a.vel.multiplyScalar(7 / sp);
            a.pos.addScaledVector(a.vel, dt);
            a.en += (Math.min(sp / 4, 1) - a.en) * (1 - Math.exp(-4 * dt));
            a.phase += dt * (12 + a.size * 8 + a.en * 8);

            if (sp > 0.2) {
              tmpF.copy(a.vel).normalize();
              tmpF.y *= 0.4;
              tmpF.normalize();
              prevF.copy(a.fwd);
              a.fwd.lerp(tmpF, 1 - Math.exp(-5 * dt)).normalize();
              const turn = (prevF.z * a.fwd.x - prevF.x * a.fwd.z) / Math.max(dt, 1e-3);
              a.bank += (Math.max(-0.7, Math.min(0.7, turn * 0.12)) - a.bank) * (1 - Math.exp(-6 * dt));
            }

            up.set(0, 0.55, 1);
            up.addScaledVector(a.fwd, -up.dot(a.fwd));
            if (up.lengthSq() < 0.05) up.set(0, 1, 0);
            up.normalize().applyAxisAngle(a.fwd, a.bank);

            const sc = a.size * (width < height ? 0.85 : 1);
            aPos.set([a.pos.x, a.pos.y, a.pos.z], i * 3);
            aFwd.set([a.fwd.x, a.fwd.y, a.fwd.z], i * 3);
            aUp.set([up.x, up.y, up.z], i * 3);
            aData.set([a.seed, a.phase, a.en, sc], i * 4);

            // Particle trail behind butterflies
            if (R() < 0.25 + a.en * 0.75) {
              spawn(
                a.pos.x - a.fwd.x * 0.25 + (R() - 0.5) * 0.1,
                a.pos.y - a.fwd.y * 0.25 + (R() - 0.5) * 0.1,
                a.pos.z - a.fwd.z * 0.25,
                a.seed,
                0.07 + R() * 0.1,
                0.9 + R() * 0.8
              );
            }
          }

          if (sf > 0.15) {
            for (let k = 0; k < Math.ceil(sf * 6); k++) {
              spawn(
                target.x + (R() - 0.5) * 0.6,
                target.y + (R() - 0.5) * 0.6,
                target.z,
                R(),
                0.05 + R() * 0.12,
                0.8 + R()
              );
            }
          }

          bPos.needsUpdate = true;
          bFwd.needsUpdate = true;
          bUp.needsUpdate = true;
          bData.needsUpdate = true;
          pPosB.needsUpdate = true;
          pDataB.needsUpdate = true;

          renderer?.render(scene, camera);
        });
      } catch (err) {
        console.warn("WebGPURenderer ArcaneButterfliesOverlay initialization error:", err);
      }
    }

    start();

    return () => {
      disposed = true;
      window.removeEventListener("pointermove", onPtr);
      window.removeEventListener("pointerdown", onPtr);
      resizeObserver.disconnect();

      const r = renderer as THREE.WebGPURenderer | null;
      if (r) {
        r.setAnimationLoop(null);
        if (r.domElement && r.domElement.parentNode) {
          r.domElement.parentNode.removeChild(r.domElement);
        }
        r.dispose();
      }

      baseWingGeom.dispose();
      wingsGeom.dispose();
      wingMat.dispose();
      cyl.dispose();
      bodyGeom.dispose();
      bodyMat.dispose();
      plane.dispose();
      ptsGeom.dispose();
      ptsMat.dispose();
    };
  }, [enableBackground]);

  return (
    <div ref={containerRef} className={className} aria-hidden="true">
      {/* Subtle guidance pill that fades when cursor moves */}
      <div
        className={`pointer-events-none absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-md transition-opacity duration-700 ${
          hintVisible ? "opacity-70" : "opacity-0"
        }`}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#05d9d9]" />
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#e9e3ff]">
          Kupu-kupu Arcane · Usik kursor atawa toél layar
        </span>
      </div>
    </div>
  );
}
