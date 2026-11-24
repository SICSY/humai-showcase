import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { foundationData } from "@/lib/humaini";

const ArcaneButterfliesOverlay = dynamic(() => import("@/components/humaini/ArcaneButterfliesOverlay"), { ssr: false });

export default function FoundationStage() {
  const [hoveredIndex, setHoveredIndex] = useState(0);

  return (
    <section
      id='foundation'
      data-section='foundation'
      data-tone='light'
      className='relative z-[11] -mt-[8vw] w-full overflow-hidden  px-5 pb-20 pt-[calc(8vw+50px)] text-[#161232] [clip-path:polygon(0_8vw,100%_0,100%_100%,0_100%)] sm:px-8 md:px-14 md:pb-28'
    >
      <ArcaneButterfliesOverlay className='pointer-events-none absolute inset-0 z-[12]' />

      <div className='mx-auto max-w-[1600px] relative z-10 '>
        {/* Header Section */}

        {/* Interactive Expanding Horizontal Tile Accordion */}
        <div className='mt-12 flex h-[480px] sm:h-[540px] md:h-[620px] w-full gap-2 sm:gap-3 overflow-hidden rounded-2xl'>
          {foundationData.gallery.map((tile, idx) => {
            const isExpanded = idx === hoveredIndex;
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onClick={() => setHoveredIndex(idx)}
                data-foundation-tile='true'
                style={{
                  flexGrow: isExpanded ? 4.5 : 1,
                  transition: "flex-grow 700ms cubic-bezier(0.22, 1, 0.36, 1)"
                }}
                className='group relative h-full cursor-pointer overflow-hidden rounded-xl '
              >
                <div className='relative h-full w-full'>
                  <Image
                    src={tile.src}
                    alt={tile.alt}
                    fill
                    sizes='(max-width: 768px) 100vw, 800px'
                    className='object-cover transition-all duration-700'
                    style={{
                      filter: isExpanded ? "grayscale(0) sepia(0) brightness(1)" : "grayscale(1) sepia(0.35) brightness(0.92)"
                    }}
                    priority={idx === 0}
                  />

                  {/* Gradient shadow overlay */}
                  <div aria-hidden='true' className={`absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent transition-opacity duration-500 ${isExpanded ? "opacity-100" : "opacity-40 group-hover:opacity-60"}`} />

                  {/* Tile Number Index */}
                  <div className='absolute top-4 left-4 z-10 font-mono text-[10px] font-bold uppercase tracking-wider text-white/80 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-sm'>#{String(idx + 1).padStart(2, "0")}</div>

                  {/* Caption reveals dynamically when tile expands */}
                  <div className={`absolute bottom-0 inset-x-0 p-5 sm:p-6 transition-all duration-500 ${isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
                    <p className='text-xs sm:text-sm font-bold text-white drop-shadow-md'>{tile.alt}</p>
                    <p className='mt-1 font-mono text-[9px] uppercase tracking-wider text-[#c9a24a]'>YAYASAN Humai · BABAKTI MASARAKAT</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Metadata & Action Row */}
        <div className='mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-[#161232]/15 pt-6'>
          <div>
            <h3 className='font-mono text-xs uppercase tracking-widest text-[#161232] font-bold'>{foundationData.name}</h3>
            <p className='mt-1 text-xs text-[#161232]/70 font-light'>Pangrojong kulawarga, pelatihan olahraga budak ngora, sarta panyaluran pangan ka sakuliah nagara.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
