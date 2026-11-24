import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { foundationData } from "@/lib/humaini";
import HeatShader from "@/components/humaini/HeatShader";
import FoundationShader from "@/components/humaini/FoundationShader";
import SculptTeaser from "@/components/humaini/SculptTeaser";

const SectionSculpt = dynamic(() => import("@/components/humaini/SectionSculpt"), {
  ssr: false,
  loading: () => <div className='h-[100svh] w-full bg-[#050301]' />
});

const ArcaneButterfliesOverlay = dynamic(() => import("@/components/humaini/ArcaneButterfliesOverlay"), { ssr: false });

const foundationNameParts = foundationData.name.split(",");
const foundationNameLead = foundationNameParts[0]?.trim() || foundationData.name;
const foundationNameRest = foundationNameParts.slice(1).join(",").trim();

const foundationSlides = foundationData.gallery;

function splitMomentAlt(alt: string) {
  const [lead, ...rest] = alt.split("—");
  if (!rest.length) return { kicker: "", title: alt.trim() };
  return { kicker: lead.trim(), title: rest.join("—").trim() };
}

export default function PartnershipsStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const pinPaneRef = useRef<HTMLDivElement>(null);
  const cleatRef = useRef<HTMLDivElement>(null);
  const cleatLayerRef = useRef<HTMLDivElement>(null);
  const humaiOneLayerRef = useRef<HTMLDivElement>(null);
  const humaiTwoLayerRef = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<HTMLDivElement>(null);
  const partnerCardRef = useRef<HTMLDivElement>(null);
  const partnerTextRef = useRef<HTMLDivElement>(null);
  const foundationLayerRef = useRef<HTMLDivElement>(null);
  const foundationContentRef = useRef<HTMLDivElement>(null);
  const foundationGalleryRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const scrollIndexRef = useRef(-1);
  const foundationFooterRef = useRef<HTMLDivElement>(null);
  const sculptBoxRef = useRef<HTMLButtonElement>(null);
  const sculptRectRef = useRef<DOMRect | null>(null);
  const sculptClosingRef = useRef(false);
  const bodyOverflowRef = useRef("");
  const bodyPaddingRef = useRef("");

  const [activeMoment, setActiveMoment] = useState(2); // Center slide framed by default
  const [isSculptOpen, setIsSculptOpen] = useState(false);

  const closeSculpt = useCallback(() => {
    if (sculptClosingRef.current) return;

    const overlay = document.getElementById("sculpt-room");
    const finish = () => {
      sculptClosingRef.current = false;
      setIsSculptOpen(false);
      document.body.style.overflow = bodyOverflowRef.current;
      document.body.style.paddingRight = bodyPaddingRef.current;
      window.setTimeout(() => sculptBoxRef.current?.focus({ preventScroll: true }), 0);
    };

    if (!overlay || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }

    sculptClosingRef.current = true;
    gsap.killTweensOf(overlay);
    gsap.to(overlay, { opacity: 0, duration: 0.3, ease: "power2.in", onComplete: finish });
  }, []);

  useEffect(() => {
    if (!isSculptOpen) return;

    let startY = 0;
    let closed = false;
    const openedAt = performance.now();

    const close = () => {
      if (closed) return;
      closed = true;
      closeSculpt();
    };

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < -32 && performance.now() - openedAt > 600) close();
    };
    const onTouchStart = (event: TouchEvent) => {
      startY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? 0;
      if (y - startY > 70 && performance.now() - openedAt > 600) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isSculptOpen, closeSculpt]);

  useEffect(() => {
    if (!isSculptOpen) return;

    const overlay = document.getElementById("sculpt-room");
    if (!overlay) return;

    sculptClosingRef.current = false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = sculptRectRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const from = rect ? `inset(${Math.max(0, rect.top)}px ${Math.max(0, vw - rect.right)}px ${Math.max(0, vh - rect.bottom)}px ${Math.max(0, rect.left)}px round 16px)` : "inset(42% 38% 42% 38% round 16px)";

    gsap.fromTo(
      overlay,
      { clipPath: from, opacity: 0.35 },
      {
        clipPath: "inset(0px 0px 0px 0px round 0px)",
        opacity: 1,
        duration: 0.9,
        ease: "power3.inOut",
        clearProps: "clipPath,opacity"
      }
    );
  }, [isSculptOpen]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = bodyOverflowRef.current;
      document.body.style.paddingRight = bodyPaddingRef.current;
    };
  }, []);

  const openSculptFromBox = () => {
    if (isSculptOpen || sculptClosingRef.current) return;

    const box = sculptBoxRef.current;
    if (!box) return;

    sculptRectRef.current = box.getBoundingClientRect();

    bodyOverflowRef.current = document.body.style.overflow;
    bodyPaddingRef.current = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    setIsSculptOpen(true);
  };

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const stage = stageRef.current;
    const pinPane = pinPaneRef.current;
    const foundationLayer = foundationLayerRef.current;
    const cleat = cleatRef.current;
    const cleatLayer = cleatLayerRef.current;
    const humaiOneLayer = humaiOneLayerRef.current;
    const humaiTwoLayer = humaiTwoLayerRef.current;
    const watermark = watermarkRef.current;
    const partnerCard = partnerCardRef.current;
    const partnerText = partnerTextRef.current;
    const foundationContent = foundationContentRef.current;
    const foundationGallery = foundationGalleryRef.current;
    const foundationFooter = foundationFooterRef.current;
    const deck = deckRef.current;

    if (!stage || !pinPane || !foundationLayer) return;

    const ctx = gsap.context(() => {
      // Mouse move 3D tilt for the floating cleat + photo deck
      const deckRX = deck ? gsap.quickTo(deck, "rotationX", { duration: 0.9, ease: "power3.out" }) : null;
      const deckRY = deck ? gsap.quickTo(deck, "rotationY", { duration: 0.9, ease: "power3.out" }) : null;

      const onMouseMove = (e: MouseEvent) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        if (cleat) {
          gsap.to(cleat, {
            rotateY: x * 15,
            rotateX: -y * 12,
            x: x * 18,
            y: y * 14,
            duration: 0.8,
            ease: "power2.out"
          });
        }
        deckRX?.(-y * 4);
        deckRY?.(x * 6);
      };
      window.addEventListener("mousemove", onMouseMove, { passive: true });

      // Master ScrollTrigger Timeline for the pinned Partnerships -> Foundation diagonal wipe
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.0,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const total = foundationSlides.length;
            if (!total || self.progress < 0.6) return;
            const local = Math.min(1, (self.progress - 0.6) / 0.4);
            const idx = Math.min(total - 1, Math.floor(local * total));
            if (idx !== scrollIndexRef.current) {
              scrollIndexRef.current = idx;
              setActiveMoment(idx);
            }
          }
        }
      });

      // =======================================================================
      // PHASE 1: SECTION 4 PINNED (0.00 -> 0.50)
      // Partnerships showcase is fully pinned and interactive
      // =======================================================================
      tl.to({}, { duration: 0.5 });

      // -----------------------------------------------------------------------
      // IMAGE WIPES (diagonal) — satu-satu, ada jeda tiap gambar
      //   0.00 -> 0.10  jeda   : gambar 1 (Under Armour)
      //   0.10 -> 0.22  wipe   : gambar 2 (Humai 1) naik diagonal, gambar 1 mundur
      //   0.22 -> 0.34  jeda   : gambar 2
      //   0.34 -> 0.46  wipe   : gambar 3 (Humai 2) naik diagonal, gambar 2 mundur
      //   0.46 -> 0.50  jeda   : gambar 3
      // -----------------------------------------------------------------------
      const wipeClosed = "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)";
      const wipeOpen = "polygon(0% -18%, 100% -58%, 100% 100%, 0% 100%)";

      if (humaiOneLayer) {
        tl.fromTo(humaiOneLayer, { clipPath: wipeClosed }, { clipPath: wipeOpen, duration: 0.12, ease: "power2.inOut" }, 0.1);
      }
      if (cleatLayer) {
        tl.fromTo(cleatLayer, { scale: 1, opacity: 1 }, { scale: 0.94, opacity: 0, duration: 0.12, ease: "power2.inOut" }, 0.1);
      }
      if (humaiTwoLayer) {
        tl.fromTo(humaiTwoLayer, { clipPath: wipeClosed }, { clipPath: wipeOpen, duration: 0.12, ease: "power2.inOut" }, 0.34);
      }
      if (humaiOneLayer) {
        tl.fromTo(humaiOneLayer, { scale: 1, opacity: 1 }, { scale: 0.94, opacity: 0, duration: 0.12, ease: "power2.inOut" }, 0.34);
      }

      // =======================================================================
      // PHASE 2: SECTION 4 -> SECTION 5 DIAGONAL PARALLAX PIN WIPE (0.50 -> 0.85)
      // Exactly like Section 1 -> Section 2: Angled diagonal clip-path wipes up
      // =======================================================================
      tl.fromTo(
        foundationLayer,
        {
          clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)"
        },
        {
          clipPath: "polygon(0% -12%, 100% -38%, 100% 100%, 0% 100%)",
          duration: 0.35,
          ease: "power2.inOut"
        },
        0.5
      );

      // Section 4 elements subtly parallax as Foundation wipes in
      if (cleat) {
        tl.to(cleat, { y: -80, opacity: 0.3, duration: 0.3, ease: "power1.in" }, 0.55);
      }
      if (watermark) {
        tl.to(watermark, { y: -50, opacity: 0.2, duration: 0.3, ease: "power1.in" }, 0.55);
      }
      if (partnerCard) {
        tl.to(partnerCard, { y: 30, opacity: 0, duration: 0.25, ease: "power1.in" }, 0.55);
      }

      // Foundation content rises slightly for organic parallax entry
      if (foundationContent) {
        tl.fromTo(foundationContent, { y: 60, opacity: 0.85 }, { y: 0, opacity: 1, duration: 0.45, ease: "power2.out" }, 0.53);
      }

      // Gallery tiles animate in one-by-one as the cream layer wipes up
      if (foundationGallery) {
        const tiles = gsap.utils.toArray<HTMLElement>("[data-foundation-tile]", foundationGallery);
        if (tiles.length) {
          tl.fromTo(tiles, { y: 48, opacity: 0, rotateZ: (i) => (i % 2 === 0 ? -1.4 : 1.4) }, { y: 0, opacity: 1, rotateZ: 0, duration: 0.32, stagger: 0.045, ease: "power2.out" }, 0.56);
        }
      }

      // Footer row (title, blurb, CTA) moves up slightly after the gallery
      if (foundationFooter) {
        tl.fromTo(foundationFooter, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.26, ease: "power2.out" }, 0.64);
      }

      // =======================================================================
      // PHASE 3: FOUNDATION PINNED & ACCORDION READY (0.80 -> 1.00)
      // =======================================================================
      tl.to({}, { duration: 0.2 });

      return () => {
        window.removeEventListener("mousemove", onMouseMove);
      };
    }, stage);

    return () => {
      if (partnerText) gsap.killTweensOf(partnerText);
      ctx.revert();
    };
  }, []);

  const activeSlide = foundationSlides[Math.min(activeMoment, foundationSlides.length - 1)];
  const activeAlt = activeSlide ? splitMomentAlt(activeSlide.alt) : { kicker: "", title: "" };

  return (
    <section ref={stageRef} id='partnerships' data-section='partnerships' className='relative w-full ' style={{ height: "260vh" }}>
      {/* Sticky 100svh Viewport */}
      <div ref={pinPaneRef} className='sticky top-0 h-[100svh] w-full overflow-hidden'>
        {/* =====================================================================
            LAYER 1: SECTION 4 — PARTNERSHIPS SHOWCASE (Dark Football Pebble Leather)
            Matches Reference Image 3 & 4
        ===================================================================== */}
        <div className='absolute inset-0 z-0 bg-[#000000] overflow-hidden select-none'>
          <div ref={watermarkRef} aria-hidden='true' className='pointer-events-none absolute inset-0 z-[2]'>
            <HeatShader />
          </div>

          <div aria-hidden='true' className='pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(180deg,rgba(7,4,16,0.35)_0%,transparent_28%,transparent_68%,rgba(7,4,16,0.55)_100%)]' />

          {/* Center: Scroll-driven Showcase (Matches Image 4)
              Gambar 1 Under Armour -> Gambar 2 Humai -> Gambar 3 Humai,
              tiap ganti pakai wipe diagonal naik dari bawah */}
          <div className='absolute inset-0 z-[5] flex items-center justify-center pointer-events-none pb-[5svh]'>
            <div
              ref={cleatRef}
              className='relative h-[min(70svh,700px)] w-[min(88vw,520px)] overflow-hidden will-change-transform drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)] drop-shadow-[0_0_40px_rgba(242,199,102,0.25)]'
              style={{
                perspective: 1200,
                transformStyle: "preserve-3d"
              }}
            >
              {/* Gambar 1 — Under Armour x Louis Vuitton gold cleat */}
              <div ref={cleatLayerRef} className='absolute inset-0'>
                <Image src='/gold-cleat-cutout.png' alt='Under Armour custom Louis Vuitton cleat for Humai' fill sizes='(max-width: 640px) 88vw, 520px' priority className='object-contain animate-[float_4s_ease-in-out_infinite]' />
              </div>

              {/* Gambar 2 — Humai cut-out, muncul lewat wipe diagonal */}
              <div ref={humaiOneLayerRef} className='absolute inset-0' style={{ clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)" }}>
                <Image src='/humai-transparent-1.png' alt='Humai (Humai) in LSU gear reaching forward with a gloved hand' fill sizes='(max-width: 640px) 88vw, 520px' className='object-contain' />
              </div>

              {/* Gambar 3 — Humai collage cut-out, muncul lewat wipe diagonal */}
              <div ref={humaiTwoLayerRef} className='absolute inset-0' style={{ clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)" }}>
                <Image src='/humai-transparent-2.png' alt='Humai collage cut-out with neon green doodles and torn paper frame' fill sizes='(max-width: 640px) 88vw, 520px' className='object-contain' />
              </div>
            </div>
          </div>

          {/* Bottom Left: Interactive Partner Description Card with Vertical Dots (Matches Image 4) */}
        

          {/* Bottom Right: "TINGALI SADAYA" Pill Button & Equalizer */}
          <div className='absolute bottom-6 right-5 sm:bottom-10 sm:right-10 md:right-14 z-20 flex items-center gap-3'>
            <a
              href='https://www.instagram.com/humaini_09/'
              target='_blank'
              rel='noreferrer'
              className='rounded-full bg-[#f6f3ef] px-6 py-2.5 font-mono text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#0b0820] shadow-[0_10px_25px_rgba(0,0,0,0.5)] transition-all duration-300 hover:bg-[#c9a24a] hover:scale-105 active:scale-95'
            >
              TINGALI SADAYA
            </a>

            <div className='flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-md' aria-hidden='true'>
              <div className='flex items-end gap-[2px]'>
                <span className='h-3 w-[2px] rounded-full bg-white/70' />
                <span className='h-4.5 w-[2px] rounded-full bg-white' />
                <span className='h-2 w-[2px] rounded-full bg-white/70' />
                <span className='h-3.5 w-[2px] rounded-full bg-white' />
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            LAYER 2: SECTION 5 — YAYASAN THE Humai (Bahasa Sunda & Elevated Editorial Layout)
        ===================================================================== */}
        <div
          id='foundation'
          ref={foundationLayerRef}
          className='absolute inset-0 z-10 overflow-hidden bg-[#000000] text-[#e9e3ff]'
          style={{
            clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)"
          }}
        >
          {/* Animated WebGL aurora field, tuned to the site's violet & gold palette */}
          <div aria-hidden='true' className='pointer-events-none absolute inset-0 z-0'>
            <FoundationShader />
          </div>

          {/* Readability veil */}
          <div aria-hidden='true' className='pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_22%_18%,_rgba(0, 0, 0, 0.18)_0%,_rgba(5,8,20,0.66)_72%)]' />
          <div aria-hidden='true' className='pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(0, 0, 0, 0.55)_0%,transparent_26%,transparent_72%,rgba(5,8,20,0.75)_100%)]' />

          {/* WebGPU TSL Arcane Butterflies Canvas Overlay */}
          <ArcaneButterfliesOverlay className='pointer-events-none absolute inset-0 z-[12]' />

          {/* Foundation Pinned Stage Content */}
          <div
            ref={foundationContentRef}
            className='relative z-10 mx-auto flex h-full w-full max-w-[1600px] flex-col gap-3 px-5 py-5 sm:gap-4 sm:px-8 sm:py-7 md:px-14 md:py-9 lg:grid lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.45fr)] lg:gap-x-12'
          >
            <div ref={foundationFooterRef} className='flex min-w-0 shrink-0 flex-col justify-between gap-4 lg:min-h-0'>
              <div>
                <p className='jj-serif mt-5 text-[clamp(0.95rem,1.5vw,1.25rem)] italic leading-none text-[#f2c766]/90'>{foundationData.headline}</p>

                <h3 className='jj-serif mt-2 text-[clamp(2.1rem,4.1vw,4.2rem)] leading-[0.9] md:text-8xl font-extrabold uppercase tracking-[-0.018em] text-white'>
                  <span className='block'>{foundationNameLead}</span>
                  {foundationNameRest ? (
                    <span className='mt-1 block pl-[0.06em] italic text-[#c4a9ff]'>
                      {foundationNameRest}
                      <span className='not-italic text-[#f2c766]'>.</span>
                    </span>
                  ) : (
                    <span className='mt-1 block pl-[0.06em] italic text-[#c4a9ff]'>
                      <span className='not-italic text-[#f2c766]'>.</span>
                    </span>
                  )}
                </h3>
              </div>

              <button
                ref={sculptBoxRef}
                type='button'
                onClick={openSculptFromBox}
                aria-label='Asup ka Rohangan Sculpt'
                className='group relative flex h-[clamp(110px,22vh,230px)] w-full shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#070410] text-left shadow-[0_24px_60px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-[1.015]'
              >
                <SculptTeaser className='absolute inset-0' />
                <span data-sculpt-ui='true' aria-hidden='true' className='pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(7,4,16,0.62)_0%,rgba(7,4,16,0.12)_30%,transparent_52%)]' />
                <span data-sculpt-ui='true' aria-hidden='true' className='pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,rgba(7,4,16,0.9)_0%,transparent_100%)]' />
                <span data-sculpt-ui='true' aria-hidden='true' className='pointer-events-none absolute inset-2 rounded-xl border border-white/10' />
                <span data-sculpt-ui='true' className='pointer-events-none absolute inset-x-4 bottom-3 flex items-end justify-between gap-3'>
                  <span className='flex flex-col gap-1'>
                    <span className='jj-mono text-[8px] uppercase tracking-[0.3em] text-white/45'>01 / Pintonan Visual Live</span>
                    <span className='jj-display text-lg uppercase leading-none tracking-[0.02em] text-white sm:text-xl'>Asup ka Rohangan Sculpt</span>
                  </span>
                  <span className='text-sm leading-none text-[#f2c766] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5'>↗</span>
                </span>
              </button>
            </div>

            <div className='relative flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.05fr)] lg:gap-6'>
              {/* Editorial type — voices the archive the way Humai speaks elsewhere */}
              <div className='relative z-30 flex shrink-0 flex-col justify-center lg:min-h-0'>
                <div className='flex items-center gap-3'>
                  <span className='jj-display text-[clamp(2.6rem,4.4vw,4.4rem)] leading-none text-[#f2c766]'>{String(activeMoment + 1).padStart(2, "0")}</span>
                  <span className='h-px w-12 bg-[#f2c766]/55' />
                  <span className='jj-mono text-[8px] uppercase tracking-[0.32em] text-[#e9e3ff]/45'>Momen Kapilih Yayasan</span>
                </div>

                <p key={`k-${activeMoment}`} className='jj-serif mt-3 animate-[jj-moment-in_0.55s_cubic-bezier(0.22,1,0.36,1)_both] text-[clamp(1.2rem,2.2vw,2rem)] italic leading-none text-[#f2c766]'>
                  {activeAlt.kicker}
                </p>
                <h4 key={`t-${activeMoment}`} className='jj-display mt-1 max-w-[11ch] animate-[jj-moment-in_0.7s_cubic-bezier(0.22,1,0.36,1)_both] text-[clamp(2.6rem,5.6vw,5.8rem)] leading-[0.82] tracking-[-0.02em] text-[#f6f3ef] drop-shadow-[0_8px_28px_rgba(0,0,0,0.65)]'>
                  {activeAlt.title}
                </h4>

                <div className='mt-6 flex items-center gap-4'>
                  <button
                    type='button'
                    onClick={() => setActiveMoment((i) => Math.max(0, i - 1))}
                    aria-label='Momen saméméhna'
                    disabled={activeMoment === 0}
                    className='group flex items-center disabled:opacity-25'
                  >
                    <svg viewBox='0 0 44 12' aria-hidden='true' className='h-3 w-11 rotate-180 text-[#e9e3ff]/55 transition-colors duration-300 group-hover:text-[#f2c766]'>
                      <path d='M43 6H2M2 6l8-5M2 6l8 5' fill='none' stroke='currentColor' strokeWidth='1.1' />
                    </svg>
                  </button>
                  <span className='jj-display text-[11px] tracking-[0.08em] text-white/45'>
                    {String(activeMoment + 1).padStart(2, "0")} / {String(foundationSlides.length).padStart(2, "0")}
                  </span>
                  <button
                    type='button'
                    onClick={() => setActiveMoment((i) => Math.min(foundationSlides.length - 1, i + 1))}
                    aria-label='Momen satuluyna'
                    disabled={activeMoment === foundationSlides.length - 1}
                    className='group flex items-center disabled:opacity-25'
                  >
                    <svg viewBox='0 0 44 12' aria-hidden='true' className='h-3 w-11 text-[#e9e3ff]/55 transition-colors duration-300 group-hover:text-[#f2c766]'>
                      <path d='M43 6H2M2 6l8-5M2 6l8 5' fill='none' stroke='currentColor' strokeWidth='1.1' />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 3D photo deck */}
              <div
                ref={foundationGalleryRef}
                className='jj-moment-stage relative min-h-[240px] flex-1 select-none overflow-hidden outline-none lg:h-full lg:flex-none'
                style={{ perspective: "1500px", perspectiveOrigin: "50% 46%" }}
                tabIndex={0}
                role='group'
                aria-label='Galeri momen yayasan'
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    setActiveMoment((i) => Math.max(0, i - 1));
                  }
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    setActiveMoment((i) => Math.min(foundationSlides.length - 1, i + 1));
                  }
                }}
              >
                <span
                  aria-hidden='true'
                  className='jj-display jj-outline-gold pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[clamp(8rem,17vw,18rem)] leading-none opacity-20'
                >
                  {String(activeMoment + 1).padStart(2, "0")}
                </span>

                <div ref={deckRef} className='absolute inset-0' style={{ transformStyle: "preserve-3d", willChange: "transform" }}>
                  {foundationSlides.map((tile, idx) => {
                    const offset = idx - activeMoment;
                    const abs = Math.abs(offset);
                    const isActive = offset === 0;
                    const tilt = [-2.4, 1.7, -1.3, 2.2, -1.9][idx % 5];
                    const { kicker, title } = splitMomentAlt(tile.alt);
                    return (
                      <button
                        key={`${tile.src}-${idx}`}
                        type='button'
                        data-moment-slide='true'
                        onClick={() => setActiveMoment(idx)}
                        onMouseEnter={() => setActiveMoment(idx)}
                        aria-label={`${kicker} ${title}`.trim()}
                        aria-current={isActive ? "true" : undefined}
                        className='absolute left-1/2 top-1/2 block h-full cursor-pointer focus-visible:outline-none'
                        style={{
                          aspectRatio: "2 / 3",
                          transform: `translate(-50%, -50%) translateX(${offset * 56 + tilt * 0.9}%) translateY(${tilt * 1.6}px) translateZ(${-abs * 165}px) rotateY(${offset * -33}deg) rotateX(${abs * 1.5}deg) rotateZ(${tilt}deg)`,
                          zIndex: 20 - abs,
                          opacity: abs > 3 ? 0 : 1 - abs * 0.16,
                          filter: isActive ? "none" : "saturate(0.55) brightness(0.5)",
                          transition: "transform 750ms cubic-bezier(0.22, 1, 0.36, 1), opacity 600ms ease, filter 600ms ease"
                        }}
                      >
                        <span
                          data-foundation-tile='true'
                          className='block h-full w-full bg-[#efe8d8] p-[6px]'
                          style={{
                            boxShadow: isActive
                              ? "0 26px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(242,199,102,0.65)"
                              : "0 18px 42px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)"
                          }}
                        >
                          <span className='relative block h-full w-full overflow-hidden bg-[#0b0820]'>
                            <Image
                              src={tile.src}
                              alt={tile.alt}
                              fill
                              sizes='(max-width: 768px) 60vw, 420px'
                              className='object-cover'
                              style={{ objectPosition: `${tile.focusX ?? 50}% ${tile.focusY ?? 50}%` }}
                              priority={idx === 0}
                            />
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isSculptOpen && (
        <div id='sculpt-room' role='dialog' aria-modal='true' aria-label='Rohangan Sculpt' className='fixed inset-0 z-[110] bg-[#050301]'>
          <SectionSculpt />
          <button
            type='button'
            onClick={closeSculpt}
            className='absolute left-4 top-4 z-20 rounded-full border border-white/15 bg-black/45 px-4 py-2 jj-mono text-[9px] uppercase tracking-[0.24em] text-white/80 backdrop-blur-md transition-colors hover:border-[#f2c766]/60 hover:text-[#f2c766] sm:left-6 sm:top-6'
          >
            ← Balik ka Yayasan
          </button>
          <div className='pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center'>
            <span className='jj-mono rounded-full bg-black/35 px-4 py-1.5 text-[8px] uppercase tracking-[0.28em] text-white/45 backdrop-blur-md'>Gésér ka luhur pikeun mulang</span>
          </div>
        </div>
      )}
    </section>
  );
}
