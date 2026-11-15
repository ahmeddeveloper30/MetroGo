import { useEffect, useState } from 'react';

/**
 * Brief metro-inspired transition shown after successful login:
 * a red metro line draws across the screen and a small train glides
 * along it before the app navigates to the dashboard.
 * Self-contained; the parent controls unmounting via navigation.
 */
export default function MetroTransition({ duration = 1000 }: { duration?: number }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), duration - 250);
    return () => clearTimeout(t);
  }, [duration]);

  return (
    <div
      className={`fixed inset-0 z-[60] grid place-items-center bg-[#1F1F1F]/95 backdrop-blur-sm ${leaving ? 'ml-fade-out [animation-duration:250ms]' : 'ml-fade [animation-duration:200ms]'}`}
      role="status"
      aria-label="جاري تسجيل الدخول"
      style={{ pointerEvents: 'all' }}
    >
      <div className="relative w-64 sm:w-80">
        {/* red metro line drawing across */}
        <svg viewBox="0 0 320 60" fill="none" className="w-full">
          <path
            d="M6 34 L96 34 L136 16 L216 16 L268 34 L314 34"
            pathLength={1}
            stroke="rgb(var(--m-red))"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-draw-once ml-glow"
            style={{ '--c': 'rgb(var(--m-red))' } as React.CSSProperties}
          />
          {[30, 120, 200, 280].map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy={i % 2 === 0 ? 34 : 16}
              r="4.5"
              fill="#fff"
              stroke="rgb(var(--m-red))"
              strokeWidth="2.5"
              className="ml-pop"
              style={{ '--d': `${0.25 + i * 0.12}s` } as React.CSSProperties}
            />
          ))}
          {/* small train gliding along the line */}
          <g className="ml-train-in" style={{ animationDuration: '.8s' }}>
            <rect x="128" y="6" width="46" height="20" rx="6" fill="#fff" />
            <rect x="128" y="12" width="46" height="6" fill="rgb(var(--m-red))" />
            <rect x="136" y="10" width="8" height="6" rx="2" fill="#1F1F1F" />
            <rect x="150" y="10" width="8" height="6" rx="2" fill="#1F1F1F" />
          </g>
        </svg>
        <p className="mt-3 text-center font-display text-lg font-bold text-white">مترو القاهرة الكبرى</p>
      </div>
    </div>
  );
}
