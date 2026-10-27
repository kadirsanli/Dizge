import * as namespace from './dizge.js';
// CommonJS namespace in Node; UMD global in browsers.
const Dizge = namespace.default || globalThis.Dizge;
export default Dizge;
export const { version, data, Table, stats, csv, configure, xlsx, pdf, download, store, debounce, chunks, analyze, analyzeAsync, ui, format, styles } = Dizge;
