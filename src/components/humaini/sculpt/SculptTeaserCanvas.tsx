"use client";

import { Canvas } from "@react-three/fiber";
import GoldParticles from "./GoldParticles";
import ManualPostFX from "./ManualPostFX";
import { SculptModel } from "../SectionSculpt";

export default function SculptTeaserCanvas() {
  return (
    <Canvas
      className='size-full'
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 4], fov: 35 }}
    >
      <SculptModel />
      <GoldParticles />
      <ManualPostFX />
    </Canvas>
  );
}
