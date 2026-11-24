import type { CSSProperties, ReactNode } from "react";

interface MarqueeProps {
  children: ReactNode;
  duration?: number;
  reverse?: boolean;
  className?: string;
}

export default function Marquee({
  children,
  duration = 40,
  reverse = false,
  className = "",
}: MarqueeProps) {
  const style = {
    "--jj-marquee-duration": `${duration}s`,
  } as CSSProperties;

  return (
    <div className={`jj-marquee ${className}`} aria-hidden="true">
      <div
        className={`jj-marquee-track ${reverse ? "jj-marquee-reverse" : ""}`}
        style={style}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center">{children}</div>
      </div>
    </div>
  );
}
