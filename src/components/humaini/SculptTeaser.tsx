"use client";

import dynamic from "next/dynamic";
import { useQualityTier } from "@/hooks/useQualityTier";
import { useInView } from "@/hooks/useInView";

const SculptTeaserCanvas = dynamic(() => import("./sculpt/SculptTeaserCanvas"), { ssr: false });

export default function SculptTeaser({ className = "" }: { className?: string }) {
  const tier = useQualityTier();
  const [containerRef, inView] = useInView<HTMLDivElement>("160px");
  const active = tier === "high" && inView;

  return (
    <div ref={containerRef} className={`pointer-events-none ${className}`}>
      {active ? (
        <SculptTeaserCanvas />
      ) : (
        <div
          aria-hidden='true'
          className='h-full w-full'
          style={{
            background:
              "radial-gradient(60% 70% at 50% 82%, rgba(255,179,77,0.35) 0%, transparent 70%), radial-gradient(50% 60% at 50% 30%, rgba(157,109,233,0.16) 0%, transparent 72%), #070410",
          }}
        />
      )}
    </div>
  );
}
