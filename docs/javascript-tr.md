# Dizge.js — Türkçe kaynak ve Türkçe API

**Sürüm 0.2.0.** Bu sürümde `dizge.js` dosyasının içi Türkçedir: değişkenler, fonksiyonlar, yorumlar, hata mesajları ve varsayılan arayüz metinleri Türkçe yazılır. İngilizce API adları geriye uyumluluk için alias olarak korunur.

Tek dosya HTML'de `dizge.js` içeriğini olduğu gibi gömün. Sağ tıkla kaynağı açan kişi ağırlıklı olarak Türkçe kod görür. `dizge.min.js` üretim boyutu içindir; küçültülmüş kodda değişken adları kısaldığı için Türkçe görünüm kaybolur.

## 1. Kurulum

### Tek dosya HTML (önerilen)

`dizge.js` içeriğini `<script>` etiketinin içine kopyalayın. Harici dosya veya ağ isteği gerekmez.

```html
<script>
/* dizge.js içeriği buraya */
</script>
<script>
  const tablo = Dizge.arayüz.tablo({ satırlar: [{ ürün: 'Kalem', tutar: 30 }] });
  const uygulama = Dizge.arayüz.uygulama('#uygulama', {
    başlık: 'İlk uygulamam',
    içerik: [tablo.el]
  });
  uygulama.kullan(tablo);
</script>
```

Hazır örnek: [examples/tek-dosya.html](../examples/tek-dosya.html). Yeniden üretmek için:

```sh
npm run build:tek
```

### Ayrı dosya

```html
<script src="dizge.js"></script>
```

### ESM / CommonJS

```js
import Dizge, { veri, arayüz, istatistik } from './dizge.mjs';
const D = require('./dizge.js');
```

## 2. Türkçe API özeti

| Türkçe | İngilizce alias | İş |
|---|---|---|
| `Dizge.veri(satırlar)` | `data` | Tablo üretir |
| `Dizge.Tablo` | `Table` | Tablo sınıfı |
| `Dizge.istatistik` | `stats` | Özet, yüzdelik, histogram, regresyon |
| `Dizge.csv.çöz` / `.yaz` | `parse` / `stringify` | CSV |
| `Dizge.yapılandır` | `configure` | PDF/XLSX bağlayıcıları |
| `Dizge.xlsx.oku` / `.yaz` | `read` / `write` | XLSX |
| `Dizge.pdf.metin` / `.rapor` / `.birleştir` | `text` / `report` / `merge` | PDF |
| `Dizge.indir` | `download` | Dosya indirir |
| `Dizge.depo` | `store` | Durum deposu |
| `Dizge.geciktir` | `debounce` | Gecikmeli çağrı |
| `Dizge.parçala` | `chunks` | Bloklu işlem |
| `Dizge.analizEt` | `analyze` | Senkron analiz |
| `Dizge.eşzamansızAnalizEt` | `analyzeAsync` | Worker ile analiz |
| `Dizge.arayüz` | `ui` | Arayüz bileşenleri |
| `Dizge.biçim` | `format` | Sayı/para/tarih |
| `Dizge.stiller` | `styles` | CSS metni |

## 3. Veri ve tablo

```js
const satırlar = [
  { ürün: 'Kalem', kategori: 'Kırtasiye', tutar: 30 },
  { ürün: 'Kulaklık', kategori: 'Elektronik', tutar: 1250 }
];

const sonuç = Dizge.veri(satırlar)
  .süz(s => s.tutar > 50)
  .türet({ kdv: s => s.tutar * .20 })
  .sırala('tutar', 'desc')
  .seç('ürün', 'tutar', 'kdv')
  .diziye();
```

Tablo yöntemleri: `süz`, `seç`, `türet`, `sırala`, `dilimle`, `sayfala`, `tekil`, `grupla`, `özetle`, `betimle`, `birleştir`, `sütunlar`, `sütun`, `diziye`, `uzunluk`.

```js
const toplamlar = Dizge.veri(satırlar)
  .grupla('kategori')
  .özetle({ toplam: t => Dizge.istatistik.özet(t.sütun('tutar')).toplam })
  .diziye();
```

`grupla` sonucu `özetle`/`girdiler` ve İngilizce `aggregate`/`entries` sunar.

## 4. İstatistik

```js
Dizge.istatistik.özet([1, 2, 3, null]);      // sayı, eksik, toplam, ortalama, varyans...
Dizge.istatistik.yüzdelik(değerler, .25);    // doğrusal enterpolasyon
Dizge.istatistik.ortanca(değerler);
Dizge.istatistik.histogram(değerler, 10);
Dizge.istatistik.regresyon(xs, ys);          // eğim, kesişim, r, r2
Dizge.istatistik.korelasyon(xs, ys);
```

Yalnızca sonlu sayılar kullanılır; metin sayıya çevrilmez. Özet nesnesi hem Türkçe (`sayı`, `ortalama`, `varyans`) hem İngilizce (`count`, `mean`, `variance`) alanları taşır.

## 5. CSV

```js
const satırlar = Dizge.csv.çöz(await dosya.text(), { enÇokSatır: 100000 });
const metin = Dizge.csv.yaz(satırlar, { sütunlar: ['ürün', 'tutar'] });
Dizge.indir('\uFEFF' + metin, 'veri.csv', 'text/csv;charset=utf-8');
```

Tırnaklı alan, CRLF/LF, BOM, hücre içi satır sonu ve boş hücre desteklenir. Dışa aktarımda `güvenli: true` varsayılandır ve `= + - @` ile başlayan metinleri apostrofla korur.

## 6. XLSX ve PDF

Bağlayıcılar isteğe bağlıdır; çekirdeğe gömülmez.

```js
Dizge.yapılandır({ xlsx: XLSX });
const kitap = await Dizge.xlsx.oku(dosya, { sayfa: 'Satışlar', enÇokSatır: 100000 });
const baytlar = await Dizge.xlsx.yaz({ Satışlar: kitap.satırlar });
```

```js
Dizge.yapılandır({ pdf: PDFLib, fontkit, pdfjs });
const rapor = await Dizge.pdf.rapor({
  başlık: 'Satış özeti',
  satırlar: ['İstanbul · Ekim'],
  veriSatırları: satırlar,
  yazıTipiBaytları: await font.arrayBuffer()
});
Dizge.indir(rapor, 'rapor.pdf', 'application/pdf');
const { sayfalar, metin } = await Dizge.pdf.metin(dosya);
const birleşik = await Dizge.pdf.birleştir([pdf1, pdf2]);
```

Türkçe PDF için Unicode glif içeren TTF/OTF gerekir. PDF.js metin çıkarır; sayfa görüntüleme/zoom için PDF.js'i doğrudan kullanın.

## 7. Arayüz

```js
const { arayüz, biçim } = Dizge;

const tablo = arayüz.tablo({
  satırlar,
  sayfaBoyu: 10,
  etiket: 'Satışlar',
  sütunlar: [
    { anahtar: 'ürün', etiket: 'ÜRÜN' },
    { anahtar: 'tutar', etiket: 'TUTAR', biçimle: v => biçim.para(v) }
  ]
});

const uygulama = arayüz.uygulama('#uygulama', {
  başlık: 'Satış paneli',
  altBaşlık: 'Veriler tarayıcıda kalır.',
  eylemler: [arayüz.düğme('Tema', () => uygulama.tema('dark'))],
  içerik: [
    arayüz.ızgara(
      arayüz.ölçüt('TOPLAM', biçim.para(1000)),
      arayüz.ölçüt('SATIR', biçim.sayı(24))
    ),
    arayüz.kart('Satışlar', tablo.el)
  ]
});
uygulama.kullan(tablo);
```

Bileşenler: `öğe`, `düğme`, `kart`, `ölçüt`, `tablo`, `grafik`, `form`, `sekmeler`, `pencere`, `bildirim`, `uygulama`, `ızgara`, `yığın`, `stilleriKur`.

Form alanları Türkçe anahtarlarla verilebilir:

```js
arayüz.form({
  alanlar: [
    { ad: 'ürün', etiket: 'Ürün', zorunlu: true },
    { ad: 'tutar', etiket: 'Tutar (₺)', tür: 'number', enAz: 0, adım: .01 }
  ],
  gönder: değerler => console.log(değerler),
  düğmeMetni: 'Kaydet'
});
```

## 8. Worker

```js
const sonuç = await Dizge.eşzamansızAnalizEt(satırlar, [
  { tür: 'süz', anahtar: 'tutar', işleç: 'büyük', değer: 100 },
  { tür: 'betimle', anahtarlar: ['tutar'] }
], { işçiAdresi: './dizge.worker.js' });
```

Worker dosyası `dizge.js` ile aynı klasörde HTTP üzerinden sunulmalıdır. Tek dosya HTML'de Worker'ı Blob URL ile oluşturmadıkça `eşzamansızAnalizEt` kullanmayın; `analizEt` aynı işi ana iş parçacığında yapar.

## 9. Tek dosya örneği

[examples/tek-dosya.html](../examples/tek-dosya.html) dosyası:

- `dizge.js` kaynağını inline taşır,
- Türkçe API ve Türkçe yorumlar kullanır,
- tablo, ölçüt, grafik, form, pencere, bildirim ve CSV indirme gösterir,
- ağ isteği yapmaz.

`npm run build:tek` ile `examples/tek-dosya.kaynak.html` şablonundan üretilir. `npm run check:tek` güncelliğini denetler.

## 10. AI için kısa istem

```text
Tek dosya HTML üret. Dizge.js 0.2.0'ı dosyanın içine inline göm.
Türkçe API kullan: Dizge.arayüz.uygulama, arayüz.tablo, arayüz.ölçüt,
arayüz.düğme, arayüz.pencere, arayüz.bildirim, Dizge.indir, Dizge.csv.
Değişken adları, yorumlar ve kullanıcı metinleri Türkçe olsun.
dizge.min.js kullanma; küçültülmüş kod Türkçe görünmez.
Mevcut olmayan API uydurma; docs/javascript-tr.md ve dizge.d.ts dosyalarına uy.
```

## 11. Sınırlar

- JavaScript anahtar kelimeleri ve tarayıcı API'leri İngilizce kalır.
- `dizge.min.js` küçültülmüştür; Türkçe kaynak görünümü için `dizge.js` kullanın.
- OCR, Excel formül hesaplama ve gelişmiş PDF tablo mizanpajı yoktur.
- PDF/XLSX bağlayıcıları ayrıca yüklenir; tamamen çevrimdışı tek dosya için bunları da gömmek gerekir.
- 100.000 satır her cihazda akıcı çalışma garantisi değildir.
