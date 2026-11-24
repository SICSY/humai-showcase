import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { makeAPlayData } from "@/lib/humaini";
import { meltingTextConfig, type MeltingTheme } from "@/lib/meltingTextConfig";
import Marquee from "@/components/humaini/Marquee";
import MeltingText from "@/components/humaini/MeltingText";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group } from "three";

const tilts = [-3, 2.5, -2, 3.5, -2.5, 1.8, -3.2, 2.8, -1.5, 3.2, -2.2, 2, -3.5, 1.5, -2.8, 3];
const themeCycle: MeltingTheme[] = ["jj", "fire", "ice", "ember"];
const cardThemes: MeltingTheme[] = ["fire", "ice", "ember", "mono"];

useGLTF.preload("/fck-hand.glb");

export default function MakeAPlay() {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const themeTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const hoveringRef = useRef(false);
  const [theme, setTheme] = useState<MeltingTheme>(meltingTextConfig.theme);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const heading = headingRef.current;

    const ctx = gsap.context(() => {
      if (heading) {
        gsap.fromTo(
          heading,
          { y: 72, opacity: 0, scale: 0.94, filter: "blur(10px)" },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            duration: 1.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: heading,
              start: "top 88%",
              toggleActions: "play none none reverse",
              invalidateOnRefresh: true
            }
          }
        );
      }

      const themeTl = gsap.timeline({ repeat: -1 });
      themeCycle.forEach((nextTheme) => {
        themeTl.call(() => {
          if (!hoveringRef.current) setTheme(nextTheme);
        });
        themeTl.to({}, { duration: 2.4 });
      });
      themeTimelineRef.current = themeTl;
    });

    return () => {
      themeTimelineRef.current = null;
      ctx.revert();
    };
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const enter = {
        trigger: section,
        start: "top 84%",
        toggleActions: "play none none reverse",
        invalidateOnRefresh: true
      };

      if (bgRef.current) {
        gsap.fromTo(bgRef.current, { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 1.4, ease: "power2.out", scrollTrigger: enter });
      }

      if (seamRef.current) {
        gsap.fromTo(seamRef.current, { yPercent: -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.15, ease: "power3.out", scrollTrigger: enter });
      }

      if (tickerRef.current) {
        gsap.fromTo(
          tickerRef.current,
          { y: 34, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power2.out",
            scrollTrigger: {
              trigger: tickerRef.current,
              start: "top 94%",
              toggleActions: "play none none reverse",
              invalidateOnRefresh: true
            }
          }
        );
      }

      if (railRef.current) {
        gsap.fromTo(
          railRef.current,
          { y: 96, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: railRef.current,
              start: "top 92%",
              toggleActions: "play none none reverse",
              invalidateOnRefresh: true
            }
          }
        );
      }
    }, section);

    return () => ctx.revert();
  }, []);

  const activateCardTheme = (index: number) => {
    hoveringRef.current = true;
    themeTimelineRef.current?.pause();
    setTheme(cardThemes[index % cardThemes.length]);
  };

  const clearCardTheme = () => {
    hoveringRef.current = false;
    themeTimelineRef.current?.resume();
  };

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = handRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { yPercent: 115, opacity: 0, scale: 0.92 },
        {
          yPercent: 0,
          opacity: 1,
          scale: 1,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            toggleActions: "play none none reverse",
            invalidateOnRefresh: true
          }
        }
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id='make-a-play' data-section='make-a-play' data-tone='light' className='relative w-full overflow-hidden border-t border-[#161232]/10 bg-[#e9e4d7] pt-24 text-[#161232] md:pt-36'>
      {/* Layered archive backdrop so the cream section has depth instead of empty paper */}
      <div ref={bgRef} aria-hidden='true' className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='jj-leather-cream absolute inset-0 opacity-40 mix-blend-multiply' />
        <div className='jj-hex-field absolute inset-0 opacity-[0.14] mix-blend-multiply' />
        <div className='absolute -left-32 top-[10%] h-[26rem] w-[26rem] rounded-full bg-[#4b30cc]/20 blur-[120px]' />
        <div className='absolute -right-24 bottom-[2%] h-[22rem] w-[22rem] rounded-full bg-[#c9a24a]/25 blur-[110px]' />
        <div className='absolute left-1/2 top-[12%] -translate-x-1/2 -rotate-6 whitespace-nowrap jj-display text-[clamp(7rem,24vw,24rem)] leading-none text-transparent [-webkit-text-stroke:1px_rgba(22,18,50,0.07)]'>HUMAI</div>
        <div className='absolute inset-x-0 top-[54%] h-px bg-[#161232]/10' />
        <div className='absolute inset-x-0 top-[64%] hidden h-px bg-[repeating-linear-gradient(90deg,rgba(22,18,50,0.18)_0_10px,transparent_10px_22px)] md:block' />
        <div className='absolute left-5 top-1/2 hidden -translate-y-1/2 -rotate-90 jj-mono text-[9px] uppercase tracking-[0.45em] text-[#161232]/35 lg:block'>Visual Archive / 035</div>
        <div className='absolute right-5 top-1/2 hidden -translate-y-1/2 rotate-90 jj-mono text-[9px] uppercase tracking-[0.45em] text-[#161232]/35 lg:block'>St. Rose, LA</div>
      </div>

      {/* Diagonal seam bridging the previous heat section into this cream chapter */}
      <div ref={seamRef} aria-hidden='true' className='pointer-events-none absolute inset-x-0 top-0 z-30 h-[9vw] min-h-[64px] max-h-[120px]'>
        <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(11,6,24,0.2),rgba(44,19,82,0.08)_45%,transparent)] [clip-path:polygon(0_0,100%_0,100%_42%,0_100%)]' />
        <div className='absolute inset-x-0 top-0 h-px bg-[#161232]/20' />
        <div className='absolute inset-x-0 top-[38%] h-px bg-gradient-to-r from-transparent via-[#c9a24a]/70 to-transparent' />
      </div>

      <div className='relative z-10 mx-auto max-w-[1600px] px-5 sm:px-8 md:px-14'>
        {/* Display Headline */}
        <div ref={headingRef} className='relative mx-auto w-full max-w-[1000px] select-none'>
          <h2 className='sr-only'>
            {makeAPlayData.heading[0]} {makeAPlayData.heading[1]}
          </h2>
          <MeltingText lines={makeAPlayData.heading} theme={theme} className='h-[clamp(320px,30vw,460px)] w-full' />
        </div>
      </div>

      <div ref={tickerRef} className='relative z-10 mt-2 overflow-hidden border-y border-[#161232]/10 bg-[#f6f3ef]/55 py-2.5 backdrop-blur-[2px]'>
        <Marquee duration={48}>
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className='mx-6 flex items-center gap-6 jj-mono text-[10px] uppercase tracking-[0.34em] text-[#161232]/60'>
              <span>Aksi di Lapang</span>
              <span className='text-[#c9a24a]'>/</span>
              <span>Sumanget 18</span>
              <span className='text-[#c9a24a]'>/</span>
              <span>Bukti Nyata</span>
              <span className='text-[#c9a24a]'>/</span>
              <span>Jawara Lapang Héjo</span>
              <span className='text-[#c9a24a]'>/</span>
            </span>
          ))}
        </Marquee>
      </div>

      {/* Drifting Horizontal Rail of Tilted Framed Polaroids */}
      <div ref={railRef} className='relative z-10 mt-14 overflow-hidden py-8 md:mt-20'>
        <Marquee duration={65} className='py-4'>
          {makeAPlayData.cards.map((card, idx) => {
            const tilt = tilts[idx % tilts.length];
            return (
              <div
                key={idx}
                data-mp-card='true'
                style={{ transform: `rotate(${tilt}deg)` }}
                onPointerEnter={() => activateCardTheme(idx)}
                onPointerLeave={clearCardTheme}
                className='mx-4 sm:mx-6 w-[220px] sm:w-[260px] md:w-[300px] shrink-0 transition-transform duration-300 hover:scale-105 hover:z-20 hover:rotate-0'
              >
                <div data-mp-frame='true' className='rounded-[4px] bg-[#FAF7F2] p-2.5 pb-5 sm:p-3 sm:pb-6 shadow-[0_20px_40px_rgba(43,27,71,0.18)] border border-black/5'>
                  <div className='relative aspect-[4/5] w-full overflow-hidden rounded-[2px] bg-[#161224]'>
                    <Image src={card.src} alt={card.caption} fill sizes='(max-width: 640px) 220px, 300px' className='object-cover' />
                  </div>
                  <div className='mt-3 px-1'>
                    <p className='font-mono text-[10px] sm:text-[11px] font-bold text-[#161232] truncate'>{card.caption}</p>
                    <p className='font-mono text-[8px] text-[#161232]/50 uppercase tracking-wider mt-0.5'>ARCHIVE · 35MM</p>
                  </div>
                </div>
              </div>
            );
          })}
        </Marquee>
      </div>

      {/* Decorative hand rising from the bottom edge */}
      <div className='pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center overflow-hidden'>
        <div ref={handRef} className='h-[clamp(320px,46vh,520px)] w-full max-w-[760px] will-change-transform'>
          <Canvas className='size-full' dpr={[1, 2]} camera={{ position: [0, 0, 4], fov: 40 }} gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}>
            <ambientLight intensity={1.4} />
            <directionalLight position={[3, 5, 4]} intensity={2.4} />
            <directionalLight position={[-3, 2, -2]} intensity={0.9} color='#c9a24a' />
            <Suspense fallback={null}>
              <ModelHand />
            </Suspense>
          </Canvas>
        </div>
      </div>
    </section>
  );
}

const ModelHand = () => {
  const { scene } = useGLTF("/fck-hand.glb");
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    group.position.y = -0.8 + Math.sin(t * 0.9) * 0.05;
    group.rotation.z = Math.sin(t * 0.5) * 0.025;
  });

  return (
    <group ref={groupRef} position={[0, -0.8, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <primitive object={scene} scale={2.4} />
    </group>
  );
};
