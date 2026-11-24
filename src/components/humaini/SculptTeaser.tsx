"use client";

import { Canvas } from "@react-three/fiber";
import GoldParticles from "./sculpt/GoldParticles";
import ManualPostFX from "./sculpt/ManualPostFX";
import { SculptModel } from "./SectionSculpt";

export default function SculptTeaser({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none ${className}`}>
      <Canvas
        className='size-full'
        dpr={[1, 2]}
        shadows
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 4], fov: 35 }}
      >
        <SculptModel />
        <GoldParticles />
        <ManualPostFX />
      </Canvas>
    </div>
  );
}
