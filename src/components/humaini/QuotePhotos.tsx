import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { quoteData } from "@/lib/humaini";

export default function QuotePhotos() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const leftCardRef = useRef<HTMLDivElement>(null);
  const centerCardRef = useRef<HTMLDivElement>(null);
  const rightCardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const container = containerRef.current;
    const dots = dotsRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.1,
        },
      });

      // Dot-matrix layer lifts away from the solid lettering, left to right
      if (dots) {
        tl.fromTo(dots, { clipPath: "inset(0% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 100%)", ease: "none" }, 0);
      }

      if (bodyRef.current) {
        tl.fromTo(bodyRef.current, { opacity: 0.25, y: 14 }, { opacity: 1, y: 0, ease: "none" }, 0.15);
      }

      // Photos stack up and rise over the quote
      tl.fromTo(leftCardRef.current, { x: 0, y: 40, rotateZ: -2, scale: 0.94 }, { x: -120, y: -30, rotateZ: -7, scale: 1.02, ease: "power2.out" }, 0);

      tl.fromTo(rightCardRef.current, { x: 0, y: 40, rotateZ: 2, scale: 0.94 }, { x: 120, y: -18, rotateZ: 7, scale: 1.02, ease: "power2.out" }, 0);

      tl.fromTo(centerCardRef.current, { scale: 0.9, y: 50 }, { scale: 1.04, y: -40, ease: "power2.out" }, 0);
    }, container);

    return () => ctx.revert();
  }, []);

  const lines = quoteData.lines;

  return (
    <section ref={containerRef} id='quote' data-section='quote-photos' className='relative w-full bg-[#0b0820] text-[#e9e4d7]' style={{ height: "240vh" }}>
      {/* Ambient violet glow */}
      <div aria-hidden='true' className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='absolute left-1/2 top-1/3 h-[720px] w-[960px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4b30cc]/18 blur-[170px]' />
      </div>

      <div ref={stickyRef} className='sticky top-0 flex h-[100svh] w-full flex-col justify-center overflow-hidden px-5 py-10 sm:px-8 md:px-14'>
        {/* Quote block */}
        <div className='relative z-10 mx-auto w-full max-w-[1100px] text-center'>
          <span aria-hidden='true' className='jj-display block text-[2.2rem] leading-none text-[#c9a24a] md:text-[3rem]'>
            &ldquo;
          </span>

          <div className='relative'>
            {/* Solid lettering (revealed as the scroll progresses) */}
            <h2 className='jj-display text-[clamp(2.1rem,7.4vw,6.4rem)] leading-[0.95] tracking-tight text-[#e9e4d7]'>
              {lines.map((line) => (
                <span key={line} className='block'>
                  {line}
                </span>
              ))}
            </h2>

            {/* Dot-matrix overlay (fades out left to right) */}
            <div ref={dotsRef} aria-hidden='true' className='absolute inset-0 jj-dots-bone jj-display text-[clamp(2.1rem,7.4vw,6.4rem)] leading-[0.95] tracking-tight' style={{ clipPath: "inset(0% 0% 0% 0%)" }}>
              {lines.map((line) => (
                <span key={line} className='block'>
                  {line}
                </span>
              ))}
            </div>
          </div>

          <p ref={bodyRef} className='mx-auto mt-10 max-w-[52ch] text-center text-[12px] leading-relaxed text-[#e9e4d7]/75 opacity-25 md:text-[13px]'>
            {quoteData.body}
          </p>
        </div>

        {/* Polaroid stack */}
        <div className='relative mx-auto mt-8 flex h-[240px] w-full max-w-[760px] items-center justify-center sm:h-[300px] md:mt-2 md:h-[360px]'>
          {quoteData.photos[0] && (
            <div ref={leftCardRef} className='absolute z-10 w-[150px] rotate-[-3deg] bg-[#f5f1e8] p-2 shadow-[0_22px_50px_rgba(0,0,0,0.65)] sm:w-[190px] md:w-[220px]'>
              <div className='relative aspect-[3/4] w-full overflow-hidden bg-[#171334]'>
                <Image src={quoteData.photos[0].src} alt={quoteData.photos[0].alt || "Humai"} fill sizes='(max-width: 768px) 150px, 220px' className='object-cover' />
              </div>
            </div>
          )}

          {quoteData.photos[2] && (
            <div ref={rightCardRef} className='absolute z-10 w-[150px] rotate-[3deg] bg-[#f5f1e8] p-2 shadow-[0_22px_50px_rgba(0,0,0,0.65)] sm:w-[190px] md:w-[220px]'>
              <div className='relative aspect-[3/4] w-full overflow-hidden bg-[#171334]'>
                <Image src={quoteData.photos[2].src} alt={quoteData.photos[2].alt || "Humai"} fill sizes='(max-width: 768px) 150px, 220px' className='object-cover' />
              </div>
            </div>
          )}

          {quoteData.photos[1] && (
            <div ref={centerCardRef} className='absolute z-20 w-[160px] rotate-[-1deg] bg-[#f5f1e8] p-2.5 shadow-[0_28px_70px_rgba(0,0,0,0.8)] sm:w-[200px] md:w-[235px]'>
              <div className='relative aspect-[3/4] w-full overflow-hidden bg-[#171334]'>
                <Image src={quoteData.photos[1].src} alt={quoteData.photos[1].alt || "Humai"} fill sizes='(max-width: 768px) 160px, 235px' className='object-cover' priority />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
