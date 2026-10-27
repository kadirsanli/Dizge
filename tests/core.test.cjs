const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('../dizge.js');

test('immutable array operations and derived fields', () => {
  const rows = [{ x: 3, category: 'A' }, { x: 1, category: 'B' }, { x: 2, category: 'A' }];
  const result = D.data(rows).filter(r => r.x > 1).derive({ twice: r => 2 * r.x }).sort('x').select('twice').toArray();
  assert.deepEqual(result, [{ twice: 4 }, { twice: 6 }]); assert.deepEqual(rows.map(r => r.x), [3, 1, 2]);
  assert.equal(D.data(rows).page(2, 2).length, 1); assert.equal(D.data(rows).unique('category').length, 2);
  assert.throws(() => D.data(rows).page(0)); assert.throws(() => D.data(rows).sort('x', 'wrong'));
});
test('groups preserve typed keys, null, and prototype-shaped names', () => {
  const grouped = D.data([{ k: 1, v: 4 }, { k: '1', v: 7 }, { k: '__proto__', v: 2 }, { k: 1, v: 8 }]).groupBy('k').aggregate({ total: t => D.stats.summary(t.column('v')).sum }).toArray();
  assert.deepEqual(grouped, [{ k: 1, total: 12 }, { k: '1', total: 7 }, { k: '__proto__', total: 2 }]);
  const r = D.data([{ a: 'a|b', b: 'c' }, { a: 'a', b: 'b|c' }]).groupBy('a', 'b').entries(); assert.equal(r.length, 2);
});
test('hash joins include duplicate matches, left rows, limits and collision errors', () => {
  const left = D.data([{ id: 1, v: 'a' }, { id: 2, v: 'b' }]);
  assert.equal(left.join([{ id: 1, v: 'x' }, { id: 1, v: 'y' }], { left: 'id', how: 'left' }).length, 3);
  assert.deepEqual(left.join([{ id: 1, v: 'x' }], { left: 'id' }).toArray()[0], { id: 1, v: 'a', v_right: 'x' });
  assert.throws(() => left.join([{ id: 1 }, { id: 1 }], { left: 'id', maxRows: 1 }));
  assert.throws(() => D.data([{ id: 1, v: 2, v_right: 3 }]).join([{ id: 1, v: 4 }], { left: 'id' }));
});
test('statistics match analytic fixtures and exclude missing data', () => {
  const s = D.stats.summary([1, 2, 3, 4, null, NaN, Infinity, '8']);
  assert.equal(s.mean, 2.5); assert.equal(s.variance, 1.25); assert.equal(s.missing, 4); assert.equal(s.sampleVariance, 5 / 3);
  assert.equal(D.stats.quantile([4, 1, 2, 3], .25), 1.75); assert.equal(D.stats.summary([]).mean, null);
  assert.equal(D.stats.summary([1e12 + 1, 1e12 + 2, 1e12 + 3]).variance, 2 / 3);
  assert.equal(D.stats.regression([1, 2, 3], [3, 5, 7]).slope, 2); assert.equal(D.stats.regression([1, 2, 3], [3, 5, 7]).intercept, 1);
  assert.equal(D.stats.correlation([2, 2], [1, 2]), null); assert.throws(() => D.stats.regression([1], []));
  assert.deepEqual(D.stats.histogram([0, 1, 2, 3, 4], 2).map(b => b.count), [2, 3]);
  assert.equal(D.stats.histogram([4, 4]).length, 1);
});
test('CSV quoted CRLF, escaped quotes, BOM, trailing empties and exact string preservation', () => {
  const rows = [{ name: 'İstanbul, Türkiye', note: 'a\r\nb "c"', n: '0012' }, { name: '', note: '', n: '' }];
  assert.deepEqual(D.csv.parse('\uFEFF' + D.csv.stringify(rows)), rows);
  assert.deepEqual(D.csv.parse('a,b\r\nx,\r\n'), [{ a: 'x', b: '' }]);
  assert.deepEqual(D.csv.parse('""', { header: false }), [['']]);
  assert.throws(() => D.csv.parse('a,a\n1,2')); assert.throws(() => D.csv.parse('a\n"x')); assert.throws(() => D.csv.parse('a\n"x"z'));
  assert.throws(() => D.csv.parse('a,b\nx')); assert.throws(() => D.csv.parse('a\n1\n2', { maxRows: 1 }));
  assert.equal(D.csv.parse(D.csv.stringify([{ a: '=1+1' }]))[0].a, "'=1+1");
  const dangerous = D.csv.parse('__proto__,constructor\nx,y')[0]; assert.equal(dangerous.__proto__, 'x'); assert.equal({}.polluted, undefined);
});
test('worker declarative analysis rejects unsupported operations', () => {
  assert.deepEqual(D.analyze([{ x: 1 }, { x: 3 }], [{ type: 'filter', key: 'x', operator: 'gt', value: 1 }]), [{ x: 3 }]);
  assert.throws(() => D.analyze([], [{ type: 'eval' }])); assert.throws(() => D.analyze([], [{ type: 'filter', operator: '__proto__' }]));
});
test('store batches notifications and disposes queued callbacks', async () => {
  const s = D.store(0), seen = []; const off = s.subscribe(v => seen.push(v)); s.set(1); s.set(v => v + 1);
  assert.equal(s.get(), 2); await Promise.resolve(); assert.deepEqual(seen, [0, 2]); off(); s.set(3); await Promise.resolve(); assert.deepEqual(seen, [0, 2]);
  s.subscribe(v => seen.push(v), false); s.set(4); s.destroy(); await Promise.resolve(); assert.deepEqual(seen, [0, 2]); assert.throws(() => s.set(5));
});
test('chunking reports progress and honors cancellation', async () => {
  const progress = []; assert.deepEqual(await D.chunks([1, 2, 3], x => x * 2, { size: 2, onProgress: x => progress.push(x) }), [2, 4, 6]); assert.equal(progress.at(-1), 1);
  const ctrl = new AbortController(); ctrl.abort(); await assert.rejects(D.chunks([1], x => x, { signal: ctrl.signal }), { name: 'AbortError' });
});
test('ESM and CommonJS exports agree', async () => { const esm = await import('../dizge.mjs'); assert.equal(esm.default.version, D.version); assert.equal(esm.data([{ a: 1 }]).length, 1); assert.equal(esm.veri([{ a: 1 }]).uzunluk, 1); assert.equal(esm.sürüm, D.sürüm); });
test('Türkçe API İngilizce aliaslarla aynı sonucu verir', async () => {
  const satırlar = [{ x: 3, tür: 'A' }, { x: 1, tür: 'B' }, { x: 2, tür: 'A' }];
  assert.deepEqual(D.veri(satırlar).süz(r => r.x > 1).türet({ iki: r => r.x * 2 }).sırala('x').seç('iki').diziye(),
    D.data(satırlar).filter(r => r.x > 1).derive({ iki: r => r.x * 2 }).sort('x').select('iki').toArray());
  assert.equal(D.veri(satırlar).uzunluk, 3);
  const özet = D.istatistik.özet([1, 2, 3, 4, null, NaN, Infinity, '8']);
  assert.equal(özet.ortalama, 2.5); assert.equal(özet.mean, 2.5); assert.equal(özet.eksik, 4);
  assert.equal(D.istatistik.yüzdelik([4, 1, 2, 3], .25), 1.75);
  assert.deepEqual(D.csv.çöz(D.csv.yaz([{ ad: 'İstanbul', not: 'a,b' }])), [{ ad: 'İstanbul', not: 'a,b' }]);
  assert.deepEqual(D.analizEt(satırlar, [{ tür: 'süz', anahtar: 'x', işleç: 'büyük', değer: 1 }]), [{ x: 3, tür: 'A' }, { x: 2, tür: 'A' }]);
  const d = D.depo(0), görülen = []; d.aboneOl(v => görülen.push(v)); d.ayarla(1); assert.equal(d.al(), 1); await Promise.resolve(); assert.deepEqual(görülen, [0, 1]); d.yokEt();
  assert.deepEqual(await D.parçala([1, 2, 3], x => x * 2, { boyut: 2 }), [2, 4, 6]);
});
