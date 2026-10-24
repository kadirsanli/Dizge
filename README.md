# Dizge — Türkçe Mantık Motoru ve Programlama Dili (`.dzg`)

Anlamı sözcük sırasından değil **eklerden** okuyan deneysel bir dil: hâl ekleri parametreleri bağlar,
fiil çatısı bellek davranışını belirler (etken → kopya, edilgen → yerinde), koşullar cümleye
yedirilir ve dalsız vektörel maskelere derlenir. Ayrıntılar: [`DIZGE_DILI.md`](DIZGE_DILI.md).

```dzg
# hesaplama.dzg — ortalamadan 2σ uzak işlemleri ayıkla
işlemler, bin satırlık rastgele işlem tablosudur.
tutarlar, işlemlerin tutarlarıdır.
ortalama, tutarların ortalamasıdır.
sapma, tutarların standart sapmasıdır.
eşik, sapmanın iki katıdır.
tutarların ortalamadan uzaklığı eşiği aştığı takdirde işlemler "Anormal" olarak etiketlensin.
anormaller, işlemlerden durumu "Anormal" olanların matrisidir.
anormalleri tutara göre büyükten küçüğe sıralayıp ilk onunu yazdır.
```

## Kurulum ve çalıştırma

```bash
pip install -r requirements.txt
python3 dizge.py hesaplama.dzg            # LEXER → PARSER → DERLEYİCİ → ÇALIŞMA loglarıyla
python3 dizge.py hesaplama.dzg --sessiz   # yalnızca program çıktısı
python3 -m unittest -v test_dizge         # 18 test
```

| Dosya | Görev |
|---|---|
| `dizge_lexer.py` | Yüzey tokenları + Türkçe biçimbirim FSM'i (kök/ek ayrıştırma) |
| `dizge_parser.py` | SOV kaydır-indirge ayrıştırıcı → AST |
| `dizge_compiler.py` | AST → optimize Python/NumPy (sabit katlama, çatı→bellek, dalsız koşul) |
| `dizge_cekirdek.py` | Standart kütüphane: istatistik, matris, olasılık; sözlüğün kaynağı |
| `dizge.py` | Çalışma ortamı ve CLI (aşama logları, bellek izleme) |
| `hesaplama.dzg` | Finansal anomali tespiti örneği |
| `ornekler/` | `zincir.dzg` (kural 1), `bellek.dzg` (kural 2), `denetim.dzg` (kural 3 + matris/olasılık) |
| `derlenmis/` | Derleyicinin ürettiği Python modülleri (çalıştırınca oluşur, repoda yok) |
| `hesaplama_calisma.log` | `hesaplama.dzg` için örnek tam aşama logu |
| `DIZGE_DILI.md` | Dil spesifikasyonu: token yapısı, ek tablosu, dilbilgisi, sınırlar |

Gereksinim: Python ≥ 3.10, NumPy.
