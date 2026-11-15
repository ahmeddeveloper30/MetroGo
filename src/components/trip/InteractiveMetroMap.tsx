import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Footprints, Minus, Pause, Play, Plus, RotateCcw, StepForward } from 'lucide-react';
import type { MetroRoute } from '@/lib/routeFinder';
import { METRO_LINES, getStation, type LineId } from '@/lib/metroData';
import {
  LINE_PATHS,
  MAP_VIEWBOX,
  NILE_ISLAND,
  NILE_MAIN,
  NILE_WEST_BRANCH,
  STATION_COORDS,
  buildRouteOverlay,
  pointAtHop,
} from '@/lib/metroMapData';
import { cn } from '@/lib/utils';

/**
 * Interactive Cairo Metro map: base network (all lines, stations, interchanges,
 * the Nile) with the calculated journey drawn as an animated overlay —
 * progressive path drawing, a moving train, station-by-station states
 * (visited / current / upcoming) and full playback controls.
 */

const SPEEDS = [0.5, 1, 2, 4] as const;
const HOPS_PER_SECOND = 0.75; // at 1× speed

const arNum = (n: number) => n.toLocaleString('ar-EG');

interface Props {
  route: MetroRoute | null;
  fromId: string;
  toId: string;
}

export default function InteractiveMetroMap({ route, fromId, toId }: Props) {
  const overlay = useMemo(() => (route ? buildRouteOverlay(route) : null), [route]);

  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const total = overlay?.totalHops ?? 0;
  const done = total > 0 && progress >= total;

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // reset + auto-play whenever a new route is calculated
  useEffect(() => {
    setProgress(0);
    setPlaying(Boolean(route) && !reducedMotion);
    if (route && reducedMotion) setProgress(route.totalStops);
  }, [route, reducedMotion]);

  // rAF playback loop
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  useEffect(() => {
    if (!playing || total === 0) return;
    lastRef.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastRef.current) / 1000);
      lastRef.current = now;
      setProgress((p) => Math.min(total, p + dt * HOPS_PER_SECOND * SPEEDS[speedIdx]));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speedIdx, total]);

  // stop automatically at the destination
  useEffect(() => {
    if (playing && total > 0 && progress >= total) setPlaying(false);
  }, [progress, playing, total]);

  const restart = useCallback(() => {
    setProgress(0);
    setPlaying(!reducedMotion);
  }, [reducedMotion]);

  const toggle = useCallback(() => {
    if (done) {
      setProgress(0);
      setPlaying(!reducedMotion);
    } else {
      setPlaying((p) => !p);
    }
  }, [done, reducedMotion]);

  const nextStation = useCallback(() => {
    setProgress((p) => Math.min(Math.floor(p) + 1, total));
  }, [total]);

  const zoom = (f: number) =>
    setView((v) => {
      // zoom toward the viewBox center: adjust the pan so the center stays put
      const k2 = Math.min(3, Math.max(0.55, v.k * f));
      const cx = MAP_VIEWBOX.w / 2;
      const cy = MAP_VIEWBOX.h / 2;
      const tx = cx - ((cx - v.tx) / v.k) * k2;
      const ty = cy - ((cy - v.ty) / v.k) * k2;
      return { k: k2, tx, ty };
    });

  // ---- pan / wheel-zoom ----
  // React attaches onWheel as a passive listener, so preventDefault() must be
  // done through a native non-passive listener instead.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current(e.deltaY < 0 ? 1.12 : 0.9);
    };
    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', onNativeWheel);
  }, []);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = MAP_VIEWBOX.w / rect.width;
    const scaleY = MAP_VIEWBOX.h / rect.height;
    // capture the drag values *before* the async updater runs — dragRef.current
    // may be nulled by endPan() between the event and the re-render
    const tx = drag.tx + (e.clientX - drag.x) * scaleX;
    const ty = drag.ty + (e.clientY - drag.y) * scaleY;
    setView((v) => ({ ...v, tx, ty }));
  };
  const endPan = () => { dragRef.current = null; };

  // ---- derived journey info ----
  const hopIdx = Math.min(Math.floor(progress), Math.max(0, total - 1));
  const path = route?.pathStations ?? [];
  const currentId = path[done ? total : hopIdx] ?? '';
  const nextId = done ? '' : path[Math.min(hopIdx + 1, total)] ?? '';
  const remaining = Math.max(0, Math.ceil(total - progress));
  const currentLine = overlay && !done ? overlay.hopLines[Math.min(hopIdx, overlay.hopLines.length - 1)] : null;
  const trainPos = overlay ? pointAtHop(overlay, progress) : null;

  return (
    <div className="relative flex flex-col overflow-hidden rounded-lg bg-brand tile-pattern shadow-card">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5">
        <h2 className="flex items-center gap-2 text-base font-bold text-white">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#e72434] shadow-[0_0_8px_#e72434]" />
          الخريطة التفاعلية
        </h2>
        <div className="flex gap-1.5">
          {METRO_LINES.map((l) => (
            <span key={l.id} className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white">
              <i className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
              {l.ar.replace('الخط ', '')}
            </span>
          ))}
        </div>
      </div>

      {/* map canvas */}
      <div className="relative h-[380px] select-none sm:h-[480px] lg:h-[560px]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_VIEWBOX.w} ${MAP_VIEWBOX.h}`}
          className="h-full w-full cursor-grab active:cursor-grabbing"
          role="img"
          aria-label="خريطة مترو القاهرة التفاعلية"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPan}
          onPointerLeave={endPan}
        >
          <defs>
            <filter id="mm-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="mm-train-halo">
              <stop offset="0%" stopColor="#fff" stopOpacity=".85" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
            {/* ---- the Nile ---- */}
            <g fill="none" pointerEvents="none">
              <path d={NILE_MAIN} stroke="#1d3d66" strokeOpacity=".55" strokeWidth="26" strokeLinecap="round" />
              <path d={NILE_MAIN} stroke="#2a5590" strokeOpacity=".4" strokeWidth="16" strokeLinecap="round" />
              <path d={NILE_ISLAND} fill="#1d3d66" fillOpacity=".45" stroke="#2a5590" strokeOpacity=".3" strokeWidth="2" />
              <path d={NILE_WEST_BRANCH} stroke="#1d3d66" strokeOpacity=".55" strokeWidth="26" strokeLinecap="round" />
            </g>

            {/* ---- base network ---- */}
            <g opacity={overlay ? 0.38 : 1} style={{ transition: 'opacity .4s' }}>
              {LINE_PATHS.map(({ line, color, d }, i) => (
                <path key={`${line}-${i}`} d={d} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              ))}
              {Object.entries(STATION_COORDS).map(([id, p]) => {
                const hub = INTERCHANGE_SET.has(id);
                return hub ? (
                  <circle key={id} cx={p.x} cy={p.y} r="7.5" fill="#fff" stroke="#1F1F1F" strokeWidth="2.5" />
                ) : (
                  <circle key={id} cx={p.x} cy={p.y} r="4.2" fill="#F5F5F5" stroke="#1F1F1F" strokeWidth="1.6" />
                );
              })}
            </g>

            {/* ---- base labels ---- */}
            <g opacity={overlay ? 0.32 : 0.85} pointerEvents="none">
              {Object.entries(STATION_COORDS).map(([id, p]) => {
                const s = getStation(id);
                if (!s) return null;
                return (
                  <text
                    key={id}
                    x={p.x + (p.ldx ?? 0)}
                    y={p.y + (p.ldy ?? -8)}
                    textAnchor={p.la ?? 'middle'}
                    fontSize="10"
                    fontWeight="700"
                    fill="#F5F5F5"
                    fillOpacity=".9"
                  >
                    {s.ar}
                  </text>
                );
              })}
            </g>

            {/* ---- journey overlay ---- */}
            {overlay && route && (
              <g>
                {/* transfer connectors (dashed walk lines) */}
                {overlay.transfers.map((t, i) => {
                  const a = STATION_COORDS[t.fromId];
                  const b = STATION_COORDS[t.toId];
                  if (!a || !b) return null;
                  const reached = progress >= t.atHop;
                  return (
                    <line
                      key={i}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={reached ? '#e72434' : '#F5F5F5'}
                      strokeOpacity={reached ? 0.9 : 0.35}
                      strokeWidth="2.5"
                      strokeDasharray="5 5"
                      className="mm-fade"
                    />
                  );
                })}

                {/* ride segments — dim underlay + colored progress */}
                {overlay.segments.map((seg, i) => (
                  <g key={i}>
                    <path d={seg.d} fill="none" stroke="#F5F5F5" strokeOpacity=".28" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
                    <path
                      d={seg.d}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={Math.max(0, 1 - (progress - seg.startHop) / seg.hops)}
                      filter={segStartReached(progress, seg) ? 'url(#mm-glow)' : undefined}
                      style={{ transition: 'stroke-dashoffset .12s linear' }}
                    />
                  </g>
                ))}

                {/* journey stations: visited / current / upcoming */}
                {path.map((id, i) => {
                  const p = STATION_COORDS[id];
                  const s = getStation(id);
                  if (!p || !s) return null;
                  const state = stationState(i, progress, total, done);
                  const color = i === 0 ? '#e72434' : overlay.hopLines[Math.min(i - 1, overlay.hopLines.length - 1)]?.color ?? '#e72434';
                  const isEnd = i === 0 || i === total;
                  if (state === 'upcoming') {
                    return <circle key={id + i} cx={p.x} cy={p.y} r={isEnd ? 6 : 4.5} fill="#1F1F1F" stroke={color} strokeWidth="2" opacity=".55" />;
                  }
                  if (state === 'current') {
                    return (
                      <g key={id + i}>
                        <circle cx={p.x} cy={p.y} r="5.5" fill={color} className="rp-ping" opacity=".5" />
                        <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke={color} strokeWidth="3" filter="url(#mm-glow)" />
                      </g>
                    );
                  }
                  return (
                    <g key={id + i}>
                      <circle cx={p.x} cy={p.y} r={isEnd ? 6.5 : 4.5} fill={color} stroke="#fff" strokeWidth="2" filter="url(#mm-glow)" />
                    </g>
                  );
                })}

                {/* walk badge at the active interchange */}
                {overlay.transfers.map((t, i) => {
                  if (Math.min(Math.floor(progress), total) !== t.atHop || done) return null;
                  const a = STATION_COORDS[t.fromId];
                  if (!a) return null;
                  return (
                    <g key={`w${i}`} transform={`translate(${a.x} ${a.y - 22})`} className="rp-walk" pointerEvents="none">
                      <circle r="9" fill="#1F1F1F" stroke="#f59e0b" strokeWidth="1.5" />
                      <g transform="translate(-5 -5) scale(0.83)" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <FootprintsGlyph />
                      </g>
                    </g>
                  );
                })}

                {/* the moving train */}
                {trainPos && !done && (
                  <g transform={`translate(${trainPos.x} ${trainPos.y}) rotate(${trainPos.angle})`} pointerEvents="none">
                    <circle r="14" fill="url(#mm-train-halo)" opacity=".35" />
                    <g transform="translate(-11 -6)">
                      <rect x="0" y="0" width="22" height="12" rx="5" fill={currentLine?.color ?? '#e72434'} stroke="#fff" strokeWidth="1.6" filter="url(#mm-glow)" />
                      <rect x="3.5" y="3" width="5" height="6" rx="1.5" fill="#fff" opacity=".9" />
                      <rect x="13" y="3" width="5" height="6" rx="1.5" fill="#fff" opacity=".9" />
                    </g>
                  </g>
                )}
              </g>
            )}

            {/* hover tooltip */}
            {hovered && <MapTooltip id={hovered} />}

            {/* invisible hover hit-targets (topmost) */}
            <g fill="transparent">
              {Object.entries(STATION_COORDS).map(([id, p]) => (
                <circle
                  key={`hit-${id}`}
                  cx={p.x}
                  cy={p.y}
                  r="11"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => setHovered((h) => (h === id ? null : h))}
                />
              ))}
            </g>
          </g>
        </svg>

        {/* zoom controls */}
        <div className="absolute end-3 top-3 flex flex-col gap-1">
          <button onClick={() => zoom(1.25)} aria-label="تكبير" className="grid h-8 w-8 place-items-center rounded-md bg-white/10 text-white backdrop-blur transition hover:bg-white/20"><Plus className="h-4 w-4" /></button>
          <button onClick={() => zoom(0.8)} aria-label="تصغير" className="grid h-8 w-8 place-items-center rounded-md bg-white/10 text-white backdrop-blur transition hover:bg-white/20"><Minus className="h-4 w-4" /></button>
          <button onClick={() => setView({ k: 1, tx: 0, ty: 0 })} aria-label="إعادة العرض" className="grid h-8 w-8 place-items-center rounded-md bg-white/10 text-white backdrop-blur transition hover:bg-white/20"><RotateCcw className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* controls */}
      <JourneyControls
        playing={playing}
        done={done}
        hasRoute={Boolean(route)}
        speed={SPEEDS[speedIdx]}
        onToggle={toggle}
        onRestart={restart}
        onNext={nextStation}
        onSpeed={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
        progress={progress}
        total={total}
      />

      {/* live info panel */}
      <JourneyInfoPanel
        fromId={fromId}
        toId={toId}
        currentId={currentId}
        nextId={nextId}
        remaining={remaining}
        transfers={route?.transfers ?? 0}
        minutes={route?.totalMinutes ?? 0}
        line={currentLine}
        done={done}
        totalStops={route?.totalStops ?? 0}
      />
    </div>
  );
}

// ------------------------------------------------------------------
const INTERCHANGE_SET = new Set(
  Object.keys(STATION_COORDS).filter((id) => getStation(id)?.lines.length === 2),
);

function segStartReached(progress: number, seg: { startHop: number }) {
  return progress > seg.startHop + 0.05;
}

function stationState(i: number, progress: number, total: number, done: boolean): 'visited' | 'current' | 'upcoming' {
  if (done) return 'visited';
  if (i <= Math.floor(progress)) return 'visited';
  if (i === Math.floor(progress) + 1) return 'current';
  return 'upcoming';
}

/** lucide Footprints path data (kept inline to render inside SVG transforms) */
function FootprintsGlyph() {
  return (
    <>
      <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
      <path d="M13 9.5V8.63c0-2.13 1-3.13 1-5.63 0-1.25.5-3 2.5-3 2.15 0 2.5 2.13 2.5 3.5 0 3.11-2 5.66-2 8.68V15a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.5" />
      <path d="M18.5 5.5h2" />
      <path d="M6.5 8h2" />
      <path d="M4 16h6" />
      <path d="M13 15.5h7" />
    </>
  );
}

function MapTooltip({ id }: { id: string }) {
  const p = STATION_COORDS[id];
  const s = getStation(id);
  if (!p || !s) return null;
  const lines = METRO_LINES.filter((l) => s.lines.includes(l.id as LineId));
  const w = 150;
  const x = Math.min(Math.max(p.x - w / 2, 10), MAP_VIEWBOX.w - w - 10);
  const y = p.y - 58 < 10 ? p.y + 18 : p.y - 58;
  return (
    <g pointerEvents="none" className="mm-fade">
      <rect x={x} y={y} width={w} height="44" rx="8" fill="#1F1F1F" stroke="#C8102E" strokeWidth="1.5" />
      <text x={x + w / 2} y={y + 18} textAnchor="middle" fontSize="11" fontWeight="800" fill="#F5F5F5">{s.ar}</text>
      <text x={x + w / 2} y={y + 33} textAnchor="middle" fontSize="8.5" fill="#F5F5F5" fillOpacity=".6">{s.en} · {lines.map((l) => l.number).join(' • ')}</text>
    </g>
  );
}

// ------------------------------------------------------------------
function JourneyControls({ playing, done, hasRoute, speed, onToggle, onRestart, onNext, onSpeed, progress, total }: {
  playing: boolean;
  done: boolean;
  hasRoute: boolean;
  speed: number;
  onToggle: () => void;
  onRestart: () => void;
  onNext: () => void;
  onSpeed: () => void;
  progress: number;
  total: number;
}) {
  const pct = total > 0 ? (progress / total) * 100 : 0;
  return (
    <div className="border-t border-white/10 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onToggle}
          disabled={!hasRoute}
          aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل الرحلة'}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#e72434] text-white shadow-[0_0_14px_rgba(231,36,52,.5)] transition hover:brightness-110 active:scale-95 disabled:opacity-40"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 -me-0.5" />}
        </button>
        <button onClick={onRestart} disabled={!hasRoute} aria-label="إعادة تشغيل" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95 disabled:opacity-40">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button onClick={onNext} disabled={!hasRoute || done} aria-label="المحطة التالية" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95 disabled:opacity-40">
          <StepForward className="h-4 w-4" />
        </button>
        <button onClick={onSpeed} disabled={!hasRoute} className="flex h-10 items-center gap-1 rounded-full bg-white/10 px-3.5 text-xs font-black text-white transition hover:bg-white/20 active:scale-95 disabled:opacity-40">
          سرعة ×{arNum(speed)}
        </button>
        <div className="ms-auto flex items-center gap-2 text-[11px] font-bold text-white/70">
          {done ? (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 font-black text-emerald-300">وصلت! 🎉</span>
          ) : (
            <span>{arNum(Math.round(progress))} / {arNum(total)} محطة</span>
          )}
        </div>
      </div>
      {/* progress rail */}
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-l from-[#e72434] to-[#f59e0b] transition-[width] duration-150" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
function JourneyInfoPanel({ fromId, toId, currentId, nextId, remaining, transfers, minutes, line, done, totalStops }: {
  fromId: string;
  toId: string;
  currentId: string;
  nextId: string;
  remaining: number;
  transfers: number;
  minutes: number;
  line: { line: LineId; color: string } | null;
  done: boolean;
  totalStops: number;
}) {
  const from = getStation(fromId);
  const to = getStation(toId);
  const current = getStation(currentId);
  const next = getStation(nextId);
  const lineMeta = line ? METRO_LINES.find((l) => l.id === line.line) : null;

  return (
    <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-3 sm:grid-cols-3 lg:grid-cols-6">
      <InfoCell label="من" value={from?.ar ?? '—'} sub={from?.en} />
      <InfoCell label="إلى" value={to?.ar ?? '—'} sub={to?.en} />
      <InfoCell
        label={done ? 'الحالة' : 'المحطة الحالية'}
        value={done ? 'وصلت إلى وجهتك' : current?.ar ?? '—'}
        sub={done ? undefined : current?.en}
        highlight={!done}
        color={line?.color}
      />
      <InfoCell label={done ? 'الرحلة' : 'المحطة التالية'} value={done ? `${arNum(totalStops)} محطة` : next?.ar ?? 'الوجهة الأخيرة'} sub={done ? undefined : next?.en} />
      <InfoCell label="المحطات المتبقية" value={done ? '٠' : arNum(remaining)} sub={`من ${arNum(totalStops)}`} />
      <InfoCell
        label="الخط الحالي"
        value={done ? `${arNum(transfers)} تبديل` : lineMeta?.ar ?? '—'}
        sub={done ? `${arNum(minutes)} دقيقة` : `${arNum(transfers)} تبديل · ${arNum(minutes)} د`}
        dot={line?.color}
      />
    </div>
  );
}

function InfoCell({ label, value, sub, highlight, color, dot }: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  color?: string;
  dot?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 backdrop-blur', highlight && 'border-[#e72434]/60 bg-[#e72434]/10')}>
      <p className="flex items-center gap-1 text-[10px] font-bold text-white/60">
        {dot && <i className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />}
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-black text-white" style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="truncate text-[9px] text-white/50" dir="ltr">{sub}</p>}
    </div>
  );
}
