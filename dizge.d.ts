export type Row = Record<string, unknown>;
export interface Summary { count: number; missing: number; sum: number; mean: number | null; min: number | null; max: number | null; variance: number | null; std: number | null; sampleVariance: number | null; }
export type Reducers<T extends Row> = Record<string, (table: Table<T>) => unknown>;
export class Table<T extends Row = Row> {
  constructor(rows: T[]);
  readonly length: number;
  toArray(): T[];
  columns(): string[];
  column<K extends keyof T>(key: K): T[K][];
  column<V>(key: (row: T) => V): V[];
  filter(fn: (row: T, index: number) => boolean): Table<T>;
  select<K extends keyof T & string>(...keys: K[]): Table<Pick<T, K>>;
  derive<D extends Record<string, (row: T, index: number) => unknown>>(definitions: D): Table<T & { [K in keyof D]: ReturnType<D[K]> }>;
  sort(key: keyof T & string | ((row: T) => unknown), direction?: 'asc' | 'desc'): Table<T>;
  slice(start?: number, end?: number): Table<T>;
  page(number?: number, size?: number): Table<T>;
  unique(key: keyof T & string | ((row: T) => unknown)): Table<T>;
  groupBy(...keys: (keyof T & string)[]): { aggregate(reducers: Reducers<T>): Table; entries(): { keys: Row; table: Table<T> }[] };
  aggregate(reducers: Reducers<T>): Row;
  describe(...keys: (keyof T & string)[]): Record<string, Summary>;
  join(other: Table | Row[], options: { left: string; right?: string; how?: 'inner' | 'left'; suffix?: string; maxRows?: number }): Table;
}
export function data<T extends Row>(rows: T[]): Table<T>;
export const version: string;
export const stats: {
  summary(values: Iterable<unknown>): Summary;
  quantile(values: Iterable<unknown>, p?: number): number | null;
  median(values: Iterable<unknown>): number | null;
  histogram(values: Iterable<unknown>, bins?: number): { min: number; max: number; count: number }[];
  regression(xs: ArrayLike<unknown>, ys: ArrayLike<unknown>): { count: number; slope: number | null; intercept: number | null; r: number | null; r2: number | null };
  correlation(xs: ArrayLike<unknown>, ys: ArrayLike<unknown>): number | null;
};
export const csv: {
  parse(text: string, options?: { delimiter?: string; header?: true; maxRows?: number }): Record<string, string>[];
  parse(text: string, options: { delimiter?: string; header: false; maxRows?: number }): string[][];
  stringify(rows: Row[], options?: { columns?: string[]; delimiter?: string; safe?: boolean }): string;
};
export type Binary = Blob | ArrayBuffer | ArrayBufferView;
export function configure(adapters: Partial<Record<'xlsx' | 'pdf' | 'pdfjs' | 'fontkit', unknown>>): void;
export const xlsx: {
  read(input: Binary, options?: { sheet?: string; maxBytes?: number; maxRows?: number; signal?: AbortSignal }): Promise<{ sheets: string[]; sheet: string; rows: Row[] }>;
  write(sheets: Record<string, Row[]>): Promise<Uint8Array>;
};
export const pdf: {
  text(input: Binary, options?: { maxBytes?: number; maxPages?: number; signal?: AbortSignal; password?: string }): Promise<{ pages: string[]; text: string }>;
  report(options?: { title?: string; lines?: string[]; rows?: Row[]; columns?: string[]; fontBytes?: Binary; fontSize?: number; margin?: number }): Promise<Uint8Array>;
  merge(inputs: Binary[], options?: { maxBytes?: number }): Promise<Uint8Array>;
};
export function download(content: BlobPart, filename: string, type?: string): void;
export interface Store<T> { get(): T; set(value: T | ((previous: T) => T)): void; subscribe(fn: (value: T) => void, immediate?: boolean): () => boolean; destroy(): void; }
export function store<T>(initial: T): Store<T>;
export function debounce<A extends unknown[]>(fn: (...args: A) => void, delay?: number): ((...args: A) => void) & { cancel(): void };
export function chunks<T, U>(items: T[], fn: (item: T, index: number) => U, options?: { size?: number; signal?: AbortSignal; onProgress?: (fraction: number) => void }): Promise<U[]>;
export type Operation = { type: 'sort'; key: string; direction?: 'asc' | 'desc' } | { type: 'select'; keys: string[] } | { type: 'slice'; start?: number; end?: number } | { type: 'filter'; key: string; operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains'; value: unknown } | { type: 'describe'; keys?: string[] };
export function analyze(rows: Row[], operations: Operation[]): Row[] | Record<string, Summary>;
export function analyzeAsync(rows: Row[], operations: Operation[], options: { workerUrl: string | URL; signal?: AbortSignal }): Promise<Row[] | Record<string, Summary>>;
export type Child = Node | string | number | boolean | null | undefined | Child[];
export type Props = Record<string, unknown> & { on?: Record<string, EventListener>; style?: Record<string, string> };
export interface Component { el: HTMLElement; destroy(): void; }
export interface Column { key: string; label?: string; sortable?: boolean; format?: (value: unknown, row: Row) => Child; }
export interface FormField { name: string; label?: string; type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'url' | 'tel'; value?: string | number; required?: boolean; min?: number; max?: number; step?: number | 'any'; options?: string[]; validate?: (value: string | number | null) => string | undefined; }
export const ui: {
  el(tag: string, props?: Props, ...children: Child[]): HTMLElement;
  button(label: string, onClick: EventListener, props?: Props): HTMLButtonElement;
  card(title: string | null, ...children: Child[]): HTMLElement;
  metric(label: string, value: Child, note?: string): HTMLElement;
  table(options?: { rows?: Row[]; columns?: Column[]; pageSize?: number; searchable?: boolean; label?: string }): Component & { setRows(rows: Row[]): void };
  chart(options?: { values?: number[]; labels?: string[]; type?: 'bar' | 'line'; label?: string; maxPoints?: number }): SVGSVGElement;
  form(options: { fields: FormField[]; onSubmit: (values: Row) => unknown | Promise<unknown>; submitLabel?: string }): Component;
  tabs(items: { label: string; content: Child }[]): HTMLElement;
  modal(options: { title: string; content: Child; parent?: HTMLElement }): { el: HTMLDialogElement; close(): void };
  toast(message: string, options?: { parent?: HTMLElement; duration?: number }): () => void;
  app(target: string | HTMLElement, options?: { title?: string; subtitle?: string; theme?: 'light' | 'dark'; actions?: Child[]; content?: Child[]; nonce?: string }): Component & { theme(value: 'light' | 'dark'): void; use(component: Component | HTMLElement): HTMLElement };
  installStyles(options?: { nonce?: string }): void;
  grid(...children: Child[]): HTMLElement;
  stack(...children: Child[]): HTMLElement;
};
export const styles: string;
export const format: {
  number(n: number, options?: Intl.NumberFormatOptions, locale?: string): string;
  currency(n: number, currency?: string, locale?: string): string;
  date(value: string | number | Date, options?: Intl.DateTimeFormatOptions, locale?: string): string;
};
declare const Dizge: { version: typeof version; Table: typeof Table; data: typeof data; stats: typeof stats; csv: typeof csv; configure: typeof configure; xlsx: typeof xlsx; pdf: typeof pdf; download: typeof download; store: typeof store; debounce: typeof debounce; chunks: typeof chunks; analyze: typeof analyze; analyzeAsync: typeof analyzeAsync; ui: typeof ui; format: typeof format; styles: typeof styles };
export default Dizge;
export as namespace Dizge;
