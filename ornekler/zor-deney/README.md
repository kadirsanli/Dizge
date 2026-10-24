# Zor Deney — üç hesaplamalı 3B laboratuvar

`normal-zor.html`: doğrudan JS akışı. `dizge-zor.html`: gerçek `.dzg` AST'sinden üretilen akış. İki HTML tek dosyadır. Arayüz, parser ve sayısal yardımcılar ortaktır; deney bağımsız iki algoritma icadını ölçmez.

| Laboratuvar | Hesaplama |
|---|---|
| Newton | Güvenli parser, dual kompleks türev, artık/türev/tekillik kontrolü |
| N-cisim | 3B çekim, velocity-Verlet, enerji/momentum |
| Schrödinger | 2B FFT, split-operator, yoğunluk/faz, norm/tersinirlik |

## Yeniden üretim

Python ≥3.10 + NumPy ve Node ile depo kökünden:

```bash
python ornekler/zor-deney/referans_uret.py
python ornekler/zor-deney/dzg_derle.py
node ornekler/zor-deney/paketle.cjs
node ornekler/zor-deney/node-test.cjs normal-akis.js --no-benchmark
node ornekler/zor-deney/node-test.cjs dizge-akis.js --no-benchmark
```

Referans üreticisi JS çekirdeğini çağırmaz: 50 analitik `cmath` f/türev örneği, NumPy FFT, üç cisim×100 adım ve dalga×25 adım üretir. Python eklentisinin Newton örnek kontrolü z³−1 için bir adımdır; genel ifade parser'ı tarayıcıdaki ortak JS çekirdeğidir.

Depo kökünde `python -m http.server 8000` sonrasında `http://localhost:8000/ornekler/zor-deney/arayuz-test.html` dış UI kontrollerini açar. HTML içindeki ana test düğmesi 114 kontrol +3 CPU hedefini; “60 FPS tavan testi” ayrı eşiği çalıştırır. Aynı cihazda görünür sekmede ölçün.

## Sonuçlar — 24 Ekim 2026

| Kontrol | Normal | Dizge |
|---|---:|---:|
| Sayısal doğruluk | 81/81 | 81/81 |
| Parser/girdi/sınır | 33/33 | 33/33 |
| Ana CPU hedefleri | 3/3 | 3/3 |
| Toplam ana test | 117/117 | 117/117 |
| Dış arayüz | 21/21 | 21/21 |
| Ek 60 FPS tavanı | 0/3 | 0/3 |
| Çelişkili istekleri çözme | 0/3 | 0/3 |
| Doğru gerekçeyle reddetme | 3/3 | 3/3 |

Her CPU işi için 1 ısınma +5 ölçüm; medyanlar, UI çizimi hariç. Ana eşik 500 ms:

| İş | Normal | Dizge |
|---|---:|---:|
| 64×64 Newton / z³−1 / 32 adım sınırı | 47,40 ms | 47,00 ms |
| 128 cisim×200 adım | 211,80 ms | 212,50 ms |
| 64×64 dalga×100 adım | 208,50 ms | 210,80 ms |

Pilot sonrasında iki yönteme eşit uygulanan ek tek kare hedefi 16,67 ms'dir; ana puan eşiği değiştirilmedi:

| Ağır iş | Normal | Dizge |
|---|---:|---:|
| 96×96 Newton / exp(z)sin(z)+z⁵−1 / 64 adım sınırı | 222,20 ms | 227,90 ms |
| 128 cisim×100 adım | 106,80 ms | 110,20 ms |
| 128×128 dalga×20 adım | 153,40 ms | 159,20 ms |

Ölçüm aralıkları örtüşüyor; bu tek oturum genel dil hız üstünlüğünü desteklemiyor. İki akış aynı yardımcıları aynı sırada çağırır; aynı sonuç beklenir. Büyük işleri tek karede bitirme hedefi ikisinde de başarısızdır; bu mantıksal imkânsızlık değildir.

Gerçek çelişkiler ayrı: z=0'da doğru sonlu 1/z yoktur; bütün örnekleri sıfır kalan dalganın normu 1 olamaz; bir milyar ham XYZ Float32 köşesi en az12 milyar bayt ister. Ret, başarılı matematik çözümü diye sayılmaz.

## Kanıt ve sınırlar

[Kaynak](akıslar.dzg) · [Üretilen JS](dizge-akis.js) · [AST](derleme/ast.txt) · [Derleme kanıtı](derleme/kanit.json) · [Protokol](PROMPT.md) · [NumPy referansları](referans.json)

Ham kayıtlar: [normal tarayıcı](normal-tarayici.json), [Dizge tarayıcı](dizge-tarayici.json), [normal UI](normal-arayuz.json), [Dizge UI](dizge-arayuz.json), [normal tavan](normal-tavan.json), [Dizge tavan](dizge-tavan.json).

İlk HTML paketi kayıtlı başlangıçtan yaklaşık6 dk15 sn sonra hazırdı. Ortak hazırlama iki yönteme bölünemedi; normal akış istemle birlikte kaydedildiğinden bağımsız üretim süresi üstünlüğü hesaplanmadı. Sonraki GitHub/GIF hazırlığı buna eklenmez. Aynı model/oturum, tek koşu ve ortak çekirdek kullanıldı; kör insan estetik veya ekran okuyucu denetimi yapılmadı.

Çalışma testleri localhost'tadır; araç politikası doğrudan file:// testine izin vermedi. Sonlu adım/ızgara, periyodik sınır ve yumuşatılmış çekim yaklaşık modellerdir. Norm korunumunun kendisi sürekli PDE doğruluğunu kanıtlamaz; uzun süreli kesin enerji korunum garantisi yoktur. Bu arka uç genel bir Dizge→JS derleyicisi değildir.
