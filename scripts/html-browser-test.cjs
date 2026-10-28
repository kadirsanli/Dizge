const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'examples/turkce-html.html'), 'utf8');
const server = http.createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
  catch { res.writeHead(400).end(); return; }
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8'); res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.DIZGE_BROWSER_PATH || undefined });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [], external = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('file:')) external.push(r.url()); });
    const response = await page.goto(base + '/examples/turkce-html.html');
    assert.equal(await response.text(), source, 'Sunulan kaynak özgün Türkçe etiketleri korumalı');
    await page.locator('tbody tr').first().waitFor();
    assert.equal(await page.locator('tbody tr').count(), 3);
    assert.equal(await page.getByRole('heading', { name: '01 · Sayaç' }).count(), 1);
    await page.getByRole('button', { name: 'Artır', exact: true }).focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('output').textContent(), '1');
    await page.getByRole('button', { name: 'Azalt', exact: true }).click(); assert.equal(await page.locator('output').textContent(), '0');
    await page.getByRole('button', { name: 'Öğrenci ekle' }).click(); assert.equal(await page.locator('tbody tr').count(), 3);
    await page.getByLabel('Öğrenci adı', { exact: true }).fill('Çağla'); await page.getByLabel('Puan', { exact: true }).fill('101');
    await page.getByRole('button', { name: 'Öğrenci ekle' }).click(); assert.equal(await page.locator('tbody tr').count(), 3);
    await page.getByLabel('Puan', { exact: true }).fill('72'); await page.getByRole('button', { name: 'Öğrenci ekle' }).click();
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 4);
    assert.match(await page.locator('dz-form [role=status]').textContent(), /Çağla/);
    await page.getByLabel('Tabloda ara', { exact: true }).fill('ipek');
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1 && document.querySelector('tbody').textContent.includes('İpek'));
    await page.getByLabel('Tabloda ara', { exact: true }).fill(''); await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 4);
    await page.evaluate(() => document.querySelector('dz-sayfa').setAttribute('tema', 'koyu'));
    await page.waitForFunction(() => getComputedStyle(document.querySelector('dz-tablo table')).getPropertyValue('--dz-panel').trim() === '#1a2232');
    await page.evaluate(() => document.querySelector('dz-sayfa').setAttribute('tema', 'açık'));
    await page.waitForFunction(() => document.querySelector('dz-sayfa').dataset.theme === 'light');
    fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'test-results/turkce-html-masaustu.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobil sayfa yatay taşmamalı');
    await page.screenshot({ path: path.join(root, 'test-results/turkce-html-mobil.png'), fullPage: true });
    await page.evaluate(() => document.querySelector('dz-veri').güncelle([{ ad: '<img src=x onerror=alert(1)>', puan: 1 }]));
    await page.waitForFunction(() => document.querySelector('tbody').textContent.includes('<img'));
    assert.equal(await page.locator('img').count(), 0);
    await page.evaluate(() => document.querySelector('dz-veri').textContent = '{bozuk');
    await page.getByRole('alert').filter({ hasText: 'geçerli JSON değil' }).waitFor();
    await page.evaluate(() => document.querySelector('dz-veri').güncelle([]));
    await page.getByText('Sonuç yok', { exact: true }).waitFor();
    // Yerel dosya modu ve küçültülmüş dağıtım da gerçek tarayıcıda çalışmalı.
    await page.goto(pathToFileURL(path.join(root, 'examples/turkce-html.html')).href);
    await page.locator('tbody tr').first().waitFor(); assert.equal(await page.locator('tbody tr').count(), 3);
    await page.route(base + '/examples/turkce-html.html', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: source.replace('../dizge-html.js', '../dizge-html.min.js') }));
    await page.goto(base + '/examples/turkce-html.html'); await page.locator('tbody tr').first().waitFor();
    await page.getByRole('button', { name: 'Artır', exact: true }).click(); assert.equal(await page.locator('output').textContent(), '1');
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    console.log(JSON.stringify({ browser: browser.version(), passed: true, checks: ['özgün kaynak', 'sayaç/klavye', 'form sınırları', 'form→tablo', 'Türkçe arama', 'tema kalıtımı', '1440px/390px', 'metin güvenliği', 'hata toparlanması', 'file://', 'küçültülmüş dağıtım', 'dış istek yok'] }, null, 2));
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
