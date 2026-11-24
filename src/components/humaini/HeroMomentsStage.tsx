import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import Signature from "@/components/humaini/Signature";
import { moments, quoteData } from "@/lib/humaini";

const JJHero3D = dynamic(() => import("@/components/humaini/JJHero3D"), {
  ssr: false
});

interface HeroMomentsStageProps {
  isHeroZoomed?: boolean;
  onHeroZoomChange?: (zoomed: boolean) => void;
  isHeroMuted?: boolean;
  onToggleHeroSound?: () => void;
  shadesScale?: number;
  onShadesScaleChange?: (scale: number) => void;
}

export default function HeroMomentsStage({ isHeroZoomed = false, onHeroZoomChange, isHeroMuted = true, onToggleHeroSound, shadesScale = 0.3, onShadesScaleChange }: HeroMomentsStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const pinPaneRef = useRef<HTMLDivElement>(null);

  // Hero Section Refs
  const heroContentRef = useRef<HTMLDivElement>(null);
  const heroSlotRef = useRef<HTMLDivElement>(null);

  // Moments Section Refs
  const backdropRef = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<HTMLDivElement>(null);
  const yardlinesRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const momentsSlotRef = useRef<HTMLDivElement>(null);
  const otherCardsRef = useRef<HTMLDivElement>(null);
  const card1TitleRef = useRef<HTMLDivElement>(null);
  const bottomRailRef = useRef<HTMLDivElement>(null);

  // Quote & Polaroid Fan Section Refs (Fixed Layer with Zoom Out -> Zoom In Scrub)
  const quoteFixedLayerRef = useRef<HTMLDivElement>(null);
  const quoteZoomContainerRef = useRef<HTMLDivElement>(null);
  const quoteMarkRef = useRef<HTMLDivElement>(null);
  const quoteTextRef = useRef<HTMLDivElement>(null);
  const lineOverlaysRef = useRef<(HTMLHeadingElement | null)[]>([]);
  const quoteBodyRef = useRef<HTMLParagraphElement>(null);
  const photoStackRef = useRef<HTMLDivElement>(null);
  const leftPhotoRef = useRef<HTMLDivElement>(null);
  const centerPhotoRef = useRef<HTMLDivElement>(null);
  const rightPhotoRef = useRef<HTMLDivElement>(null);
  const quoteBgRef = useRef<HTMLDivElement>(null);

  // The moving Card 1 Element
  const card1Ref = useRef<HTMLDivElement>(null);

  // Interactive Card State
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const toggleFlip = useCallback((index: string) => {
    setFlippedCards((prev) => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const nudgeShades = (delta: number) => {
    if (onShadesScaleChange) {
      onShadesScaleChange(Math.max(0.2, Math.min(0.44, +(shadesScale + delta).toFixed(2))));
    }
  };

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, Flip);

    const stage = stageRef.current;
    const pinPane = pinPaneRef.current;
    const heroSlot = heroSlotRef.current;
    const momentsSlot = momentsSlotRef.current;
    const card1 = card1Ref.current;
    const backdrop = backdropRef.current;
    const track = trackRef.current;
    const yardlines = yardlinesRef.current;
    const watermark = watermarkRef.current;
    const heroContent = heroContentRef.current;
    const otherCards = otherCardsRef.current;
    const card1Title = card1TitleRef.current;
    const bottomRail = bottomRailRef.current;
    const quoteZoomContainer = quoteZoomContainerRef.current;
    const quoteMark = quoteMarkRef.current;
    const quoteText = quoteTextRef.current;
    const lineOverlays = lineOverlaysRef.current;
    const quoteBody = quoteBodyRef.current;
    const photoStack = photoStackRef.current;
    const leftPhoto = leftPhotoRef.current;
    const centerPhoto = centerPhotoRef.current;
    const rightPhoto = rightPhotoRef.current;
    const quoteBg = quoteBgRef.current;

    if (!stage || !pinPane || !heroSlot || !momentsSlot || !card1 || !track || !backdrop) {
      return;
    }

    const ctx = gsap.context(() => {
      // 1. Ensure Card 1 starts physically in Hero Slot
      heroSlot.appendChild(card1);

      // 2. Record First State with GSAP Flip
      const flipState = Flip.getState(card1, {
        props: "transform,opacity"
      });

      // 3. Move Card 1 physically into Moments Slot on the horizontal track
      momentsSlot.appendChild(card1);

      // 4. Create the genuine GSAP Flip Tween
      const flipTween = Flip.from(flipState, {
        duration: 0.16,
        rotateY: 360,
        ease: "power2.inOut",
        scale: true,
        absolute: false
      });

      // Total cards horizontal scroll distance
      const getCardsScrollDist = () => {
        return Math.max(window.innerWidth * 1.5, track.scrollWidth - window.innerWidth * 0.55);
      };

      // 5. Master Timeline bound to ScrollTrigger across the full 680vh pinned sequence
      const masterTl = gsap.timeline({
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.0,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });

      // =======================================================================
      // PHASE 1: HERO -> SECTION 2 FLIP HANDOFF & PARALLAX DIAGONAL WIPE (0.00 -> 0.16)
      // =======================================================================
      masterTl.add(flipTween, 0);

      masterTl.fromTo(
        backdrop,
        {
          clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)"
        },
        {
          clipPath: "polygon(0% -15%, 100% -45%, 100% 100%, 0% 100%)",
          duration: 0.16,
          ease: "power2.inOut"
        },
        0
      );

      if (heroContent) {
        masterTl.to(
          heroContent,
          {
            opacity: 0,
            y: -25,
            duration: 0.08,
            ease: "power1.out"
          },
          0
        );
      }

      if (yardlines) {
        masterTl.fromTo(yardlines, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "power2.out" }, 0.04);
      }

      if (watermark) {
        masterTl.fromTo(watermark, { opacity: 0, y: -30 }, { opacity: 0.55, y: 0, duration: 0.12, ease: "power2.out" }, 0.05);
      }

      if (card1Title) {
        masterTl.fromTo(card1Title, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.08, ease: "power2.out" }, 0.1);
      }

      if (otherCards) {
        masterTl.fromTo(otherCards, { opacity: 0, x: 100 }, { opacity: 1, x: 0, duration: 0.12, ease: "power2.out" }, 0.06);
      }

      // =======================================================================
      // PHASE 2: HORIZONTAL CARDS SCROLL (0.16 -> 0.52)
      // =======================================================================
      masterTl.to(
        track,
        {
          x: () => -getCardsScrollDist(),
          duration: 0.36,
          ease: "none"
        },
        0.16
      );

      if (yardlines) {
        masterTl.to(
          yardlines,
          {
            x: () => -getCardsScrollDist() * 0.38,
            duration: 0.36,
            ease: "none"
          },
          0.16
        );
      }

      // Behind Card 4 & 5: Fixed Quote appears at GIANT ZOOM (scale: 2.3, x: 4vw, Image 2!)
      if (quoteZoomContainer) {
        masterTl.fromTo(quoteZoomContainer, { opacity: 0, scale: 2.3, x: "4vw" }, { opacity: 0.85, scale: 2.3, x: "4vw", duration: 0.1, ease: "power1.out" }, 0.38);
      }

      // As Card 5 scrolls off: Cards track, watermark, yardlines fade out
      masterTl.to(track, { opacity: 0, duration: 0.08, ease: "power1.out" }, 0.48);

      if (watermark) {
        masterTl.to(watermark, { opacity: 0, duration: 0.08, ease: "power1.out" }, 0.46);
      }
      if (yardlines) {
        masterTl.to(yardlines, { opacity: 0, duration: 0.08, ease: "power1.out" }, 0.48);
      }
      if (bottomRail) {
        masterTl.to(bottomRail, { opacity: 0, y: 15, duration: 0.06, ease: "power1.out" }, 0.46);
      }

      // Section 3 Background: transitions back to Section 1 cream football leather
      if (quoteBg) {
        masterTl.fromTo(quoteBg, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "power1.out" }, 0.48);
      }

      // =======================================================================
      // THE ZOOM OUT TO EDGE-TO-EDGE SCREEN FILL (0.48 -> 0.58, Image 3!)
      // =======================================================================
      if (quoteZoomContainer) {
        masterTl.to(
          quoteZoomContainer,
          {
            scale: 1.35,
            x: "0vw",
            opacity: 1.0,
            duration: 0.1,
            ease: "power2.out"
          },
          0.48
        );
      }

      if (quoteMark) {
        masterTl.fromTo(quoteMark, { opacity: 0, scale: 0.75 }, { opacity: 1, scale: 1, duration: 0.05, ease: "back.out(1.5)" }, 0.54);
      }

      // =======================================================================
      // PHASE 3: SCALING DOWN TO CENTERED FIT (1.35 -> 1.0) + ATHLETIC DIAGONAL SCRUB REVEAL (0.58 -> 0.78, Image 4!)
      // =======================================================================
      if (quoteZoomContainer) {
        masterTl.to(
          quoteZoomContainer,
          {
            scale: 1.0,
            duration: 0.2,
            ease: "power1.out"
          },
          0.58
        );
      }

      // Line 1: solid cream sweeps with athletic diagonal slant across dotted LED (Matches Image 4!)
      if (lineOverlays[0]) {
        masterTl.fromTo(lineOverlays[0], { clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)" }, { clipPath: "polygon(0% 0%, 106% 0%, 100% 100%, 0% 100%)", duration: 0.07, ease: "none" }, 0.58);
      }

      // Line 2: solid cream sweeps with athletic diagonal slant across dotted LED
      if (lineOverlays[1]) {
        masterTl.fromTo(lineOverlays[1], { clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)" }, { clipPath: "polygon(0% 0%, 106% 0%, 100% 100%, 0% 100%)", duration: 0.07, ease: "none" }, 0.65);
      }

      // Line 3: solid cream sweeps with athletic diagonal slant across dotted LED
      if (lineOverlays[2]) {
        masterTl.fromTo(lineOverlays[2], { clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)" }, { clipPath: "polygon(0% 0%, 106% 0%, 100% 100%, 0% 100%)", duration: 0.07, ease: "none" }, 0.72);
      }

      // Narrative body text fades in underneath (Matches Image 4!)
      if (quoteBody) {
        masterTl.fromTo(quoteBody, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.08, ease: "power1.out" }, 0.7);
      }

      // =======================================================================
      // PHASE 4: STAGE REMAINS PINNED! POLAROID FAN STACK OVER QUOTE (0.76 -> 0.96)
      // =======================================================================
      if (photoStack) {
        masterTl.fromTo(photoStack, { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.78);
      }

      if (leftPhoto) {
        masterTl.fromTo(leftPhoto, { x: 0, y: 50, rotateZ: -2, scale: 0.92 }, { x: -140, y: 0, rotateZ: -7, scale: 1.02, duration: 0.16, ease: "power2.out" }, 0.8);
      }

      if (rightPhoto) {
        masterTl.fromTo(rightPhoto, { x: 0, y: 50, rotateZ: 2, scale: 0.92 }, { x: 140, y: 10, rotateZ: 7, scale: 1.02, duration: 0.16, ease: "power2.out" }, 0.8);
      }

      if (centerPhoto) {
        masterTl.fromTo(centerPhoto, { y: 60, scale: 0.92 }, { y: -10, scale: 1.05, duration: 0.16, ease: "power2.out" }, 0.8);
      }

      if (quoteText) {
        masterTl.to(quoteText, { opacity: 0.25, duration: 0.16, ease: "power1.out" }, 0.8);
      }
    }, stage);

    return () => {
      ctx.revert();
      // Restore card1 back to heroSlot on unmount
      if (heroSlot && card1 && card1.parentNode !== heroSlot) {
        heroSlot.appendChild(card1);
      }
    };
  }, [shadesScale]);

  const moment1 = moments[0];
  const otherMoments = moments.slice(1);

  return (
    <section ref={stageRef} id='home' data-section='home-stage' className='relative w-full' style={{ height: "680vh" }}>
      {/* Sticky 100svh Viewport */}
      <div ref={pinPaneRef} data-home-pin='true' className='sticky top-0 h-[100svh] w-full overflow-hidden'>
        {/* =====================================================================
            LAYER 1: HERO SECTION (Cream Leather / 3D Sunglasses / Editorial Sidebars)
        ===================================================================== */}
        <div data-section='hero-editorial' className='absolute inset-0 z-0 bg-[#e9e4d7] overflow-hidden'>
          {/* Authentic Cream Football Pebble Leather Texture */}
          <div aria-hidden='true' className='jj-leather-cream absolute inset-0 opacity-100' />
          {/* Subtle Hex Mesh Accent */}
          <div aria-hidden='true' className='jj-hex-field absolute inset-0 opacity-40' />

          {/* Three.js 3D Portrait & Video Sunglasses Mask */}
          <div className='absolute inset-0 z-[5]'>
            <JJHero3D isZoomed={isHeroZoomed} onZoomChange={onHeroZoomChange} isMuted={isHeroMuted} onToggleSound={onToggleHeroSound} shadesScale={shadesScale} onShadesScaleChange={onShadesScaleChange} />
          </div>

          {/* Editorial Sidebars (Matches Image 1) */}
          <div ref={heroContentRef} className='pointer-events-none relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1680px] flex-col justify-between px-5 pb-8 pt-24 sm:px-8 md:px-2 md:pb-12 md:pt-28'>
            <div className='grid flex-1 grid-cols-1 items-center gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,2.2fr)_minmax(0,0.85fr)]'>
              {/* Left Column: Hero Card Slot & Blurb */}
              <div className='order-1 hidden md:block'>
                {/* HERO SLOT: Card 1 starts physically here! */}
                <div
                  ref={heroSlotRef}
                  className='w-[140px] md:w-[155px] aspect-[1036/1519] rounded-[4px] border-2 border-[#c9a24a]/80 shadow-[0_12px_30px_rgba(0,0,0,0.2)] overflow-hidden bg-[#161232]/10 backdrop-blur-sm p-1 pointer-events-auto'
                >
                  {/* Card 1 is rendered here in JSX, then moved via GSAP Flip! */}
                  <div
                    ref={card1Ref}
                    onMouseEnter={() => setHoveredCard(moment1.index)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => toggleFlip(moment1.index)}
                    className='relative h-full w-full cursor-pointer select-none'
                    style={{
                      aspectRatio: "1036 / 1519",
                      perspective: 1400
                    }}
                  >
                    {/* 3D Trading Card Body with 180° Flip */}
                    <div
                      className='relative h-full w-full rounded-[14px] md:rounded-[18px] transition-transform duration-500 ease-out'
                      style={{
                        transformStyle: "preserve-3d",
                        transform: `rotateY(${flippedCards[moment1.index] ? 180 : 0}deg) scale(${hoveredCard === moment1.index ? 1.04 : 1.0})`,
                        filter: hoveredCard === moment1.index ? "drop-shadow(0 30px 55px rgba(0,0,0,0.85)) drop-shadow(0 0 30px rgba(242,199,102,0.45))" : "drop-shadow(0 18px 35px rgba(0,0,0,0.7))"
                      }}
                    >
                      {/* FRONT FACE (Card Artwork) */}
                      <div className='absolute inset-0 overflow-hidden rounded-[14px] md:rounded-[18px] border-[2.5px] md:border-[3.5px] border-[#c9a24a] bg-[#161232] shadow-2xl' style={{ backfaceVisibility: "hidden" }}>
                        <Image src={moment1.image} alt={moment1.alt} fill sizes='(max-width: 768px) 76vw, 350px' className='object-cover' priority />

                        {/* Gold Foil Border Shimmer */}
                        <div aria-hidden='true' className='pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-60' />
                        <div aria-hidden='true' className='pointer-events-none absolute inset-0 rounded-[11px] md:rounded-[15px] border border-white/20' />

                        {/* "TONTON" Pill Button */}
                        <div
                          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f6f3ef] px-4 py-1.5 font-mono text-[9px] font-extrabold uppercase tracking-[0.24em] text-[#0b0820] shadow-2xl backdrop-blur-md transition-all duration-300 ${
                            hoveredCard === moment1.index && !flippedCards[moment1.index] ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
                          }`}
                        >
                          TONTON
                        </div>
                      </div>

                      {/* BACK FACE (Video Highlight Playback) */}
                      <div
                        className='absolute inset-0 overflow-hidden rounded-[14px] md:rounded-[18px] border-[2.5px] md:border-[3.5px] border-[#c9a24a] bg-black shadow-2xl'
                        style={{
                          backfaceVisibility: "hidden",
                          transform: "rotateY(180deg)"
                        }}
                      >
                        {moment1.videoUrl && flippedCards[moment1.index] && <video src={moment1.videoUrl} autoPlay loop muted playsInline className='h-full w-full object-cover' />}

                        <div className='absolute bottom-3 left-3 right-3 rounded-lg bg-black/70 p-2.5 backdrop-blur-md'>
                          <p className='font-mono text-[10px] font-bold text-white uppercase truncate'>{moment1.title}</p>
                          <p className='font-mono text-[8px] text-[#c9a24a] uppercase'>{moment1.stat}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className='mt-4 max-w-[34ch] font-grotesk text-[12px] leading-[1.7] text-[#161232]/80 md:text-[13px]'>
                  Ngawangun pangalaman digital ngaliwatan desain anu éndah, téknologi, jeung kreativitas. Unggal karya mangrupa gambaran tina ide, prosés, jeung perhatian kana unggal jéntréna.
                </p>
              </div>

              {/* Center spacer for 3D portrait */}
              <div className='order-2' aria-hidden='true' />

              {/* Right Column: Purple Signature & Blurb */}
              <div className='order-3 hidden md:block md:self-center'>
                <Signature className='h-[64px] w-[150px] text-[#4b30cc] md:h-[78px] md:w-[186px]' />
                <p className='mt-4 max-w-[32ch] font-grotesk text-[12px] leading-[1.7] text-[#161232]/80 md:text-[13px]'>Késang, getih, jeung sumanget anu moal kungsi pareum.</p>
              </div>
            </div>

            {/* Bottom-right Utility Cluster (Kaca Panon size + Audio toggle) */}
            <div className='pointer-events-auto flex items-end justify-end gap-3.5'>
              <div className='flex items-center gap-2 rounded-full border border-[#161232]/15 bg-[#f5f1e8]/90 px-3 py-1.5 backdrop-blur-md shadow-sm'>
                <span className='jj-mono text-[9px] text-[#161232]/60 font-bold uppercase tracking-[0.18em]'>KACA PANON</span>
                <button type='button' onClick={() => nudgeShades(-0.02)} className='h-5 w-5 rounded text-[#161232]/70 font-bold transition-colors hover:bg-[#161232]/10' title='Leutikan kacamata'>
                  −
                </button>
                <span className='jj-mono min-w-[30px] text-center text-[10px] font-bold text-[#161232]'>{Math.round(shadesScale * 100)}%</span>
                <button type='button' onClick={() => nudgeShades(0.02)} className='h-5 w-5 rounded text-[#161232]/70 font-bold transition-colors hover:bg-[#161232]/10' title='Gedéan kacamata'>
                  +
                </button>
              </div>

              <button
                type='button'
                onClick={onToggleHeroSound}
                aria-label={isHeroMuted ? "Hurungkeun sora" : "Pareumkeun sora"}
                className='flex h-11 w-11 items-center justify-center rounded-full bg-[#161232] text-[#f5f1e8] shadow-[0_10px_25px_rgba(22,18,50,0.3)] transition-transform hover:scale-105 active:scale-95'
              >
                <span aria-hidden='true' className='flex items-end gap-[2.5px]'>
                  {[12, 18, 9, 15].map((h, i) => (
                    <span key={i} style={{ height: `${h}px` }} className={`block w-[2px] rounded-full bg-[#f5f1e8] transition-opacity ${isHeroMuted ? "opacity-40" : "opacity-100"}`} />
                  ))}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            LAYER 2: SECTION 2 — DARK TURF BACKDROP WITH PARALLAX DIAGONAL WIPE
        ===================================================================== */}
        <div
          ref={backdropRef}
          data-jj-backdrop='true'
          className='absolute inset-0 z-10 overflow-hidden bg-[#0b0820] text-[#e9e4d7]'
          style={{
            clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)"
          }}
        >
          {/* Authentic Dark Football Pebble Leather Texture */}
          <div aria-hidden='true' className='jj-leather-dark absolute inset-0 opacity-100' />

          {/* Subtle Ambient Stadium Texture */}
          <div aria-hidden='true' className='pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#3d2494]/40 via-transparent to-transparent' />

          {/* Giant Watermark Display: "SIGNATURE MOMENTS" */}
          <div ref={watermarkRef} aria-hidden='true' className='pointer-events-none absolute inset-x-0 top-6 sm:top-10 md:top-12 z-[5] overflow-hidden select-none opacity-0'>
            <h2 className='jj-display whitespace-nowrap text-center text-[clamp(5rem,15vw,14rem)] leading-[0.8] tracking-tight jj-leather-purple-text drop-shadow-[0_0_80px_rgba(61,36,148,0.4)]'>DETIK KASOHOR</h2>
          </div>

          {/* Stadium Turf Yardlines (10, 20, 30, 40, 50...) with Authentic Giant Numbers */}
          <div ref={yardlinesRef} aria-hidden='true' className='pointer-events-none absolute inset-y-0 left-0 z-0 flex items-stretch opacity-0' style={{ width: "420vw" }}>
            {[10, 20, 30, 40, 50, 40, 30, 20, 10, 20].map((yard, idx) => (
              <div key={idx} className='relative flex h-full w-[37vw] shrink-0 flex-col items-center justify-end border-l border-dashed border-[#e9e4d7]/10 pb-16 md:pb-20'>
                {/* Upper hash tick marks */}
                <span className='absolute top-20 left-0 w-3 h-px bg-[#e9e4d7]/20' />
                <span className='absolute top-1/3 left-0 w-4 h-px bg-[#e9e4d7]/20' />
                <span className='absolute top-2/3 left-0 w-4 h-px bg-[#e9e4d7]/20' />

                {/* Giant Field Number (low on the turf, matching screenshot) */}
                <span className='font-anton text-[clamp(6rem,11vw,10.5rem)] font-bold text-white/[0.07] tracking-wider select-none leading-none'>{yard}</span>
              </div>
            ))}
          </div>
        </div>

        {/* =====================================================================
            LAYER 2.5: FIXED QUOTE & PHOTO STAGE (FIXED OVERLAY: ZOOM OUT -> ZOOM IN SCRUB)
        ===================================================================== */}
        <div ref={quoteFixedLayerRef} className='pointer-events-none absolute inset-0 z-20 flex h-full w-full flex-col items-center justify-center overflow-hidden select-none'>
          {/* Section 3 Background: transitions back to Section 1 cream football leather */}
          <div ref={quoteBgRef} aria-hidden='true' className='jj-leather-cream absolute inset-0 opacity-0 pointer-events-none' />
          <div
            ref={quoteZoomContainerRef}
            className='relative flex flex-col items-center justify-center text-center px-4 sm:px-8 w-full max-w-[1240px] will-change-transform opacity-0'
            style={{
              transform: "scale(2.3) translateX(4vw)",
              transformOrigin: "center center"
            }}
          >
            {/* Quotation Marks (Matches Image 2 & 3) */}
            <div ref={quoteMarkRef} className='mb-4 md:mb-6 select-none opacity-0'>
              <span className='font-serif text-3xl sm:text-4xl md:text-5xl tracking-widest text-[#c9a24a] leading-none'>“ ”</span>
            </div>

            {/* The 3-Line Scrub Reveal Quote */}
            <div ref={quoteTextRef} className='relative w-full max-w-[1080px] mx-auto'>
              {quoteData.lines.map((line, idx) => (
                <div key={idx} className='relative overflow-hidden py-0.5 sm:py-1 select-none'>
                  {/* DOTTED STADIUM LED BASE LAYER (Matches Image 1, 2, 3) */}
                  <h2
                    className='jj-display jj-dots-ink text-[clamp(2.5rem,7.5vw,6.6rem)] leading-[0.92] tracking-tight uppercase'
                    style={{
                      backgroundImage: "radial-gradient(circle, rgba(22, 18, 50, 0.45) 1.5px, transparent 1.7px)",
                      backgroundSize: "6px 6px"
                    }}
                  >
                    {line}
                  </h2>

                  {/* SOLID INK OVERLAY LAYER (Scrubbed with clip-path from left to right on cream background) */}
                  <h2
                    ref={(el) => {
                      lineOverlaysRef.current[idx] = el;
                    }}
                    className='absolute inset-0 jj-display text-[clamp(2.5rem,7.5vw,6.6rem)] leading-[0.92] tracking-tight uppercase text-[#161232]'
                    style={{ clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)" }}
                  >
                    {line}
                  </h2>
                </div>
              ))}
            </div>

            {/* Quote Body Narrative (Bahasa Sunda) */}
            <p ref={quoteBodyRef} className='mx-auto mt-6 md:mt-8 max-w-[54ch] text-center font-grotesk text-[13px] leading-[1.75] text-[#161232]/85 md:text-[14.5px] opacity-0 select-none'>
              {quoteData.body}
            </p>

            {/* Photo Fan Polaroid Stack (Absolute centered so it never displaces the quote from the center) */}
            <div ref={photoStackRef} className='pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-[280px] w-full max-w-[850px] items-center justify-center opacity-0 sm:h-[340px] md:h-[400px]'>
              {quoteData.photos[0] && (
                <div ref={leftPhotoRef} className='absolute z-10 w-[165px] rotate-[-8deg] bg-[#f5f1e8] p-2.5 pb-4 shadow-[0_28px_65px_rgba(0,0,0,0.9)] sm:w-[215px] md:w-[255px] rounded-[3px] border border-black/10'>
                  <div className='relative aspect-[3/4] w-full overflow-hidden bg-[#171334] rounded-[1px]'>
                    <Image src={quoteData.photos[0].src} alt={quoteData.photos[0].alt || "Humai"} fill sizes='(max-width: 768px) 165px, 255px' className='object-cover' />
                  </div>
                  <div className='pt-2 text-center font-mono text-[9px] sm:text-[10px] tracking-[0.24em] text-[#161232]/75 uppercase font-bold'>DI LUAR LAPANG · 01</div>
                </div>
              )}

              {quoteData.photos[2] && (
                <div ref={rightPhotoRef} className='absolute z-10 w-[165px] rotate-[8deg] bg-[#f5f1e8] p-2.5 pb-4 shadow-[0_28px_65px_rgba(0,0,0,0.9)] sm:w-[215px] md:w-[255px] rounded-[3px] border border-black/10'>
                  <div className='relative aspect-[3/4] w-full overflow-hidden bg-[#171334] rounded-[1px]'>
                    <Image src={quoteData.photos[2].src} alt={quoteData.photos[2].alt || "Humai"} fill sizes='(max-width: 768px) 165px, 255px' className='object-cover' />
                  </div>
                  <div className='pt-2 text-center font-mono text-[9px] sm:text-[10px] tracking-[0.24em] text-[#161232]/75 uppercase font-bold'>DI LUAR LAPANG · 03</div>
                </div>
              )}

              {quoteData.photos[1] && (
                <div ref={centerPhotoRef} className='absolute z-20 w-[185px] rotate-[-1deg] bg-[#f5f1e8] p-3 pb-5 shadow-[0_36px_85px_rgba(0,0,0,0.98)] sm:w-[240px] md:w-[285px] rounded-[3px] border border-black/10'>
                  <div className='relative aspect-[3/4] w-full overflow-hidden bg-[#171334] rounded-[1px]'>
                    <Image src={quoteData.photos[1].src} alt={quoteData.photos[1].alt || "Humai"} fill sizes='(max-width: 768px) 185px, 285px' className='object-cover' priority />
                  </div>
                  <div className='pt-2 text-center font-mono text-[9px] sm:text-[10px] tracking-[0.24em] text-[#161232]/90 uppercase font-bold'>Humai · 02</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================================
            LAYER 3: HORIZONTAL CARDS TRACK (Z-INDEX 30 - FLOATS IN FRONT OF QUOTE)
        ===================================================================== */}
        <div className='pointer-events-none absolute inset-0 z-30 flex h-full w-full flex-col justify-center'>
          <div ref={trackRef} className='pointer-events-auto flex items-center gap-16 sm:gap-24 md:gap-[15vw] px-[16vw] md:px-[22vw]'>
            {/* =================================================================
                CARD 1 MOMENTS SLOT (Flip target destination at Yardline 20)
                Staggered Position: Elevated (-4.5vh)
            ================================================================= */}
            <div className='flex flex-col items-center shrink-0' style={{ transform: "translateY(-4.5vh)" }}>
              <div
                ref={momentsSlotRef}
                className='group/card relative w-[76vw] max-w-[340px] shrink-0 cursor-pointer select-none md:w-[clamp(280px,36vh,350px)]'
                style={{
                  aspectRatio: "1036 / 1519"
                }}
              >
                {/* Card 1 is moved here by GSAP Flip! */}
              </div>

              {/* Card 1 Label Underneath in Moments Section */}
              <div ref={card1TitleRef} className='mt-5 text-center select-none opacity-0'>
                <h3 className='font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.22em] text-[#e9e4d7]'>{moment1.title}</h3>
                <p className='font-mono text-[9px] sm:text-[10px] tracking-[0.24em] text-[#c9a24a] uppercase mt-1.5'>{moment1.stat}</p>
              </div>
            </div>

            {/* =================================================================
                CARDS 2 THROUGH 5 (Staggered High-Low wave matching humaini.com)
            ================================================================= */}
            <div ref={otherCardsRef} className='flex items-center gap-16 sm:gap-24 md:gap-[15vw] opacity-0'>
              {otherMoments.map((moment, idx) => {
                const isFlipped = !!flippedCards[moment.index];
                // Stagger sequence: Card 2 low (+6vh), Card 3 high (-4vh, -1.8deg), Card 4 low (+5.5vh), Card 5 high (-3.5vh)
                const staggerTransforms = [
                  "translateY(6vh)", // Card 2
                  "translateY(-4vh) rotate(-1.8deg)", // Card 3
                  "translateY(5.5vh)", // Card 4
                  "translateY(-3.5vh)" // Card 5
                ];
                const cardTransform = staggerTransforms[idx] || "translateY(0)";

                return (
                  <div key={moment.index} className='flex flex-col items-center shrink-0' style={{ transform: cardTransform }}>
                    <div
                      onMouseEnter={() => setHoveredCard(moment.index)}
                      onMouseLeave={() => setHoveredCard(null)}
                      onClick={() => toggleFlip(moment.index)}
                      className='group/card relative w-[76vw] max-w-[340px] shrink-0 cursor-pointer select-none md:w-[clamp(280px,36vh,350px)]'
                      style={{
                        aspectRatio: "1036 / 1519",
                        perspective: 1400
                      }}
                    >
                      {/* 3D Trading Card Body with 180° Flip */}
                      <div
                        className='relative h-full w-full rounded-[14px] md:rounded-[18px] transition-transform duration-500 ease-out'
                        style={{
                          transformStyle: "preserve-3d",
                          transform: `rotateY(${isFlipped ? 180 : 0}deg) scale(${hoveredCard === moment.index ? 1.04 : 1.0})`,
                          filter: hoveredCard === moment.index ? "drop-shadow(0 30px 55px rgba(0,0,0,0.85)) drop-shadow(0 0 30px rgba(242,199,102,0.45))" : "drop-shadow(0 18px 35px rgba(0,0,0,0.7))"
                        }}
                      >
                        {/* FRONT FACE (Card Artwork) */}
                        <div className='absolute inset-0 overflow-hidden rounded-[14px] md:rounded-[18px] border-[2.5px] md:border-[3.5px] border-[#c9a24a] bg-[#161232] shadow-2xl' style={{ backfaceVisibility: "hidden" }}>
                          <Image src={moment.image} alt={moment.alt} fill sizes='(max-width: 768px) 76vw, 350px' className='object-cover' />

                          {/* Gold Foil Border Shimmer */}
                          <div aria-hidden='true' className='pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-60' />
                          <div aria-hidden='true' className='pointer-events-none absolute inset-0 rounded-[11px] md:rounded-[15px] border border-white/20' />

                          {/* "TONTON" Pill Button */}
                          <div
                            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f6f3ef] px-4 py-1.5 font-mono text-[9px] font-extrabold uppercase tracking-[0.24em] text-[#0b0820] shadow-2xl backdrop-blur-md transition-all duration-300 ${
                              hoveredCard === moment.index && !isFlipped ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
                            }`}
                          >
                            TONTON
                          </div>
                        </div>

                        {/* BACK FACE (Video Highlight Playback) */}
                        <div
                          className='absolute inset-0 overflow-hidden rounded-[14px] md:rounded-[18px] border-[2.5px] md:border-[3.5px] border-[#c9a24a] bg-black shadow-2xl'
                          style={{
                            backfaceVisibility: "hidden",
                            transform: "rotateY(180deg)"
                          }}
                        >
                          {moment.videoUrl && isFlipped && <video src={moment.videoUrl} autoPlay loop muted playsInline className='h-full w-full object-cover' />}

                          <div className='absolute bottom-3 left-3 right-3 rounded-lg bg-black/70 p-2.5 backdrop-blur-md'>
                            <p className='font-mono text-[10px] font-bold text-white uppercase truncate'>{moment.title}</p>
                            <p className='font-mono text-[8px] text-[#c9a24a] uppercase'>{moment.stat}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Label Underneath */}
                    <div className='mt-5 text-center select-none'>
                      <h3 className='font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.22em] text-[#e9e4d7]'>{moment.title}</h3>
                      <p className='font-mono text-[9px] sm:text-[10px] tracking-[0.24em] text-[#c9a24a] uppercase mt-1.5'>{moment.stat}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Rail Metadata (Bahasa Sunda) */}
        <div
          ref={bottomRailRef}
          className='pointer-events-none absolute bottom-5 inset-x-5 md:inset-x-12 z-40 flex items-center justify-between border-t border-[#e9e4d7]/10 pt-4 text-[10px] text-[#e9e4d7]/50 font-mono uppercase tracking-[0.22em]'
        >
          <span>05 DETIK KASOHOR</span>
          <span className='text-[#c9a24a]'>GÉSÉR KA GIGIR PIKEUN NINGALI →</span>
        </div>
      </div>
    </section>
  );
}
