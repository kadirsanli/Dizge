# Dizge.js ile HTML uygulaması üreten AI için sözleşme

1. `dizge.js` scriptini yükle, `Dizge` globalini kullan; alternatif `dizge.mjs`. API kaynağı `dizge.d.ts` ve `docs/javascript.md`.
2. Tek HTML'de çalışabilir bir uygulama üret. İhtiyaç yoksa framework, build sistemi veya backend ekleme. Verilerin anlamını kullanıcıdan/kaynaktan belirle; eksik veriyi örnek diye açıkça etiketle.
3. UI için `ui.app`, `grid`, `stack`, `card`, `metric`, `table`, `chart`, `form`, `tabs`, `modal` kullan. Hiçbir `ui.dashboard`, `readPDF`, `exportExcel` gibi mevcut olmayan API uydurma.
4. `data(rows)` zincirleri Array yerine Table döndürür. Sonuç için `.toArray()`. `groupBy(...keys).aggregate({output: table => result})`. İstatistikler `stats.summary(table.column('field'))`.
5. CSV sayılarını kendin doğrula/dönüştür. Null, boş metin, NaN ve parasal hassasiyeti ayrı ele al. Veri kaynağına özgü sütunları varsaymadan önce sözleşmeyi göster.
6. PDF/XLSX için `configure` gerekir. `xlsx`, `pdf`, `pdfjs`, `fontkit` adlarını kullan. PDF.js worker URL'sini ayarla. Türkçe PDF'ye fontBytes ver. Loader'ı ihtiyaç anına bırak, hatayı UI'da göster.
7. Güvenilmeyen metni `ui.el` çocukları olarak geçir. `innerHTML`, eval veya kod olarak CSV içeriği kullanma. CSV dışa aktarmada varsayılan formül korumasını koru.
8. Büyük tabloda pageSize sınırla. Büyük hesapta `analyzeAsync` ve AbortController kullan; workerUrl gerçek dosyaya işaret etsin. XLSX/PDF senkron bölümleri için gerekirse uygulamaya özel ayrı worker tasarla.
9. Her form alanına label, her butona anlaşılır ad, her grafiğe metin ve karşılık gelen tablo sağla. Açık/koyu temayı ve mobil genişliği doğrula.
10. `app.use(component)` temizleme kaydıdır; `.el` ayrıca içerikte olmalıdır. Store aboneliğini kaldır, pending debounce'u iptal et, component.destroy çağır.
11. Kullanıcı tıklamasına bağlı indirme için `download(bytes, filename, mime)`. Önce işlemi await et; yükleniyor/hata/boş durumlarını göster.
12. `.dzg` kaynaklarını bu JS kütüphanesinin doğrudan derleyebileceğini iddia etme. OCR, formül hesaplama, dashboard sihirbazı ve gelişmiş PDF tablo mizanpajı bu sürümün API'sinde yoktur.

Örnek istek: “Dizge.js kullanarak ürün/tutar CSV'sini açan, tutarı doğrulayan, kategori toplamlarını gösteren, 25 satırlık sayfalı tablo ve XLSX dışa aktarımı olan responsive bir HTML uygulaması üret. Kullanılan API'leri bu dosyalardan doğrula. Veriyi tarayıcıda tut.”
