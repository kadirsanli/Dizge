const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html; charset=utf-8', '.ttf': 'font/ttf', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let file; try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); } catch { res.writeHead(400).end(); return; }
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, content) => { if (error) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(content); });
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.DIZGE_BROWSER_PATH || undefined }); const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
    const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/examples/javascript/'); await page.locator('tbody tr').first().waitFor();
    assert.equal(await page.locator('tbody tr').count(), 10);
    assert.equal(await page.locator('.dz-metric').count(), 4);
    fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'docs/javascript-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Tema' }).click(); assert.equal(await page.locator('.dz').getAttribute('data-theme'), 'dark');
    await page.getByRole('button', { name: 'Tema' }).click();
    await page.getByRole('button', { name: '+ Kayıt ekle' }).click();
    await page.getByLabel('Tutar (₺)').fill('99.50'); await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.dz-metric')[1].textContent === '241');
    await page.getByRole('button', { name: 'Worker ile analiz' }).click(); await page.getByRole('dialog').waitFor();
    assert.match(await page.getByRole('dialog').textContent(), /241/); await page.getByRole('button', { name: 'Kapat' }).click();
    // Real worker cancellation, error propagation and ESM in a browser.
    const worker = await page.evaluate(async () => {
      const module = await import('../../dizge.mjs'); const ctrl = new AbortController();
      const pending = Dizge.eşzamansızAnalizEt(Array.from({ length: 10000 }, (_, x) => ({ x })), [{ type: 'sort', key: 'x' }], { işçiAdresi: '../../dizge.worker.js', sinyal: ctrl.signal }); ctrl.abort();
      let cancelled = false, rejected = false;
      try { await pending; } catch (e) { cancelled = e.name === 'AbortError'; }
      try { await Dizge.eşzamansızAnalizEt([], [{ type: 'invalid' }], { işçiAdresi: '../../dizge.worker.js' }); } catch { rejected = true; }
      return { cancelled, rejected, version: module.default.version };
    }); assert.deepEqual(worker, { cancelled: true, rejected: true, version: '0.2.0' });
    const csvDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'CSV indir', exact: true }).click(); const csv = await csvDownload; const csvPath = path.join(root, 'test-results/roundtrip.csv'); await csv.saveAs(csvPath);
    assert.match(fs.readFileSync(csvPath, 'utf8'), /İstanbul/); await page.locator('input[type=file]').setInputFiles(csvPath); await page.waitForFunction(() => document.querySelector('[role=status]').textContent.includes('okundu'));
    // Use pinned local dependencies to make file tests deterministic and offline.
    await page.addScriptTag({ url: base + '/node_modules/xlsx/dist/xlsx.full.min.js' });
    await page.addScriptTag({ url: base + '/node_modules/pdf-lib/dist/pdf-lib.min.js' });
    await page.addScriptTag({ url: base + '/node_modules/@pdf-lib/fontkit/dist/fontkit.umd.min.js' });
    await page.evaluate(async () => {
      const pdfjs = await import('../../node_modules/pdfjs-dist/build/pdf.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.mjs';
      Dizge.configure({ xlsx: XLSX, pdf: PDFLib, fontkit, pdfjs });
    });
    await context.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/standard_fonts/LiberationSans-Regular.ttf', route => route.fulfill({ path: path.join(root, 'node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf'), contentType: 'font/ttf' }));
    const excelDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Excel indir' }).click(); const excel = await excelDownload, excelPath = path.join(root, 'test-results/roundtrip.xlsx'); await excel.saveAs(excelPath);
    await page.locator('input[type=file]').setInputFiles(excelPath); await page.waitForFunction(() => document.querySelector('[role=status]').textContent.includes('okundu'));
    const pdfDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'PDF raporu' }).click(); const pdf = await pdfDownload, pdfPath = path.join(root, 'test-results/report.pdf'); await pdf.saveAs(pdfPath);
    assert.equal(fs.readFileSync(pdfPath).subarray(0, 5).toString(), '%PDF-');
    await page.locator('input[type=file]').setInputFiles(pdfPath); await page.getByRole('dialog').waitFor(); assert.match(await page.getByRole('dialog').textContent(), /İstanbul/); await page.getByRole('button', { name: 'Kapat' }).click();
    await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: path.join(root, 'docs/javascript-mobile.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No page-level horizontal overflow');
    assert.deepEqual(errors, []);
    // Tek dosya örneği: Dizge.js gömülü, Türkçe API, dış istek yok.
    const tek = await context.newPage(), tekHatalar = [], tekIstekler = [];
    tek.on('pageerror', e => tekHatalar.push(e.message));
    tek.on('request', r => tekIstekler.push(r.url()));
    await tek.goto(base + '/examples/tek-dosya.html'); await tek.locator('tbody tr').first().waitFor();
    assert.equal(await tek.locator('tbody tr').count(), 5);
    assert.equal(await tek.locator('.dz-metric').count(), 3);
    assert.ok((await tek.content()).includes('Türkçe kaynak sürümü'));
    assert.deepEqual(tekIstekler.filter(u => !u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:')), []);
    await tek.getByRole('button', { name: '+ Satış ekle' }).click();
    await tek.getByLabel('Ürün').fill('Çay');
    await tek.locator('select[name="kategori"]').selectOption('Gıda');
    await tek.getByLabel('Tutar (₺)').fill('75');
    await tek.getByLabel('Tarih').fill('2026-10-04');
    await tek.getByRole('button', { name: 'Kaydet' }).click();
    await tek.waitForFunction(() => [...document.querySelectorAll('.dz-metric')].some(x => x.textContent === '6'));
    assert.deepEqual(tekHatalar, []); await tek.close();
    console.log(JSON.stringify({ browser: await browser.version(), desktop: '1440x1100', mobile: '390x844', checks: ['render', 'theme', 'form', 'worker', 'worker abort', 'worker error', 'browser ESM', 'CSV download/import', 'XLSX download/import', 'Unicode PDF download/text', 'mobile overflow', 'page errors', 'tek dosya inline', 'tek dosya form', 'tek dosya dış istek yok'], passed: true }, null, 2));
  } finally { await browser?.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
