# Dizge.js 0.1.0 doğrulama kaydı

Tarih: 28 Ekim 2026 (Europe/Istanbul). Yerel doğrulama; CI sonucu ayrıca GitHub Actions üzerinden izlenir.

| Kontrol | Sonuç |
|---|---|
| `npm test` | 20/20 test; veri, istatistik, CSV, DOM, yaşam döngüsü, gerçek PDF/XLSX |
| `npm run check` | TypeScript strict: başarılı |
| `npm run build` | Küçültülmüş dağıtım üretildi; yaklaşık 24 KB, gzip yaklaşık 10 KB |
| `npm run test:browser` | Chromium 149.0.7827.55; 1440×1100 ve 390×844 |
| Dosya akışları | CSV/XLSX indir → yükle; Türkçe PDF üret → metnini oku |
| Worker | Analiz, hata iletimi, AbortController iptali |
| UI | Tema, kayıt formu, mobil taşma kontrolü; JS sayfa hatası yok |
| Python regresyon | Mevcut 18 unittest başarılı; Python kaynakları değiştirilmedi |
| `npm pack --dry-run` | Dağıtım dosyaları doğrulandı |
| `git diff --check` | Başarılı |

Dosya bağlayıcıları tarayıcı testinde sürümü sabit yerel npm bağımlılıklarıyla çalıştırılır; test CDN erişilebilirliğini ölçmez. PDF.js standart Helvetica testlerinde standart font veri yolu uyarısı verebilir; metin çıktısı doğrulanır, Türkçe test gömülü Liberation Sans kullanır. Ekran görüntüleri gerçek tarayıcıdan alınmıştır: [masaüstü](javascript-desktop.png), [mobil](javascript-mobile.png).

100.000 kayıtla performans: [ham JSON](javascript-benchmark.json). Intel i5-4440 / Windows / Node 24, bir ısınma ve yedi ölçüm. Medyanlar yaklaşık: özet 5,8 ms, filtre+sıralama 28,8 ms, gruplama 26,5 ms, join 102 ms. Ölçümler cihaz ve çalışma yüküne özeldir; diğer kütüphanelere üstünlük iddiası veya gerçek zaman garantisi değildir.

Henüz doğrulanmayan alanlar: Firefox/Safari otomasyonu, resmi erişilebilirlik uygunluk sertifikası, OCR, düşmanca sıkıştırma bombalarında kaynak izolasyonu, milyonlarca satırla bellek tavanı. Sürüm kapsamı ve dosya formatı sınırları [API rehberinde](javascript.md).
