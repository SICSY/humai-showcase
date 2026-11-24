import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, useCallback, MouseEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { moments, Moment } from "@/lib/humaini";

interface CardItemProps {
  moment: Moment;
  isFlipped: boolean;
  onFlip: () => void;
  index: number;
}

function MomentCard({ moment, isFlipped, onFlip, index }: CardItemProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hoverStyles, setHoverStyles] = useState({
    rx: 0,
    ry: 0,
    mxf: 50,
    isHovered: false
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const isPlaying = isFlipped && !userPaused;

  // Staggered vertical offset per card for the editorial rail
  const staggerY = index === 0 ? -22 : index === 1 ? 26 : index === 2 ? -14 : index === 3 ? 30 : -10;

  useEffect(() => {
    if (!videoRef.current) return;
    if (isFlipped) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isFlipped]);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const rx = -(y - 0.5) * 16;
    const ry = (x - 0.5) * 16;

    setHoverStyles({ rx, ry, mxf: Math.round(x * 100), isHovered: true });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverStyles({ rx: 0, ry: 0, mxf: 50, isHovered: false });
  }, []);

  const toggleVideoPlay = (e: MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setUserPaused(false);
    } else {
      videoRef.current.pause();
      setUserPaused(true);
    }
  };

  const toggleVideoMute = (e: MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const next = !videoRef.current.muted;
    videoRef.current.muted = next;
    setIsMuted(next);
  };
  return (
    <div
      ref={cardRef}
      data-moment-card
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className='group/card jj-card-item relative w-[72vw] max-w-[280px] shrink-0 snap-start select-none md:w-[clamp(185px,25vh,265px)]'
      style={{ perspective: 1400, transform: `translateY(${staggerY}px)` }}
    >
      <div
        className='relative transition-transform duration-500 ease-out'
        style={{
          transformStyle: "preserve-3d",
          transform: `
            rotateX(${hoverStyles.rx}deg)
            rotateY(${isFlipped ? 180 + hoverStyles.ry : hoverStyles.ry}deg)
            translateZ(${hoverStyles.isHovered ? 26 : 0}px)
            scale(${hoverStyles.isHovered ? 1.03 : 1})
          `,
          filter: hoverStyles.isHovered ? "drop-shadow(0 30px 46px rgba(0,0,0,0.7)) drop-shadow(0 0 28px rgba(201,162,74,0.35))" : "drop-shadow(0 16px 30px rgba(0,0,0,0.55))"
        }}
      >
        {/* ================= FRONT: gold framed artwork ================= */}
        <div
          onClick={onFlip}
          className='relative cursor-pointer overflow-hidden rounded-[6px]'
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(0deg)"
          }}
        >
          <div className='relative aspect-[1036/1519] w-full overflow-hidden rounded-[6px] bg-[#171334]'>
            <Image
              src={moment.image}
              alt={moment.alt}
              fill
              sizes='(max-width: 640px) 74vw, (max-width: 1024px) 40vw, 320px'
              className='object-cover transition-transform duration-700 ease-out group-hover/card:scale-105'
              priority={index === 0}
            />

            {/* Holographic foil sweep */}
            <div
              aria-hidden='true'
              className='pointer-events-none absolute inset-0 transition-opacity duration-300'
              style={{
                background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.25) 45%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0.25) 55%, transparent 65%)",
                backgroundSize: "260% 100%",
                backgroundPositionX: `${hoverStyles.mxf}%`,
                mixBlendMode: "screen",
                opacity: hoverStyles.isHovered ? 0.8 : 0
              }}
            />

            {/* Corner index chip */}
            <div className='absolute left-3 top-3 flex items-center gap-2'>
              <span className='jj-mono rounded-full bg-[#0b0820]/75 px-2.5 py-1 text-[9px] font-bold text-[#e9e4d7] backdrop-blur-md'>{moment.index}</span>
              <span className='jj-mono rounded-full bg-[#0b0820]/75 px-2.5 py-1 text-[9px] text-[#e9e4d7]/70 backdrop-blur-md'>{moment.year}</span>
            </div>
          </div>
        </div>

        {/* ================= BACK: game tape ================= */}
        <div
          className='absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[6px] border border-[#c9a24a]/40 bg-[#0b0820] p-4 text-[#e9e4d7]'
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)"
          }}
        >
          <div className='flex items-center justify-between border-b border-[#e9e4d7]/15 pb-2'>
            <p className='jj-mono text-[8px] font-bold tracking-widest text-[#c9a24a] uppercase'>Game Tape</p>
            <button type='button' onClick={onFlip} className='jj-mono text-[9px] text-[#e9e4d7]/70 transition-colors hover:text-[#c9a24a]'>
              FLIP ↻
            </button>
          </div>

          <div className='relative my-2 flex-1 overflow-hidden rounded-[4px] bg-black'>
            {moment.videoUrl ? <video ref={videoRef} src={moment.videoUrl} loop playsInline muted={isMuted} autoPlay={isFlipped} className='h-full w-full object-cover' /> : null}

            <div className='absolute bottom-2 right-2 flex items-center gap-2'>
              <button
                type='button'
                onClick={toggleVideoPlay}
                aria-label={isPlaying ? "Pause highlight" : "Play highlight"}
                className='flex h-6 w-6 items-center justify-center rounded-full bg-[#0b0820]/80 text-[9px] text-[#e9e4d7] backdrop-blur-md'
              >
                {isPlaying ? "❚❚" : "▶"}
              </button>
              <button type='button' onClick={toggleVideoMute} aria-label={isMuted ? "Unmute audio" : "Mute audio"} className='flex h-6 w-6 items-center justify-center rounded-full bg-[#0b0820]/80 text-[9px] text-[#e9e4d7] backdrop-blur-md'>
                {isMuted ? "🔇" : "🔊"}
              </button>
            </div>
          </div>

          <div className='space-y-1 border-t border-[#e9e4d7]/15 pt-2'>
            <div className='flex items-center justify-between text-[9px]'>
              <span className='jj-mono text-[#e9e4d7]/45'>DATE</span>
              <span className='jj-mono text-[#e9e4d7]'>{moment.details}</span>
            </div>
            <div className='flex items-center justify-between text-[9px]'>
              <span className='jj-mono text-[#e9e4d7]/45'>STATLINE</span>
              <span className='jj-mono font-bold text-[#c9a24a]'>{moment.stat}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Caption under the card */}
      <div className='mt-4 px-1'>
        <h3 className='jj-display text-[clamp(1rem,1.9vw,1.5rem)] leading-none text-[#e9e4d7]'>{moment.title}</h3>
        <p className='jj-mono mt-2 text-[9px] leading-relaxed text-[#c9a24a]'>{moment.stat}</p>
      </div>
    </div>
  );
}

export default function SignatureMoments() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const yardlinesRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  const toggleFlip = useCallback((index: string) => {
    setFlippedCards((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  }, []);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    const track = trackRef.current;
    const yardlines = yardlinesRef.current;
    if (!section || !track) return;

    const mm = gsap.matchMedia();
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const getScrollDistance = () => Math.max(0, track.scrollWidth - window.innerWidth + 96);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getScrollDistance() * 1.35}`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });

      tl.to(track, {
        x: () => -getScrollDistance(),
        ease: "none"
      });

      if (yardlines) {
        tl.to(
          yardlines,
          {
            x: () => -getScrollDistance() * 0.45,
            ease: "none"
          },
          0
        );
      }

      const cardElements = gsap.utils.toArray<HTMLElement>("[data-moment-card]");
      cardElements.forEach((card) => {
        gsap.fromTo(
          card,
          { opacity: 0.25, scale: 0.92, y: 40 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.9,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              containerAnimation: tl,
              start: "left 94%",
              end: "right 16%",
              toggleActions: "play reverse play reverse"
            }
          }
        );
      });

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
        gsap.set(track, { clearProps: "transform" });
        if (yardlines) gsap.set(yardlines, { clearProps: "transform" });
      };
    });

    return () => mm.revert();
  }, []);

  useEffect(() => {
    if (!titleRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-moment-title]",
        { yPercent: 18, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: titleRef.current,
            start: "top 90%"
          }
        }
      );
    }, titleRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id='on-field' ref={sectionRef} className='jj-ink-panel relative overflow-hidden bg-[#0b0820] text-[#e9e4d7] md:h-[100svh]'>
      {/* Dot-matrix watermark */}
      <div aria-hidden='true' className='pointer-events-none absolute inset-x-0 bottom-0 flex h-1/2 items-end justify-center overflow-hidden opacity-[0.18]'>
        <span className='jj-dots-violet jj-display text-[clamp(6rem,22vw,20rem)] leading-none'>JJ</span>
      </div>

      {/* Stadium turf yardlines (10, 20, 30, 40, 50) */}
      <div ref={yardlinesRef} aria-hidden='true' className='pointer-events-none absolute inset-y-0 left-0 z-0 flex w-[260vw] items-stretch justify-between'>
        {[10, 20, 30, 40, 50, 40, 30, 20, 10].map((yard, idx) => (
          <div key={idx} className='flex h-full w-[12vw] flex-col items-center justify-between border-l border-dashed border-[#e9e4d7]/10 px-6'>
            <span className='jj-display mt-6 text-[clamp(1.4rem,2.6vw,2.2rem)] font-light text-[#e9e4d7]/12'>{yard}</span>
            <span className='h-10 w-px bg-[#e9e4d7]/10' />
            <span className='jj-display mb-6 text-[clamp(1.4rem,2.6vw,2.2rem)] font-light text-[#e9e4d7]/12'>{yard}</span>
          </div>
        ))}
      </div>

      <div className='relative z-10 flex flex-col md:h-full'>
        {/* Oversized section title */}
        <div ref={titleRef} className='px-5 pt-14 sm:px-8 md:px-12 md:pt-16'>
          <div className='flex items-center gap-3'>
            <span className='h-2 w-2 rounded-full bg-[#c9a24a] animate-pulse' />
            <p className='jj-mono text-[10px] tracking-widest text-[#c9a24a] uppercase'>02 / On-field highlights</p>
          </div>
          <h2 data-moment-title className='jj-display mt-1 select-none whitespace-nowrap text-[clamp(2.6rem,9.2vw,8.4rem)] leading-[0.8] text-[#4b30cc]' style={{ textShadow: "0 0 60px rgba(75,48,204,0.45)" }}>
            Signature Moments
          </h2>
        </div>

        {/* Horizontal card rail */}
        <div className='flex-1 overflow-x-auto pb-16 md:overflow-visible md:pb-0'>
          <div ref={trackRef} className='flex w-max snap-x snap-mandatory items-start gap-8 px-5 py-10 sm:gap-12 sm:px-8 md:px-12'>
            {moments.map((moment, idx) => (
              <MomentCard key={moment.index} moment={moment} index={idx} isFlipped={!!flippedCards[moment.index]} onFlip={() => toggleFlip(moment.index)} />
            ))}
          </div>
        </div>

        {/* Footer rail */}
        <div className='flex items-center justify-between border-t border-[#e9e4d7]/10 px-5 py-5 sm:px-8 md:px-12'>
          <p className='jj-mono text-[9px] text-[#e9e4d7]/40'>05 moments curated · tap a card for the film</p>
          <p className='jj-mono text-[9px] text-[#c9a24a]/70'>Scroll →</p>
        </div>
      </div>
    </section>
  );
}
