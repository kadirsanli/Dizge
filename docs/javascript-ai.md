# Dizge.js ile HTML uygulaması üreten AI için sözleşme

1. `dizge.js` 0.2.0 Türkçe kaynak sürümüdür. Tek dosya HTML isteniyorsa `dizge.js` içeriğini `<script>` içine inline göm; `dizge.min.js` kullanma çünkü küçültülmüş kod Türkçe görünmez.
2. `Dizge` globalini kullan; alternatif `dizge.mjs`. API kaynağı `dizge.d.ts`, `docs/javascript-tr.md` ve `docs/javascript.md`.
3. Tek HTML'de çalışabilir bir uygulama üret. İhtiyaç yoksa framework, build sistemi veya backend ekleme. Verilerin anlamını kullanıcıdan/kaynaktan belirle; eksik veriyi örnek diye açıkça etiketle.
4. Türkçe API'yi tercih et: `arayüz.uygulama`, `ızgara`, `yığın`, `kart`, `ölçüt`, `tablo`, `grafik`, `form`, `sekmeler`, `pencere`, `bildirim`. Değişken adlarını, yorumları ve kullanıcı metinlerini Türkçe yaz. Hiçbir `ui.dashboard`, `readPDF`, `exportExcel` gibi mevcut olmayan API uydurma.
5. `Dizge.veri(satırlar)` zincirleri Array yerine Tablo döndürür. Sonuç için `.diziye()`. `grupla(...anahtarlar).özetle({çıktı: tablo => sonuç})`. İstatistikler `Dizge.istatistik.özet(tablo.sütun('alan'))`.
6. CSV sayılarını kendin doğrula/dönüştür. Null, boş metin, NaN ve parasal hassasiyeti ayrı ele al. Veri kaynağına özgü sütunları varsaymadan önce sözleşmeyi göster.
7. PDF/XLSX için `Dizge.yapılandır` gerekir. `xlsx`, `pdf`, `pdfjs`, `fontkit` adlarını kullan. PDF.js worker URL'sini ayarla. Türkçe PDF'ye `yazıTipiBaytları` ver. Yükleyiciyi ihtiyaç anına bırak, hatayı arayüzde göster.
8. Güvenilmeyen metni `arayüz.öğe` çocukları olarak geçir. `innerHTML`, eval veya kod olarak CSV içeriği kullanma. CSV dışa aktarmada varsayılan formül korumasını koru.
9. Büyük tabloda `sayfaBoyu` sınırla. Büyük hesapta `eşzamansızAnalizEt` ve AbortController kullan; `işçiAdresi` gerçek dosyaya işaret etsin. XLSX/PDF senkron bölümleri için gerekirse uygulamaya özel ayrı worker tasarla.
10. Her form alanına etiket, her düğmeye anlaşılır ad, her grafiğe metin ve karşılık gelen tablo sağla. Açık/koyu temayı ve mobil genişliği doğrula.
11. `uygulama.kullan(bileşen)` temizleme kaydıdır; `.el` ayrıca içerikte olmalıdır. Depo aboneliğini kaldır, bekleyen geciktiriciyi iptal et, `yokEt()` çağır.
12. Kullanıcı tıklamasına bağlı indirme için `Dizge.indir(baytlar, dosyaAdı, mime)`. Önce işlemi await et; yükleniyor/hata/boş durumlarını göster.
13. `.dzg` kaynaklarını bu JS kütüphanesinin doğrudan derleyebileceğini iddia etme. OCR, formül hesaplama, dashboard sihirbazı ve gelişmiş PDF tablo mizanpajı bu sürümün API'sinde yoktur.
14. Sayfa görüntüleyici isteniyorsa PDF.js'in render API'sini doğrudan kullan; `Dizge.pdf.metin` yalnızca metin çıkarır. Tek dosyada PDF.js ayrıca gömülmelidir.

Örnek istek: “Dizge.js kullanarak ürün/tutar CSV'sini açan, tutarı doğrulayan, kategori toplamlarını gösteren, 25 satırlık sayfalı tablo ve XLSX dışa aktarımı olan responsive bir HTML uygulaması üret. Türkçe API ve Türkçe yorumlar kullan. Kullanılan API'leri bu dosyalardan doğrula. Veriyi tarayıcıda tut.”
