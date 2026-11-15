import { useState } from 'react';
import { ChevronsUpDown, Footprints, TrainFront } from 'lucide-react';
import type { MetroRoute, RouteLeg } from '@/lib/routeFinder';
import { directionFor } from '@/lib/routeFinder';
import { METRO_LINES, getStation, type LineId } from '@/lib/metroData';
import { cn } from '@/lib/utils';

/**
 * Google-Maps-transit-style animated route timeline:
 *  - colored rails draw downward, leg by leg, in each line's official colour
 *  - start/destination pins carry a pulsing radar effect
 *  - interchange stations show an animated transfer (walk) marker
 *  - intermediate stations collapse behind a "ركب N محطة" accordion
 */

interface Props {
  route: MetroRoute;
  fromId: string;
  toId: string;
}

const arNum = (n: number) => n.toLocaleString('ar-EG');

/** per-leg entrance delay — each leg starts after the previous one draws */
const legDelay = (i: number) => `${i * 0.55}s`;

export default function AnimatedRouteView({ route, fromId, toId }: Props) {
  const from = getStation(fromId);
  const to = getStation(toId);
  if (!from || !to) return null;

  let delayIdx = 0;

  return (
    <div className="relative">
      {/* timeline gutter */}
      <div className="relative ps-10" role="list" aria-label="تفاصيل مسار الرحلة">
        {/* start pin */}
        <Node
          color="#C8102E"
          title={from.ar}
          sub={from.en}
          delay={legDelay(0)}
          radar
          badge="القيام"
        />

        {route.legs.map((leg, i) => {
          if (leg.type === 'transfer') return <TransferStep key={`t${i}`} nextLine={nextRideLine(route, i)} delay={legDelay(++delayIdx)} />;
          return (
            <RideStep
              key={`r${i}`}
              leg={leg}
              delay={legDelay(++delayIdx)}
            />
          );
        })}

        {/* destination pin */}
        <Node color="#9E1028" title={to.ar} sub={to.en} delay={legDelay(delayIdx + 1)} radar badge="الوصول" last />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
function Node({ color, title, sub, delay, radar, badge, last }: {
  color: string;
  title: string;
  sub: string;
  delay: string;
  radar?: boolean;
  badge?: string;
  last?: boolean;
}) {
  return (
    <div role="listitem" className="relative" style={{ ['--d' as string]: delay }}>
      <div className="absolute -start-10 top-1 grid place-items-center" aria-hidden="true">
        {radar && <span className="absolute h-5 w-5 rounded-full opacity-60 rp-ping" style={{ backgroundColor: color }} />}
        <span className="relative h-5 w-5 rounded-full border-[3px] bg-card" style={{ borderColor: color, boxShadow: `0 0 0 4px ${color}22` }} />
        {!last && <span className="absolute top-5 h-[calc(100%+4px)] w-0.5 bg-border" />}
      </div>
      <div className="ml-fade-up flex flex-wrap items-baseline gap-x-2 pb-5">
        <h3 className="text-base font-bold">{title}</h3>
        <span className="text-xs text-muted-foreground" dir="ltr">{sub}</span>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${color}1A`, color }}>{badge}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
function RideStep({ leg, delay }: { leg: Extract<RouteLeg, { type: 'ride' }>; delay: string }) {
  const [open, setOpen] = useState(false);
  const line = METRO_LINES.find((l) => l.id === leg.line) as { id: LineId; ar: string; en: string; number: number; color: string };
  const stations = leg.stations ?? [];
  const intermediate = stations.slice(1, -1);
  const first = getStation(stations[0]);
  const last = getStation(stations[stations.length - 1]);
  const direction = directionFor(line.id, stations[0], stations[stations.length - 1]);

  return (
    <div role="listitem" className="relative" style={{ ['--d' as string]: delay }}>
      {/* gutter rail: draws downward in the line colour */}
      <div className="absolute -start-10 top-1 bottom-0 grid place-items-start justify-center" aria-hidden="true">
        <span className="h-5 w-5" />
        <div
          className="relative w-1 flex-1 overflow-hidden rounded-full rp-draw"
          style={{ backgroundColor: line.color, ['--d' as string]: delay, minHeight: '100%' }}
        >
          {/* direction chip gliding along the rail */}
          {direction && (
            <span
              className="absolute inset-x-auto end-1 top-2 flex items-center gap-1 rounded-full bg-card px-1.5 py-0.5 text-[10px] font-bold shadow-card rp-train"
              style={{ color: line.color, border: `1px solid ${line.color}55`, ['--d' as string]: '1s' }}
            >
              <TrainFront className="h-3 w-3" />
              {direction}
            </span>
          )}
        </div>
      </div>

      {/* boarding station */}
      <div className="ml-fade-up pb-2" style={{ ['--d' as string]: delay }}>
        <p className="text-sm font-bold" style={{ color: line.color }}>
          {line.ar}
          <span className="ms-2 text-[11px] font-normal text-muted-foreground" dir="ltr">{line.en}</span>
        </p>
        <p className="text-xs text-muted-foreground">صعود في <b className="text-foreground">{first?.ar}</b></p>
      </div>

      {/* collapsible intermediate stops — "ركب N محطة" */}
      <div className="relative pb-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow-card transition hover:brightness-110 active:scale-[0.97]"
          style={{ backgroundColor: line.color }}
        >
          ركب {arNum(leg.stops ?? 0)} محطة
          <ChevronsUpDown className="h-3 w-3" />
        </button>

        <div className="rp-collapse" data-open={open}>
          <div className="overflow-hidden">
            <ul className="mt-2 space-y-1.5 rounded-lg bg-muted/60 p-2.5">
              {intermediate.map((sid) => (
                <li key={sid} className="flex items-center gap-2 text-xs">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: line.color }} />
                  <span className="font-bold">{getStation(sid)?.ar}</span>
                  <span className="text-muted-foreground" dir="ltr">{getStation(sid)?.en}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* alighting station */}
      <div className="ml-fade-up pb-5" style={{ ['--d' as string]: delay }}>
        <p className="text-xs text-muted-foreground">نزول في <b className="text-foreground">{last?.ar}</b></p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
function TransferStep({ nextLine, delay }: { nextLine: LineId | undefined; delay: string }) {
  const line = nextLine ? METRO_LINES.find((l) => l.id === nextLine) : undefined;
  return (
    <div role="listitem" className="relative pb-5" style={{ ['--d' as string]: delay }}>
      {/* gutter: short neutral link */}
      <div className="absolute -start-10 top-0 bottom-0 grid justify-center" aria-hidden="true">
        <span className="w-0.5 border-r-2 border-dashed border-border rp-walk" />
      </div>
      <div className="ml-fade-up flex items-center gap-2" style={{ ['--d' as string]: delay }}>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-warning/15 text-warning">
          <Footprints className="h-4 w-4" />
        </span>
        <p className="text-sm">
          انتقل إلى <b style={{ color: line?.color }}>{line?.ar}</b>
          <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">نحو ٥ دقائق</span>
        </p>
      </div>
    </div>
  );
}

/** the line ridden right after transfer leg at index i */
function nextRideLine(route: MetroRoute, transferIdx: number): LineId | undefined {
  const next = route.legs[transferIdx + 1];
  return next?.type === 'ride' ? next.line : undefined;
}
