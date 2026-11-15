/**
 * Cairo Metro network model (مترو القاهرة الكبرى).
 * Graph structure: stations (nodes) + ordered station sequences per line (edges).
 * Sources: official National Authority for Tunnels / Wikipedia route tables.
 *
 * Line colours are the official ones:
 *   Line 1 (المرج الجديدة ↔ حلوان) — Blue   #0055A5
 *   Line 2 (شبرا الخيمة ↔ المنيب)  — Red    #D9232E
 *   Line 3 (عدلي منصور ↔ كيت كات + فرعان) — Green #009640
 */

export type LineId = 'l1' | 'l2' | 'l3';

export interface MetroStation {
  id: string;
  ar: string;
  en: string;
  /** Operational lines serving this station (a station serving 2+ lines is an interchange). */
  lines: LineId[];
}

export interface MetroLine {
  id: LineId;
  number: number;
  ar: string;
  en: string;
  color: string;
}

export const METRO_LINES: MetroLine[] = [
  { id: 'l1', number: 1, ar: 'الخط الأول', en: 'Line 1', color: '#0055A5' },
  { id: 'l2', number: 2, ar: 'الخط الثاني', en: 'Line 2', color: '#D9232E' },
  { id: 'l3', number: 3, ar: 'الخط الثالث', en: 'Line 3', color: '#009640' },
];

const lineOf = (id: LineId) => METRO_LINES.find((l) => l.id === id)!;
export const getLine = lineOf;

// ------------------------------------------------------------------
// Ordered station sequences (topology). Consecutive pairs become edges.
// Line 3 has two branches from الكيت كات (same line — no transfer needed).
// ------------------------------------------------------------------
export const LINE_ROUTES: Array<{ line: LineId; stations: string[]; toward: [string, string] }> = [
  {
    line: 'l1',
    toward: ['المرج الجديدة', 'حلوان'],
    stations: [
      'marg-new', 'marg', 'ezbet-el-nakhl', 'ain-shams', 'el-matareyya', 'hilmeyet-el-zaitoun',
      'hadayeq-el-zaitoun', 'saray-el-qobba', 'hammamat-el-qobba', 'kobri-el-qobba', 'manshiet-el-sadr',
      'el-demerdash', 'ghamra', 'shohadaa', 'orabi', 'nasser', 'sadat', 'saad-zaghloul', 'sayeda-zeinab',
      'malek-saleh', 'mar-girgis', 'el-zahraa', 'dar-el-salam', 'hadayek-el-maadi', 'maadi',
      'sakanat-el-maadi', 'tora-el-balad', 'kozzika', 'tura-el-esmant', 'elmasraa', 'hadayek-helwan',
      'wadi-hof', 'helwan-uni', 'ain-helwan', 'helwan',
    ],
  },
  {
    line: 'l2',
    toward: ['شبرا الخيمة', 'المنيب'],
    stations: [
      'shubra-kheima', 'koliet-el-zeraa', 'mezallat', 'khalafawy', 'st-teresa', 'rod-el-farag',
      'masarra', 'shohadaa', 'attaba', 'mohamed-naguib', 'sadat', 'opera', 'dokki', 'el-bohoth',
      'cairo-uni', 'faisal', 'giza', 'omm-el-masryeen', 'sakiat-mekky', 'el-mounib',
    ],
  },
  {
    line: 'l3',
    toward: ['عدلي منصور', 'الكيت كات'],
    stations: [
      'adly-mansour', 'el-haykestep', 'omar-ibn-el-khattab', 'qubaa', 'hesham-barakat', 'el-nozha',
      'el-shams-club', 'alf-masken', 'heliopolis', 'haroun', 'al-ahram', 'koleyet-el-banat', 'stadium',
      'fair-zone', 'abbassiya', 'abdou-pasha', 'el-geish', 'bab-el-shaariya', 'attaba', 'nasser',
      'maspero', 'safaa-hegazy', 'kit-kat',
    ],
  },
  {
    line: 'l3',
    toward: ['الكيت كات', 'محور روض الفرج'],
    stations: ['kit-kat', 'sudan', 'imbaba', 'el-bohy', 'el-qawmia', 'ring-road', 'rod-el-farag-corridor'],
  },
  {
    line: 'l3',
    toward: ['الكيت كات', 'جامعة القاهرة'],
    stations: ['kit-kat', 'tawfikia', 'wadi-el-nile', 'gamat-el-dowal', 'boulak-el-dakrour', 'cairo-uni'],
  },
];

// ------------------------------------------------------------------
// Stations
// ------------------------------------------------------------------
const S = (id: string, ar: string, en: string, lines: LineId[]): MetroStation => ({ id, ar, en, lines });

export const METRO_STATIONS: MetroStation[] = [
  // ---- Line 1 (35) ----
  S('marg-new', 'المرج الجديدة', 'New El Marg', ['l1']),
  S('marg', 'المرج', 'El Marg', ['l1']),
  S('ezbet-el-nakhl', 'عزبة النخل', 'Ezbet El Nakhl', ['l1']),
  S('ain-shams', 'عين شمس', 'Ain Shams', ['l1']),
  S('el-matareyya', 'المطرية', 'El Matareyya', ['l1']),
  S('hilmeyet-el-zaitoun', 'حلمية الزيتون', 'Helmeyet El Zaitoun', ['l1']),
  S('hadayeq-el-zaitoun', 'حدائق الزيتون', 'Hadayeq El Zaitoun', ['l1']),
  S('saray-el-qobba', 'سراي القبة', 'Saray El Qobba', ['l1']),
  S('hammamat-el-qobba', 'حمامات القبة', 'Hammamat El Qobba', ['l1']),
  S('kobri-el-qobba', 'كوبري القبة', 'Kobri El Qobba', ['l1']),
  S('manshiet-el-sadr', 'منشية الصدر', 'Manshiet El Sadr', ['l1']),
  S('el-demerdash', 'الدمرداش', 'El Demerdash', ['l1']),
  S('ghamra', 'غمرة', 'Ghamra', ['l1']),
  S('shohadaa', 'الشهداء', 'Al-Shohadaa', ['l1', 'l2']),
  S('orabi', 'أحمد عرابي', 'Ahmed Orabi', ['l1']),
  S('nasser', 'جمال عبد الناصر', 'Gamal Abdel Nasser', ['l1', 'l3']),
  S('sadat', 'أنور السادات', 'Anwar El Sadat', ['l1', 'l2']),
  S('saad-zaghloul', 'سعد زغلول', 'Saad Zaghloul', ['l1']),
  S('sayeda-zeinab', 'السيدة زينب', 'Al-Sayeda Zeinab', ['l1']),
  S('malek-saleh', 'الملك الصالح', 'El-Malek El-Saleh', ['l1']),
  S('mar-girgis', 'مار جرجس', 'Mar Girgis', ['l1']),
  S('el-zahraa', 'الزهراء', 'El Zahraa', ['l1']),
  S('dar-el-salam', 'دار السلام', 'Dar El Salam', ['l1']),
  S('hadayek-el-maadi', 'حدائق المعادي', 'Hadayek El Maadi', ['l1']),
  S('maadi', 'المعادي', 'Maadi', ['l1']),
  S('sakanat-el-maadi', 'سكنات المعادي', 'Sakanat El Maadi', ['l1']),
  S('tora-el-balad', 'طرة البلد', 'Tora El Balad', ['l1']),
  S('kozzika', 'كوتسيكا', 'Kozzika', ['l1']),
  S('tura-el-esmant', 'طرة الأسمنت', 'Tura El Esmant', ['l1']),
  S('elmasraa', 'المعصرة', 'Elmasraa', ['l1']),
  S('hadayek-helwan', 'حدائق حلوان', 'Hadayek Helwan', ['l1']),
  S('wadi-hof', 'وادي حوف', 'Wadi Hof', ['l1']),
  S('helwan-uni', 'جامعة حلوان', 'Helwan University', ['l1']),
  S('ain-helwan', 'عين حلوان', 'Ain Helwan', ['l1']),
  S('helwan', 'حلوان', 'Helwan', ['l1']),

  // ---- Line 2 (20) ----
  S('shubra-kheima', 'شبرا الخيمة', 'Shubra Al Khaimah', ['l2']),
  S('koliet-el-zeraa', 'كلية الزراعة', 'Koliet El Zeraa', ['l2']),
  S('mezallat', 'المزاللت', 'Mezallat', ['l2']),
  S('khalafawy', 'خلافوي', 'Khalafawy', ['l2']),
  S('st-teresa', 'سانت تريزا', 'St. Teresa', ['l2']),
  S('rod-el-farag', 'روضة الفرج', 'Rod El-Farag', ['l2']),
  S('masarra', 'المسرة', 'Masarra', ['l2']),
  // shohadaa / attaba / mohamed-naguib / sadat appear above or below in order
  S('attaba', 'العتبة', 'Attaba', ['l2', 'l3']),
  S('mohamed-naguib', 'محمد نجيب', 'Mohamed Naguib', ['l2']),
  S('opera', 'الأوبرا', 'Opera', ['l2']),
  S('dokki', 'الدقي', 'Dokki', ['l2']),
  S('el-bohoth', 'البحوث', 'El Bohoth', ['l2']),
  S('cairo-uni', 'جامعة القاهرة', 'Cairo University', ['l2', 'l3']),
  S('faisal', 'فيصل', 'Faisal', ['l2']),
  S('giza', 'الجيزة', 'Giza', ['l2']),
  S('omm-el-masryeen', 'أم المصريين', 'Omm El Masryeen', ['l2']),
  S('sakiat-mekky', 'ساقية مكي', 'Sakiat Mekky', ['l2']),
  S('el-mounib', 'المنيب', 'El Mounib', ['l2']),

  // ---- Line 3 (main + 2 branches) ----
  S('adly-mansour', 'عدلي منصور', 'Adly Mansour', ['l3']),
  S('el-haykestep', 'الهايكستب', 'El Haykestep', ['l3']),
  S('omar-ibn-el-khattab', 'عمر بن الخطاب', 'Omar Ibn El Khattab', ['l3']),
  S('qubaa', 'قباء', 'Qubaa', ['l3']),
  S('hesham-barakat', 'هشام بركات', 'Hesham Barakat', ['l3']),
  S('el-nozha', 'النزهة', 'El Nozha', ['l3']),
  S('el-shams-club', 'نادي الشمس', 'El Shams Club', ['l3']),
  S('alf-masken', 'ألف مسكن', 'Alf Masken', ['l3']),
  S('heliopolis', 'هليوبوليس', 'Heliopolis', ['l3']),
  S('haroun', 'هارون', 'Haroun', ['l3']),
  S('al-ahram', 'الأهرام', 'Al-Ahram', ['l3']),
  S('koleyet-el-banat', 'كلية البنات', 'Koleyet El Banat', ['l3']),
  S('stadium', 'الاستاد', 'Stadium', ['l3']),
  S('fair-zone', 'أرض المعارض', 'Fair Zone', ['l3']),
  S('abbassiya', 'العباسية', 'Abbassiya', ['l3']),
  S('abdou-pasha', 'عبده باشا', 'Abdou Pasha', ['l3']),
  S('el-geish', 'الجيش', 'El-Geish', ['l3']),
  S('bab-el-shaariya', 'باب الشعرية', 'Bab El Shaariya', ['l3']),
  S('maspero', 'ماسبيرو', 'Maspero', ['l3']),
  S('safaa-hegazy', 'صفاء حجازي', 'Safaa Hegazy', ['l3']),
  S('kit-kat', 'الكيت كات', 'Kit-Kat', ['l3']),
  S('sudan', 'السودان', 'Sudan', ['l3']),
  S('imbaba', 'إمبابة', 'Imbaba', ['l3']),
  S('el-bohy', 'البوهي', 'El Bohy', ['l3']),
  S('el-qawmia', 'القومية', 'El Qawmia', ['l3']),
  S('ring-road', 'الطريق الدائري', 'Ring Road', ['l3']),
  S('rod-el-farag-corridor', 'محور روض الفرج', 'Rod El Farag Corridor', ['l3']),
  S('tawfikia', 'التوفيقية', 'Tawfikia', ['l3']),
  S('wadi-el-nile', 'وادي النيل', 'Wadi El Nile', ['l3']),
  S('gamat-el-dowal', 'جامعة الدول العربية', 'Gamat El Dowal', ['l3']),
  S('boulak-el-dakrour', 'بولاق الدكرور', 'Boulak El Dakrour', ['l3']),
];

const stationMap = new Map(METRO_STATIONS.map((s) => [s.id, s]));
export const getStation = (id: string): MetroStation | undefined => stationMap.get(id);

/** Search by Arabic or English name (used by the selectors). */
export function searchStations(query: string): MetroStation[] {
  const q = query.trim().toLowerCase();
  if (!q) return METRO_STATIONS;
  return METRO_STATIONS.filter(
    (s) => s.ar.includes(q.trim()) || s.en.toLowerCase().includes(q),
  );
}

/** Find a station by any of its names (HomePage hero form passes Arabic names). */
export const findStationByName = (name: string): MetroStation | undefined => {
  const q = name.trim();
  if (!q) return undefined;
  return (
    METRO_STATIONS.find((s) => s.ar === q || s.en.toLowerCase() === q.toLowerCase()) ??
    // lenient match: "السادات" → "أنور السادات"
    METRO_STATIONS.find((s) => s.ar.includes(q) || q.includes(s.ar))
  );
};

export const interchangeStations = (): MetroStation[] => METRO_STATIONS.filter((s) => s.lines.length > 1);

// ------------------------------------------------------------------
// Upcoming / planned lines — greyed-out toggleable layers (not routable)
// ------------------------------------------------------------------
export interface UpcomingLine {
  number: number;
  ar: string;
  color: string;
  status: string;
  stations: Array<{ ar: string; en: string }>;
}

export const UPCOMING_LINES: UpcomingLine[] = [
  {
    number: 4,
    ar: 'الخط الرابع',
    color: '#F2C700',
    status: 'قيد التنفيذ',
    stations: [
      { ar: 'حدائق الأشجار', en: 'Hadayek El Ashgar' },
      { ar: 'حدائق الأهرام', en: 'Ahram Gardens' },
      { ar: 'النصر', en: 'El Nasr' },
      { ar: 'المتحف المصري الكبير', en: 'Grand Egyptian Museum' },
      { ar: 'ميدان الرماية', en: 'Remaya Square' },
      { ar: 'الهرم', en: 'Pyramids' },
      { ar: 'المريوطية', en: 'Maryoteya' },
      { ar: 'العريش', en: 'Arish' },
      { ar: 'المطبعة', en: 'El Matbaa' },
      { ar: 'الطالبية', en: 'Talbeya' },
      { ar: 'مدكور', en: 'Madkour' },
      { ar: 'المساحة', en: 'El Mesaha' },
      { ar: 'الجيزة', en: 'Giza' },
      { ar: 'ميدان الجيزة', en: 'Giza Square' },
      { ar: 'جزيرة المنيل', en: 'Manyal' },
      { ar: 'الملك الصالح', en: 'El-Malek El-Saleh' },
      { ar: 'الفسطاط', en: 'El Fustat' },
    ],
  },
  {
    number: 6,
    ar: 'الخط السادس',
    color: '#8E4A9E',
    status: 'قيد التخطيط',
    stations: [{ ar: 'لم تُعلن المحطات بعد', en: 'Stations not announced yet' }],
  },
];

// ------------------------------------------------------------------
// Ticket price tiers (by number of stations travelled) — update here only.
// ------------------------------------------------------------------
export interface TicketTier {
  label: string;
  price: number; // EGP
}

export const TICKET_TIERS: Array<{ maxStops: number } & TicketTier> = [
  { maxStops: 9, price: 15, label: 'من 1 إلى 9 محطات' },
  { maxStops: 16, price: 20, label: 'من 10 إلى 16 محطة' },
  { maxStops: 23, price: 25, label: 'من 17 إلى 23 محطة' },
  { maxStops: Infinity, price: 30, label: '24 محطة فأكثر' },
];

export const ticketForStops = (stops: number): TicketTier =>
  TICKET_TIERS.find((t) => stops <= t.maxStops) ?? TICKET_TIERS[TICKET_TIERS.length - 1];
