# Dizge: Türkçe HTML ve kısa kaynak yol haritası

Tarih: 28 Ekim 2026. Bu belge başlangıç tasarımını ve sonraki aşamaları kaydeder.

Uygulama güncellemesi: Türkçe HTML motorunun deneysel ilk sürümü eklendi. Sayaç, tablo, form, veri kaynağı ve temel yerleşim etiketleri çalışıyor. Aşağıdaki mimari örnek artık destekleniyor; `.dzg` köprüsü, tam sözlük, editör ve AI/MCP aşamaları henüz uygulanmadı. Gerçek API ve kapsam için [Türkçe HTML rehberini](turkce-html.md) kullanın.

Amaç: Kullanıcının Türkçe ve az tekrar içeren kaynakla web arayüzü yazması; sayfa kaynağında bu tanımın okunabilmesi; aynı altyapının ileride yapay zekâ araçları tarafından kullanılabilmesi.

## Mevcut durum ve düzeltmeler

- İncelenen çalışma kopyası `dizge-js-work`: package.json sürümü 0.3.0, paket adı `@kadirsanli/dizge`. ESM, CommonJS, tarayıcı dosyası, küçültülmüş dağıtım ve TypeScript tanımları var. Paket dosyasının bulunması npm'de yayımlandığını kanıtlamaz. README yayımlanmadığını söylüyor; canlı kayıt ve verilen CDN adresi bu ortamın erişim/DNS hataları nedeniyle doğrulanamadı.
- Dizge.js veri, tablo, grafik, form ve başka arayüz bileşenleri sunuyor. `.dzg` ise ayrı lexer/parser ve Python/NumPy derleyicisine sahip. Genel amaçlı tarayıcı arka ucu henüz yok.
- Mevcut `arayüz.tablo` bir seçenek nesnesi alıyor: `Dizge.arayüz.tablo({ satırlar })`. Sonuç HTML metni değil, `.el` ve yaşam döngüsü yöntemleri bulunan bileşen. Paylaşılan `innerHTML = Dizge.arayüz.tablo(satırlar)` örneği mevcut API'ye uygun değil.
- Vitrin aracı uygulamayı Base64 iframe içinde paketliyor. Bu, okunabilir Türkçe programlama dili sağlamaz; dış kaynakta kodlanmış veri gösterir. Belgeler de iframe'in depolama, göreli adres ve worker sınırlamalarını belirtiyor.
- npm/CDN kodu dağıtır. Yazılan kodu azaltan asıl unsur bileşenler, varsayılanlar ve tekrar kullanılabilir işlemlerdir. CDN dosyası tarayıcıya yine indirilir; elle kurulum gerekmez.

## Gerçekçi Türkçeleştirme sınırı

| Katman | Hedef |
| --- | --- |
| Editör menüleri, yardım, öneriler, hata mesajları | Türkçe bir geliştirme arayüzü yapılabilir. |
| Kullanıcının yazdığı uygulama tanımı | Türkçe etiket, nitelik, olay, stil ve `.dzg` ifadeleriyle tasarlanabilir. |
| Sayfa Kaynağı | Türkçe tanım korunabilir; standart HTML kabuğu ve motoru yükleyen etiket kalır. |
| Tarayıcının çalıştırdığı DOM, CSS ve JavaScript | Web standartlarına uygun yapı üretilir; geliştirici araçlarında standart adlar görülebilir. |

Sıradan tarayıcıda HTML/JS anahtar sözcüklerini tümüyle yeniden adlandırmak mümkün değildir. `script` yerine `betik` yazılması aynı davranışı sağlamaz. Türkçe özel etiketlerin çalışması için Dizge motoru gerekir. Custom Elements adları küçük ASCII harfle başlamalı ve tire içermelidir; `dz-düğme` bu yaklaşıma uygundur. Kaynak görünümü ile çalışma anındaki DOM incelemesi ayrı kabul ölçütleri olmalıdır.

Kaynak: [HTML Custom Elements standardı](https://html.spec.whatwg.org/multipage/custom-elements.html).

## Önerilen mimari

Türkçe HTML etiketleri + sınırlı `.dzg` davranışları → doğrulama/ara temsil → mevcut Dizge.js bileşenleri → standart DOM.

İlk adımda mevcut arayüz bileşenleri tekrar yazılmaz. Türkçe etiketler bunlara seçenekleri aktarır, olayları bağlar ve kaldırıldıklarında temizleme yöntemlerini çağırır. Semantik düğme/form/tablo öğeleri üretmek, klavye ve etiket davranışlarını korumak gerekir.

İlk sürümün desteklediği örnek; `dizge-html.js` çekirdeği içeren yeni motor dosyasıdır:

```html
<!doctype html>
<html lang="tr">
<meta charset="utf-8">
<title>Öğrenciler</title>
<script src="dizge-html.js" defer></script>
<dz-sayfa başlık="Öğrenciler" tema="açık">
  <dz-veri kimlik="öğrenciler">[{"ad":"Ali","puan":90},{"ad":"Ayşe","puan":85}]</dz-veri>
  <dz-tablo kaynak="öğrenciler" sütunlar="ad,puan" aranabilir></dz-tablo>
</dz-sayfa>
</html>
```

Veri etiketi motor tarafından okunmalı, görünür metin olarak bırakılmamalıdır. İlk sürümde doğrulanan JSON yeterlidir. Gerçek veri, HTML içine güvenli serileştirilmelidir; etiket kapatma karakterleri kaçırılmalıdır.

CSS için ham özellikleri çevirmenin yanında `tema`, `boşluk`, `sütun`, `hizalama`, `yazı-boyutu` gibi küçük bir Türkçe düzen sözlüğü gerekir. Bu sözlük standart CSS'e çevrilir. İlk sürüm tüm CSS'i kapsadığını iddia etmez.

## Aşamalar ve bitiş ölçütleri

1. **Sözleşme ve sözlük:** Etiketler, özellikler, stil değerleri, olay adları, dönüş türleri ve hatalar tanımlanır. Tek bir makinece okunabilir sözlükten belge ve doğrulama üretilir. Mevcut Türkçe API adları ve İngilizce uyumluluk adları korunur. Bitiş: örneklerin kullandığı her özellik belgelenmiş olmalı.
2. **Türkçe HTML ilk sürümü:** Sayfa, başlık, metin, kart, düğme, veri, tablo, form ve temel yerleşim eklenir. Sayaç, aramalı tablo ve form örnekleri hazırlanır. Bitiş: mobil/masaüstü görünüm, klavye kullanımı, boş/hata durumları ve bileşen temizliği doğrulanır; sayfa kaynağı okunabilir Türkçe tanımı içerir.
3. **Dağıtım:** Mevcut paket içeriği ve alt girişleri düzenlenir. Yerel dosya, npm ve CDN yolları aynı sürümle denenir. npm yayımlama adı `@kadirsanli/dizge` olur; `npm install dizge` bu paketle aynı şey değildir. GitHub üzerinden CDN npm yayını olmadan da kullanılabilir; dosyanın uzak depoda bulunması gerekir. Yayın URL'si etiket/commit veya tam paket sürümüne sabitlenir. Bitiş: temiz projede kurulum ve gerçek CDN yüklemesi başarılı olmalı. Bu plan yayın yapmaz.
4. **`.dzg` tarayıcı köprüsü:** Önce mevcut dilin küçük, açıkça belgelenmiş bir alt kümesi desteklenir; arayüz olayları, durum ve hesaplamalar bunun üzerine eklenir. Lexer/parser/AST üzerinden çalışılır; kör metin değiştirme veya `eval` kullanılmaz. Satır/sütun içeren Türkçe hatalar sağlanır. Bitiş: bir tıklama `.dzg` işlemini çalıştırıp bağlı görünümü güncellemeli; desteklenmeyen dil yapıları açık hata vermeli.
5. **Türkçe editör:** Yaz/Önizle/Hatalar/Paketle akışı, tamamlama ve örnekler. Aynı motoru kullanır. Okunabilir kaynak dağıtımı, derlenmiş dağıtım ve çevrimdışı paketleme açık seçenekler olur. Derlenmiş çıktının kaynak görünümü standart HTML/JS içerebilir; bu seçim kullanıcıya açıklanır.
6. **Yapay zekâ bağlantısı:** Önce sürümlenmiş belgeler ve doğrulama komutu; sonra MCP araçları. Önerilen işlemler: sözlüğü oku, örnek bul, kaynağı doğrula, derle, önizleme üret. Bunlar AI'nin doğru kod üretmesini ve hatalarını düzeltmesini destekler. Her istemcide bağlantı/hesap desteği ayrıca doğrulanır.

CDN/npm başvurusu: [jsDelivr kullanım belgeleri](https://github.com/jsdelivr/jsdelivr#usage-documentation).

## Eklenen sözlük önerilerinin değerlendirmesi

DOM ve olaylar HTML odağı nedeniyle ilk sırada: `belge.seç`, `kimlikleBul`, `tümünüSeç`, `dinle`, `metin`, `sınıfEkle`, `sınıfÇıkar`. Ardından konsol, metin, dizi, matematik, JSON, tarih/zamanlayıcı ve yerel depolama gelir. Ağ erişiminde sonuç, hata ve iptal davranışı da Türkçe sözleşmeye dahil edilmelidir.

Yerleşik `Array.prototype` veya DOM prototiplerini küresel değiştirmek yerine Dizge kapsamındaki sarmalayıcılar kullanılmalıdır. `.dzg` çağrıları AST üzerinden bunlara bağlanır. Python tarafındaki `@işlev`, tarayıcı DOM'unu tek başına erişilebilir yapmaz; tarayıcı çalışma katmanı ayrıca gerekir.

- `some` için `enAzBiri` daha kesin; `bazıları` birden fazla eşleşme gerektiği izlenimi verebilir.
- `findIndex` için `ilkEşleşmeninİndeksi`; `indexOf` için `indeksBul` düşünülebilir. `kaçıncı` tercih edilirse sıfırdan mı birden mi başladığı ve bulunamama değeri açık olmalıdır.
- `concat` için `dizileriBirleştir`, `join` için `metinleBirleştir` daha açık seçeneklerdir. Adlar kullanıcı denemeleriyle kesinleştirilmeli.
- `sırala` gibi yerinde değiştiren işlemler ile yeni değer döndürenler açıkça ayrılmalıdır; mevcut `.dzg` çatı/bellek kuralları korunmalıdır.
- Türkçe büyük/küçük harf işlemleri `I/ı` ve `İ/i` davranışını tanımlamalıdır; JavaScript'in genel harf dönüşümünün birebir kopyası yeterli değildir.
- `sayıDeğilMi`, tür denetimi ve sayıya dönüşüm farklı işlerdir. `isNaN` ve `Number.isNaN` davranışları karıştırılmamalıdır.
- `htmlİçerik` ham HTML eklediği için `metin` ile eşdeğer kabul edilmemelidir. Varsayılan düz metin olmalı.
- Mevcut `Dizge.geciktir` debounce işidir. Önerilen `zamanlayıcı.geciktir` tek seferlik zamanlayıcıdır; iki davranışın farkı belgelenmeli.

Çift virgül ve tırnak isteği yeni dil işaretleri anlamına geliyorsa önce örnek kullanım belirlenmelidir. Mevcut dilde virgül tanımı ayırıyor, sayı kuralı ondalık virgüle izin veriyor ve çift tırnak metin sınırı. `,,` gibi yeni bir işaretin görevi belirlenmeden dilbilgisine eklenmesi uygun değildir. Metin içi tırnak kaçışı ve çok satırlı metin ayrı tasarım maddeleridir.

## Yapay zekâ bağlantısının iki yönü

ChatGPT/Claude gibi bir araca Dizge'yi tanıtıp kod ürettirmek için belgeler ve MCP araçları uygundur. OpenAI API ve Claude belgeleri MCP araçlarına bağlantıyı tarif ediyor; tek bir sunucunun tüm ürünlerde otomatik çalışacağı varsayılmamalıdır. [OpenAI Docs: MCP](https://developers.openai.com/api/docs/guides/tools-connectors-mcp), [Claude: MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector).

Dizge editörünün içine bir AI sohbeti koymak ayrı bir API entegrasyonudur. Sağlayıcı adaptörleri, sunucu tarafında anahtar saklama ve maliyet yönetimi gerekir. MCP tek başına modele kod yazdıran bir servis veya model eğitimi değildir.

## Başarı nasıl ölçülecek?

Aynı işlevi yapan aynı örnekler karşılaştırılmalı: yazarın yazdığı boş olmayan satır, karakter/token, bağımlılık boyutu, başlangıç süresi, hata anlaşılabilirliği ve bakım için gereken tekrar. Kütüphaneyi CDN'e taşıyarak uygulama dosyasını küçültmek toplam indirilen kodun azaldığını göstermez. Base64 veya tüm kodu tek satıra sıkıştırmak başarı ölçütü sayılmaz.

İlk teslimat önerisi: Türkçe etiketlerle sayaç, tablo ve form; kaynak görünümü karşılaştırması; doğrulanmış dağıtım yolları. Tam JavaScript/CSS çevirisi ve geniş kapsamlı AI bağlayıcısı sonraki adımlardır.
