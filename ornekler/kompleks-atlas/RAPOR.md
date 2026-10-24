# Kompleks Atlas — yöntem karşılaştırması

24 Ekim 2026, Europe/Istanbul. Tek oturum, aynı model, sıralı iki üretim. İki çıktı da bağımsız, çevrimdışı kullanılacak tek HTML dosyasıdır.

## Sonuç

Bu denemede normal yöntem ilk HTML'yi daha kısa sürede üretti. Dizge yöntemi, daha sıkı ayar doğrulaması ve daha hızlı örgü üretimi verdi. Matematik referansları ve görüntüleme işlevleri ikisinde de geçti. Bu sonuç “Dizge dili genel olarak daha hızlı/daha kaliteli” sonucunu kanıtlamaz.

| Ölçüm | Normal | Dizge |
|---|---:|---:|
| İlk HTML dosyasına kadar, yöntem okuması hariç | 1 dk 23,207 sn | 1 dk 56,506 sn |
| Dizge deposunu okuma/ortam keşfi | — | 47,470 sn |
| İlk HTML dosyasına kadar, yöntem okuması dahil | 1 dk 23,207 sn | 2 dk 43,976 sn |
| İlk eşit test aşamasının tamamlanması/sabitleme | 3 dk 34,455 sn | 2 dk 58,697 sn |
| Nihai ortak dış kontroller | 76/78 (%97,44) | 78/78 (%100) |
| Önceden belirlenen kalite rubriği, yazar değerlendirmesi | **95/100** | **100/100** |
| 160 çözünürlükte örgü üretimi, medyan | 24,35 ms | 17,20 ms |
| Animasyon FPS | 74,98 | 74,97 |
| HTML dosya boyutu | 21.202 bayt | 27.152 bayt |

İlk dosya süresi ve doğrulama dahil süre farklı sonuçlar veriyor: ortak sunucu/test tezgâhı normal aşamada kuruldu. Bu yüzden 3:34 / 2:59 toplamları eşit altyapı koşullarında bir hız yarışı değildir. İlk HTML oluşturma, yöntem okuma ve ilk test tamamlama anları ayrı verildi; sonraki ortak kontroller iki çıktının da dosya hash'lerini değiştirmedi. Zamanlar duvar saatidir; yalnızca model düşünme süresi veya API gecikmesi değildir. Token/kullanım maliyeti ölçülmedi.

17,20 ms, 24,35 ms'ye göre bu örnekte yaklaşık %29,4 daha kısa üretim süresidir. İki tarayıcı uygulaması da JavaScript/WebGL çalıştırır. İkinci sürümün önceden ayrılmış typed-array tamponları ve farklı shader uygulaması bu farkı açıklayabilir; bunu `.dzg` çalışma zamanı hız kazanımı diye yorumlamayın. FPS'ler aynı ekran yenileme sınırına yakın; ayırt edici bir üstünlük yok.

## Kalite puanının dayanağı

Her satır beş puanlık bir kriterdir; kısmi karşılık 2,5 puan. Bu 100'lük puan bir kabul listesi puanıdır, bağımsız veya kör bir insan estetik puanı değildir. 100 almak kusursuz ya da üretime hazır olmak anlamına gelmez. Görsel inceleme bu uygulamaları yazan aynı asistan tarafından yapıldı; sizin manuel değerlendirmeniz ayrı tutulmalıdır.

| Kriter | Normal | Dizge | Kanıt / yorum |
|---|---:|---:|---|
| Altı fonksiyon | 5 | 5 | 12 bağımsız bilinen sonuç + tüm fonksiyon seçimleri |
| Dört yükseklik | 5 | 5 | z=1+i, f=z² için log(3), 2, 0, 2 |
| Bilinen değer doğruluğu | 5 | 5 | Ortak referanslar geçti |
| Tekillik ve sonluluk | 5 | 5 | 1/0, Möbius -1 kutbu, NaN, Infinity |
| Faz renk eşlemesi | 5 | 5 | Faz renk anahtarı, sıfırın fazı tanımsız, yüzey incelemesi |
| Kamera | 5 | 5 | Klavye yörünge/yakınlaşma/sıfırlama/duraklatma testleri; sürükleme işleyicileri |
| Parametreler | 5 | 5 | 24 fonksiyon/yükseklik birleşimi en yüksek parametrelerde |
| Hesaplayıcı ve girdi | 5 | 5 | Sayısal sonuçlar; boş girişin native reddi; kutup mesajı |
| PNG | 5 | 5 | Gerçek düğmeden iki PNG indirildi, dosya başlıkları doğrulandı |
| Atomik JSON gidiş dönüşü | **2,5** | 5 | Normal, enum alanında dizi türünü yanlış kabul ediyor |
| Çevrimdışı / tek dosya | 5 | 5 | Harici script, font, fetch veya modül yok; tüm kod gömülü |
| Başlangıç / etkileşim hatasızlığı | 5 | 5 | WebGL hata kodu yok; gözlenen konsol hatası yok |
| Geçersiz girdiler | **2,5** | 5 | Aynı enum tür açığı bu sağlamlık kriterini de kısmen etkiliyor |
| En yüksek çözünürlük | 5 | 5 | 25.921 köşe, varsayılan log yüzeyinde 51.200 üçgen; sonlu ölçümler |
| Açıklama ve renk anahtarı | 5 | 5 | Eksenler, kırpma/maske ve faz açıklanıyor |
| Etiket / klavye | 5 | 5 | Etiketler, odak stili, canvas klavye işlevleri |
| Hiyerarşi / dar ekran | 5 | 5 | 1280 ve 390 px ekran görüntüleri; 390 px'de yatay taşma yok |
| Yardım / hata geri bildirimi | 5 | 5 | Bozuk gerçek JSON yüklemede mesaj; yardım bölümü |
| Gerçek istatistikler | 5 | 5 | performance.now ve requestAnimationFrame aralıkları |
| Çalıştırılabilir referans testleri | 5 | 5 | Gömülü normal 18/18; Dizge 37/37; dış testler ayrı |
| **Toplam** | **95** | **100** | Matematik 25/25; işlevler 22,5/25; sağlamlık 17,5/20; görsellik 20/20; ölçüm 10/10 (Normal) |

JSON ve geçersiz girdi kriterleri kısmen örtüşüyor; aynı iki tip açığı bu önceden tanımlanan iki alanda da puan düşürdü. Rubriği sonuçları görünce değiştirmedim. Normal dosya karşılaştırmanın bozulmaması için sonradan düzeltilmedi.

### Normal sürümdeki somut hata

`fn` ve `mode` için `Object.hasOwn` kullanılıyor, ancak değer türünün string olduğu ayrıca doğrulanmıyor. `['square']` nesne anahtarına dönüştürülünce kabul ediliyor; ardından fonksiyon seçimi matematik değerlendiricisinde eşleşmiyor. Tam ayar nesnesindeki `fn: ["square"]` normal sürümde boş yüzey oluşturabiliyor. Dizge sürümü bunu durum değiştirmeden reddediyor. Manuel yeniden üretmek için `tur-hatasi-test.json` dosyasını iki uygulamaya da yükleyin. Çözmek için normal sürümde bir normal JSON yükleyin veya sayfayı yenileyin.

## Dizge uygulaması gerçekte nasıl üretildi?

Kaynak: [kadirsanli/Dizge](https://github.com/kadirsanli/Dizge/tree/6622ff41165db958d677d68e095a848502666a11), commit `6622ff41165db958d677d68e095a848502666a11`. İncelenen [dil tanımı](https://github.com/kadirsanli/Dizge/blob/6622ff41165db958d677d68e095a848502666a11/DIZGE_DILI.md) `.dzg → lexer → parser → AST → Python/NumPy` hattını ve `@işlev` genişleme noktasını tanımlıyor. Yerel kaynak dosyalarının Git blob kimlikleri `dizge-kaynak/KAYNAK_KIMLIGI.json` içinde.

1. Normal HTML, bu kaynaklar okunmadan doğrudan HTML/CSS/JavaScript ile yazıldı ve sabitlendi. Sonra normal kaynak kopyalanmadan ikinci uygulama yazıldı. Aynı görev nedeniyle düzen, başlangıç ayarları ve kamuya açık test API'si paralel tutuldu; bu kör, sıfır bağlamlı iki model denemesi değildir.
2. `atlas_eklentisi.py`, resmi `@işlev` kayıt arayüzüne NumPy kompleks düzlem, altı fonksiyon, genlik, açı, gerçek/sanal bileşen ve log yükseklik işlemlerini ekler. Upstream lexer/parser/compiler değişmedi.
3. `atlas.dzg` gerçek Türkçe ekli cümlelerden oluşur: `kareler, düzlemin kareyüzeyidir.` ve `yükseklikler, genliklerin logyüksekliğidir.` gibi. Süs amaçlı yorum dosyası değildir.
4. `dizge_derle.py` resmi lexer/parser/compiler'ı çağırır, Python kodunu çalıştırır, 97×97 kompleks ızgarayı ve yüksekliği kontrol eder. Orijinal derleyici çıktısı `derleme/atlas-upstream.py`; eklenti kaydını başlatan çalıştırılabilir sarmalayıcı `derleme/atlas.py` dosyasıdır.
5. Bu görev için eklenen küçük AST→JavaScript arka ucu yalnızca saf `Tanım`, `Uygula`, `Ad`, `Sayı` alt kümesini destekler. Altı fonksiyon ve dört yükseklik yönlendirmesi gerçek AST'den çıkarılır. Izgara başvurusu, tarayıcıda her örnek için sağlanan z parametresine özelleştirilir. Genel amaçlı bir Dizge tarayıcı derleyicisi değildir.
6. `derleme/atlas-uretilen.js`, `.dzg` kaynağı ve 30 NumPy referansı `paketle.cjs` ile HTML'ye gömülür. Arayüz, WebGL sürücüsü, karmaşık sayı işlemlerinin JavaScript karşılıkları ve dosya kontrolleri ayrıca JavaScript ile yazılmıştır. Uygulamanın tamamının upstream Dizge tarafından kendiliğinden üretildiği iddia edilmez.
7. Upstream dil testleri, depodaki üç örnek dosya da yerelde bulunarak çalıştırıldı: 18/18 geçti. NumPy derleme/çalıştırma kanıtı `derleme/derleme-kaniti.json` içindedir. Üst düzey son değişkenlerin kullanılmama uyarıları korunmuştur; tarayıcı arka ucu bu çıktıları dışa aktarır.

Bu nedenle karşılaştırmanın doğru adı “doğrudan AI kodlaması” ile “AI + gerçek Dizge matematik kaynağı + görev için yazılmış JS uyarlaması”dır. İkinci yaklaşım aynı AI'yi ortadan kaldırmaz.

## Test koşulları ve sınırlar

- Chrome/Chromium 155, Windows, in-app browser; WebGL 1.0. Ayrıntılar iki `*-test.json` dosyasında.
- Nihai ortak ölçüm sayfası 1280×720 CSS px, devicePixelRatio 1,5. Örgü: alan yarıçapı 2, yükseklik log, ölçek 0,7, çözünürlük 160. z² / z³−1 sırayla 7 örnek; ilk ısınma örneği çıkarıldı; kalan 6 ölçümün ortancası alındı. Üretim süresi, uygulamanın kendi üretim sayaç sınırıdır; uçtan uca input→ekran gecikmesi değildir.
- FPS: otomatik dönüş açık, varsayılan 96 çözünürlük; 8 ısınma karesinden sonra yaklaşık 1,2 saniye / 90 kare. Bunlar tek kısa ölçüm oturumu; güven aralığı ve uzun süreli yük testi yok.
- İlk ölçümde normal FPS kaydı 1 karelik gecikmeyle bozuldu. Ham kayıt `normal-test-ilk.json` içinde tutuldu; FPS sıralamasında kullanılmadı. Ortak tezgâha 8 kare ısınma eklendi ve iki yöntem aynı koşullarda yeniden ölçüldü.
- İlk dış test 70 kontroldü, iki sürüm de 70/70 geçti. Sonra enum tipi, klavye ve boş alan kontrolleri aynı tezgâha eklendi: 78 kontrol. Bu genişletme iki uygulama için de aynıdır ve kaynaklar değiştirilmedi.
- PNG düğmeleriyle gerçek dosyalar indirildi: ikisi de 785×678 piksel. Gerçek file-chooser ile JSON yükleme, sin seçiliyken varsayılanları geri getirme ve bozuk dosya reddi doğrulandı. JSON şeması iki uygulama arasında ortak.
- Ekran görüntüleri aynı sekmede alındı: 1280×800 ve 390×844 viewport. Dar görünümde ikisinin de içerik genişliği 375 CSS px; yatay taşma yok. Dokunmatik donanım üzerinde fiziksel test yapılmadı. Ekran okuyucuyla bağımsız erişilebilirlik denetimi yapılmadı.
- Doğrudan `file://` açma testi, araç tarayıcısının yalnızca HTTP/HTTPS'ye izin veren URL politikası tarafından engellendi. Bu engel aşılmadı. Çalışma testleri localhost üzerinde tamamlandı; çift tıklama akışının son manuel doğrulaması size ait. Statik incelemede iki HTML'nin ağ/kütüphane bağımlılığı bulunmuyor.
- Aşırı yüksekliklerde kamera kadrajı yüzeyin bir bölümünü kesebilir; ±6 kırpma ve üçgen kopuş eşiği görselleştirme tercihidir. Tekillik çevresinde otomatik uyarlanan örnekleme yok. Bunlar bütün çok yapraklı Riemann yüzeyleri değil, seçilen gerçek büyüklüğün kompleks düzlem üzerindeki grafiğidir.
- Aynı model/oturum, öğrenme ve sıra etkisi, ortak test altyapısının ilk aşamada kurulması, insan tarafından kör değerlendirme yapılmaması genel sonuç çıkarmayı sınırlar. Ayrı AI bağlantıları veya yeniden başlatılmış model oturumları kullanılmadı.

## Dosyalar ve yeniden çalıştırma

`normal.html` ve `dizge.html` çalışmak için yan dosya istemez. Tarayıcıda açın. `karsilastirma.html` sonuçlara ve iki uygulamaya yerel bağlantılar sunar. Ortak test tezgâhı, iframe erişimi için sunucu gerektirir:

```powershell
node preview.cjs
# http://127.0.0.1:8770/test.html
```

Bu yalnızca yerel arayüzde dinler. Node test sunucusu uygulamaların kendi bağımlılığı değildir. Kullanım bitince Ctrl+C ile kapatın.

Dizge üretimini tekrarlamak için Python ≥3.10 + NumPy ve Node ile:

```powershell
python dizge_derle.py
node paketle.cjs
python derleme/atlas.py
python -m unittest discover -s dizge-kaynak -p test_dizge.py -v
```

Bu oturumda paketli Python 3.12.14 / NumPy 2.3.5 ve Node 24.19.0 kullanıldı. Ortak istem, puanlama ve manuel rota `DENEY_PROMPTU.md`; kesin zamanlar `zamanlar.json`; ham dış testler `normal-test.json` ve `dizge-test.json`; görsel kanıtlar `*-masaustu.jpg` ve `*-mobil.jpg` içindedir.

## Sabitlenen HTML kimlikleri

- Normal SHA-256: `567c54c9edf32c84ae167f7d24a9613983fab706d91a840e04b2e8e9fc250068`
- Dizge SHA-256: `52270cb7c3e4547352a03e3686d6dec92611ee4ae6207cd04c00f57a2b2b00a5`
