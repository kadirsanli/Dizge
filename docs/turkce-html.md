# Türkçe HTML — deneysel motor 0.1.0

Amaç: Türkçe etiketlerle kısa, okunabilir uygulama tanımları. Mevcut Dizge.js 0.3.0 bileşenleri kullanılır. İlk sürüm sayaç, tablo ve form akışını kapsar; `.dzg`, genel amaçlı olay dili veya tam CSS çevirisi içermez.

## Çalıştırma ve dağıtım

Depodaki `examples/turkce-html.html` dosyasını tarayıcıda açın. Yerel `dizge-html.js` mevcut çekirdeği içerir; ayrıca `dizge.js` yüklemek gerekmez. JavaScript ve Custom Elements desteği gerekir. Form verileri yalnızca sayfa açıkken bellekte tutulur; yenilemede kaynak JSON'a dönülür.

```html
<script src="dizge-html.js" defer></script>
```

Geliştirme: `npm ci`, `npm run build`, `npm test`, `npm run check`, `npm run test:html`. Son komut Playwright Chromium gerektirir: `npx playwright install chromium`. Mevcut bir Chromium tabanlı tarayıcı `DIZGE_BROWSER_PATH` ortam değişkeniyle seçilebilir.

Paket adı `@kadirsanli/dizge`dir. npm kaydı yayımlanmış varsayılmamalıdır. Kayıt sistemine yayın yapmadan yerel paketi deneyin:

```sh
npm pack
# Üretilen .tgz dosyasını başka projede npm install <dosya-yolu> ile kurun.
```

Paket `dizge-html.js` ve `dizge-html.min.js` tarayıcı girişlerini içerir. Bunlar otomatik kayıt yapan klasik tarayıcı betikleridir; Node.js'te çalışan bir DOM motoru veya ESM modül API'si değildir. npm kurulumu dosyaları sunucunuzda otomatik olarak web adresine açmaz; dağıtım klasörünüze kopyalayın veya paketleyicinizle statik varlık olarak sunun.

GitHub/CDN kullanımı için **bu dosyaların bulunduğu gerçek commit SHA'sını** aşağıdaki `COMMIT_SHA` yerine koyun. Bu bir adres şablonudur; commit seçmeden çalışmaz:

```html
<script src="https://cdn.jsdelivr.net/gh/kadirsanli/Dizge@COMMIT_SHA/dizge-html.min.js" defer></script>
```

CDN'nin erişimini dağıtım sırasında ayrıca doğrulayın. Sabit commit sürümü korur; CDN çevrimdışı çalışma sağlamaz. Yerel dosya kullanımı, ağ olmadan çalışır. [jsDelivr dağıtım belgeleri](https://github.com/jsdelivr/jsdelivr#usage-documentation).

## Etiket sözlüğü

| Etiket | Nitelikler / davranış |
| --- | --- |
| `dz-sayfa` | `başlık`, `açıklama`, `tema="açık\|koyu"`; veri ve hedef kimliklerini sayfa içinde sınırlar. |
| `dz-kart` | İçeriği kart görünümüne alır. |
| `dz-ızgara` | İçindeki kartları ekran genişliğine göre dizer. |
| `dz-başlık` | Varsayılan ikinci düzey başlık; gerektiğinde `aria-level` değiştirilebilir. |
| `dz-metin` | Açıklama metni. |
| `dz-veri` | `kimlik`; içerik nesnelerden oluşan JSON dizisi. Görünmez. |
| `dz-tablo` | `kaynak`, isteğe bağlı virgülle ayrılmış `sütunlar`, `sayfa-boyu` (1–1000, varsayılan 10), `aranabilir` (varsayılan evet), `etiket`. |
| `dz-sayaç` | `kimlik` (dış düğme kullanılıyorsa), `başlangıç` (varsayılan 0), `adım` (pozitif tam sayı, varsayılan 1), `etiket`. Azalt, başlangıca dön, artır düğmelerini üretir. |
| `dz-düğme` | `hedef` sayaç kimliği, `işlem="artır\|azalt\|sıfırla"`, `etiket`; `sıfırla` başlangıç değerine döner. Genel JavaScript çalıştırmaz. |
| `dz-form` | İsteğe bağlı `kaynak` veri kimliği; başarılı gönderimde kayıt ekler. `düğme`, `başarı` metinleri. Kaynaksız form sonucu yalnızca gösterir. |
| `dz-alan` | Formun doğrudan çocuğu. `ad`, `etiket`, `tür="metin\|sayı\|eposta\|tarih\|telefon"`, `değer`, `zorunlu`; sayısal sınırlar için `en-az`, `en-çok`, `adım`. |

Mantıksal nitelikler: boş değer, `evet`, `doğru` → açık; `hayır`, `yanlış` → kapalı. `aranabilir="false"` desteklenmez; Türkçe hata verir. Sayı niteliklerinde HTML'e uygun nokta kullanılır (`adım="0.5"`); sayaç yalnızca güvenli tam sayıları kabul eder.

Her kaynak kimliği kendi `dz-sayfa` alanında tekil olmalıdır. İç içe sayfalar kendi kaynaklarını kullanır. Sayfa dışındaki bileşenler belge kapsamını kullanır. Form, kayıt eklediğinde o kaynağa bağlı tablolar yenilenir; arama/sıralama/sayfa durumu yeniden başlatılır. Birden fazla form alanı aynı adı kullanamaz. Tarayıcının yerel zorunluluk, eposta ve sayı sınırı doğrulaması uygulanır; kendi doğrulama balonlarının dili tarayıcı ayarına bağlıdır.

```html
<dz-form kaynak="öğrenciler" düğme="Öğrenci ekle">
  <dz-alan ad="ad" etiket="Öğrenci adı" zorunlu></dz-alan>
  <dz-alan ad="puan" etiket="Puan" tür="sayı" en-az="0" en-çok="100" zorunlu></dz-alan>
</dz-form>
```

## Veri, hatalar ve yaşam döngüsü

JSON, JavaScript nesne ifadesi değildir; anahtarlar çift tırnaklıdır. HTML içindeki JSON metin değerlerinde `<` karakterini `\u003c`, `&` karakterini `\u0026` yazın. Güvenilmeyen metni ham HTML içine birleştirmeyin. Çalışma anında `dz-veri.güncelle(satırlar)` güvenli metin üretir. Hücre ve sonuç metinleri `textContent` ile gösterilir. JSON geçersizse tablo hata gösterir; kaynak düzeltildiğinde yeniden çalışır.

Motor `eval`, `new Function` veya metinden olay kodu üretmez. Ham HTML çalıştıran nitelik sunmaz. Hata mesajları `role="alert"` alanında gösterilir. HTML dosyasının kendisi yine çalıştırılabilir bir web belgesidir; bu motor bir HTML temizleyicisi veya güvenlik sınırı değildir.

Tablo/form çıkarıldığında mevcut Dizge bileşeninin temizleme yöntemi çağrılır; veri gözlemcileri ve belge dinleyicileri kaldırılır. Yeniden eklenince bileşen tekrar kurulur. Sayaç değeri yeniden bağlanmada korunur; `başlangıç` değiştirilirse sıfırlanır. Motoru ikinci kez yüklemek aynı sürümde yeniden kayıt hatası üretmez.

Kaynak JSON'un değiştirilmesi ve gözlenen bileşen nitelikleri otomatik güncellenir. Formun içindeki `dz-alan` tanımları sonradan değiştirilirse `form.yenile()` çağırın; girilmiş değerler yeniden kurulumda kaybolur. Bunlar kaynak değişiklikleridir; uygulama verisini güncellemek için veri yöntemini kullanın.

İsteğe bağlı JS bağlantıları:

- `veri.oku()` → kayıt dizisi; `veri.güncelle(satırlar)` → kaynağı değiştirir.
- `sayaç.değer`, `sayaç.işle('artır')` → sayı ve sınırlı sayaç eylemi.
- `dz-değişti` → `event.detail.değer`; `dz-gönder` → `event.detail.değerler`.
- `dz-hata` → kurulum hatasında `event.detail.ileti` ve `etiket`.
- `DizgeHTML.sürüm`, `DizgeHTML.kur()` → motor sürümü ve aynı sürüm için güvenli tekrar kayıt.

## Kaynak görünümü ve kapsam

Sayfa Kaynağı orijinal dosyadaki Türkçe tanımı gösterir; geliştirici araçlarının DOM görünümü üretilen standart HTML'i gösterir. Motor kodu ayrıca incelenebilir. Base64 gizleme uygulanmaz. Örnek HTML tek dosya olsa da motor ayrı bir varlıktır; tüm çalışma zamanı dahil tek dosyalı çıktı henüz bu katmanın özelliği değildir.

Genel `.dzg` tarayıcı desteği, tam DOM/metin/dizi sözlüğü, yerel depolama, özel olay ifadeleri, Türkçe editör ve AI/MCP bağlantısı yol haritasındadır; bu sürümde varmış gibi kullanılmamalıdır. Mobil/masaüstü Chromium doğrulaması otomasyona dahildir; Firefox/Safari testi veya resmi erişilebilirlik sertifikası iddiası yoktur.
