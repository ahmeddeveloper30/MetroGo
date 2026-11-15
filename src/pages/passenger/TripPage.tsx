import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeftRight, ListOrdered, Map, MapPinned, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import AnimatedRouteView from '@/components/trip/AnimatedRouteView';
import InteractiveMetroMap from '@/components/trip/InteractiveMetroMap';
import StationSelect from '@/components/trip/StationSelect';
import TripSummaryCard, { LinesUsedChips } from '@/components/trip/TripSummaryCard';
import { METRO_STATIONS, findStationByName, interchangeStations } from '@/lib/metroData';
import { findRoute } from '@/lib/routeFinder';
import { cn } from '@/lib/utils';

/**
 * Plan Your Trip (خطط الرحلة) — Cairo Metro Route Planner:
 * searchable start/destination selectors, swap, Dijkstra routing,
 * Google-Maps-style animated timeline and a trip summary footer.
 */

export default function TripPage() {
  const location = useLocation();
  // hero form on HomePage navigates here with { state: { from, to } } (Arabic names)
  const preset = (location.state ?? {}) as { from?: string; to?: string };

  const [fromId, setFromId] = useState(() => findStationByName(preset.from ?? '')?.id ?? '');
  const [toId, setToId] = useState(() => findStationByName(preset.to ?? '')?.id ?? '');
  const [swapSpin, setSwapSpin] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const route = useMemo(
    () => (fromId && toId && fromId !== toId ? findRoute(fromId, toId) : null),
    [fromId, toId],
  );

  const sameStation = fromId !== '' && fromId === toId;

  const swap = () => {
    setFromId(toId);
    setToId(fromId);
    setSwapSpin(true);
  };

  const hubs = useMemo(() => interchangeStations().slice(0, 6), []);

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MapPinned className="h-6 w-6 text-accent" /> خطط الرحلة
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">اختر محطة القيام والوصول — والباقي علينا: أسرع مسار، الزمن، وسعر التذكرة.</p>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent sm:flex">
          <Sparkles className="h-3.5 w-3.5" /> خوارزمية أقصر مسار
        </span>
      </div>

      {/* selector card */}
      <Card className="p-4 shadow-card sm:p-5">
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <StationSelect
            id="trip-from"
            value={fromId}
            onChange={setFromId}
            label="محطة القيام"
            dotColor="#C8102E"
            placeholder="اختر محطة البداية"
          />
          <button
            type="button"
            onClick={swap}
            aria-label="تبديل المحطتين"
            className={cn(
              'mx-auto grid h-11 w-11 place-items-center self-center rounded-full border-2 border-accent/40 bg-accent/5 text-accent shadow-card transition hover:bg-accent hover:text-white active:scale-95',
              swapSpin && 'rotate-180 transition-transform duration-500',
            )}
            onAnimationEnd={() => setSwapSpin(false)}
          >
            <ArrowLeftRight className="h-5 w-5" />
          </button>
          <StationSelect
            id="trip-to"
            value={toId}
            onChange={setToId}
            label="محطة الوصول"
            dotColor="#9E1028"
            placeholder="اختر محطة الوصول"
          />
        </div>

        {sameStation && (
          <p className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-sm font-bold text-warning" role="alert">
            المحطتان متطابقتان — اختر محطة وصول مختلفة.
          </p>
        )}
        {fromId && toId && !sameStation && !route && (
          <p className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-sm font-bold text-warning" role="alert">
            لا يوجد مسار متاح بين هاتين المحطتين حاليًا.
          </p>
        )}

        {/* interchange hubs hint */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-[11px] font-bold text-muted-foreground">مراكز التبديل:</span>
          {hubs.map((h) => (
            <span key={h.id} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">
              {h.ar}
              <span className="flex gap-0.5">
                {h.lines.map((l) => (
                  <i key={l} className={cn('h-2 w-2 rounded-full', l === 'l1' && 'bg-[#0055A5]', l === 'l2' && 'bg-[#D9232E]', l === 'l3' && 'bg-[#009640]')} />
                ))}
              </span>
            </span>
          ))}
        </div>
      </Card>

      {/* route result — interactive map is the hero */}
      {route && fromId && toId && (
        <div className="space-y-4">
          <InteractiveMetroMap route={route} fromId={fromId} toId={toId} />

          <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
            <Card className="p-4 shadow-card sm:p-5">
              <h2 className="mb-3 text-base font-bold">ملخص الرحلة</h2>
              <TripSummaryCard route={route} />
              <div className="mt-3 border-t pt-3">
                <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">الخطوط المستخدمة</p>
                <LinesUsedChips route={route} />
              </div>
            </Card>

            {/* quick tips */}
            <Card className="bg-brand tile-pattern p-4 text-white shadow-card">
              <p className="text-sm font-bold">نصيحة</p>
              <p className="mt-1 text-xs leading-relaxed text-white/80">
                في أوقات الذروة (٧–٩ ص و ٣–٥ م) يفضل ترك {ar(10)} دقائق إضافية عند مراكز التبديل مثل الشهداء والسادات والعتبة.
              </p>
              <p className="mt-3 text-xs text-white/60">اسحب الخريطة للتحرك · استخدم + و − للتكبير · اضغط ▶ لمشاهدة رحلتك محطة بمحطة.</p>
            </Card>
          </div>

          {/* step-by-step timeline (collapsible) */}
          <Card className="overflow-hidden shadow-card">
            <button
              type="button"
              onClick={() => setShowSteps((s) => !s)}
              aria-expanded={showSteps}
              className="flex w-full items-center gap-2 px-4 py-3 text-start transition hover:bg-muted/50"
            >
              <ListOrdered className="h-5 w-5 text-accent" />
              <span className="flex-1 text-sm font-bold">تفاصيل المسار خطوة بخطوة</span>
              <span className={cn('text-muted-foreground transition', showSteps && 'rotate-180')}>▾</span>
            </button>
            <div className="rp-collapse" data-open={showSteps}>
              <div className="overflow-hidden">
                <div className="border-t p-4 sm:p-5">
                  <AnimatedRouteView route={route} fromId={fromId} toId={toId} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* empty state */}
      {!route && !sameStation && (
        <Card className="flex flex-col items-center gap-2 p-10 text-center shadow-card">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent"><Map className="h-7 w-7" /></span>
          <p className="text-base font-bold">لم تبدأ التخطيط بعد</p>
          <p className="text-sm text-muted-foreground">اختر محطة القيام ومحطة الوصول من القائمة أعلاه لعرض المسار المتحرك.</p>
          <p className="text-xs text-muted-foreground">{ar(METRO_STATIONS.length)} محطة عبر ٣ خطوط عاملة.</p>
        </Card>
      )}
    </div>
  );
}

const ar = (n: number) => n.toLocaleString('ar-EG');
