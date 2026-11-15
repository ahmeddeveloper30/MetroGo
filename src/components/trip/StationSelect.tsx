import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, MapPin, Search, X } from 'lucide-react';
import { METRO_LINES, METRO_STATIONS, type MetroStation } from '@/lib/metroData';
import { cn } from '@/lib/utils';

/**
 * Google-Maps-style searchable station selector.
 * Filter matches Arabic and English names; every result carries
 * official line-colour badges. Fully keyboard accessible.
 */

interface Props {
  id: string;
  value: string; // station id ('' = none)
  onChange: (stationId: string) => void;
  label: string;
  dotColor: string; // marker colour of this endpoint (from/to)
  placeholder?: string;
}

export default function StationSelect({ id, value, onChange, label, dotColor, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(() => METRO_STATIONS.find((s) => s.id === value), [value]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return METRO_STATIONS;
    // exact matches first, then prefix, then substring — Google-Maps-style ranking
    const scored = METRO_STATIONS.map((s) => {
      const ar = s.ar, en = s.en.toLowerCase();
      let score = 3;
      if (ar === query.trim() || en === q) score = 0;
      else if (ar.startsWith(query.trim()) || en.startsWith(q)) score = 1;
      else if (ar.includes(query.trim()) || en.includes(q)) score = 2;
      else return null;
      return { s, score };
    }).filter(Boolean) as Array<{ s: MetroStation; score: number }>;
    return scored.sort((a, b) => a.score - b.score).map((x) => x.s);
  }, [query]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // keep active item in view
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const openList = () => {
    setQuery('');
    setActive(0);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const pick = (s: MetroStation) => {
    onChange(s.id);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && open && results[active]) { e.preventDefault(); pick(results[active]); }
  };

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className="mb-1.5 flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <span
          className="relative grid h-3 w-3 place-items-center"
          style={{ color: dotColor }}
          aria-hidden="true"
        >
          <span className="absolute inline-flex h-full w-full rounded-full opacity-50 rp-ping" style={{ backgroundColor: dotColor }} />
          <span className="relative h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
        </span>
        {label}
      </label>

      {open ? (
        <div className="relative" onKeyDown={onKeyDown}>
          <div className="flex h-12 items-center gap-2 rounded-lg border-2 border-primary bg-background px-3 shadow-card">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              placeholder="ابحث بالعربي أو الإنجليزي..."
              className="w-full bg-transparent text-sm font-bold outline-none placeholder:font-normal placeholder:text-muted-foreground"
              aria-label={`البحث عن ${label}`}
              role="combobox"
              aria-expanded="true"
              aria-controls={`${id}-list`}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="إغلاق القائمة"
              className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ul
            id={`${id}-list`}
            ref={listRef}
            role="listbox"
            className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto rounded-lg border bg-card shadow-card"
          >
            {results.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground">لا توجد محطات مطابقة</li>
            )}
            {results.map((s, i) => (
              <li key={s.id} role="option" aria-selected={s.id === value}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(s)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2.5 text-start transition',
                    i === active ? 'bg-accent/10' : 'hover:bg-muted/60',
                  )}
                >
                  <MapPin className={cn('h-4 w-4 shrink-0', i === active ? 'text-accent' : 'text-muted-foreground')} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{s.ar}</span>
                    <span className="block truncate text-[11px] text-muted-foreground" dir="ltr">{s.en}</span>
                  </span>
                  <span className="flex shrink-0 gap-1">
                    {s.lines.map((lineId) => {
                      const line = METRO_LINES.find((l) => l.id === lineId)!;
                      return (
                        <span
                          key={lineId}
                          title={line.ar}
                          className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-black text-white"
                          style={{ backgroundColor: line.color }}
                        >
                          {line.number}
                        </span>
                      );
                    })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button
          id={id}
          type="button"
          onClick={openList}
          aria-haspopup="listbox"
          aria-expanded="false"
          className="flex h-12 w-full items-center gap-2 rounded-lg border bg-background px-3 text-start shadow-card transition hover:border-primary/60"
        >
          {selected ? (
            <>
              <span className="flex shrink-0 gap-1">
                {selected.lines.map((lineId) => {
                  const line = METRO_LINES.find((l) => l.id === lineId)!;
                  return (
                    <span
                      key={lineId}
                      title={line.ar}
                      className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-black text-white"
                      style={{ backgroundColor: line.color }}
                    >
                      {line.number}
                    </span>
                  );
                })}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{selected.ar}</span>
                <span className="block truncate text-[11px] text-muted-foreground" dir="ltr">{selected.en}</span>
              </span>
            </>
          ) : (
            <span className="flex-1 truncate text-sm text-muted-foreground">{placeholder ?? 'اختر محطة'}</span>
          )}
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition', open && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}
