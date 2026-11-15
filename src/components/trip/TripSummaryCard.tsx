import { Clock, ReceiptText, Route, Wallet } from 'lucide-react';
import type { MetroRoute } from '@/lib/routeFinder';
import { METRO_LINES, ticketForStops } from '@/lib/metroData';
import { MINUTES_PER_TRANSFER } from '@/lib/routeFinder';
import { cn } from '@/lib/utils';

/**
 * Prominent summary card beneath the animated route:
 * estimated time, total stops, transfers, and ticket price tier.
 */

interface Props {
  route: MetroRoute;
}

const arNum = (n: number) => n.toLocaleString('ar-EG');

export default function TripSummaryCard({ route }: Props) {
  const ticket = ticketForStops(route.totalStops);
  const transferTime = route.transfers * MINUTES_PER_TRANSFER;
  const rideTime = route.totalMinutes - transferTime;

  return (
    <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_auto]">
      {/* main time card */}
      <div className="flex items-center gap-3 rounded-lg bg-brand tile-pattern p-4 text-white shadow-card">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/15">
          <Clock className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] text-white/70">الزمن التقديري للرحلة</p>
          <p className="text-xl font-black leading-tight">{arNum(route.totalMinutes)} دقيقة</p>
          <p className="mt-0.5 text-[11px] text-white/70">
            ركوب {arNum(rideTime)} د + تنقلات {arNum(transferTime)} د
          </p>
        </div>
      </div>

      {/* stops + transfers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 rounded-lg border bg-card p-3 shadow-card">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent/10 text-accent"><Route className="h-4 w-4" /></span>
          <div>
            <p className="text-[10px] text-muted-foreground">عدد المحطات</p>
            <p className="text-base font-black leading-tight">{arNum(route.totalStops)} محطة</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border bg-card p-3 shadow-card">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-warning/10 text-warning"><ReceiptText className="h-4 w-4" /></span>
          <div>
            <p className="text-[10px] text-muted-foreground">مرات التبديل</p>
            <p className="text-base font-black leading-tight">{route.transfers === 0 ? 'بدون تبديل' : `${arNum(route.transfers)} تبديل`}</p>
          </div>
        </div>
      </div>

      {/* ticket tier */}
      <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-accent/50 bg-accent/5 p-3 shadow-card sm:min-w-44">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent/15 text-accent"><Wallet className="h-4 w-4" /></span>
        <div>
          <p className="text-[10px] text-muted-foreground">فئة التذكرة · {ticket.label}</p>
          <p className="text-lg font-black leading-tight text-accent">
            {arNum(ticket.price)} <span className="text-xs font-bold">ج.م</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/** small horizontal line-chip row summarizing which lines the trip uses */
export function LinesUsedChips({ route, className }: { route: MetroRoute; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {route.linesUsed.map((lineId) => {
        const line = METRO_LINES.find((l) => l.id === lineId);
        if (!line) return null;
        return (
          <span key={lineId} className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: line.color }} />
            {line.ar}
          </span>
        );
      })}
    </div>
  );
}
