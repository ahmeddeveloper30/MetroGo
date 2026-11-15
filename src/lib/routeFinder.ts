/**
 * Cairo Metro pathfinding — Dijkstra over (station, line) states.
 *
 * Cost model:
 *  - riding one station hop:  2 min (average metro headway + travel)
 *  - changing lines at an interchange: 5 min (walking + waiting)
 * Route segments are then merged into "ride N stops on line X" legs,
 * exactly like Google Maps transit directions.
 */
import { LINE_ROUTES, METRO_LINES, getStation, type LineId } from './metroData';

export const MINUTES_PER_HOP = 2;
export const MINUTES_PER_TRANSFER = 5;

export interface RideLeg {
  type: 'ride';
  line: LineId;
  color: string;
  /** ordered station ids from → to (inclusive). */
  stations: string[];
  /** number of hops in this leg. */
  stops: number;
  /** minutes spent riding. */
  minutes: number;
}

export interface TransferLeg {
  type: 'transfer';
  /** minutes spent walking + waiting (~5). */
  minutes: number;
}

export type RouteLeg = RideLeg | TransferLeg;

export interface MetroRoute {
  legs: RouteLeg[];
  /** total station hops across all rides */
  totalStops: number;
  totalMinutes: number;
  transfers: number;
  linesUsed: LineId[];
  /** ordered ids of every station the rider passes through (start → end). */
  pathStations: string[];
}

interface Edge {
  to: string;
  line: LineId;
}

// adjacency: station -> [{to, line}]
const ADJ = new Map<string, Edge[]>();
// lines serving each station (recomputed from actual routes, branches included)
const LINES_AT = new Map<string, Set<LineId>>();

for (const route of LINE_ROUTES) {
  for (let i = 0; i < route.stations.length; i++) {
    const a = route.stations[i];
    if (!LINES_AT.has(a)) LINES_AT.set(a, new Set());
    LINES_AT.get(a)!.add(route.line);
    if (i + 1 < route.stations.length) {
      const b = route.stations[i + 1];
      if (!ADJ.has(a)) ADJ.set(a, []);
      if (!ADJ.has(b)) ADJ.set(b, []);
      ADJ.get(a)!.push({ to: b, line: route.line });
      ADJ.get(b)!.push({ to: a, line: route.line });
    }
  }
}

/** Direction of travel on a line for display (e.g. "اتجاه حلوان"). */
export function directionFor(line: LineId, fromStation: string, toStation: string): string | null {
  const route = LINE_ROUTES.find((r) => r.line === line && r.stations.includes(fromStation) && r.stations.includes(toStation));
  if (!route) return null;
  const i = route.stations.indexOf(fromStation);
  const j = route.stations.indexOf(toStation);
  return route.toward[j > i ? 1 : 0];
}

interface NodeKey {
  station: string;
  line: LineId | null; // the line currently ridden (null only at the start)
}

export function findRoute(from: string, to: string): MetroRoute | null {
  if (from === to || !ADJ.has(from) || !ADJ.has(to)) return null;

  // Dijkstra over (station, line) state. Staying on the same line costs a hop;
  // switching lines costs a hop + transfer penalty.
  const best = new Map<string, number>();
  const parent = new Map<string, { key: NodeKey; viaEdge: Edge }>();
  const keyOf = (k: NodeKey) => `${k.station}|${k.line ?? ''}`;
  const heap: Array<{ key: NodeKey; cost: number }> = [];

  // Parent pointers are recorded ONLY when the best cost strictly improves,
  // which keeps every parent chain strictly increasing in cost (cycle-free).
  const push = (k: NodeKey, cost: number, fromKey: NodeKey | null, viaEdge: Edge | null) => {
    const id = keyOf(k);
    const cur = best.get(id);
    if (cur !== undefined && cur <= cost) return;
    best.set(id, cost);
    if (fromKey && viaEdge) parent.set(id, { key: fromKey, viaEdge });
    heap.push({ key: k, cost });
  };

  push({ station: from, line: null }, 0, null, null);

  let goalKey: NodeKey | null = null;
  while (heap.length) {
    // small graphs — linear extract-min is fine and dependency-free
    let mi = 0;
    for (let i = 1; i < heap.length; i++) if (heap[i].cost < heap[mi].cost) mi = i;
    const { key, cost } = heap.splice(mi, 1)[0];
    if (cost > (best.get(keyOf(key)) ?? Infinity)) continue;
    if (key.station === to && key.line !== null) { goalKey = key; break; }

    for (const edge of ADJ.get(key.station) ?? []) {
      const transfer = key.line !== null && key.line !== edge.line;
      const stepCost = cost + MINUTES_PER_HOP + (transfer ? MINUTES_PER_TRANSFER : 0);
      push({ station: edge.to, line: edge.line }, stepCost, key, edge);
    }
  }

  if (!goalKey) return null;

  // reconstruct (station, line) state chain → edge list
  const stateChain: Array<{ key: NodeKey; edge: Edge | null }> = [];
  let cur: NodeKey | undefined = goalKey;
  let guard = 0;
  while (cur && guard++ < 1000) {
    const p = parent.get(keyOf(cur));
    stateChain.unshift({ key: cur, edge: p?.viaEdge ?? null });
    if (!p) break;
    cur = p.key;
  }
  // ensure start state present
  if (stateChain[0]?.key.station !== from) stateChain.unshift({ key: { station: from, line: null }, edge: null });

  // merge consecutive edges of the same line into ride legs; line changes become transfers
  const legs: RouteLeg[] = [];
  const linesUsed: LineId[] = [];
  const pathStations: string[] = [from];
  let totalStops = 0;

  let ride: { line: LineId; stations: string[] } | null = null;
  let prevStation = from;

  for (let i = 1; i < stateChain.length; i++) {
    const edge = stateChain[i].edge;
    if (!edge) continue;
    const sameLine = ride?.line === edge.line;
    if (!sameLine) {
      const closed = ride;
      if (closed) {
        legs.push({
          type: 'ride',
          line: closed.line,
          color: METRO_LINES.find((l) => l.id === closed.line)!.color,
          stations: closed.stations,
          stops: closed.stations.length - 1,
          minutes: (closed.stations.length - 1) * MINUTES_PER_HOP,
        });
        totalStops += closed.stations.length - 1;
        linesUsed.push(closed.line);
      }
      ride = { line: edge.line, stations: [prevStation, edge.to] };
      if (linesUsed.length > 0) {
        legs.push({ type: 'transfer', minutes: MINUTES_PER_TRANSFER });
      }
    } else {
      ride?.stations.push(edge.to);
    }
    prevStation = edge.to;
    pathStations.push(edge.to);
  }
  const finalRide = ride;
  if (finalRide) {
    const line = METRO_LINES.find((l) => l.id === finalRide.line)!;
    legs.push({
      type: 'ride',
      line: finalRide.line,
      color: line.color,
      stations: finalRide.stations,
      stops: finalRide.stations.length - 1,
      minutes: (finalRide.stations.length - 1) * MINUTES_PER_HOP,
    });
    totalStops += finalRide.stations.length - 1;
    linesUsed.push(finalRide.line);
  }

  // drop a leading transfer if the first leg starts exactly at origin (no walk needed)
  if (legs[0]?.type === 'transfer') legs.shift();

  return {
    legs,
    totalStops,
    totalMinutes: legs.reduce((s, l) => s + l.minutes, 0),
    transfers: legs.filter((l) => l.type === 'transfer').length,
    linesUsed: [...new Set(linesUsed)],
    pathStations,
  };
}

export const stationLines = (id: string): LineId[] => [...(LINES_AT.get(id) ?? [])];

export { getStation };
