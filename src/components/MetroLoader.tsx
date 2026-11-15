import { cn } from '@/lib/utils';

/**
 * Signature Cairo Metro loading animation.
 * Built on the official Metro Map Lines SVG (six lines: green, yellow,
 * orange, silver, blue, red) — original paths and geometry preserved.
 * Each route draws progressively with a staggered delay (stroke-dasharray
 * / stroke-dashoffset), soft glow, and a train highlight riding the red line.
 */

interface Line {
  id: string;
  color: string;
  d: string;
  delay: number; // seconds — lines appear one after another
}

const LINES: Line[] = [
  {
    id: 'green', color: '#0aa848', delay: 0,
    d: 'M205,183l-14-14c-.7-1-2.77-.83-3.95-.57l-4.17,2.15a3.32,3.32,0,0,1-3.17-1l-8.07-8.79a5.51,5.51,0,0,0-4.06-1.79H153.34a4.37,4.37,0,0,1-4.37-4.33l.53-58.38a4.84,4.84,0,0,0-4.84-4.89h-3.19a4,4,0,0,1-4-4V85.5a4,4,0,0,1,4-4h6.73a8,8,0,0,0,7.36-4.84L157.14,73a6.64,6.64,0,0,1,.83-1L180.5,49.5',
  },
  {
    id: 'yellow', color: '#fcd000', delay: 0.32,
    d: 'M128,224V187c0-4.43-2.57-6.13-7-6,0,0-6,1.22-6-2V164c0-2.13,11-11,11-11,1.39-1.33,4.08-1,6-1h10c3,0,3-1.1,3-6V101c0-3.35.65-5.63-2.66-5.68h-1.72a6.83,6.83,0,0,1-6.81-6.83V84.65a7,7,0,0,1,7-7c3.39,0,6.77,0,6.94,0a6,6,0,0,0,2-.38l1.84-1.28,1.7-1.6',
  },
  {
    id: 'orange', color: '#f49506', delay: 0.64,
    d: 'M28.5,123.5H72.4c5.1,0,11.6,1.5,11.6-3.5v-5.5c0-9,7.5-12,9.5-12h32c2.54,0,10,1,10,12v13c0,2.54,0,7,6,7h26a4.51,4.51,0,0,0,2.93-1.08l6.77-5.81a4.6,4.6,0,0,1,3-1.11h15.39a4.6,4.6,0,0,0,3.26-1.35L219.5,104.5',
  },
  {
    id: 'silver', color: '#9fa5a4', delay: 0.96,
    d: 'M30,104l22.17,22.17a2.84,2.84,0,0,0,2,.83H81a7,7,0,0,0,7-7l0-7.38c.15-2,2.64-5.42,5.75-5.66l30.22-.32c4.43,0,7.35,3.55,7.35,8l.1,15.83c0,4.18,4,7.56,8.16,7.56h29.79a4.35,4.35,0,0,0,2.89-1.1l6.31-5.61a4,4,0,0,1,2.91-1.3H234',
  },
  {
    id: 'blue', color: '#1076c4', delay: 1.28,
    d: 'M82,223v-8.58A6.42,6.42,0,0,1,88.42,208h32.33a3.25,3.25,0,0,0,3.25-3.25V190.88a4.88,4.88,0,0,0-4.88-4.88h-2.88a5.24,5.24,0,0,1-5.24-5.24V159.25a7.84,7.84,0,0,0-2.3-5.54L95,140a12.07,12.07,0,0,1-3.54-8.54v-17a4,4,0,0,1,4-4h27.93a3.57,3.57,0,0,1,3.57,3.57v14.84A13.09,13.09,0,0,0,140.09,142h30.26a4.7,4.7,0,0,0,2.94-1l7-5.57a6.4,6.4,0,0,1,4-1.4H234',
  },
  {
    id: 'red', color: '#e72434', delay: 1.6,
    d: 'M137.5,22.5V54a6.2,6.2,0,0,0,1.69,4.26l27.74,28.59A5,5,0,0,1,168,88.65a5.22,5.22,0,0,1,.3,2.06c-.28,7.59.3,15.2.16,22.79a4.32,4.32,0,0,1-1,3,3.68,3.68,0,0,1-2,1c-11.33,0-26.67-.15-38,0-7.89.1-7.29-3.89-7.29-3.89L120,97.15c-.3-1.25-2-3.14-2.87-4.08L107.08,82.41a5.25,5.25,0,0,0-4-1.91H100.7c-2.69,0-5.27-3.08-7.15-5L52.5,34.5',
  },
];

const SIZES = { sm: 'w-40', md: 'w-56', lg: 'w-64 sm:w-80' } as const;

interface Props {
  /** Surface behind the loader: 'page' inherits the page background, 'dark' paints its own backdrop. */
  surface?: 'page' | 'dark';
  size?: keyof typeof SIZES;
  message?: string;
  className?: string;
}

export default function MetroLoader({ surface = 'page', size = 'md', message = 'جاري تحميل المحطات...', className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1',
        surface === 'dark' && 'bg-[#1F1F1F] tile-pattern',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <svg
        id="Metro_Map_Lines"
        data-name="Metro Map Lines"
        viewBox="0 0 208.5 204.5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(SIZES[size], 'map max-w-full')}
        aria-hidden="true"
      >
        <defs>
          <style>{`.ml-line{fill:none;stroke-linecap:round;stroke-miterlimit:10;stroke-width:3px}`}</style>
        </defs>
        <title>metro-map-svg</title>

        {/* metro routes — original line geometry */}
        {LINES.map((l) => (
          <path
            key={l.id}
            id={`${l.id}-line`}
            className="line ml-line ml-draw ml-glow"
            d={l.d}
            transform="translate(-27 -21)"
            stroke={l.color}
            style={{ '--d': `${l.delay}s`, '--c': l.color } as React.CSSProperties}
          />
        ))}

        {/* train highlight riding the red line */}
        <g transform="translate(-27 -21)" className="ml-motion">
          <circle r="2.4" fill="#fff" className="ml-glow-pulse" style={{ '--c': '#e72434' } as React.CSSProperties}>
            <animateMotion dur="4.5s" repeatCount="indefinite" path={LINES[5].d} />
          </circle>
        </g>
      </svg>

      <p className={cn('font-display text-lg font-bold sm:text-xl', surface === 'dark' ? 'text-white' : 'text-foreground')}>
        مترو القاهرة الكبرى
      </p>
      <p className={cn('text-xs sm:text-sm', surface === 'dark' ? 'text-white/60' : 'text-muted-foreground')}>{message}</p>
    </div>
  );
}
