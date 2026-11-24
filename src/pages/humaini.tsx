import Head from "next/head";
import { Anton, Instrument_Serif, Space_Grotesk, Space_Mono } from "next/font/google";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SiteHeader from "@/components/humaini/SiteHeader";
import HeroMomentsStage from "@/components/humaini/HeroMomentsStage";
import PartnershipsStage from "@/components/humaini/PartnershipsStage";
import MakeAPlay from "@/components/humaini/MakeAPlay";

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap"
});

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  display: "swap"
});

const spaceMono = Space_Mono({
  variable: "--font-mono-jj",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap"
});

const instrument = Instrument_Serif({
  variable: "--font-jj-editorial",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap"
});

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function HumainiPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isHeroZoomed, setIsHeroZoomed] = useState(false);
  const [isHeroMuted, setIsHeroMuted] = useState(true);
  const [shadesScale, setShadesScale] = useState(0.3);

  const toggleHeroSound = useCallback(() => {
    setIsHeroMuted((muted) => !muted);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isHeroZoomed) {
        setIsHeroZoomed(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isHeroZoomed]);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) {
      const raf = requestAnimationFrame(() => setLoaded(true));
      return () => cancelAnimationFrame(raf);
    }

    const timer = setTimeout(() => {
      setLoaded(true);
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.classList.add("jj-body");
    return () => {
      document.body.classList.remove("jj-body");
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useLayoutEffect(() => {
    if (!loaded) return;
    const reduced = prefersReducedMotion();
    const root = rootRef.current;
    if (!root) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      if (!reduced) {
        gsap.from(".jj-hero-line", {
          yPercent: 110,
          duration: 1.1,
          stagger: 0.1,
          ease: "power4.out",
          delay: 0.2
        });

        gsap.from(".jj-hero-fade", {
          y: 20,
          opacity: 0,
          duration: 0.85,
          stagger: 0.08,
          ease: "power3.out",
          delay: 0.4
        });
      }
    }, root);

    ScrollTrigger.refresh();
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);

    return () => {
      window.removeEventListener("load", onLoad);
      ctx.revert();
    };
  }, [loaded]);

  return (
    <div ref={rootRef} className={`${anton.variable} ${instrument.variable} ${grotesk.variable} ${spaceMono.variable} jj-page jj-grain min-h-screen bg-[#0A0518] text-[#F6F3EF] selection:bg-[#F2C766] selection:text-[#0A0518]`}>
      <Head>
        <title>Humai — Di Lapang, Di Luar Lapang, Yayasan</title>
        <meta name='description' content='Humai, panewak bola Minnesota Vikings. Rekor, statistik karir, mitra resmi, Yayasan Humai, jeung carita lalampahan hirupna.' />
        <meta property='og:title' content='Humai — humaini.com' />
        <meta property='og:description' content='Ti St. Rose, Louisiana nepi ka panggung Met Gala — unggal léngkah mawa tujuan.' />
      </Head>

      {/* Progress Line */}
      <div aria-hidden='true' className='fixed inset-x-0 top-0 z-[100] h-[2px] bg-white/5'>
        <div className='h-full origin-left bg-[#F2C766]' style={{ transform: `scaleX(${scrollProgress})` }} />
      </div>

      <SiteHeader />

      <main>
        {/* =========================================================================
            SECTION 1, 2, 3: HERO STAGE + DIAGONAL PARALLAX WIPE + MOMENTS + QUOTE
        ========================================================================= */}
        <HeroMomentsStage isHeroZoomed={isHeroZoomed} onHeroZoomChange={setIsHeroZoomed} isHeroMuted={isHeroMuted} onToggleHeroSound={toggleHeroSound} shadesScale={shadesScale} onShadesScaleChange={setShadesScale} />

        {/* =========================================================================
            SECTION 4 & 5: PARTNERSHIPS + DIAGONAL PARALLAX PIN WIPE INTO FOUNDATION
        ========================================================================= */}

        {/* =========================================================================
            SECTION 7: MAKE A PLAY (WARM SAND, PURPLE DISPLAY, DRIFTING POLAROIDS)
        ========================================================================= */}

        <MakeAPlay />
        {/* =========================================================================
            SECTION 6: INSTAGRAM — FOLLOW FLOW + IN-PAGE INSTAGRAM WINDOW
        ========================================================================= */}
        <PartnershipsStage />

      </main>
    </div>
  );
}
