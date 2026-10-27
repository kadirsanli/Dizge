// Dizge.js 0.2.0 — Türkçe API birincil, İngilizce adlar alias.
export type Row = Record<string, unknown>;
export interface Summary {
  count: number; missing: number; sum: number; mean: number | null; min: number | null; max: number | null; variance: number | null; std: number | null; sampleVariance: number | null;
  sayı: number; eksik: number; toplam: number; ortalama: number | null; enKüçük: number | null; enBüyük: number | null; varyans: number | null; standartSapma: number | null; örnekVaryans: number | null;
}
export interface HistogramKutusu { min: number; max: number; count: number; enAz: number; enÇok: number; sayı: number; }
export interface Regresyon { count: number; slope: number | null; intercept: number | null; r: number | null; r2: number | null; sayı: number; eğim: number | null; kesişim: number | null; }
export type Reducers<T extends Row> = Record<string, (table: Table<T>) => unknown>;
export type Yön = 'asc' | 'desc';
export class Table<T extends Row = Row> {
  constructor(rows: T[]);
  readonly length: number;
  readonly uzunluk: number;
  toArray(): T[];
  diziye(): T[];
  columns(): string[];
  sütunlar(): string[];
  column<K extends keyof T>(key: K): T[K][];
  column<V>(key: (row: T) => V): V[];
  sütun<K extends keyof T>(key: K): T[K][];
  sütun<V>(key: (row: T) => V): V[];
  filter(fn: (row: T, index: number) => boolean): Table<T>;
  süz(fn: (row: T, index: number) => boolean): Table<T>;
  select<K extends keyof T & string>(...keys: K[]): Table<Pick<T, K>>;
  seç<K extends keyof T & string>(...keys: K[]): Table<Pick<T, K>>;
  derive<D extends Record<string, (row: T, index: number) => unknown>>(definitions: D): Table<T & { [K in keyof D]: ReturnType<D[K]> }>;
  türet<D extends Record<string, (row: T, index: number) => unknown>>(definitions: D): Table<T & { [K in keyof D]: ReturnType<D[K]> }>;
  sort(key: keyof T & string | ((row: T) => unknown), direction?: Yön): Table<T>;
  sırala(key: keyof T & string | ((row: T) => unknown), yön?: Yön): Table<T>;
  slice(start?: number, end?: number): Table<T>;
  dilimle(baş?: number, son?: number): Table<T>;
  page(number?: number, size?: number): Table<T>;
  sayfala(sayı?: number, boy?: number): Table<T>;
  unique(key: keyof T & string | ((row: T) => unknown)): Table<T>;
  tekil(key: keyof T & string | ((row: T) => unknown)): Table<T>;
  groupBy(...keys: (keyof T & string)[]): {
    aggregate(reducers: Reducers<T>): Table; entries(): { keys: Row; table: Table<T>; anahtarlar: Row; tablo: Table<T> }[];
    özetle(reducers: Reducers<T>): Table; girdiler(): { anahtarlar: Row; tablo: Table<T>; keys: Row; table: Table<T> }[];
  };
  grupla(...keys: (keyof T & string)[]): {
    aggregate(reducers: Reducers<T>): Table; entries(): { keys: Row; table: Table<T>; anahtarlar: Row; tablo: Table<T> }[];
    özetle(reducers: Reducers<T>): Table; girdiler(): { anahtarlar: Row; tablo: Table<T>; keys: Row; table: Table<T> }[];
  };
  aggregate(reducers: Reducers<T>): Row;
  özetle(reducers: Reducers<T>): Row;
  describe(...keys: (keyof T & string)[]): Record<string, Summary>;
  betimle(...keys: (keyof T & string)[]): Record<string, Summary>;
  join(other: Table | Row[], options: BirleştirmeSeçenekleri): Table;
  birleştir(other: Table | Row[], options?: BirleştirmeSeçenekleri): Table;
}
export interface BirleştirmeSeçenekleri {
  left?: string; right?: string; how?: 'inner' | 'left'; suffix?: string; maxRows?: number;
  sol?: string; sağ?: string; tür?: 'inner' | 'left'; sonEk?: string; enÇokSatır?: number;
}
export { Table as Tablo };
export function data<T extends Row>(rows: T[]): Table<T>;
export function veri<T extends Row>(rows: T[]): Table<T>;
export const version: string;
export const sürüm: string;
export const stats: {
  summary(values: Iterable<unknown>): Summary;
  quantile(values: Iterable<unknown>, p?: number): number | null;
  median(values: Iterable<unknown>): number | null;
  histogram(values: Iterable<unknown>, bins?: number): HistogramKutusu[];
  regression(xs: ArrayLike<unknown>, ys: ArrayLike<unknown>): Regresyon;
  correlation(xs: ArrayLike<unknown>, ys: ArrayLike<unknown>): number | null;
  özet(values: Iterable<unknown>): Summary;
  yüzdelik(values: Iterable<unknown>, p?: number): number | null;
  ortanca(values: Iterable<unknown>): number | null;
  histogram(values: Iterable<unknown>, kutu?: number): HistogramKutusu[];
  regresyon(xs: ArrayLike<unknown>, ys: ArrayLike<unknown>): Regresyon;
  korelasyon(xs: ArrayLike<unknown>, ys: ArrayLike<unknown>): number | null;
};
export const istatistik: typeof stats;
export interface CsvSeçenekleri {
  delimiter?: string; header?: boolean; maxRows?: number;
  ayırıcı?: string; başlık?: boolean; enÇokSatır?: number;
}
export const csv: {
  parse(text: string, options?: CsvSeçenekleri & { header?: true; başlık?: true }): Record<string, string>[];
  parse(text: string, options: CsvSeçenekleri & { header: false }): string[][];
  parse(text: string, options: CsvSeçenekleri & { başlık: false }): string[][];
  stringify(rows: Row[], options?: { columns?: string[]; delimiter?: string; safe?: boolean; sütunlar?: string[]; ayırıcı?: string; güvenli?: boolean }): string;
  çöz(text: string, options?: CsvSeçenekleri & { header?: true; başlık?: true }): Record<string, string>[];
  çöz(text: string, options: CsvSeçenekleri & { header: false }): string[][];
  çöz(text: string, options: CsvSeçenekleri & { başlık: false }): string[][];
  yaz(rows: Row[], options?: { columns?: string[]; delimiter?: string; safe?: boolean; sütunlar?: string[]; ayırıcı?: string; güvenli?: boolean }): string;
};
export type Binary = Blob | ArrayBuffer | ArrayBufferView;
export function configure(adapters: Partial<Record<'xlsx' | 'pdf' | 'pdfjs' | 'fontkit', unknown>>): void;
export function yapılandır(adapters: Partial<Record<'xlsx' | 'pdf' | 'pdfjs' | 'fontkit', unknown>>): void;
export interface XlsxOkuma { sheets: string[]; sheet: string; rows: Row[]; sayfalar: string[]; sayfa: string; satırlar: Row[]; }
export const xlsx: {
  read(input: Binary, options?: { sheet?: string; maxBytes?: number; maxRows?: number; signal?: AbortSignal; sayfa?: string; enÇokBayt?: number; enÇokSatır?: number; sinyal?: AbortSignal }): Promise<XlsxOkuma>;
  write(sheets: Record<string, Row[]>): Promise<Uint8Array>;
  oku(input: Binary, options?: { sheet?: string; maxBytes?: number; maxRows?: number; signal?: AbortSignal; sayfa?: string; enÇokBayt?: number; enÇokSatır?: number; sinyal?: AbortSignal }): Promise<XlsxOkuma>;
  yaz(sheets: Record<string, Row[]>): Promise<Uint8Array>;
};
export interface PdfMetni { pages: string[]; text: string; sayfalar: string[]; metin: string; }
export const pdf: {
  text(input: Binary, options?: { maxBytes?: number; maxPages?: number; signal?: AbortSignal; password?: string; enÇokBayt?: number; enÇokSayfa?: number; sinyal?: AbortSignal; parola?: string }): Promise<PdfMetni>;
  report(options?: RaporSeçenekleri): Promise<Uint8Array>;
  merge(inputs: Binary[], options?: { maxBytes?: number; enÇokBayt?: number }): Promise<Uint8Array>;
  metin(input: Binary, options?: { maxBytes?: number; maxPages?: number; signal?: AbortSignal; password?: string; enÇokBayt?: number; enÇokSayfa?: number; sinyal?: AbortSignal; parola?: string }): Promise<PdfMetni>;
  rapor(options?: RaporSeçenekleri): Promise<Uint8Array>;
  birleştir(inputs: Binary[], options?: { maxBytes?: number; enÇokBayt?: number }): Promise<Uint8Array>;
};
export interface RaporSeçenekleri {
  title?: string; lines?: string[]; rows?: Row[]; columns?: string[]; fontBytes?: Binary; fontSize?: number; margin?: number;
  başlık?: string; satırlar?: string[]; veriSatırları?: Row[]; sütunlar?: string[]; yazıTipiBaytları?: Binary; yazıBoyu?: number; kenarBoşluğu?: number;
}
export function download(content: BlobPart, filename: string, type?: string): void;
export function indir(content: BlobPart, filename: string, type?: string): void;
export interface Store<T> { get(): T; set(value: T | ((previous: T) => T)): void; subscribe(fn: (value: T) => void, immediate?: boolean): () => boolean; destroy(): void; al(): T; ayarla(value: T | ((previous: T) => T)): void; aboneOl(fn: (value: T) => void, hemen?: boolean): () => boolean; yokEt(): void; }
export function store<T>(initial: T): Store<T>;
export function depo<T>(initial: T): Store<T>;
export function debounce<A extends unknown[]>(fn: (...args: A) => void, delay?: number): ((...args: A) => void) & { cancel(): void; iptal(): void };
export function geciktir<A extends unknown[]>(fn: (...args: A) => void, delay?: number): ((...args: A) => void) & { cancel(): void; iptal(): void };
export function chunks<T, U>(items: T[], fn: (item: T, index: number) => U, options?: { size?: number; signal?: AbortSignal; onProgress?: (fraction: number) => void; boyut?: number; sinyal?: AbortSignal; ilerleme?: (fraction: number) => void }): Promise<U[]>;
export function parçala<T, U>(items: T[], fn: (item: T, index: number) => U, options?: { size?: number; signal?: AbortSignal; onProgress?: (fraction: number) => void; boyut?: number; sinyal?: AbortSignal; ilerleme?: (fraction: number) => void }): Promise<U[]>;
export type Operation = { type: 'sort'; key: string; direction?: Yön } | { tür: 'sırala'; anahtar: string; yön?: Yön } | { type: 'select'; keys: string[] } | { tür: 'seç'; anahtarlar: string[] } | { type: 'slice'; start?: number; end?: number } | { tür: 'dilimle'; baş?: number; son?: number } | { type: 'filter'; key: string; operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains'; value: unknown } | { tür: 'süz'; anahtar: string; işleç: 'eşit' | 'büyük' | 'büyükEşit' | 'küçük' | 'küçükEşit' | 'içerir'; değer: unknown } | { type: 'describe'; keys?: string[] } | { tür: 'betimle'; anahtarlar?: string[] };
export function analyze(rows: Row[], operations: Operation[]): Row[] | Record<string, Summary>;
export function analizEt(rows: Row[], operations: Operation[]): Row[] | Record<string, Summary>;
export function analyzeAsync(rows: Row[], operations: Operation[], options: { workerUrl: string | URL; signal?: AbortSignal; işçiAdresi?: string | URL; sinyal?: AbortSignal }): Promise<Row[] | Record<string, Summary>>;
export function eşzamansızAnalizEt(rows: Row[], operations: Operation[], options: { workerUrl?: string | URL; signal?: AbortSignal; işçiAdresi?: string | URL; sinyal?: AbortSignal }): Promise<Row[] | Record<string, Summary>>;
export type Child = Node | string | number | boolean | null | undefined | Child[];
export interface Props extends Record<string, unknown> { on?: Record<string, EventListener>; style?: Record<string, string>; }
export interface Component { el: HTMLElement; destroy(): void; yokEt?(): void; }
export interface Column {
  key?: string; label?: string; sortable?: boolean; format?: (value: unknown, row: Row) => Child;
  anahtar?: string; etiket?: string; sıralanabilir?: boolean; biçimle?: (value: unknown, row: Row) => Child;
}
export interface TableOptions {
  rows?: Row[]; columns?: Column[]; pageSize?: number; searchable?: boolean; label?: string; locale?: string;
  satırlar?: Row[]; sütunlar?: Column[]; sayfaBoyu?: number; aranabilir?: boolean; etiket?: string; yerel?: string;
}
export interface ChartOptions {
  values?: number[]; labels?: string[]; type?: 'bar' | 'line'; label?: string; maxPoints?: number;
  değerler?: number[]; etiketler?: string[]; tür?: 'bar' | 'line'; etiket?: string; enÇokNokta?: number;
}
export interface FormField {
  name?: string; label?: string; type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'url' | 'tel'; value?: string | number; required?: boolean; min?: number; max?: number; step?: number | 'any'; options?: string[]; validate?: (value: string | number | null) => string | undefined;
  ad?: string; etiket?: string; tür?: 'text' | 'number' | 'email' | 'password' | 'date' | 'url' | 'tel'; değer?: string | number; zorunlu?: boolean; enAz?: number; enÇok?: number; adım?: number | 'any'; seçenekler?: string[]; doğrula?: (value: string | number | null) => string | undefined;
}
export interface FormOptions {
  fields?: FormField[]; onSubmit?: (values: Row) => unknown | Promise<unknown>; submitLabel?: string;
  alanlar?: FormField[]; gönder?: (values: Row) => unknown | Promise<unknown>; düğmeMetni?: string;
}
export interface TabItem { label?: string; content?: Child; etiket?: string; içerik?: Child; }
export interface ModalOptions { title?: string; content?: Child; parent?: HTMLElement; başlık?: string; içerik?: Child; üst?: HTMLElement; }
export interface ToastOptions { parent?: HTMLElement; duration?: number; üst?: HTMLElement; süre?: number; }
export interface AppOptions {
  title?: string; subtitle?: string; theme?: 'light' | 'dark'; actions?: Child[]; content?: Child[]; nonce?: string;
  başlık?: string; altBaşlık?: string; tema?: 'light' | 'dark'; eylemler?: Child[]; içerik?: Child[];
}
export const ui: {
  el(tag: string, props?: Props, ...children: Child[]): HTMLElement;
  öğe(tag: string, props?: Props, ...children: Child[]): HTMLElement;
  button(label: string, onClick: EventListener, props?: Props): HTMLButtonElement;
  düğme(label: string, onClick: EventListener, props?: Props): HTMLButtonElement;
  card(title: string | null, ...children: Child[]): HTMLElement;
  kart(title: string | null, ...children: Child[]): HTMLElement;
  metric(label: string, value: Child, note?: string): HTMLElement;
  ölçüt(label: string, value: Child, note?: string): HTMLElement;
  table(options?: TableOptions): Component & { setRows(rows: Row[]): void; satırlarıAyarla(rows: Row[]): void };
  tablo(options?: TableOptions): Component & { setRows(rows: Row[]): void; satırlarıAyarla(rows: Row[]): void };
  chart(options?: ChartOptions): SVGSVGElement;
  grafik(options?: ChartOptions): SVGSVGElement;
  form(options: FormOptions): Component;
  tabs(items: TabItem[]): HTMLElement;
  sekmeler(items: TabItem[]): HTMLElement;
  modal(options: ModalOptions): { el: HTMLDialogElement; close(): void; kapat(): void };
  pencere(options: ModalOptions): { el: HTMLDialogElement; close(): void; kapat(): void };
  toast(message: string, options?: ToastOptions): () => void;
  bildirim(message: string, options?: ToastOptions): () => void;
  app(target: string | HTMLElement, options?: AppOptions): Component & { theme(value: 'light' | 'dark'): void; use(component: Component | HTMLElement): HTMLElement; tema(value: 'light' | 'dark'): void; kullan(component: Component | HTMLElement): HTMLElement };
  uygulama(target: string | HTMLElement, options?: AppOptions): Component & { theme(value: 'light' | 'dark'): void; use(component: Component | HTMLElement): HTMLElement; tema(value: 'light' | 'dark'): void; kullan(component: Component | HTMLElement): HTMLElement };
  installStyles(options?: { nonce?: string }): void;
  stilleriKur(options?: { nonce?: string }): void;
  grid(...children: Child[]): HTMLElement;
  ızgara(...children: Child[]): HTMLElement;
  stack(...children: Child[]): HTMLElement;
  yığın(...children: Child[]): HTMLElement;
};
export const arayüz: typeof ui;
export const styles: string;
export const stiller: string;
export const format: {
  number(n: number, options?: Intl.NumberFormatOptions, locale?: string): string;
  currency(n: number, currency?: string, locale?: string): string;
  date(value: string | number | Date, options?: Intl.DateTimeFormatOptions, locale?: string): string;
  sayı(n: number, options?: Intl.NumberFormatOptions, yerel?: string): string;
  para(n: number, currency?: string, yerel?: string): string;
  tarih(value: string | number | Date, options?: Intl.DateTimeFormatOptions, yerel?: string): string;
};
export const biçim: typeof format;
declare const Dizge: {
  sürüm: typeof version; version: typeof version;
  veri: typeof data; data: typeof data;
  Tablo: typeof Table; Table: typeof Table;
  istatistik: typeof stats; stats: typeof stats;
  csv: typeof csv;
  yapılandır: typeof configure; configure: typeof configure;
  xlsx: typeof xlsx; pdf: typeof pdf;
  indir: typeof download; download: typeof download;
  depo: typeof store; store: typeof store;
  geciktir: typeof debounce; debounce: typeof debounce;
  parçala: typeof chunks; chunks: typeof chunks;
  analizEt: typeof analyze; analyze: typeof analyze;
  eşzamansızAnalizEt: typeof analyzeAsync; analyzeAsync: typeof analyzeAsync;
  arayüz: typeof ui; ui: typeof ui;
  biçim: typeof format; format: typeof format;
  stiller: typeof styles; styles: typeof styles;
};
export default Dizge;
export as namespace Dizge;
