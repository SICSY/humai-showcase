import { useEffect, useState } from "react";
import Logo from "./Logo";
import { navLinks, socials } from "@/lib/humaini";

const navScroll: Record<string, { anchor: string; progress: number }> = {
  "#home": { anchor: "#home", progress: 0 },
  "#on-field": { anchor: "#home", progress: 0.26 },
  "#quote": { anchor: "#home", progress: 0.56 },
  "#partnerships": { anchor: "#partnerships", progress: 0 },
  "#foundation": { anchor: "#partnerships", progress: 0.78 },
  "#make-a-play": { anchor: "#make-a-play", progress: 0 }
};

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  const goToSection = (href: string) => {
    setOpen(false);
    const target = navScroll[href] ?? { anchor: href, progress: 0 };
    const element = document.querySelector(target.anchor);
    if (!element) return;

    const top = element.getBoundingClientRect().top + window.scrollY;
    const travel = Math.max(0, element.clientHeight - window.innerHeight);
    const destination = top + travel * target.progress;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: destination, behavior: "smooth" });
    });
  };

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <header className='fixed inset-x-0 top-0 z-[95]'>
        <div className='relative flex items-center justify-between px-5 py-5 sm:px-8 md:px-12 md:py-6 mix-blend-difference'>
          <a href='#home' onClick={() => setOpen(false)} className='group text-white' aria-label='Humai — home'>
            <Logo className='h-8 w-auto transition-transform duration-500 ease-out group-hover:-translate-y-0.5 md:h-10' />
          </a>

          <h1 className='jj-display pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[clamp(0.95rem,2.1vw,1.55rem)] tracking-[0.08em] uppercase text-white'>Humai</h1>

          <button
            type='button'
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls='site-menu'
            aria-label={open ? "Tutup ménu" : "Buka ménu"}
            className='group relative flex h-8 w-10 items-center justify-end text-white'
          >
            <span aria-hidden='true' className='relative block h-4 w-8'>
              <span className={`absolute right-0 top-1 block h-[3px] w-6 origin-right -skew-x-[28deg] bg-current transition-transform duration-300 ${open ? "translate-y-[6px] rotate-45" : ""}`} />
              <span className={`absolute bottom-1 right-0 block h-[3px] w-8 origin-right -skew-x-[28deg] bg-current transition-transform duration-300 ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </header>

      <div
        id='site-menu'
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-0 z-[90] flex flex-col overflow-y-auto bg-[#0b0820] text-[#f5f1e8] transition-[opacity,visibility] duration-500 ${open ? "visible opacity-100" : "invisible opacity-0"}`}
      >
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 opacity-70'
          style={{
            background: "radial-gradient(circle at 78% 18%, rgba(75,48,204,0.45), transparent 48%), radial-gradient(circle at 12% 82%, rgba(201,162,74,0.22), transparent 52%)",
          }}
        />
        <nav aria-label='Pituduh kaca utama' className='relative z-10 mx-auto flex w-full max-w-[1500px] flex-1 flex-col justify-center px-5 pb-10 pt-24 sm:px-8 md:px-12'>
          <p className='jj-mono mb-5 text-[10px] tracking-[0.28em] uppercase text-[#f5f1e8]/50'>Pituduh Kaca</p>
          <ul>
            {navLinks.map((link, index) => (
              <li key={link.href}>
                <a href={link.href} onClick={(event) => { event.preventDefault(); goToSection(link.href); }} className='jj-menu-link group flex items-baseline gap-4 py-1 text-[#f5f1e8]'>
                  <span className='jj-mono w-7 shrink-0 text-[10px] tracking-[0.2em] text-[#f5f1e8]/35'>{String(index + 1).padStart(2, "0")}</span>
                  <span className='jj-display text-[clamp(2.1rem,7vw,5.5rem)] tracking-tight'>{link.label}</span>
                  <span aria-hidden='true' className='ml-auto text-lg text-[#c9a24a] opacity-0 transition-opacity duration-300 group-hover:opacity-100'>
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <div className='mt-10 flex flex-wrap items-end justify-between gap-8 border-t border-[#f5f1e8]/15 pt-6'>
            <div>
              <p className='jj-mono text-[10px] tracking-[0.28em] uppercase text-[#f5f1e8]/50'>Tuturkeun Kami</p>
              <ul className='mt-3 flex flex-wrap gap-x-6 gap-y-2'>
                {socials.map((social) => (
                  <li key={social.label}>
                    <a href={social.href} target='_blank' rel='noreferrer' className='jj-link jj-mono text-[11px] text-[#f5f1e8] transition-colors hover:text-[#c9a24a]'>
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <p className='jj-mono max-w-[32ch] text-[10px] leading-relaxed text-[#f5f1e8]/50 uppercase tracking-[0.16em]'>Ti ide ka wujud — desain, téknologi, jeung kreativitas.</p>
          </div>
        </nav>
      </div>
    </>
  );
}
