/**
 * Schematic (geographically-inspired) SVG layout of the Cairo Metro network.
 * Coordinates are hand-placed to mirror the real network topology:
 * Line 1 descends NE→downtown→S, Line 2 hooks W then SW, Line 3 runs E→W
 * with two branches at Kit-Kat, and the Nile is drawn for context.
 */
import { LINE_ROUTES, METRO_STATIONS, type LineId } from './metroData';
import type { MetroRoute } from './routeFinder';

export const MAP_VIEWBOX = { x: 0, y: 0, w: 1000, h: 1400 };

export interface MapStation {
  x: number;
  y: number;
  /** label placement: dx, dy offsets + text-anchor */
  ldx?: number;
  ldy?: number;
  la?: 'start' | 'end' | 'middle';
}

// key = station id
export const STATION_COORDS: Record<string, MapStation> = {
  // ---- Line 1: NE diagonal then vertical south (x=480) ----
  'marg-new': { x: 900, y: 80, ldx: 10, ldy: -6 },
  marg: { x: 868, y: 110, ldx: 9, ldy: 12, la: 'start' },
  'ezbet-el-nakhl': { x: 836, y: 140, ldx: 9, ldy: 12, la: 'start' },
  'ain-shams': { x: 804, y: 170, ldx: 9, ldy: 12, la: 'start' },
  'el-matareyya': { x: 771, y: 200, ldx: 9, ldy: 12, la: 'start' },
  'hilmeyet-el-zaitoun': { x: 739, y: 230, ldx: 9, ldy: 12, la: 'start' },
  'hadayeq-el-zaitoun': { x: 706, y: 260, ldx: 9, ldy: 12, la: 'start' },
  'saray-el-qobba': { x: 674, y: 290, ldx: 9, ldy: 12, la: 'start' },
  'hammamat-el-qobba': { x: 641, y: 320, ldx: 9, ldy: 12, la: 'start' },
  'kobri-el-qobba': { x: 609, y: 350, ldx: 9, ldy: 12, la: 'start' },
  'manshiet-el-sadr': { x: 577, y: 380, ldx: 9, ldy: 12, la: 'start' },
  'el-demerdash': { x: 544, y: 410, ldx: 9, ldy: 12, la: 'start' },
  ghamra: { x: 512, y: 440, ldx: 9, ldy: 12, la: 'start' },
  shohadaa: { x: 480, y: 470, ldy: -10 },
  orabi: { x: 480, y: 508, ldx: -9, ldy: 3.5, la: 'end' },
  nasser: { x: 480, y: 546, ldx: 9, ldy: -6, la: 'start' },
  sadat: { x: 480, y: 584, ldx: 9, ldy: 3.5, la: 'start' },
  'saad-zaghloul': { x: 480, y: 622, ldx: 9, ldy: 3.5, la: 'start' },
  'sayeda-zeinab': { x: 480, y: 660, ldx: -9, ldy: 3.5, la: 'end' },
  'malek-saleh': { x: 480, y: 698, ldx: 9, ldy: 3.5, la: 'start' },
  'mar-girgis': { x: 480, y: 736, ldx: 9, ldy: 3.5, la: 'start' },
  'el-zahraa': { x: 480, y: 774, ldx: -9, ldy: 3.5, la: 'end' },
  'dar-el-salam': { x: 480, y: 812, ldx: 9, ldy: 3.5, la: 'start' },
  'hadayek-el-maadi': { x: 480, y: 850, ldx: -9, ldy: 3.5, la: 'end' },
  maadi: { x: 480, y: 888, ldx: 9, ldy: 3.5, la: 'start' },
  'sakanat-el-maadi': { x: 480, y: 926, ldx: -9, ldy: 3.5, la: 'end' },
  'tora-el-balad': { x: 480, y: 964, ldx: 9, ldy: 3.5, la: 'start' },
  kozzika: { x: 480, y: 1002, ldx: -9, ldy: 3.5, la: 'end' },
  'tura-el-esmant': { x: 480, y: 1040, ldx: 9, ldy: 3.5, la: 'start' },
  elmasraa: { x: 480, y: 1078, ldx: -9, ldy: 3.5, la: 'end' },
  'hadayek-helwan': { x: 480, y: 1116, ldx: 9, ldy: 3.5, la: 'start' },
  'wadi-hof': { x: 480, y: 1154, ldx: -9, ldy: 3.5, la: 'end' },
  'helwan-uni': { x: 480, y: 1192, ldx: 9, ldy: 3.5, la: 'start' },
  'ain-helwan': { x: 480, y: 1230, ldx: -9, ldy: 3.5, la: 'end' },
  helwan: { x: 480, y: 1268, ldy: 17 },

  // ---- Line 2: vertical (x=200) then hook SE→W→SW ----
  'shubra-kheima': { x: 200, y: 140, ldx: -9, ldy: 3.5, la: 'end' },
  'koliet-el-zeraa': { x: 200, y: 185, ldx: -9, ldy: 3.5, la: 'end' },
  mezallat: { x: 200, y: 230, ldx: -9, ldy: 3.5, la: 'end' },
  khalafawy: { x: 200, y: 275, ldx: -9, ldy: 3.5, la: 'end' },
  'st-teresa': { x: 200, y: 320, ldx: -9, ldy: 3.5, la: 'end' },
  'rod-el-farag': { x: 200, y: 365, ldx: -9, ldy: 3.5, la: 'end' },
  masarra: { x: 200, y: 410, ldx: -9, ldy: 3.5, la: 'end' },
  attaba: { x: 420, y: 540, ldy: 16 },
  'mohamed-naguib': { x: 370, y: 575, ldx: -9, ldy: 3.5, la: 'end' },
  opera: { x: 370, y: 625, ldy: -8 },
  dokki: { x: 290, y: 655, ldy: -8 },
  'el-bohoth': { x: 220, y: 685, ldy: -8 },
  'cairo-uni': { x: 160, y: 715, ldx: -9, ldy: 14, la: 'end' },
  faisal: { x: 125, y: 765, ldx: -9, ldy: 3.5, la: 'end' },
  giza: { x: 105, y: 820, ldx: -9, ldy: 3.5, la: 'end' },
  'omm-el-masryeen': { x: 110, y: 880, ldx: -9, ldy: 3.5, la: 'end' },
  'sakiat-mekky': { x: 150, y: 930, ldy: -8 },
  'el-mounib': { x: 185, y: 980, ldy: 17 },

  // ---- Line 3: east horizontal (y=706) then diagonal up to downtown ----
  'adly-mansour': { x: 940, y: 706, ldy: -8 },
  'el-haykestep': { x: 905, y: 706, ldy: 15 },
  'omar-ibn-el-khattab': { x: 870, y: 706, ldy: -8 },
  qubaa: { x: 835, y: 706, ldy: 15 },
  'hesham-barakat': { x: 800, y: 706, ldy: -8 },
  'el-nozha': { x: 765, y: 706, ldy: 15 },
  'el-shams-club': { x: 730, y: 706, ldy: -8 },
  'alf-masken': { x: 695, y: 706, ldy: 15 },
  heliopolis: { x: 655, y: 706, ldy: -8 },
  haroun: { x: 645, y: 682, ldx: 9, ldy: 3, la: 'start' },
  'al-ahram': { x: 635, y: 658, ldx: 9, ldy: 3, la: 'start' },
  'koleyet-el-banat': { x: 625, y: 635, ldx: -9, ldy: 3, la: 'end' },
  stadium: { x: 615, y: 612, ldx: 9, ldy: 3, la: 'start' },
  'fair-zone': { x: 605, y: 590, ldx: -9, ldy: 3, la: 'end' },
  abbassiya: { x: 590, y: 570, ldx: 9, ldy: 3, la: 'start' },
  'abdou-pasha': { x: 568, y: 550, ldx: -9, ldy: 3, la: 'end' },
  'el-geish': { x: 546, y: 532, ldx: 9, ldy: 3, la: 'start' },
  'bab-el-shaariya': { x: 522, y: 515, ldy: -9 },
  maspero: { x: 400, y: 560, ldy: 14 },
  'safaa-hegazy': { x: 320, y: 540, ldy: -9 },
  'kit-kat': { x: 225, y: 520, ldy: -9 },

  // ---- Line 3 branch A (NW along the west bank) ----
  sudan: { x: 205, y: 490, ldx: -9, ldy: 3.5, la: 'end' },
  imbaba: { x: 175, y: 465, ldx: -9, ldy: 3.5, la: 'end' },
  'el-bohy': { x: 150, y: 440, ldx: -9, ldy: 3.5, la: 'end' },
  'el-qawmia': { x: 130, y: 415, ldx: -9, ldy: 3.5, la: 'end' },
  'ring-road': { x: 115, y: 390, ldx: -9, ldy: 3.5, la: 'end' },
  'rod-el-farag-corridor': { x: 105, y: 365, ldx: -9, ldy: 3.5, la: 'end' },

  // ---- Line 3 branch B (south to Cairo University) ----
  tawfikia: { x: 215, y: 555, ldx: -9, ldy: 3.5, la: 'end' },
  'wadi-el-nile': { x: 210, y: 585, ldx: -9, ldy: 3.5, la: 'end' },
  'gamat-el-dowal': { x: 205, y: 615, ldx: -9, ldy: 3.5, la: 'end' },
  'boulak-el-dakrour': { x: 200, y: 645, ldx: -9, ldy: 3.5, la: 'end' },
};

/** Polyline (SVG path "M..L..") through the given station ids. */
export function polylinePath(stationIds: string[]): string {
  const pts = stationIds
    .map((id) => STATION_COORDS[id])
    .filter(Boolean)
    .map((p) => `${p.x},${p.y}`);
  return pts.length ? `M${pts.join('L')}` : '';
}

/** Base-map paths for every line (branches included). */
export const LINE_PATHS: Array<{ line: LineId; color: string; d: string }> = LINE_ROUTES.map((r) => ({
  line: r.line,
  color: r.line === 'l1' ? '#0055A5' : r.line === 'l2' ? '#D9232E' : '#009640',
  d: polylinePath(r.stations),
}));

/** Interchange = served by 2+ distinct lines (from the network data). */
export const INTERCHANGE_IDS = new Set(
  METRO_STATIONS.filter((s) => s.lines.length > 1).map((s) => s.id),
);

/** Hub junctions on a single line (branch points) — styled like mini-interchanges. */
export const JUNCTION_IDS = new Set(['kit-kat']);

/** The Nile — decorative context (two channels around Zamalek island). */
export const NILE_MAIN =
  'M140,-20C118,90 112,260 148,428C210,470 262,478 292,488' +
  'C350,514 358,548 342,578C320,610 262,640 218,700C196,760 188,830 200,900' +
  'C212,970 232,1060 262,1140C288,1210 306,1270 316,1420';
export const NILE_ISLAND =
  'M292,488C318,500 336,516 342,540C348,562 330,580 302,594C278,604 260,596 252,574C246,552 258,516 292,488Z';
export const NILE_WEST_BRANCH =
  'M262,478C244,500 236,530 244,558C250,578 262,590 268,600';

// ------------------------------------------------------------------
// Route overlay helpers (for the animated journey)
// ------------------------------------------------------------------
export interface RouteSegment {
  kind: 'ride';
  line: LineId;
  color: string;
  d: string;
  /** global hop index where this segment starts */
  startHop: number;
  hops: number;
  stationIds: string[];
}

export interface RouteTransfer {
  kind: 'transfer';
  fromId: string;
  toId: string;
  /** global hop index reached when the rider is at the interchange */
  atHop: number;
}

export interface RouteOverlay {
  segments: RouteSegment[];
  transfers: RouteTransfer[];
  /** line serving each hop (index = hop number) */
  hopLines: Array<{ line: LineId; color: string }>;
  totalHops: number;
}

/** Build SVG segments + transfer connectors from the calculated route. */
export function buildRouteOverlay(route: MetroRoute): RouteOverlay {
  const segments: RouteSegment[] = [];
  const transfers: RouteTransfer[] = [];
  const hopLines: Array<{ line: LineId; color: string }> = [];
  let hop = 0;

  for (const leg of route.legs) {
    if (leg.type === 'transfer') {
      const prev = route.legs[route.legs.indexOf(leg) - 1];
      const next = route.legs[route.legs.indexOf(leg) + 1];
      const fromId = prev?.type === 'ride' ? prev.stations[prev.stations.length - 1] : '';
      const toId = next?.type === 'ride' ? next.stations[0] : '';
      if (fromId && toId) transfers.push({ kind: 'transfer', fromId, toId, atHop: hop });
      continue;
    }
    const d = polylinePath(leg.stations);
    segments.push({
      kind: 'ride',
      line: leg.line,
      color: leg.color,
      d,
      startHop: hop,
      hops: leg.stops,
      stationIds: leg.stations,
    });
    for (let i = 0; i < leg.stops; i++) hopLines.push({ line: leg.line, color: leg.color });
    hop += leg.stops;
  }

  return { segments, transfers, hopLines, totalHops: hop };
}

/** Interpolated point + angle at a fractional hop position along the route. */
export function pointAtHop(overlay: RouteOverlay, progress: number): { x: number; y: number; angle: number } {
  const clamped = Math.max(0, Math.min(overlay.totalHops, progress));
  const seg = overlay.segments.find((s) => clamped <= s.startHop + s.hops) ?? overlay.segments[overlay.segments.length - 1];
  const local = Math.max(0, Math.min(seg.hops, clamped - seg.startHop));
  const i = Math.min(seg.stationIds.length - 2, Math.floor(local));
  const a = STATION_COORDS[seg.stationIds[i]];
  const b = STATION_COORDS[seg.stationIds[i + 1]];
  if (!a || !b) return { x: 0, y: 0, angle: 0 };
  const t = local - i;
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return { x, y, angle };
}
