/**
 * Front-facing Cairo Metro train (approaching the viewer) — the mobile hero
 * variant. Same visual identity as the side view: white body, dark windows,
 * red brand stripe with the "M" badge and the warm headlight glow.
 */
export default function MetroTrainFront({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 300" className={className} role="img" aria-label="قطار مترو القاهرة">
      <defs>
        <linearGradient id="front-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E4E4E4" />
        </linearGradient>
        <linearGradient id="front-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A3A3A" />
          <stop offset="1" stopColor="#171717" />
        </linearGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="140" cy="284" rx="104" ry="9" fill="#000" opacity=".3" />

      {/* wheels hint */}
      <rect x="52" y="248" width="26" height="7" rx="3" fill="#141414" />
      <rect x="202" y="248" width="26" height="7" rx="3" fill="#141414" />

      {/* body */}
      <rect x="34" y="34" width="212" height="216" rx="30" fill="url(#front-body)" />

      {/* roof strip + pantograph */}
      <rect x="34" y="34" width="212" height="14" rx="7" fill="#1F1F1F" opacity=".85" />
      <path d="M140 34 V20 M126 20 h28" stroke="#1F1F1F" strokeWidth="4" strokeLinecap="round" fill="none" />

      {/* destination display */}
      <rect x="100" y="55" width="80" height="14" rx="4" fill="#1F1F1F" />
      <text x="140" y="65.5" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#86EFAC" fontFamily="'IBM Plex Sans Arabic', sans-serif">
        ١ · حلوان
      </text>

      {/* windshield */}
      <rect x="56" y="78" width="168" height="70" rx="16" fill="url(#front-window)" />
      {/* windshield shine */}
      <path d="M74 84 L122 84 L94 142 L64 142 Z" fill="#fff" opacity=".08" />

      {/* red brand stripe + M badge */}
      <rect x="34" y="156" width="212" height="24" fill="rgb(var(--primary))" />
      <circle cx="140" cy="168" r="11" fill="#fff" />
      <text x="140" y="172.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="rgb(var(--primary))" fontFamily="'IBM Plex Sans Arabic', sans-serif">
        M
      </text>

      {/* headlights */}
      <circle cx="68" cy="222" r="13" fill="#FFE082" opacity=".3" className="ml-glow-pulse" />
      <circle cx="68" cy="222" r="8" fill="#FFE082" />
      <circle cx="212" cy="222" r="13" fill="#FFE082" opacity=".3" className="ml-glow-pulse" style={{ animationDelay: '.4s' }} />
      <circle cx="212" cy="222" r="8" fill="#FFE082" />

      {/* bumper + coupler */}
      <rect x="46" y="250" width="188" height="10" rx="5" fill="#2B2B2B" />
      <rect x="124" y="260" width="32" height="8" rx="3" fill="#141414" />
    </svg>
  );
}
