# Dizge.js 0.2.0 doğrulama kaydı

Tarih: 28 Ekim 2026 (Europe/Istanbul). Yerel doğrulama; CI sonucu ayrıca GitHub Actions üzerinden izlenir.

| Kontrol | Sonuç |
|---|---|
| `npm test` | 24/24 test; Türkçe/İngilizce API eşliği, veri, istatistik, CSV, DOM, yaşam döngüsü, gerçek PDF/XLSX |
| `npm run check` | TypeScript strict: başarılı; Türkçe API tipleri dahil |
| `npm run build` | 49.448 bayt kaynak → 30.604 bayt küçültülmüş; gzip 12.003 bayt |
| `npm run build:tek` | `examples/tek-dosya.html` 53.512 bayt; Dizge.js gömülü |
| `npm run test:browser` | Chromium 149.0.7827.55; 1440×1100 ve 390×844; tek dosya örneği dahil |
| Tek dosya | Dış istek yok; Türkçe API, form, tablo, grafik, tema; JS sayfa hatası yok |
| Dosya akışları | CSV/XLSX indir → yükle; Türkçe PDF üret → metnini oku |
| Worker | Analiz, hata iletimi, AbortController iptali |
| UI | Tema, kayıt formu, mobil taşma kontrolü; JS sayfa hatası yok |
| Python regresyon | Mevcut 18 unittest başarılı; Python kaynakları değiştirilmedi |
| `npm pack --dry-run` | 12 dosya; Türkçe rehber ve tek dosya örneği dahil |
| `git diff --check` | Başarılı |

Dosya bağlayıcıları tarayıcı testinde sürümü sabit yerel npm bağımlılıklarıyla çalıştırılır; test CDN erişilebilirliğini ölçmez. PDF.js standart Helvetica testlerinde standart font veri yolu uyarısı verebilir; metin çıktısı doğrulanır, Türkçe test gömülü Liberation Sans kullanır. Ekran görüntüleri gerçek tarayıcıdan alınmıştır: [masaüstü](javascript-desktop.png), [mobil](javascript-mobile.png). Tek dosya örneği: [examples/tek-dosya.html](../examples/tek-dosya.html).

100.000 kayıtla performans: [ham JSON](javascript-benchmark.json). Intel i5-4440 / Windows / Node 24, bir ısınma ve yedi ölçüm. Bu 0.2.0 koşusunda medyanlar yaklaşık: özet 5,01 ms, filtre+sıralama 31,40 ms, gruplama 22,98 ms, join 114,03 ms, CSV 27,36 ms. Ölçümler cihaz ve çalışma yüküne özeldir; diğer kütüphanelere üstünlük iddiası veya gerçek zaman garantisi değildir.

Türkçe kaynak görünümü yalnızca küçültülmemiş `dizge.js` için geçerlidir. `dizge.min.js` boyut içindir; değişken adları küçültme sırasında kısalır. JavaScript anahtar kelimeleri ve tarayıcı API'leri İngilizce kalır.

Henüz doğrulanmayan alanlar: Firefox/Safari otomasyonu, resmi erişilebilirlik uygunluk sertifikası, OCR, düşmanca sıkıştırma bombalarında kaynak izolasyonu, milyonlarca satırla bellek tavanı. Sürüm kapsamı ve dosya formatı sınırları [API rehberinde](javascript.md) ve [Türkçe rehberde](javascript-tr.md).
