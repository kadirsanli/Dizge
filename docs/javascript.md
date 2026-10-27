# Dizge.js — HTML uygulamaları için araç kutusu

**Sürüm 0.2.0.** Tek script ile UI, veri işlemleri ve CSV; isteğe bağlı bağlayıcılarla XLSX ve PDF. Derleyici veya framework gerektirmez. İnsanların ve AI kod üreticilerinin aynı küçük API ile okunabilir HTML araçları kurması için tasarlanmıştır.

**Türkçe kaynak:** 0.2.0 ile `dizge.js` içi Türkçeleştirildi. Türkçe API (`Dizge.veri`, `Dizge.arayüz.tablo`, `Dizge.istatistik.özet`) birincil, İngilizce adlar (`Dizge.data`, `Dizge.ui.table`, `Dizge.stats.summary`) geriye uyumluluk için alias'dır. Tek dosya HTML'de küçültülmemiş `dizge.js` gömülürse kaynak Türkçe görünür. Ayrıntılı Türkçe rehber: [javascript-tr.md](javascript-tr.md).

Bu kütüphane mevcut `.dzg → Python/NumPy` dilinden ayrı bir JavaScript katmanıdır. `.dzg` derlemez. İlk sürümün desteklediği kapsam aşağıda açıkça tanımlıdır; her belge formatını, her grafik türünü veya her veri büyüklüğünü kapsama iddiası yoktur.

## 1. Kurulum

Depodan `dizge.js` veya `dizge.min.js` dosyasını indirin ve HTML dosyanızın yanına koyun:

```html
<!doctype html>
<html lang="tr">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>İlk Dizge uygulamam</title>
<div id="app"></div>
<script src="dizge.js"></script>
<script>
  const satırlar = [{ ürün: 'Kalem', tutar: 30 }, { ürün: 'Defter', tutar: 80 }];
  const tablo = Dizge.arayüz.tablo({ satırlar });
  const uygulama = Dizge.arayüz.uygulama('#app', {
    başlık: 'Satışlar',
    içerik: [Dizge.arayüz.ölçüt('Toplam', Dizge.biçim.para(110)), tablo.el]
  });
  uygulama.kullan(tablo); // uygulama.yokEt() tabloyu da temizler
</script>
</html>
```

Tek dosya HTML için `dizge.js` içeriğini `<script>` etiketinin içine kopyalayın. `dizge.min.js` yalnızca boyut içindir; küçültülmüş kodda değişken adları kısaldığı için Türkçe kaynak görünümü kaybolur.

Çekirdek kendi başına ağ isteği yapmaz. Stil ilk `arayüz.uygulama()` çağrısında eklenir. Tek bileşen kullanırken `arayüz.stilleriKur()` çağırın ve üst öğeye `class="dz"` verin. CSP nonce için `arayüz.uygulama('#app', { nonce: 'sunucunun-nonce-değeri' })` kullanın. Sıkı CSP ortamında `Dizge.stiller` içeriğini ayrı CSS dosyası olarak sunabilirsiniz.

ESM: `import D, { veri, arayüz } from './dizge.mjs'`. CommonJS: `const D = require('./dizge.js')`. İngilizce `data`, `ui` ihracı da korunur. Paket npm kayıt sistemine yayımlanmış değildir; `npm pack` ile yerel paket üretilebilir. TypeScript tanımları `dizge.d.ts` içindedir. Hedef: güncel Chrome/Edge, Firefox, Safari; Node ≥20 (UI hariç). Chromium otomatik test edilmiştir, diğer tarayıcılar için bu sürümde çalıştırılmış uyumluluk kanıtı yoktur.

## 2. Veri işlemleri

```js
const result = D.data(rows)
  .filter(r => r.tutar > 0)
  .derive({ kdv: r => r.tutar * .20 })
  .sort('tutar', 'desc')
  .select('ürün', 'tutar', 'kdv')
  .page(1, 25)
  .toArray();

const totals = D.data(sales).groupBy('şehir', 'kategori').aggregate({
  adet: t => t.length,
  toplam: t => D.stats.summary(t.column('tutar')).sum
}).toArray();

const joined = D.data(orders).join(customers, {
  left: 'customerId', right: 'id', how: 'left', maxRows: 100000
}).toArray();
```

| API | Davranış |
|---|---|
| `data(rows)` / `new Table(rows)` | Kayıt dizisini alır; dizi kopyalanır, satır nesneleri paylaşılır. |
| `length`, `columns()`, `column(key)`, `toArray()` | Sütunlar, sütun değerleri, yeni dış dizi. `column` işlev de alır. |
| `filter`, `select`, `derive`, `sort`, `slice`, `page` | Yeni Table üretir; kaynak diziyi sıralamaz/değiştirmez. |
| `derive({name: (row,index) => value})` | Hesaplanan alanlar aynı kaynak satırdan üretilir. |
| `unique(key)` | İlk görülen kaydı korur. |
| `groupBy(...keys).aggregate(reducers)` | Türleri ayıran Map anahtarları; çok alanlı gruplama. |
| `groupBy(...keys).entries()` | `{keys, table}` grupları. |
| `aggregate(reducers)` | Her reducer bir Table alır. |
| `describe(...keys)` | Her alan için sayısal özet. |
| `join(other, options)` | Hash join; inner/left; çoğul eşleşmeler korunur. Sağ alan çakışmasına `_right` eklenir; ikinci çakışma hatadır. Null sağ anahtarlar eşleşmez. |

Satır nesnelerini ve iç içe değerleri doğrudan değiştirirseniz diğer Table görünümleri de etkilenir. `derive` üst düzey yeni satır üretir; derin kopya yapmaz. İç içe yollar yorumlanmaz; `'a.b'` gerçek bir alan adıdır. `sort` kararlıdır; varsayılan artan sıralamada null/undefined/NaN sonda, azalan sıralamada baştadır. Sayılar sayısal, diğer değerler `localeCompare` ile karşılaştırılır. Gruplamada nesne anahtarları kimlikleriyle eşleşir.

### İstatistik

```js
D.stats.summary([1, 2, 3, null]); // count=3, missing=1, mean=2
D.stats.quantile([1, 2, 3, 4], .25); // 1.75; doğrusal enterpolasyon
D.stats.median(values);
D.stats.histogram(values, 10);
D.stats.regression(xs, ys); // count, slope, intercept, r, r2
D.stats.correlation(xs, ys);
```

Yalnızca sonlu `number` değerleri kullanılır. Sayı gibi görünen metinler otomatik çevrilmez. Özet: count, missing, sum, mean, min, max, population variance, std ve sampleVariance. Boş sayısal kümede sum=0, diğer istatistikler null; tek gözlemde sampleVariance null. Regresyon çift bazında eksikleri çıkarır, eşit uzunluk ister; sabit x için eğim, sabit seride korelasyon null. Welford varyansı ve telafili toplam kullanılır; JavaScript kayan nokta sınırları geçerlidir. Finansal kesin ondalık aritmetik değildir.

## 3. CSV

```js
const rows = D.csv.parse(await file.text(), { delimiter: ',', maxRows: 100000 });
const text = D.csv.stringify(rows, { columns: ['ürün', 'tutar'] });
D.download('\uFEFF' + text, 'veri.csv', 'text/csv;charset=utf-8');
```

Tırnaklı alan, çift tırnak kaçışı, CRLF/LF, hücre içi satır sonu, BOM ve boş hücre desteklenir. Parse tüm hücreleri metin olarak korur. `header:false` dizi dizisi döndürür. Yinelenen başlık, kapanmayan tırnak ve tutarsız sütun sayısı hata üretir. Varsayılan maxRows=1.000.000. Dışa aktarım varsayılan `safe:true` ile `= + - @` ile başlayan metinleri apostrofla korur; bu hücre değerini kasıtlı değiştirir. Tam metin round-trip gerekiyorsa güvenilir veride `safe:false` kullanın. CSV dosyasını Excel açarken ayırıcı seçimi yerel ayarlara bağlıdır.

## 4. XLSX

SheetJS CE 0.20.3 ile test edilmiştir. [Resmî kurulum](https://docs.sheetjs.com/docs/getting-started/installation/standalone/). Bağlayıcıları nesne veya bir kez çağrılan async loader ile verin:

```html
<script src="vendor/xlsx.full.min.js"></script>
<script>
  Dizge.configure({ xlsx: XLSX });
</script>
```

```js
const { sheets, sheet, rows } = await D.xlsx.read(file, {
  sheet: 'Satışlar', maxBytes: 20 * 1024 * 1024, maxRows: 100000
});
const bytes = await D.xlsx.write({ Satışlar: rows, Özet: [{ toplam: 100 }] });
D.download(bytes, 'rapor.xlsx');
```

Okumada varsayılan ilk sayfa seçilir. Başlık satırından nesneler üretilir; yinelenen/boş başlıklar SheetJS tarafından normalize edilir. Sayı/metin/boolean/tarih korunur. Formül hesaplayıcısı yoktur; dosyadaki mevcut önbellek sonuçları okunur. Formül ve VBA çalıştırılmaz. Yazım skaler veya Date hücre kabul eder; formül nesnesi reddedilir, `'=1+1'` gibi metinler Excel formülüne dönüşmez. Hücre stili, makro, resim, grafik veya eski dosya biçimlerinin tam korunumu hedeflenmez. Dosya limiti varsayılan 50 MiB; sıkıştırılmış dosya boyutu açılmış bellek tüketimini sınırlamaz. Güvenilmeyen çok büyük dosyalar için uygulama düzeyinde ayrı worker/process ve bellek/zaman sınırı kullanın. AbortSignal senkron SheetJS parse işlemini ortasında durduramaz.

## 5. PDF

PDF üretimi/birleştirme: [pdf-lib](https://pdf-lib.js.org/), metin çıkarma: [PDF.js](https://mozilla.github.io/pdf.js/examples/). Türkçe için fontkit + Türkçe glif içeren lisanslı TTF/OTF gerekir.

```js
D.configure({
  pdf: PDFLib,
  fontkit: fontkit,
  pdfjs: async () => {
    const lib = await import('./vendor/pdf.mjs');
    lib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.mjs';
    return lib;
  }
});
const response = await fetch('./fonts/LiberationSans-Regular.ttf');
if (!response.ok) throw new Error('Font yüklenemedi');
const report = await D.pdf.report({
  title: 'Satış özeti', lines: ['İstanbul · Ekim'], rows,
  fontBytes: await response.arrayBuffer()
});
D.download(report, 'rapor.pdf', 'application/pdf');
const { pages, text } = await D.pdf.text(file, { maxPages: 100 });
const combined = await D.pdf.merge([pdf1, pdf2]);
```

`report` A4 metin raporu, satır kaydırma, otomatik sayfalama ve `|` ile ayrılmış veri satırları üretir; HTML ekran görüntüsü veya gelişmiş tablo mizanpaj motoru değildir. Varsayılan font Helvetica yalnızca WinAnsi karakterlerini kapsar; Türkçe karakterler için fontBytes verin. fontSize=11, margin=44 varsayılandır. `text` sayfa sırasıyla metin katmanını çıkarır; OCR, taranmış belgeden metin veya tablonun semantik yeniden kurulumu yoktur. `password` parametresi metin okuma için desteklenir. Metin çıkarma sonunda PDF.js kaynakları temizlenir. `maxPages` varsayılan 1000. `merge` girdi sırasıyla sayfaları kopyalar; imza ve belge düzeyindeki form/metadata korunumu garanti edilmez.

## 6. UI bileşenleri

Türkçe adlar: `arayüz.öğe`, `düğme`, `kart`, `ölçüt`, `tablo`, `grafik`, `form`, `sekmeler`, `pencere`, `bildirim`, `uygulama`, `ızgara`, `yığın`, `stilleriKur`. İngilizce `ui.el`, `button`, `card`, `metric`, `table`, `chart`, `tabs`, `modal`, `toast`, `app`, `grid`, `stack`, `installStyles` alias olarak çalışır.

| İşlev | Sonuç / seçenekler |
|---|---|
| `ui.el(tag, props, ...children)` | DOM düğümü; metinler textContent ile. Olaylar `on:{click:fn}`. |
| `ui.app(target, options)` | Başlık, alt başlık, actions, content, light/dark tema; `.el`, `.theme()`, `.use()`, `.destroy()`. |
| `ui.card(title, ...children)`, `ui.grid`, `ui.stack` | Responsive düzen. |
| `ui.metric(label, value, note)` | İstatistik kartı. |
| `ui.button(label, handler, props)` | `type=button`, `data-variant=primary` seçeneği. |
| `ui.table({rows, columns, pageSize, searchable, label})` | `.el`, `.setRows(rows)`, `.destroy()`; arama/sıralama/sayfalama. |
| `ui.chart({values, labels, type, label, maxPoints})` | SVG bar/line; negatif değerler; varsayılan en çok 300 kova. |
| `ui.form({fields, onSubmit, submitLabel})` | Etiket, tarayıcı doğrulaması, özel validate, async submit hata alanı. |
| `ui.tabs([{label,content}])` | ARIA roller, ok tuşları/Home/End. |
| `ui.modal({title,content,parent})` | Native dialog: `.el`, `.close()`; Escape ve önceki odağa dönüş. |
| `ui.toast(message, options)` | role=status; temizleme işlevi. |

Tablo sütunu `{key,label,sortable,format(value,row)}` biçimindedir. Format metin veya güvenilir DOM düğümü döndürebilir. Arama 150 ms debounce kullanır, bütün satırlarda arar; sayfalama yalnızca görünen kayıtları DOM'a ekler. Grafik örneklemesi ardışık kovaların ortalamasıdır; tepe değerleri saklamak için ham veriyi ayrı analiz edin. Ekran okuyucu için grafiğe anlamlı label verin ve aynı verinin tablosunu sunun.

Form alanları: name, label, type, value, required, min/max/step, options ve `validate(value) → hata metni | undefined`. Sayı alanında boş girdi null olur. HTML event handler metinleri, innerHTML, script/iframe gibi etiketler ve javascript: URL reddedilir. Bu yardımcı, uygulamanızın kendi oluşturduğu DOM veya CSS için genel bir sanitizer değildir; güvenilmeyen metni çocuk metni olarak verin.

CSS değişkenleri `.dz` altında `--dz-accent`, `--dz-bg`, `--dz-panel`, `--dz-text`, `--dz-muted`, `--dz-line`, `--dz-radius` ile özelleştirilir. Tema `data-theme="dark"`. Modalı tema sahibi app.el içine ekleyin. Bileşenleri kaldırırken `.destroy()` çağırın; `app.use(component)` sahipliği kaydeder, kendisi DOM'a eklemez.

## 7. Durum, performans ve worker

```js
const state = D.store({ count: 0 });
const unsubscribe = state.subscribe(value => console.log(value));
state.set(old => ({ ...old, count: old.count + 1 }));
// Aynı mikro-görev aralığındaki güncellemeler tek bildirime birleştirilir.
unsubscribe(); state.destroy();

const result = await D.analyzeAsync(rows, [
  { type: 'filter', key: 'tutar', operator: 'gt', value: 100 },
  { type: 'describe', keys: ['tutar'] }
], { workerUrl: './dizge.worker.js', signal: controller.signal });
```

Worker dosyası `dizge.js` ile aynı klasörde HTTP üzerinden sunulmalıdır. Worker: filter(eq/gt/gte/lt/lte/contains), sort, select, slice, describe. `describe` sonlandırıcı işlemdir; sonraki işlemler uygulanmaz. Diziler structured clone ile kopyalanır; küçük veri için worker açma/kopyalama maliyeti doğrudan `analyze` çağrısından yüksek olabilir. Her çağrı bağımsız worker açar, sonuç/hata/iptalde kapatır. İşlev veya eval gönderilmez. XLSX/PDF bağlayıcıları bu analitik worker'ın parçası değildir.

`chunks(items, fn, {size,signal,onProgress})` ana iş parçacığını her blok sonunda serbest bırakır; fn senkron olmalıdır. `debounce(fn, delay)` `.cancel()` içerir. `format.number`, `format.currency`, `format.date` Intl tabanlıdır, varsayılan tr-TR/TRY kullanır.

Maliyet: filtre/özet O(n), sıralama O(n log n), hash join O(n+m+k), quantile O(n log n), tabloda DOM O(pageSize×columns). İşlemler eager'dır; sorgu optimizer veya streaming dosya parser yoktur. 100 bin satır örneği her cihazda akıcı çalışma garantisi değildir. Ham ölçümler [javascript-benchmark.json](javascript-benchmark.json) içindedir.

## 8. AI ile uygulama üretme talimatı

AI aracınıza [AI rehberini](javascript-ai.md) ve `dizge.d.ts` dosyasını verin. İstenen arayüzü belirtin; mevcut API dışındaki işlevleri uydurmamasını, dosya bağımlılıklarını açıkça yapılandırmasını ve yaşam döngüsünü temizlemesini isteyin.

## 9. Geliştirme / doğrulama

```sh
npm ci
npm test
npm run check
npm run build
npm run build:tek
npm run check:tek
npm run bench
npm run test:browser
```

Browser testi için `npx playwright install chromium` gerekir. Örneği sunmak için depo kökünde `python -m http.server 8080`; sonra `http://localhost:8080/examples/javascript/`. PDF/Excel demo bağımlılıkları sürümü sabit CDN'den ilk kullanımda yüklenir. Üretimde yerel vendor dosyaları kullanın; internet gerektirmeyen kullanım için fontları ve PDF worker'ını da yerelleştirin. Testler gerçek XLSX ve PDF üretip yeniden okur; UI testleri jsdom + Chromium, tip testleri tsc ile çalışır. JavaScript kodu [MIT lisanslıdır](../LICENSE-JS); bağımlılıkların kendi lisansları vardır.
