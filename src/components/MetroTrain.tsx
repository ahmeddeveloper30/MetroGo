/**
 * Modern Cairo Metro train illustration (side view).
 * Facing left — the direction of travel in the RTL success animation.
 */
export default function MetroTrain({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 460 150" className={className} role="img" aria-label="قطار مترو القاهرة">
      <defs>
        <linearGradient id="train-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E4E4E4" />
        </linearGradient>
        <linearGradient id="train-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A3A3A" />
          <stop offset="1" stopColor="#171717" />
        </linearGradient>
      </defs>

      {/* body */}
      <rect x="14" y="28" width="424" height="82" rx="20" fill="url(#train-body)" />
      {/* red brand stripe */}
      <rect x="14" y="86" width="424" height="12" fill="rgb(var(--primary))" />
      <rect x="14" y="28" width="424" height="10" rx="5" fill="#1F1F1F" opacity=".85" />

      {/* slanted front (left = direction of travel) */}
      <path d="M14 48 Q14 28 34 28 L64 28 L64 110 L14 110 Z" fill="rgb(var(--primary))" />
      <path d="M22 44 Q24 36 34 36 L58 36 L58 58 L22 58 Z" fill="url(#train-window)" />
      {/* headlight */}
      <circle cx="26" cy="98" r="6" fill="#FFE082" />
      <circle cx="26" cy="98" r="10" fill="#FFE082" opacity=".35" className="ml-glow-pulse" />

      {/* windows */}
      {[92, 140, 188, 236, 284, 332, 380].map((x) => (
        <rect key={x} x={x} y="42" width="38" height="34" rx="7" fill="url(#train-window)" />
      ))}
      {/* doors */}
      {[84, 132, 180, 228, 276, 324, 372].map((x) => (
        <rect key={x} x={x} y="42" width="2" height="62" rx="1" fill="#C9C9C9" />
      ))}

      {/* undercarriage */}
      <rect x="60" y="110" width="330" height="10" rx="4" fill="#2B2B2B" />
      {/* wheels hint */}
      {[110, 200, 290, 380].map((x) => (
        <rect key={x} x={x} y="116" width="26" height="6" rx="3" fill="#141414" />
      ))}

      {/* metro "M" badge */}
      <circle cx="412" cy="58" r="12" fill="rgb(var(--primary))" />
      <text x="412" y="63" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" fontFamily="'IBM Plex Sans Arabic', sans-serif">
        M
      </text>
    </svg>
  );
}
