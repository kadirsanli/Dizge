# Zor Deney — önceden kaydedilen ortak istem ve protokol

İki bağımsız açılabilir, çevrimdışı tek HTML dosyasında aynı üç hesaplamalı 3B laboratuvarı geliştir. İnternete veya üçüncü taraf kütüphaneye bağımlı olmasın. İşlevleri gerçekten hesapla; hazır görsel oynatma.

## Görev 1 — kompleks Newton + otomatik türev

Kullanıcıdan kompleks analitik ifade al. `z`, `i`, `pi`, `e`, sayılar, + − * /, parantez, sınırlı tam sayı üsleri ve sin/cos/exp/log/sqrt destekle. JavaScript eval/Function kullanma. Ayrıştırıcı uzunluk, token, derinlik ve üs sınırlarını uygulasın. Dual kompleks sayılarla f ve f′ birlikte hesaplansın. Newton iterasyonunu artık/türev kontrolüyle çalıştır; kök, limit, kutup, sıfır türev ve taşma durumlarını ayır. Izgaradan 3B yakınsama topoğrafyası üret. Türevleri ve kök artıklarını dış referanslarla test et.

## Görev 2 — üç boyutlu N-cisim

Tohumlanmış başlangıç, birim G, yumuşatılmış çekim ve velocity-Verlet (yarım tekme → sürükleme → yeni ivme → yarım tekme). 2–128 cisim, değiştirilebilir adım büyüklüğü, 3B noktalar/yörünge izleri. Enerji, toplam momentum, adım sayısı ve zaman göster. İkili yörünge, enerji hatası, zaman tersinirliği ve deterministik başlangıcı test et. Kesin sonsuz süre enerji korunumunu iddia etme.

## Görev 3 — 2B kuantum dalga

ħ=m=1. Periyodik kutuda karmaşık ψ için radix-2 2B FFT ve simetrik split-operator: V/2 → FFT → exp(−i k² dt/2) → IFFT → V/2. 32/64/128 ızgara. Serbest, harmonik ve çift yarık potansiyelleri. Gerçek |ψ|² yüksekliğinden 3B yüzey, faz rengi, norm ve zaman. Normu her adımda yapay olarak yeniden ölçekleyerek hatayı gizleme. FFT gidiş dönüşü, düzlem dalga fazı, norm, ters adım ve NumPy referansını test et. Bu görselleştirme parçacık ölçümü veya tam gerçek evren simülasyonu değildir.

## Ortak uygulama

Yörünge kamera sürükleme/klavye/yakınlaşma, başlat/duraklat/sıfırla/tek adım, PNG ve JSON ayar indirme/yükleme, atomik doğrulama, görünür hata ve işlem ilerlemesi, dar ekran. Newton üretimi satır grupları arasında kullanıcı arayüzüne dönsün; yeni üretim eskisini iptal edebilsin. Test çıktısını JSON olarak indir. WebGL yerine projeksiyonlu Canvas 2D üçgen örgü kullanılabilir; bütün noktalar gerçek 3B koordinattan perspektifle projekte edilsin.

## Gerçekten imkânsız sınırlar — ayrı sonuç

1. 1/z'nin z=0 noktasında doğru, sonlu kompleks değerini üret: tanımsız olduğu için reddet.
2. Bütün örnekleri sıfır kalan dalga fonksiyonunun normunu bir yap: çelişki olduğu için reddet.
3. 1.000.000.000 XYZ köşesini ham Float32 olarak en fazla 1 MiB'ye sığdır: en az 12.000.000.000 bayt gerektirir; ön kontrolde reddet. Gerçek dev bellek ayırmaya çalışma.

Bu sınırlar için uydurma bir “çözüldü” sonucu verme. İmkânsız görev tamamlama sayısı ve doğru reddetme sayısı ayrı raporlansın; reddetme başarılı matematik çözümü diye sunulmasın.

## Deney tasarımı

- Ortak UI, doğrulama, parser, kompleks aritmetik, kuvvet çekirdeği ve FFT yardımcıları yöntemlerden önce hazırlanır. Ortak hazırlama süresi ayrı tutulur. Önceki bağımsız uygulama deneyinden farklı olarak burada işlem sırası gösteriminin etkisi sınanır.
- A: açık JavaScript akışı. B: sabitlenen mevcut Dizge commit'inin resmi lexer/parser/compiler hattına verilen gerçek .dzg akışları; bu görev için saf AST alt kümesi JS'ye çevrilir. İki yöntem aynı aşama yardımcılarını kullanır. Bu deney bağımsız iki algoritma icadı veya sıfırdan üretim hızı deneyi değildir.
- Normal akış önce oluşturulup hash ile sabitlenir. Ardından Dizge akışı hazırlanır. HTML'ler aynı kabukla paketlenir; yazar uygulama sırasında kendi hatalarını düzeltir, düzeltme kayıtları tutulur.
- Değerlendirme istemi ve referanslar yönteme özgü koddan önce hazırlanır. NumPy/analitik dış kontroller ile ortak tarayıcı kontrolleri iki dosyada aynıdır. Tek koşu ve aynı model/oturum sıra etkisini ortadan kaldırmaz.
- Kalite: sayısal doğruluk testlerinin geçiş oranı ×60; parser/girdi/sınır/atomiklik testlerinin geçiş oranı ×20; üç performans eşiğinin geçiş oranı ×10; ortak arayüzde 3B görünüm/klavye ve dar ekran gözlemi ×10. İmkânsız görevlerin “çözüldü” oranı bu puandan ayrıdır. Ortak koddan gelen aynı başarının iki bağımsız kanıt olmadığı belirtilir.
- Önceden belirlenen CPU stresleri: 64×64 z³−1 Newton başlangıcı, en fazla32 adım <500 ms; 128 cisim×200 adım <500 ms; 64×64 kuantum×100 adım <500 ms. Her biri 1 ısınma +5 ölçüm; medyan, min/max ve ham süreler saklanır. Eşikler bu tarayıcıya özgü kabul hedefidir; genel donanım garantisi değildir. UI çizimi CPU ölçümüne dahil değildir.

Teknik referanslar: [GROMACS velocity-Verlet](https://manual.gromacs.org/2016/manual-2016.pdf), [NumPy FFT normalizasyonu](https://numpy.org/doc/2.2/reference/routines.fft.html), [Split-operator uygulaması](https://www.algorithm-archive.org/contents/split-operator_method/split-operator_method.html). Formüller ve uygulama bağımsız yazılacak; kaynak kod kopyalanmayacak.

## Pilot sonrası ek tavan protokolü — ana puanı değiştirmez

Normal tarayıcı pilotu 117/117 geçtikten sonra, iki yönteme de aynı ek test planlandı. Seçim pilot sonrası olduğundan bağımsız ön kayıt sayılmaz; raporda açıkça ayrılacak. Aşağıdaki işlerin her birinin tek 60 FPS kare bütçesi (1000/60 ms) içinde bitmesi hedeflenir; ekran çizimi hariçtir. 1 ısınma +5 ölçüm, medyan/min/max kaydedilir. Çalışma örnekleri 1) 96×96 başlangıç, `exp(z)*sin(z)+z^5-1`, 64 Newton adımı; 2) 128 cisim×100 adım; 3) 128×128 dalga×20 adım. Bunların bu donanımda geçmemesi mantıksal imkânsızlık değildir; sayısal çıktı doğruyken gecikme hedefi başarısız olabilir. Eski 100'lük kalite puanı bu sonradan seçilmiş eşikle değiştirilmez.
