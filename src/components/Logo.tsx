/**
 * Cairo Metro mark: a red station tile with the 8-point star
 * of the Cairo Metro identity and a bold "M".
 */
export default function Logo({ className = 'text-white' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="9" fill="rgb(var(--primary))" />
      <rect x="1" y="1" width="38" height="38" rx="9" fill="url(#logo-sheen)" />
      <defs>
        <linearGradient id="logo-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="2.4">
        <rect x="10" y="10" width="20" height="20" rx="2.5" />
        <rect x="10" y="10" width="20" height="20" rx="2.5" transform="rotate(45 20 20)" />
      </g>
      <text x="20" y="25.5" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" fontFamily="'IBM Plex Sans Arabic', sans-serif">
        M
      </text>
    </svg>
  );
}
