import * as namespace from './dizge.js';
// CommonJS namespace in Node; UMD global in browsers.
const Dizge = namespace.default || globalThis.Dizge;
export default Dizge;
export const {
  sürüm, veri, Tablo, istatistik, csv, yapılandır, xlsx, pdf, indir, depo, geciktir, parçala, analizEt, eşzamansızAnalizEt, arayüz, biçim, stiller,
  version, data, Table, stats, configure, download, store, debounce, chunks, analyze, analyzeAsync, ui, format, styles
} = Dizge;
