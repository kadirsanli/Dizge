import D, { data, ui, stats, Operation, veri, istatistik, arayüz, Tablo } from '../dizge';
const rows = [{ name: 'A', value: 2 }];
const derived = data(rows).derive({ doubled: r => r.value * 2 }).select('doubled');
const n: number = derived.toArray()[0].doubled;
const table = ui.table({ rows, columns: [{ key: 'value', format: value => String(value) }] });
ui.app(document.body).use(table);
stats.summary(new Float64Array([1, 2]));

// Türkçe API aynı tiplerle çalışır.
const türkçe = veri(rows).türet({ iki: r => r.value * 2 }).seç('iki');
const m: number = türkçe.diziye()[0].iki;
const tablo = arayüz.tablo({ satırlar: rows, sütunlar: [{ anahtar: 'value', biçimle: value => String(value) }] });
arayüz.uygulama(document.body).kullan(tablo);
istatistik.özet(new Float64Array([1, 2]));
const tabloNesnesi: Tablo<typeof rows[number]> = new Tablo(rows);
tabloNesnesi.sırala('value').süz(r => r.value > 0);
const ops: Operation[] = [{ type: 'filter', key: 'value', operator: 'gt', value: n }];
D.analyze(rows, ops);
const türkçeOps: Operation[] = [{ tür: 'süz', anahtar: 'value', işleç: 'büyük', değer: m }];
D.analizEt(rows, türkçeOps);
D.csv.parse('x\n1')[0].x.toUpperCase();
D.csv.parse('1,2', { header: false })[0][0].toUpperCase();
D.csv.çöz('x\n1')[0].x.toUpperCase();
D.csv.çöz('1,2', { başlık: false })[0][0].toUpperCase();
// @ts-expect-error typed columns reject misspellings
data(rows).select('missing');
// @ts-expect-error invalid direction
data(rows).sort('value', 'up');
// @ts-expect-error Turkish columns reject misspellings
veri(rows).seç('eksik');
// @ts-expect-error Turkish direction rejects invalid values
veri(rows).sırala('value', 'yukarı');
