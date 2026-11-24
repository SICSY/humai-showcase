interface LogoProps {
  className?: string;
}

/**
 * Angular "JJ" mark — a stylised Viking prow silhouette built from
 * mirrored chevrons. Kept as inline SVG so it inherits `currentColor`.
 */
export default function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 48 52"
      role="img"
      aria-label="JJ mark"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="currentColor"
        d="M24 0 29.5 14.5 43 10 33.5 23 43 36 29.5 31.5 24 46 18.5 31.5 5 36 14.5 23 5 10 18.5 14.5 24 0Z"
      />
      <path
        fill="currentColor"
        d="M24 15.5 27 22 24 26.5 21 22 24 15.5Z"
        opacity="0.55"
      />
    </svg>
  );
}
