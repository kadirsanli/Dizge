# Dizge Dili (`.dzg`) — Spesifikasyon v0.1

Dizge, anlamı **sözcük sırasından değil eklerden** okuyan bir programlama dilidir.
Türkçenin üç özelliğini doğrudan işlem semantiğine bağlar:

| Türkçe özellik | Dizge'deki karşılığı |
|---|---|
| Sondan eklemeli yapı | Her ek bir işleç: `-ın` = bağlam/1. parametre, `-dan` = karşılaştırma tabanı, `-ıp` = boru hattı |
| SOV dizilimi | Yüklem (fiil) daima sondadır; ondan önceki öbeklerin rolünü **hâl ekleri** belirler |
| Fiil çatısı | Etken çatı → **kopya** (immutable), edilgen çatı → **yerinde** (in-place, mutable) |

## 1. Mimari

```
.dzg ──▶ dizge_lexer.py ──▶ dizge_parser.py ──▶ dizge_compiler.py ──▶ Python/NumPy ──▶ dizge.py (runtime)
          yüzey token +       SOV kaydır-indirge     ad çözümleme, rol denetimi,
          biçimbirim FSM      → AST                  sabit katlama, çatı→bellek,
                                                      dalsız koşul maskesi
                                   ▲
                    dizge_cekirdek.py (standart kütüphane = kök sözlüğünün kaynağı)
```

## 2. Token yapısı

### 2.1 Yüzey tokenları

| Tür | Desen | Örnek |
|---|---|---|
| `KELİME` | Unicode harf dizisi, isteğe bağlı `'ek` | `tutarların`, `a'nın` |
| `SAYI` | `\d+([.,]\d+)?('ek)?` | `1000`, `2,5`, `2'den` |
| `METİN` | `"..."` | `"Anormal"` |
| `VİRGÜL` | `,` | tanım ayıracı / sıralama |
| `NOKTA` | `. ; ! ?` | cümle sonu |

* `_` boşlukla eşdeğerdir: `veri_setinin_karekökünü_alıp` ≡ `veri setinin karekökünü alıp`.
* `#` satır sonuna kadar yorumdur. Büyük/küçük harf Türkçe kurallarıyla katlanır (`I→ı`, `İ→i`).

### 2.2 Biçimbirim katmanı

Her `KELİME` bir veya daha çok **çözümlemeye** ayrılır: `kök ⟨kök türü⟩ + ek[etiket] ...`

**Kök türleri:** `AD` (programda tanımlı değişken), `İŞLEV` (kütüphane isim kökü), `FİİL`,
`SIFAT` (karşılaştırma), `SAYI_SÖZ`, `EDAT`, `BAĞLAÇ`, `İSİM` (sözlük dışı → sütun/öznitelik adı).

**İsim ek dilimleri** (sıra sabit):
`kök + [TÜRETİM -lIk/-lI/-sIz] + [ÇOĞUL -lAr] + [İYELİK -(s)I] + [DURUM] + [EKFİİL -DIr]`

**Fiil ek dilimleri:**
`kök + [ÇATI edilgen -(I)l/-(I)n] + [OLUMSUZ -mA] + KİP`

Arşifonemler: `A`=a/e, `I`=ı/i/u/ü, `D`=d/t, `K`=k/ğ. Kaynaştırma ünsüzü `(y)/(n)/(s)` yalnızca
ünlüden sonra gelir. Süreksiz yumuşama kökte geri alınır (`eşiği → eşik`, `küçüğe → küçük`).

### 2.3 Ek → işlem tablosu

| Ek | Etiket | İşlemsel anlam | Örnek |
|---|---|---|---|
| `-ın/-nin` | `DURUM:ilgi` | sahip / 1. parametre | `tutarların ortalaması` → `ortalama(tutarlar)` |
| `-(s)ı` | `İYELİK` | işlev uygulaması veya öznitelik | `işlemlerin tutarları` → sütun |
| `-ı/-yı` | `DURUM:belirtme` | eylemin nesnesi | `listeyi sırala` |
| `-a/-ya` | `DURUM:yönelme` | hedef / ölçüt | `tutara göre`, `matrise dönüştür` |
| `-dan/-ten` | `DURUM:ayrılma` | karşılaştırma tabanı / kaynak | `beşten büyükler`, `ortalamadan uzaklığı` |
| `ile` | `vasıta` | ikinci işlenen | `a'nın b ile çarpımı` |
| `-lık` / `-lı` | `TÜRETİM` | adlandırılmış parametre | `1000 satırlık`, `7 tohumlu` |
| `-lar` | `ÇOĞUL` | küme / vektörel seçim | `beşten büyükleri` |
| `-dır` | `EKFİİL` | tanım (atama) | `eşik, sapmanın iki katıdır.` |
| `-ıp` | `ULAÇ_IP` | boru hattı: **sonucu** aktar | `karekökünü alıp ... ayıkla` |
| `-arak` | `ULAÇ_ARAK` | eşlik eden eylem: **aynı nesneyi** aktar | `durdurularak raporlansın` |
| `-an(lar)` | `SIFATFİİL` | süzgeç (ilgi cümleciği) | `durumu "Anormal" olanlar` |
| `-dığı takdirde` / `-dığında` / `-rsa` | `ADFİİL` / `ŞART` | koşul → boolean maske | `doksanı aştığı takdirde` |
| `-(I)l-` / `-n-` | `ÇATI:edilgen` | **yerinde** değişim | `liste sıralansın` |
| `-ma-` | `OLUMSUZ` | değilleme | `eşiği aşmadığı takdirde` |

## 3. Cümle dilbilgisi

```
program   := cümle*
cümle     := tanım | zincir
tanım     := AD "," adöbeği-DIr "."                         # ortalama, tutarların ortalamasıdır.
zincir    := [koşul] halka ( ("-Ip" | "-ArAk" | "ve") halka )* yüklem "."
koşul     := adöbeği adöbeği FİİL-DIK-(s)I ("takdirde"|"durumunda") | ...-DIKIndA | ...-(A)rsA
halka     := adöbeği* FİİL
adöbeği   := [sahip-ilgi] [ek parametreler] baş         # kaydır-indirge ile kurulur
```

**İndirgeme kuralları (özet):**

1. *İyelikli işlev başı* (`ortalaması`, `uzaklığı`, `katı`) yığının tepesindeki öbekleri
   imzasındaki rollere göre tüketir: `ilgi → veri`, `ayrılma → b`, yalın sayı → `k`, `-lık/-lı` → adlandırılmış parametre.
2. *İşlev olmayan iyelikli isim* sahibinin özniteliğidir: `işlemlerin risk puanı` → `işlemler["risk_puanı"]`.
3. *Karşılaştırma sıfatı* önündeki ayrılma hâlli değerle yüklem kurar; çoğulsa süzgeçtir: `beşten büyükleri`.
4. *Sıfat-fiil* (`olanlar`, `aşanlar`) önündeki değer ve öznitelikle süzgeç kurar; kaynağı ayrılma/ilgi hâlli öbektir.
5. `A, B ve C` sıralamaları tek bir `Liste` öbeğine katlanır; ortak sahip paylaşılır
   (`örneğin ortalamasını ve standart sapmasını`).
6. Yüklemde kalan öbekler hâllerine göre rol olur: yalın→`özne`, belirtme→`belirtme`, `göre`, `olarak`, `yön`.

Belirsizlikler (ör. `eşiği` = iyelik mi belirtme mi?) **yığın bağlamıyla** giderilir ve loglanır.

## 4. Bellek modeli (eylem çatısı)

| Yazım | Çatı | Üretilen kod | Etki |
|---|---|---|---|
| `sayıları sırala` | etken | `ç.sırala(sayılar)` | yeni dizi; `sayılar` korunur |
| `sayılar sıralansın` | edilgen | `sayılar = ç.sırala_yerinde(sayılar)` | aynı tampon sıralanır (id korunur) |
| `t'yi durdurarak raporla` | etken + `-arak` | kopya atılır | **derleyici uyarır** |
| `t durdurularak raporlansın` | edilgen + `-arak` | yerinde | tablo kalıcı değişir |

Yerinde değişimin hedefi adlandırılmış bir değişken olmak zorundadır.

## 5. Koşullar: dalsız maske

`X Y-ı aştığı takdirde Z` → `_k = karşılaştır('>', X, Y)` ve maskeyi destekleyen eylemlere
`maske=_k` argümanı. Python `if` dalı **üretilmez**; işlem NumPy ile tüm satırlar üzerinde vektörel
çalışır. Maske desteklemeyen bir eylem varsa derleyici `if ç.koşul_doğru(_k):` dalına düşer ve bunu
istatistikte `dallı_koşul` olarak raporlar.

## 6. Standart kütüphane (`dizge_cekirdek.py`)

* **İstatistik:** ortalama, standart sapma (n-1), varyans, medyan, toplam, en büyük, en küçük, yüzdelik, z puanı, korelasyon, kovaryans
* **Aritmetik:** karekök, kare, mutlak değer, uzaklık (`|a-b|`), fark, kat, yarı, oran
* **Matris:** matris, birim matris, çarpım, devrik, ters, determinant, iz, satır sayısı, sütun sayısı, ilk, son
* **Olasılık:** normal dağılım, düzgün dağılım, birikimli olasılık (Φ)
* **Veri:** dizi, rastgele işlem tablosu
* **Eylemler:** al/hesapla/bul, ayıkla, sırala, etiketle, durdur, normalleştir, yazdır, raporla, sakla, dönüştür

Yeni bir kavram eklemek için bir Python işlevini `@işlev("kök", {"ilgi": "veri", ...})` ile
işaretlemek yeterlidir; lexer sözlüğü ve parser imzası otomatik güncellenir.

## 7. Bilinen sınırlar (v0.1)

* Biçimbirim çözümleyici kural tabanlıdır; Zemberek düzeyinde tam bir Türkçe sözlüğü yoktur.
  Sözlük dışı sözcükler sütun adı varsayılır ve çalışma anında aday listesiyle eşleştirilir.
* Ünlü uyumu eşlemede gevşek tutulur (hatalı uyumlu ekler de kabul edilir).
* Arka uç Python/NumPy'dir; LLVM IR arka ucu henüz yoktur (AST, ikinci bir arka uca hazır biçimdedir).
* İsim öbeğinde ilgi hâlli sahip en solda olmalıdır (`a'nın b'den farkı`).
* Döngü, kullanıcı tanımlı işlev ve modül sistemi henüz yoktur.
