"use client";

import { useEffect, useState } from "react";
import { detectQualityTier, type QualityTier } from "@/lib/devicePerf";

export function useQualityTier(): QualityTier {
  const [tier, setTier] = useState<QualityTier>("low");

  useEffect(() => {
    const update = () => setTier(detectQualityTier());
    update();

    const mq = window.matchMedia("(max-width: 820px), (pointer: coarse)");
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return tier;
}
