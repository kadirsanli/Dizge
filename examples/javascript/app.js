/* Working example: no build step, no backend. File data stays in this browser. */
const D = Dizge, { ui, format } = D;
const cities = ['İstanbul', 'Ankara', 'İzmir', 'Bursa'], categories = ['Tasarım', 'Yazılım', 'Eğitim', 'Danışmanlık'];
const initial = Array.from({ length: 240 }, (_, i) => ({ id: i + 1, sehir: cities[i % 4], kategori: categories[Math.floor(i / 3) % 4], tutar: 400 + i * 137 % 7600, ay: '2026-' + String(1 + i % 10).padStart(2, '0') }));
let rows = initial, dark = false;
const state = D.store(rows), status = ui.el('p', { role: 'status', class: 'dz-muted file-note' }, 'Örnek veri · 240 kayıt · Dosyalarınız sunucuya gönderilmez.'), metrics = ui.grid(), charts = ui.grid();
const table = ui.table({ rows, pageSize: 10, label: 'İşlem kayıtları', columns: [
  { key: 'id', label: 'NO' }, { key: 'sehir', label: 'ŞEHİR' }, { key: 'kategori', label: 'KATEGORİ' }, { key: 'ay', label: 'DÖNEM' }, { key: 'tutar', label: 'TUTAR', format: v => format.currency(v) }
] });
function loadScript(url, globalName) {
  if (globalThis[globalName]) return Promise.resolve(globalThis[globalName]);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = url;
    const timer = setTimeout(() => { script.remove(); reject(Error('Bağımlılık yüklenemedi: bağlantıyı kontrol edin.')); }, 30000);
    script.onload = () => { clearTimeout(timer); if (globalThis[globalName]) resolve(globalThis[globalName]); else reject(Error('Bağımlılık bulunamadı')); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(Error('Bağımlılık indirilemedi. Çevrimdışı kullanım için yerel vendor dosyalarını yapılandırın.')); }; document.head.append(script);
  });
}
D.configure({
  xlsx: () => loadScript('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js', 'XLSX'),
  pdf: () => loadScript('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js', 'PDFLib'),
  fontkit: () => loadScript('https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js', 'fontkit'),
  pdfjs: async () => { const lib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/build/pdf.min.mjs'); lib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs'; return lib; }
});
function action(label, fn, props = {}) {
  return ui.button(label, async event => { const b = event.currentTarget; b.disabled = true; status.textContent = label + '…';
    try { await fn(); status.textContent = 'Tamamlandı · ' + rows.length + ' kayıt'; }
    catch (error) { status.textContent = error.message; }
    finally { b.disabled = false; }
  }, props);
}
const input = ui.el('input', { type: 'file', accept: '.csv,.xlsx,.pdf', hidden: true, 'aria-label': 'Dosya seç' });
input.addEventListener('change', async () => {
  const file = input.files[0]; if (!file) return;
  status.textContent = 'Okunuyor: ' + file.name;
  try {
    if (file.size > 20 * 1024 * 1024) throw Error('Bu örnekte dosya sınırı 20 MB.');
    if (/\.pdf$/i.test(file.name)) {
      const result = await D.pdf.text(file, { maxPages: 100 });
      ui.modal({ title: 'PDF metni · ' + result.pages.length + ' sayfa', content: ui.el('pre', {}, result.text || 'Metin katmanı yok. Taranmış PDF için OCR gerekir.'), parent: app.el });
    } else {
      const imported = /\.xlsx$/i.test(file.name) ? (await D.xlsx.read(file)).rows : D.csv.parse(await file.text(), { maxRows: 100000 });
      const normalized = imported.map((row, i) => {
        if (!['sehir', 'kategori', 'tutar', 'ay'].every(k => Object.hasOwn(row, k))) throw Error('Beklenen sütunlar: sehir, kategori, tutar, ay. Önce örnek CSV indirin.');
        const amount = row.tutar === '' || row.tutar == null ? NaN : Number(row.tutar);
        if (!Number.isFinite(amount)) throw Error('Geçersiz tutar, satır ' + (i + 2) + '. Ondalık ayırıcı nokta olmalıdır.');
        return { id: row.id ?? i + 1, sehir: String(row.sehir), kategori: String(row.kategori), tutar: amount, ay: String(row.ay) };
      }); state.set(normalized);
    }
    status.textContent = file.name + ' okundu.';
  } catch (error) { status.textContent = error.message; } finally { input.value = ''; }
});
const csvButton = action('CSV indir', () => D.download('\uFEFF' + D.csv.stringify(rows), 'dizge-veri.csv', 'text/csv;charset=utf-8'));
const xlsxButton = action('Excel indir', async () => D.download(await D.xlsx.write({ Veriler: rows }), 'dizge-veri.xlsx'));
const pdfButton = action('PDF raporu', async () => {
  const response = await fetch('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/standard_fonts/LiberationSans-Regular.ttf'); if (!response.ok) throw Error('Türkçe font indirilemedi.');
  D.download(await D.pdf.report({ title: 'Dizge · Veri Raporu', lines: [`Kayıt: ${rows.length}`, `Toplam: ${format.currency(D.stats.summary(rows.map(r => r.tutar)).sum)}`], rows: rows.slice(0, 100), fontBytes: await response.arrayBuffer() }), 'dizge-rapor.pdf', 'application/pdf');
});
const workerButton = action('Worker ile analiz', async () => {
  const result = await D.analyzeAsync(rows, [{ type: 'describe', keys: ['tutar'] }], { workerUrl: '../../dizge.worker.js' });
  ui.modal({ title: 'Arka plan analizi', content: ui.el('pre', {}, JSON.stringify(result, null, 2)), parent: app.el });
});
const addButton = ui.button('+ Kayıt ekle', () => {
  let dialog;
  const form = ui.form({ fields: [{ name: 'sehir', label: 'Şehir', options: cities }, { name: 'kategori', label: 'Kategori', options: categories }, { name: 'tutar', label: 'Tutar (₺)', type: 'number', required: true, min: 0, step: .01 }, { name: 'ay', label: 'Dönem', value: '2026-10', required: true, validate: v => /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? undefined : 'Dönem YYYY-AA biçiminde olmalıdır.' }],
    onSubmit: value => { state.set([...rows, { id: rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1, ...value }]); dialog.close(); form.destroy(); } });
  dialog = ui.modal({ title: 'Yeni işlem', content: form.el, parent: app.el });
});
const app = ui.app('#app', {
  title: 'Veriden karara.', subtitle: 'Bir JavaScript dosyası. Kendi HTML uygulamanız.',
  actions: [ui.button('Açık / Koyu', () => { dark = !dark; app.theme(dark ? 'dark' : 'light'); }), ui.button('Dosya aç', () => input.click(), { 'data-variant': 'primary' })],
  content: [input, ui.el('section', { class: 'intro' }, ui.el('h2', {}, 'Veri Atölyesi'), ui.el('p', { class: 'dz-muted' }, 'CSV ve Excel verisini inceleyin, gruplandırın ve rapora dönüştürün. PDF dosyalarından metin çıkarın. Bu ekran Dizge bileşenleriyle oluşturuldu.')),
    metrics, charts, ui.card('İşlem listesi', ui.el('div', { class: 'dz-row' }, addButton, csvButton, xlsxButton, pdfButton, workerButton), status, table.el),
    ui.card('Uygulamanıza ekleyin', ui.el('pre', {}, '<script src="dizge.js"><' + '/script>\nconst tablo = Dizge.ui.table({ rows: veriler });\nconst app = Dizge.ui.app("#app", { content: [tablo.el] });\napp.use(tablo);'), ui.el('p', { class: 'dz-muted file-note' }, 'UI ve CSV çevrimdışı çalışır. Bu örnekte PDF/Excel bağımlılıkları ilk kullanımda CDN’den yüklenir. PDF raporu ilk 100 kaydı içerir.'))]
});
app.use(table);
const unsubscribe = state.subscribe(value => {
  rows = value; const tableData = D.data(rows), s = D.stats.summary(tableData.column('tutar'));
  metrics.replaceChildren(ui.metric('TOPLAM HACİM', format.currency(s.sum), 'Tüm işlem kayıtları'), ui.metric('İŞLEM SAYISI', format.number(rows.length), 'Aranabilir ve sıralanabilir'), ui.metric('ORTALAMA TUTAR', format.currency(s.mean ?? 0), 'Eksik değerler hariç'), ui.metric('AKTİF ŞEHİR', tableData.unique('sehir').length, 'Veride bulunan şehirler'));
  const grouped = tableData.groupBy('kategori').aggregate({ total: t => D.stats.summary(t.column('tutar')).sum }).toArray();
  const monthly = tableData.groupBy('ay').aggregate({ total: t => D.stats.summary(t.column('tutar')).sum }).sort('ay').toArray();
  charts.replaceChildren(ui.card('Kategori dağılımı', ui.chart({ values: grouped.map(r => r.total), labels: grouped.map(r => r.kategori), label: 'Kategorilere göre toplam tutar' })), ui.card('Aylık hareket', ui.chart({ type: 'line', values: monthly.map(r => r.total), labels: monthly.map(r => r.ay), label: 'Aylara göre toplam tutar' })));
  table.setRows(rows);
});
window.addEventListener('pagehide', () => { unsubscribe(); state.destroy(); app.destroy(); }, { once: true });
