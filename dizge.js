/* Dizge.js 0.1.0 | MIT | https://github.com/kadirsanli/Dizge */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Dizge = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const version = '0.1.0';
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const record = entries => Object.fromEntries(entries);
  const finite = x => typeof x === 'number' && Number.isFinite(x);
  const integer = (n, min = 1) => { if (!Number.isSafeInteger(n) || n < min) throw new RangeError('Expected integer >= ' + min); return n; };
  const field = key => typeof key === 'function' ? key : row => own(row, key) ? row[key] : undefined;
  const abort = signal => { if (signal?.aborted) throw signal.reason || new DOMException('Aborted', 'AbortError'); };

  // Welford: stable, one-pass variance. Missing / non-finite values are excluded.
  function summary(values) {
    let count = 0, missing = 0, mean = 0, m2 = 0, sum = 0, compensation = 0, min = Infinity, max = -Infinity;
    for (const x of values) {
      if (!finite(x)) { missing++; continue; }
      count++; const delta = x - mean; mean += delta / count; m2 += delta * (x - mean);
      const y = x - compensation, t = sum + y; compensation = (t - sum) - y; sum = t;
      min = Math.min(min, x); max = Math.max(max, x);
    }
    return { count, missing, sum, mean: count ? mean : null, min: count ? min : null, max: count ? max : null,
      variance: count ? Math.max(0, m2 / count) : null, std: count ? Math.sqrt(Math.max(0, m2 / count)) : null,
      sampleVariance: count > 1 ? Math.max(0, m2 / (count - 1)) : null };
  }
  function quantile(values, p = .5) {
    if (!finite(p) || p < 0 || p > 1) throw new RangeError('p must be in [0, 1]');
    const a = Array.from(values).filter(finite).sort((a, b) => a - b);
    if (!a.length) return null;
    const i = (a.length - 1) * p, lo = Math.floor(i); return a[lo] + (a[Math.ceil(i)] - a[lo]) * (i - lo);
  }
  function regression(xs, ys) {
    if (xs.length !== ys.length) throw new RangeError('Equal-length inputs required');
    let count = 0, mx = 0, my = 0, xx = 0, yy = 0, xy = 0;
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i], y = ys[i]; if (!finite(x) || !finite(y)) continue;
      count++; const dx = x - mx, dy = y - my; mx += dx / count; my += dy / count;
      xx += dx * (x - mx); yy += dy * (y - my); xy += dx * (y - my);
    }
    const slope = count > 1 && xx > 0 ? xy / xx : null;
    const r = xx > 0 && yy > 0 ? Math.max(-1, Math.min(1, xy / Math.sqrt(xx * yy))) : null;
    return { count, slope, intercept: slope === null ? null : my - slope * mx, r, r2: r === null ? null : r * r };
  }
  function histogram(values, bins = 10) {
    integer(bins); if (bins > 10000) throw new RangeError('At most 10000 bins');
    const a = Array.from(values).filter(finite), s = summary(a); if (!s.count) return [];
    const width = s.max === s.min ? 1 : (s.max - s.min) / bins;
    const result = Array.from({ length: s.max === s.min ? 1 : bins }, (_, i) => ({ min: s.min + i * width, max: s.min + (i + 1) * width, count: 0 }));
    for (const x of a) result[Math.min(result.length - 1, Math.floor((x - s.min) / width))].count++;
    return result;
  }
  function compare(a, b) {
    if (Object.is(a, b)) return 0;
    if (a == null || (typeof a === 'number' && !finite(a))) return 1;
    if (b == null || (typeof b === 'number' && !finite(b))) return -1;
    return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
  }
  class Table {
    constructor(rows) {
      if (!Array.isArray(rows) || rows.some(r => !r || typeof r !== 'object' || Array.isArray(r))) throw new TypeError('Expected array of records');
      this._rows = rows.slice();
    }
    get length() { return this._rows.length; }
    toArray() { return this._rows.slice(); }
    columns() { return [...new Set(this._rows.flatMap(Object.keys))]; }
    column(key) { return this._rows.map(field(key)); }
    filter(fn) { return new Table(this._rows.filter(fn)); }
    select(...keys) { return new Table(this._rows.map(row => record(keys.map(k => [k, field(k)(row)])))); }
    derive(definitions) { return new Table(this._rows.map((row, i) => ({ ...row, ...record(Object.entries(definitions).map(([k, fn]) => [k, fn(row, i)])) }))); }
    sort(key, direction = 'asc') {
      if (!['asc', 'desc'].includes(direction)) throw new TypeError('direction: asc | desc');
      const get = field(key), sign = direction === 'asc' ? 1 : -1;
      return new Table(this._rows.slice().sort((a, b) => sign * compare(get(a), get(b))));
    }
    slice(start, end) { return new Table(this._rows.slice(start, end)); }
    page(number = 1, size = 25) { integer(number); integer(size); return this.slice((number - 1) * size, number * size); }
    unique(key) { const seen = new Set(), get = field(key); return this.filter(row => { const k = get(row); if (seen.has(k)) return false; seen.add(k); return true; }); }
    groupBy(...keys) {
      if (!keys.length) throw new TypeError('At least one group key required');
      const root = new Map(), groups = [];
      for (const row of this._rows) {
        let map = root;
        keys.forEach((key, i) => {
          const value = field(key)(row);
          if (!map.has(value)) {
            if (i === keys.length - 1) { const group = { keys: record(keys.map(k => [k, field(k)(row)])), rows: [] }; map.set(value, group); groups.push(group); }
            else map.set(value, new Map());
          }
          if (i === keys.length - 1) map.get(value).rows.push(row); else map = map.get(value);
        });
      }
      return { aggregate: reducers => new Table(groups.map(g => ({ ...g.keys, ...reduceRows(g.rows, reducers) }))),
        entries: () => groups.map(g => ({ keys: { ...g.keys }, table: new Table(g.rows) })) };
    }
    aggregate(reducers) { return reduceRows(this._rows, reducers); }
    describe(...keys) { return record((keys.length ? keys : this.columns()).map(k => [k, summary(this.column(k))])); }
    join(other, { left, right = left, how = 'inner', suffix = '_right', maxRows = 1000000 } = {}) {
      if (!['inner', 'left'].includes(how) || !left) throw new TypeError('join requires left key and inner/left mode');
      integer(maxRows); const rows = other instanceof Table ? other._rows : new Table(other)._rows, index = new Map(), result = [];
      for (const row of rows) { const k = field(right)(row); if (k == null) continue; if (!index.has(k)) index.set(k, []); index.get(k).push(row); }
      for (const row of this._rows) {
        const matches = index.get(field(left)(row));
        for (const match of matches || (how === 'left' ? [null] : [])) {
          if (result.length >= maxRows) throw new RangeError('Join output exceeds maxRows');
          const out = { ...row };
          if (match) for (const [k, v] of Object.entries(match)) {
            if (k === right && left === right) continue;
            const dest = own(out, k) ? k + suffix : k;
            if (own(out, dest)) throw new Error('Join column collision: ' + dest);
            Object.defineProperty(out, dest, { value: v, enumerable: true, writable: true, configurable: true });
          }
          result.push(out);
        }
      }
      return new Table(result);
    }
  }
  function reduceRows(rows, reducers) { return record(Object.entries(reducers).map(([name, fn]) => [name, fn(new Table(rows))])); }
  const data = rows => new Table(rows);
  const stats = { summary, quantile, median: values => quantile(values), histogram, regression,
    correlation: (xs, ys) => regression(xs, ys).r };

  function parseCSV(text, { delimiter = ',', header = true, maxRows = 1000000 } = {}) {
    if (typeof text !== 'string') throw new TypeError('CSV input must be text');
    if (delimiter.length !== 1 || /["\r\n]/.test(delimiter)) throw new TypeError('Invalid delimiter');
    integer(maxRows); text = text.replace(/^\uFEFF/, ''); if (!text) return [];
    const rows = []; let row = [], cell = '', quoted = false, closed = false;
    function pushRow() { row.push(cell); rows.push(row); if (rows.length > maxRows + (header ? 1 : 0)) throw new RangeError('CSV exceeds maxRows'); row = []; cell = ''; closed = false; }
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } } else cell += c; continue; }
      if (c === delimiter) { row.push(cell); cell = ''; closed = false; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; pushRow(); }
      else if (c === '"' && !cell && !closed) quoted = true;
      else { if (closed || c === '"') throw new SyntaxError('Malformed quoted CSV cell'); cell += c; }
    }
    if (quoted) throw new SyntaxError('Unclosed CSV quote');
    if (cell || row.length || closed || !/[\r\n]$/.test(text)) pushRow();
    if (!header) return rows;
    const keys = rows.shift(); if (new Set(keys).size !== keys.length) throw new Error('Duplicate CSV headers');
    return rows.map((r, i) => { if (r.length !== keys.length) throw new Error('CSV column count at row ' + (i + 2)); return record(keys.map((k, j) => [k, r[j]])); });
  }
  function stringifyCSV(rows, { columns, delimiter = ',', safe = true } = {}) {
    if (delimiter.length !== 1 || /["\r\n]/.test(delimiter)) throw new TypeError('Invalid delimiter');
    const table = data(rows); columns = columns || table.columns();
    const escape = value => {
      let s = value == null ? '' : String(value);
      if (safe && typeof value === 'string' && /^[\s]*[=+@-]/.test(s)) s = "'" + s;
      return /["\r\n]/.test(s) || s.includes(delimiter) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return [columns, ...rows.map(r => columns.map(field => own(r, field) ? r[field] : ''))].map(r => r.map(escape).join(delimiter)).join('\r\n');
  }

  // No network request until a host-provided adapter loader is called.
  const adapters = new Map(), loading = new Map();
  function configure(values) { for (const [name, value] of Object.entries(values)) { adapters.set(name, value); loading.delete(name); } }
  async function adapter(name) {
    if (!adapters.has(name)) throw new Error('Configure ' + name + ' first: Dizge.configure({ ' + name + ': libraryOrAsyncLoader })');
    if (!loading.has(name)) {
      const value = adapters.get(name);
      const promise = Promise.resolve().then(() => typeof value === 'function' ? value() : value).then(x => x?.default || x);
      loading.set(name, promise);
      promise.catch(() => { if (loading.get(name) === promise) loading.delete(name); });
    }
    return loading.get(name);
  }
  async function bytes(input, maxBytes = 50 * 1024 * 1024) {
    integer(maxBytes);
    if (input?.size > maxBytes || input?.byteLength > maxBytes) throw new RangeError('File exceeds maxBytes');
    if (input && typeof input.arrayBuffer === 'function') input = await input.arrayBuffer();
    const out = input instanceof ArrayBuffer ? new Uint8Array(input) : ArrayBuffer.isView(input) ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength) : null;
    if (!out) throw new TypeError('Expected File, Blob, ArrayBuffer or typed array');
    if (out.byteLength > maxBytes) throw new RangeError('File exceeds maxBytes'); return out;
  }
  function download(content, filename, type = 'application/octet-stream') {
    const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const xlsx = {
    async read(input, { sheet, maxBytes, maxRows = 100000, signal } = {}) {
      integer(maxRows); abort(signal); const lib = await adapter('xlsx'), buffer = await bytes(input, maxBytes); abort(signal);
      const book = lib.read(buffer, { type: 'array', sheetRows: maxRows + 2, cellDates: true, cellFormula: false, bookVBA: false });
      const name = sheet ?? book.SheetNames[0]; if (!book.Sheets[name]) throw new Error('Unknown sheet: ' + name);
      const ws = book.Sheets[name];
      if (ws['!fullref']) throw new RangeError('Sheet exceeds maxRows');
      const rows = lib.utils.sheet_to_json(ws, { defval: null }); if (rows.length > maxRows) throw new RangeError('Sheet exceeds maxRows');
      abort(signal); return { sheets: book.SheetNames.slice(), sheet: name, rows };
    },
    async write(sheets) {
      const lib = await adapter('xlsx'), book = lib.utils.book_new();
      if (!Object.keys(sheets).length) throw new Error('At least one sheet required');
      for (const [name, rows] of Object.entries(sheets)) {
        if (!name || name.length > 31 || /[\\/?*\[\]:]/.test(name)) throw new Error('Invalid sheet name: ' + name);
        data(rows);
        for (const row of rows) for (const value of Object.values(row)) {
          if (value != null && !['string', 'number', 'boolean'].includes(typeof value) && !(value instanceof Date)) throw new TypeError('XLSX cells must be scalar values or dates');
          if (typeof value === 'number' && !finite(value)) throw new TypeError('XLSX numbers must be finite');
          if (value instanceof Date && !finite(value.getTime())) throw new TypeError('Invalid XLSX date');
        }
        lib.utils.book_append_sheet(book, lib.utils.json_to_sheet(rows), name);
      }
      return new Uint8Array(lib.write(book, { type: 'array', bookType: 'xlsx', compression: true }));
    }
  };
  const pdf = {
    async text(input, { maxBytes, maxPages = 1000, signal, password } = {}) {
      integer(maxPages); abort(signal); const lib = await adapter('pdfjs'); const buffer = await bytes(input, maxBytes); abort(signal);
      const task = lib.getDocument({ data: buffer.slice(), password, isEvalSupported: false });
      // Do not leave password-protected documents waiting on an interactive prompt.
      const cancel = () => { void task.destroy(); }; signal?.addEventListener('abort', cancel, { once: true });
      try {
        const doc = await task.promise; if (doc.numPages > maxPages) throw new RangeError('PDF exceeds maxPages');
        const pages = [];
        for (let i = 1; i <= doc.numPages; i++) {
          abort(signal); const page = await doc.getPage(i), content = await page.getTextContent();
          pages.push(content.items.map(x => (x.str || '') + (x.hasEOL ? '\n' : ' ')).join('').trim()); page.cleanup();
        }
        return { pages, text: pages.join('\n\n') };
      } finally { signal?.removeEventListener('abort', cancel); await task.destroy(); }
    },
    async report({ title = 'Report', lines = [], rows = [], columns, fontBytes, fontSize = 11, margin = 44 } = {}) {
      if (!finite(fontSize) || fontSize < 6 || fontSize > 36 || !finite(margin) || margin < 10 || margin > 150) throw new RangeError('Invalid PDF layout');
      const lib = await adapter('pdf'), doc = await lib.PDFDocument.create();
      if (fontBytes) doc.registerFontkit(await adapter('fontkit'));
      const font = await doc.embedFont(fontBytes ? await bytes(fontBytes) : lib.StandardFonts.Helvetica);
      let page, y; const height = 841.89, width = 595.28, lineHeight = fontSize * 1.5;
      function newPage() { page = doc.addPage([width, height]); y = height - margin; } newPage();
      function draw(line) { if (y < margin + lineHeight) newPage(); page.drawText(line, { x: margin, y: y - fontSize, size: fontSize, font }); y -= lineHeight; }
      function wrap(value) {
        for (const paragraph of String(value).split(/\r?\n/)) {
          let line = '';
          for (const char of paragraph) { if (font.widthOfTextAtSize(line + char, fontSize) > width - margin * 2) { draw(line); line = char; } else line += char; }
          draw(line);
        }
      }
      wrap(title); draw(''); lines.forEach(wrap);
      if (rows.length) { const keys = columns || data(rows).columns(); wrap(keys.join(' | ')); for (const row of rows) wrap(keys.map(k => field(k)(row) ?? '').join(' | ')); }
      doc.setTitle(title); doc.setCreator('Dizge.js'); return doc.save();
    },
    async merge(inputs, { maxBytes } = {}) {
      if (!inputs.length) throw new Error('At least one PDF required');
      const lib = await adapter('pdf'), out = await lib.PDFDocument.create();
      for (const input of inputs) { const doc = await lib.PDFDocument.load(await bytes(input, maxBytes)); for (const page of await out.copyPages(doc, doc.getPageIndices())) out.addPage(page); }
      return out.save();
    }
  };

  function store(initial) {
    let state = initial, queued = false, destroyed = false; const subscribers = new Set();
    function flush() { queued = false; if (!destroyed) for (const fn of [...subscribers]) fn(state); }
    return { get: () => state,
      set(next) { if (destroyed) throw new Error('Store disposed'); const value = typeof next === 'function' ? next(state) : next; if (Object.is(value, state)) return; state = value; if (!queued) { queued = true; queueMicrotask(flush); } },
      subscribe(fn, immediate = true) { if (destroyed) throw new Error('Store disposed'); subscribers.add(fn); if (immediate) fn(state); return () => subscribers.delete(fn); },
      destroy() { destroyed = true; subscribers.clear(); } };
  }
  function debounce(fn, delay = 150) {
    let timer; const wrapped = (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; wrapped.cancel = () => clearTimeout(timer); return wrapped;
  }
  async function chunks(items, fn, { size = 1000, signal, onProgress } = {}) {
    integer(size); const result = [];
    for (let start = 0; start < items.length; start += size) { abort(signal); const end = Math.min(items.length, start + size); for (let i = start; i < end; i++) result.push(fn(items[i], i)); onProgress?.(end / items.length); await new Promise(r => setTimeout(r, 0)); }
    abort(signal); return result;
  }
  function analyzeAsync(rows, operations, { workerUrl, signal } = {}) {
    if (!workerUrl) return Promise.reject(new Error('workerUrl is required'));
    return new Promise((resolve, reject) => {
      abort(signal); const worker = new Worker(workerUrl);
      const finish = (error, value) => { worker.terminate(); signal?.removeEventListener('abort', cancel); error ? reject(error) : resolve(value); };
      const cancel = () => finish(signal.reason || new DOMException('Aborted', 'AbortError'));
      signal?.addEventListener('abort', cancel, { once: true });
      worker.onmessage = e => e.data.error ? finish(new Error(e.data.error)) : finish(null, e.data.result);
      worker.onerror = e => finish(new Error(e.message));
      try { worker.postMessage({ rows, operations }); } catch (error) { finish(error); }
    });
  }
  function analyze(rows, operations) {
    let table = data(rows);
    for (const op of operations) {
      if (op.type === 'sort') table = table.sort(op.key, op.direction);
      else if (op.type === 'select') table = table.select(...op.keys);
      else if (op.type === 'slice') table = table.slice(op.start, op.end);
      else if (op.type === 'filter') {
        const predicates = { eq: (a, b) => a === b, gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, lte: (a, b) => a <= b, contains: (a, b) => String(a ?? '').includes(String(b)) };
        if (!own(predicates, op.operator)) throw new Error('Unknown filter operator'); table = table.filter(r => predicates[op.operator](field(op.key)(r), op.value));
      } else if (op.type === 'describe') return table.describe(...(op.keys || []));
      else throw new Error('Unknown operation: ' + op.type);
    }
    return table.toArray();
  }

  const styles = `
  .dz{--dz-bg:#f4f6fb;--dz-panel:#fff;--dz-text:#17243a;--dz-muted:#59677e;--dz-line:#dce3ef;--dz-accent:#364ccc;--dz-soft:#edf0ff;--dz-radius:16px;color:var(--dz-text);background:var(--dz-bg);font:15px/1.55 system-ui,sans-serif;color-scheme:light}
  .dz[data-theme=dark]{--dz-bg:#101521;--dz-panel:#1a2232;--dz-text:#eef2ff;--dz-muted:#aab8d0;--dz-line:#35415a;--dz-accent:#a6b4ff;--dz-soft:#29334d;color-scheme:dark}
  .dz *{box-sizing:border-box}.dz button,.dz input,.dz select{font:inherit}.dz button{cursor:pointer}.dz button:disabled{cursor:default;opacity:.5}.dz :focus-visible{outline:3px solid var(--dz-accent);outline-offset:3px}
  .dz-app{max-width:1280px;margin:auto;padding:clamp(16px,4vw,48px)}.dz-header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:28px}.dz h1{font-size:clamp(28px,4vw,44px);line-height:1.12;letter-spacing:-.04em;margin:8px 0}.dz h2{font-size:18px;margin:0 0 14px}.dz p{margin:8px 0}.dz-muted{color:var(--dz-muted)}.dz-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:18px}.dz-stack{display:grid;gap:20px}.dz-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
  .dz-card{background:var(--dz-panel);border:1px solid var(--dz-line);border-radius:var(--dz-radius);padding:24px;min-width:0;box-shadow:0 8px 28px #17243a06}.dz-metric{font-size:32px;font-weight:700;letter-spacing:-.04em;font-variant-numeric:tabular-nums}.dz-button{border:1px solid var(--dz-line);border-radius:9px;padding:9px 15px;background:var(--dz-panel);color:var(--dz-text)}.dz-button[data-variant=primary]{background:var(--dz-accent);border-color:var(--dz-accent);color:var(--dz-bg)}
  .dz-field{display:grid;gap:6px}.dz-input{min-width:0;width:100%;border:1px solid var(--dz-line);border-radius:9px;padding:10px 12px;background:var(--dz-panel);color:var(--dz-text)}.dz-table-wrap{overflow:auto;max-width:100%;border:1px solid var(--dz-line);border-radius:12px}.dz table{border-collapse:collapse;width:100%;text-align:left;white-space:nowrap}.dz th,.dz td{padding:12px 16px;border-bottom:1px solid var(--dz-line)}.dz th{background:var(--dz-soft);font-size:12px;letter-spacing:.04em}.dz th button{border:0;background:transparent;color:inherit;font:inherit;padding:0}.dz tbody tr:hover{background:var(--dz-soft)}.dz-pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px}.dz-error{color:#bd2439}.dz-badge{display:inline-block;background:var(--dz-soft);color:var(--dz-accent);border-radius:999px;padding:4px 10px;font-size:12px;font-weight:650}.dz-chart{width:100%;height:auto;display:block}.dz dialog{border:1px solid var(--dz-line);border-radius:16px;background:var(--dz-panel);color:var(--dz-text);max-width:min(560px,90vw);padding:28px}.dz dialog::backdrop{background:#10152199}.dz-toast{position:fixed;bottom:24px;right:24px;max-width:calc(100vw - 48px);z-index:1000}.dz-tabs [role=tablist]{display:flex;gap:8px;border-bottom:1px solid var(--dz-line);padding-bottom:12px;margin-bottom:18px}.dz-tabs [aria-selected=true]{background:var(--dz-soft);color:var(--dz-accent)}
  .dz-chart text{font-size:14px}@media(max-width:600px){.dz-header{align-items:flex-start;flex-direction:column}.dz-card{padding:18px}.dz-pagination{flex-wrap:wrap}.dz-chart text{font-size:21px}}@media(prefers-reduced-motion:reduce){.dz *{scroll-behavior:auto!important;animation:none!important}}
  `;
  function installStyles({ nonce } = {}) {
    if (document.getElementById('dizge-styles')) return;
    const style = document.createElement('style'); style.id = 'dizge-styles'; if (nonce) style.nonce = nonce; style.textContent = styles; document.head.append(style);
  }
  function el(tag, props = {}, ...children) {
    if (!/^[a-z][a-z0-9-]*$/i.test(tag) || /^(script|iframe|object|embed|style)$/i.test(tag)) throw new Error('Unsupported element');
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (key === 'className' || key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'on') { for (const [event, fn] of Object.entries(value)) node.addEventListener(event, fn); }
      else if (key === 'style') { for (const [k, v] of Object.entries(value)) node.style.setProperty(k, v); }
      else if (/^on/i.test(key) || ['innerHTML', 'outerHTML', 'srcdoc'].includes(key)) throw new Error('Unsafe DOM property: ' + key);
      else if (['href', 'src', 'action', 'formaction', 'xlink:href'].includes(key.toLowerCase())) {
        const url = new URL(String(value), document.baseURI); if (!['http:', 'https:', 'mailto:', 'tel:', 'blob:'].includes(url.protocol)) throw new Error('Unsupported URL protocol'); node.setAttribute(key, value);
      } else if (value != null && value !== false) { if (key === 'value' || key === 'checked' || key === 'selected') node[key] = value; else node.setAttribute(key, value === true ? '' : String(value)); }
    }
    function append(child) { if (Array.isArray(child)) child.forEach(append); else if (child != null && child !== false) node.append(child?.nodeType ? child : document.createTextNode(String(child))); }
    children.forEach(append); return node;
  }
  const button = (label, onClick, props = {}) => el('button', { type: 'button', class: 'dz-button', ...props, on: { click: onClick } }, label);
  const card = (title, ...children) => el('section', { class: 'dz-card' }, title ? el('h2', {}, title) : null, children);
  const metric = (label, value, note) => card(null, el('div', { class: 'dz-muted' }, label), el('div', { class: 'dz-metric' }, value), note ? el('p', { class: 'dz-muted' }, note) : null);
  let uid = 0;
  function tableComponent({ rows = [], columns, pageSize = 25, searchable = true, label = 'Data table' } = {}) {
    integer(pageSize); let source = data(rows), filtered = source, page = 1, sortKey, direction = 'asc', query = '';
    columns = columns || source.columns().map(key => ({ key, label: key }));
    const root = el('div'), wrap = el('div', { class: 'dz-table-wrap', tabindex: '0', 'aria-label': label }), table = el('table', {}, el('caption', { class: 'dz-muted' }, label));
    const head = el('thead'), body = el('tbody'), status = el('span', { role: 'status' }); table.append(head, body); wrap.append(table);
    const prev = button('←', () => { page--; render(); }, { 'aria-label': 'Previous page' }), next = button('→', () => { page++; render(); }, { 'aria-label': 'Next page' });
    const search = el('input', { class: 'dz-input', type: 'search', placeholder: 'Ara / Search', 'aria-label': 'Search table' });
    const updateSearch = debounce(() => { query = search.value.toLocaleLowerCase(); page = 1; recompute(); }); search.addEventListener('input', updateSearch);
    if (searchable) root.append(el('label', { class: 'dz-field' }, el('span', { class: 'dz-muted' }, 'Ara / Search'), search));
    root.className = 'dz-stack'; root.append(wrap, el('div', { class: 'dz-pagination' }, status, el('div', { class: 'dz-row' }, prev, next)));
    function recompute() {
      filtered = query ? source.filter(row => columns.some(c => String(field(c.key)(row) ?? '').toLocaleLowerCase().includes(query))) : source;
      if (sortKey) filtered = filtered.sort(sortKey, direction); render();
    }
    function render() {
      const pages = Math.max(1, Math.ceil(filtered.length / pageSize)); page = Math.max(1, Math.min(page, pages));
      head.replaceChildren(el('tr', {}, columns.map(c => el('th', { scope: 'col', 'aria-sort': sortKey === c.key ? (direction === 'asc' ? 'ascending' : 'descending') : 'none' },
        c.sortable === false ? c.label || c.key : button((c.label || c.key) + (sortKey === c.key ? direction === 'asc' ? ' ↑' : ' ↓' : ''), () => { direction = sortKey === c.key && direction === 'asc' ? 'desc' : 'asc'; sortKey = c.key; recompute(); })))));
      const fragment = document.createDocumentFragment();
      for (const row of filtered.page(page, pageSize)._rows) fragment.append(el('tr', {}, columns.map(c => el('td', {}, c.format ? c.format(field(c.key)(row), row) : field(c.key)(row) ?? '—'))));
      if (!filtered.length) fragment.append(el('tr', {}, el('td', { colspan: Math.max(1, columns.length) }, 'No results / Sonuç yok')));
      body.replaceChildren(fragment); status.textContent = `${filtered.length} kayıt · ${page} / ${pages}`; prev.disabled = page === 1; next.disabled = page === pages;
    }
    render(); return { el: root, setRows(rows) { source = data(rows); page = 1; recompute(); }, destroy() { updateSearch.cancel(); root.remove(); } };
  }
  function chart({ values = [], labels = [], type = 'bar', label = 'Chart', maxPoints = 300 } = {}) {
    if (!['bar', 'line'].includes(type)) throw new Error('Chart type: bar | line'); integer(maxPoints);
    if (maxPoints > 10000) throw new RangeError('At most 10000 chart points');
    if (values.some(v => !finite(v))) throw new TypeError('Chart values must be finite');
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 640 240'); svg.setAttribute('class', 'dz-chart'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label);
    const add = (tag, attrs, text) => { const n = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text != null) n.textContent = text; svg.append(n); return n; };
    add('title', {}, label); if (!values.length) { add('text', { x: 30, y: 120, fill: 'currentColor' }, 'No data'); return svg; }
    // Bucket averages bound SVG size. Full data remains in the caller's table.
    const stride = Math.ceil(values.length / maxPoints), samples = [];
    for (let i = 0; i < values.length; i += stride) samples.push({ value: summary(values.slice(i, i + stride)).mean, label: labels[i] ?? String(i + 1) });
    const min = Math.min(0, ...samples.map(x => x.value)), max = Math.max(0, ...samples.map(x => x.value)), span = max - min || 1;
    const y = v => 195 - (v - min) / span * 165, step = 550 / samples.length, zero = y(0);
    add('line', { x1: 55, y1: zero, x2: 605, y2: zero, stroke: 'var(--dz-line)' });
    const axisLabel = value => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    add('text', { x: 4, y: 35, fill: 'currentColor', 'font-size': 11 }, axisLabel(max));
    add('text', { x: 4, y: 195, fill: 'currentColor', 'font-size': 11 }, axisLabel(min));
    if (type === 'line') add('polyline', { points: samples.map((s, i) => `${55 + step * (i + .5)},${y(s.value)}`).join(' '), fill: 'none', stroke: 'var(--dz-accent)', 'stroke-width': 3 });
    samples.forEach((s, i) => {
      if (type === 'bar') { const rect = add('rect', { x: 55 + step * i + step * .14, y: Math.min(zero, y(s.value)), width: step * .72, height: Math.max(.5, Math.abs(y(s.value) - zero)), rx: 3, fill: 'var(--dz-accent)' }); const title = document.createElementNS(ns, 'title'); title.textContent = `${s.label}: ${s.value}`; rect.append(title); }
      if (i % Math.max(1, Math.ceil(samples.length / 6)) === 0) add('text', { x: 55 + step * (i + .5), y: 220, 'text-anchor': 'middle', fill: 'currentColor', 'font-size': 11 }, String(s.label).slice(0, 12));
    }); return svg;
  }
  function form({ fields, onSubmit, submitLabel = 'Kaydet / Save' }) {
    const controls = new Map(), root = el('form', { class: 'dz-stack' }), error = el('div', { class: 'dz-error', role: 'alert' }); let disposed = false;
    for (const f of fields) {
      if (controls.has(f.name)) throw new Error('Duplicate field: ' + f.name);
      const id = 'dz-field-' + ++uid, props = { id, name: f.name, class: 'dz-input', required: !!f.required, value: f.value ?? '', min: f.min, max: f.max, step: f.step };
      const input = f.options ? el('select', props, f.options.map(v => el('option', { value: v }, v))) : el('input', { ...props, type: f.type || 'text' });
      if (f.options && f.value != null) input.value = f.value;
      controls.set(f.name, { input, f }); root.append(el('label', { class: 'dz-field', for: id }, f.label || f.name, input));
    }
    const submit = el('button', { type: 'submit', class: 'dz-button', 'data-variant': 'primary' }, submitLabel); root.append(error, submit);
    root.addEventListener('submit', async e => {
      e.preventDefault(); if (submit.disabled || !root.reportValidity()) return;
      const entries = []; error.textContent = '';
      for (const [name, { input, f }] of controls) {
        const value = f.type === 'number' ? input.value === '' ? null : Number(input.value) : input.value;
        const message = f.validate?.(value); if (message) { error.textContent = message; input.focus(); return; } entries.push([name, value]);
      }
      submit.disabled = true;
      try { await onSubmit(record(entries)); } catch (e) { if (!disposed) error.textContent = e.message || String(e); } finally { if (!disposed) submit.disabled = false; }
    });
    return { el: root, destroy() { disposed = true; root.remove(); } };
  }
  function tabs(items) {
    if (!items.length) throw new Error('At least one tab required');
    const root = el('div', { class: 'dz-tabs' }), nav = el('div', { role: 'tablist', 'aria-label': 'Sections' }), panels = [], buttons = [];
    function select(i, focus = false) { buttons.forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; panels[j].hidden = i !== j; }); if (focus) buttons[i].focus(); }
    items.forEach((item, i) => {
      const id = 'dz-tab-' + ++uid, panel = el('section', { id: id + '-panel', role: 'tabpanel', 'aria-labelledby': id, tabindex: '0' }, item.content);
      const b = button(item.label, () => select(i), { id, role: 'tab', 'aria-controls': id + '-panel' });
      b.addEventListener('keydown', e => { const next = e.key === 'ArrowRight' ? (i + 1) % items.length : e.key === 'ArrowLeft' ? (i - 1 + items.length) % items.length : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : -1; if (next >= 0) { e.preventDefault(); select(next, true); } });
      panels.push(panel); buttons.push(b); nav.append(b);
    }); root.append(nav, ...panels); select(0); return root;
  }
  function modal({ title, content, parent = document.body }) {
    const previous = document.activeElement, id = 'dz-dialog-' + ++uid, dialog = el('dialog', { 'aria-labelledby': id }, el('h2', { id }, title), content);
    const close = () => { dialog.close(); dialog.remove(); previous?.focus(); };
    dialog.append(button('Kapat / Close', close)); dialog.addEventListener('cancel', e => { e.preventDefault(); close(); }); parent.append(dialog); dialog.showModal(); return { el: dialog, close };
  }
  function toast(message, { parent = document.body, duration = 4000 } = {}) {
    const node = el('div', { class: 'dz dz-card dz-toast', role: 'status' }, message); parent.append(node);
    const timer = setTimeout(() => node.remove(), duration); return () => { clearTimeout(timer); node.remove(); };
  }
  function app(target, { title = 'Dizge', subtitle, theme = 'light', actions = [], content = [], nonce } = {}) {
    const host = typeof target === 'string' ? document.querySelector(target) : target; if (!host) throw new Error('Mount target not found');
    installStyles({ nonce }); const root = el('div', { class: 'dz', 'data-theme': theme }, el('main', { class: 'dz-app dz-stack' },
      el('header', { class: 'dz-header' }, el('div', {}, el('span', { class: 'dz-badge' }, 'DIZGE.JS'), el('h1', {}, title), subtitle ? el('p', { class: 'dz-muted' }, subtitle) : null), el('div', { class: 'dz-row' }, actions)), content)); host.append(root);
    const disposers = new Set(); return { el: root, theme(value) { root.dataset.theme = value; }, use(component) { if (component.destroy) disposers.add(() => component.destroy()); return component.el || component; }, destroy() { for (const dispose of disposers) dispose(); disposers.clear(); root.remove(); } };
  }
  const ui = { el, button, card, metric, table: tableComponent, chart, form, tabs, modal, toast, app, installStyles,
    grid: (...children) => el('div', { class: 'dz-grid' }, children), stack: (...children) => el('div', { class: 'dz-stack' }, children) };
  const format = { number: (n, options = {}, locale = 'tr-TR') => new Intl.NumberFormat(locale, options).format(n),
    currency: (n, currency = 'TRY', locale = 'tr-TR') => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n),
    date: (value, options = {}, locale = 'tr-TR') => new Intl.DateTimeFormat(locale, options).format(new Date(value)) };
  return { version, data, Table, stats, csv: { parse: parseCSV, stringify: stringifyCSV }, configure, xlsx, pdf, download, store, debounce, chunks, analyze, analyzeAsync, ui, format, styles };
});
