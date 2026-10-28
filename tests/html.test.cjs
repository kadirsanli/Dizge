const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../dizge-html.js'), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function page(t, html, script = source) {
  const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', { runScripts: 'outside-only', url: 'https://example.test/' });
  t.after(() => dom.window.close());
  dom.window.eval(script + '\nwindow.DizgeHTML = DizgeHTML;'); await tick();
  return { w: dom.window, d: dom.window.document };
}
const rows = '<dz-veri kimlik="öğrenciler">[{"ad":"İpek","puan":95},{"ad":"Ali","puan":90}]</dz-veri>';
const table = '<dz-tablo kaynak="öğrenciler" sayfa-boyu="1"></dz-tablo>';

test('Türkçe sayaç başlangıç/adım, dış düğme, olay ve klavye için yerel button üretir', async t => {
  const { d } = await page(t, '<dz-sayfa><dz-sayaç kimlik="s" başlangıç="4" adım="2"></dz-sayaç><dz-düğme hedef="s" işlem="artır" etiket="Dış artır"></dz-düğme></dz-sayfa>');
  const counter = d.querySelector('dz-sayaç'), events = [];
  counter.addEventListener('dz-değişti', e => events.push(e.detail.değer));
  counter.querySelectorAll('button')[2].click(); assert.equal(counter.değer, 6);
  d.querySelector('dz-düğme button').click(); assert.equal(counter.değer, 8);
  counter.querySelectorAll('button')[1].click(); assert.equal(counter.değer, 4);
  assert.deepEqual(events, [6, 8, 4]); assert.equal(counter.querySelector('output').getAttribute('aria-live'), 'polite');
  counter.setAttribute('başlangıç', '9'); await tick(); assert.equal(counter.değer, 9);
  assert.equal(d.querySelectorAll('[hatalı]').length, 0);
});

test('tablo Türkçe arama, sayfalama ve sıralama sağlar', async t => {
  const { w, d } = await page(t, `<dz-sayfa>${rows}${table}</dz-sayfa>`);
  assert.equal(d.querySelectorAll('tbody tr').length, 1);
  d.querySelector('[aria-label="Sonraki sayfa"]').click(); assert.match(d.querySelector('tbody').textContent, /Ali/);
  d.querySelector('[aria-label="Önceki sayfa"]').click();
  d.querySelector('th button').click(); assert.match(d.querySelector('tbody').textContent, /Ali/);
  const input = d.querySelector('input'); input.value = 'ipek'; input.dispatchEvent(new w.Event('input'));
  await new Promise(r => setTimeout(r, 180)); assert.match(d.querySelector('tbody').textContent, /İpek/);
});

test('form sayıyı dönüştürür, doğru kapsamdaki veriye ekler ve tabloyu günceller', async t => {
  const { w, d } = await page(t, `<dz-sayfa>${rows}${table}<dz-form kaynak="öğrenciler"><dz-alan ad="ad" zorunlu></dz-alan><dz-alan ad="puan" tür="sayı" zorunlu></dz-alan></dz-form></dz-sayfa><dz-sayfa>${rows}${table}</dz-sayfa>`);
  let submitted;
  d.querySelector('dz-form').addEventListener('dz-gönder', e => { submitted = e.detail.değerler; });
  d.querySelector('[name="ad"]').value = 'Çağla'; d.querySelector('[name="puan"]').value = '72';
  d.querySelector('form').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick();
  assert.equal(submitted.puan, 72); assert.equal(d.querySelector('dz-veri').oku().length, 3);
  assert.equal(d.querySelectorAll('dz-veri')[1].oku().length, 2);
  assert.match(d.querySelector('dz-form [role="status"]').textContent, /Çağla/);
  const t1 = d.querySelector('dz-tablo'); t1.setAttribute('sayfa-boyu', '10'); await tick(); assert.equal(t1.querySelectorAll('tbody tr').length, 3);
});

test('veri metni HTML çalıştırmaz, tehlikeli alan adları prototip değiştirmez', async t => {
  const { d } = await page(t, `<dz-sayfa>${rows}${table}</dz-sayfa>`);
  const value = '<img src=x onerror=alert(1)>&';
  d.querySelector('dz-veri').güncelle([{ ad: value, puan: 1 }]); await tick();
  assert.equal(d.querySelector('img'), null); assert.match(d.querySelector('tbody').textContent, /<img/);
  assert.ok(d.querySelector('dz-veri').textContent.includes('\\u003c'));
  assert.equal(d.querySelector('dz-veri').oku()[0].ad, value);
  const hostile = JSON.parse('{"__proto__":{"polluted":true},"ad":"Güvenli"}');
  d.querySelector('dz-veri').güncelle([hostile]); await tick();
  assert.equal(d.querySelector('dz-veri').oku()[0].ad, 'Güvenli'); assert.equal({}.polluted, undefined);
});

test('hatalı JSON ve yinelenen kaynak Türkçe hata verir, düzeltilince toparlanır', async t => {
  const { d } = await page(t, `<dz-sayfa><dz-veri kimlik="öğrenciler">bozuk</dz-veri>${table}</dz-sayfa>`);
  assert.match(d.querySelector('[role="alert"]').textContent, /geçerli JSON değil/);
  d.querySelector('dz-veri').güncelle([]); await tick(); assert.equal(d.querySelector('[hatalı]'), null);
  assert.match(d.querySelector('tbody').textContent, /Sonuç yok/);
  const duplicate = d.createElement('dz-veri'); duplicate.setAttribute('kimlik', 'öğrenciler'); duplicate.textContent = '[]'; d.querySelector('dz-sayfa').append(duplicate); await tick();
  assert.match(d.querySelector('[role="alert"]').textContent, /bulunan: 2/);
  duplicate.remove(); await tick(); assert.equal(d.querySelector('[hatalı]'), null);
});

test('veri sonradan eklenebilir, tablo çıkarılıp takılınca tek bileşen oluşturur', async t => {
  const { d } = await page(t, `<dz-sayfa>${table}</dz-sayfa>`);
  assert.match(d.querySelector('[role="alert"]').textContent, /bulunan: 0/);
  const data = d.createElement('dz-veri'); data.setAttribute('kimlik', 'öğrenciler'); data.textContent = '[{"ad":"İpek"}]'; d.querySelector('dz-sayfa').append(data); await tick();
  const tbl = d.querySelector('dz-tablo'), old = tbl._bileşen; let disposed = 0;
  const dispose = old.yokEt; old.yokEt = () => { disposed++; dispose(); };
  tbl.remove(); assert.equal(disposed, 1);
  data.güncelle([{ ad: 'Ayşe' }]); await tick(); assert.equal(tbl.querySelector('table'), null);
  d.querySelector('dz-sayfa').append(tbl); await tick();
  assert.equal(tbl.querySelectorAll('table').length, 1); assert.match(tbl.textContent, /Ayşe/);
});

test('yanlış tür, boolean, sayfa sınırı ve sayaç taşması reddedilir', async t => {
  const { d } = await page(t, `<dz-sayfa>${rows}<dz-tablo kaynak="öğrenciler" aranabilir="false"></dz-tablo><dz-form><dz-alan ad="x" tür="__proto__"></dz-alan></dz-form><dz-sayaç başlangıç="9007199254740991"></dz-sayaç></dz-sayfa>`);
  assert.equal(d.querySelectorAll('[hatalı]').length, 2);
  const tbl = d.querySelector('dz-tablo'); tbl.setAttribute('aranabilir', 'hayır'); tbl.setAttribute('sayfa-boyu', '1001'); await tick();
  assert.match(tbl.textContent, /1–1000/);
  tbl.setAttribute('sayfa-boyu', '5'); await tick(); assert.equal(tbl.querySelector('input'), null);
  const counter = d.querySelector('dz-sayaç'); counter.querySelectorAll('button')[2].click();
  assert.match(counter.querySelector('[role="alert"]').textContent, /sınırını/); assert.equal(counter.değer, Number.MAX_SAFE_INTEGER);
});

test('form eksik kaynağa yazarken başarı olayı göndermez', async t => {
  const { w, d } = await page(t, '<dz-sayfa><dz-form kaynak="yok"><dz-alan ad="ad"></dz-alan></dz-form></dz-sayfa>');
  let calls = 0; d.querySelector('dz-form').addEventListener('dz-gönder', () => calls++);
  d.querySelector('form').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick();
  assert.equal(calls, 0); assert.match(d.querySelector('form [role="alert"]').textContent, /bulunan: 0/);
});

test('motor iki defa yüklenebilir ve küçültülmüş dağıtım aynı örneği çalıştırır', async t => {
  const min = fs.readFileSync(path.join(__dirname, '../dizge-html.min.js'), 'utf8');
  const { w, d } = await page(t, `<dz-sayfa>${rows}${table}</dz-sayfa>`, min);
  w.eval(min); w.DizgeHTML.kur(); await tick();
  assert.equal(d.querySelectorAll('table').length, 1); assert.equal(d.querySelectorAll('#dizge-styles').length, 1);
  assert.equal(w.DizgeHTML.sürüm, '0.1.0');
});

test('örnek kaynak çalıştırılabilir kullanıcı JS veya Base64 içermiyor', () => {
  const html = fs.readFileSync(path.join(__dirname, '../examples/turkce-html.html'), 'utf8');
  assert.equal((html.match(/<script\b/g) || []).length, 1);
  assert.match(html, /<script src="\.\.\/dizge-html.js" defer><\/script>/);
  assert.doesNotMatch(html, /base64|\bonclick=|\bconst\s|\bfunction\s/);
});
