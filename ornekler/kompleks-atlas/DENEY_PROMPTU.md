# Deney: Kompleks Atlas

Bu belge iki uygulamadan önce hazırlanmıştır. İki yönteme de aşağıdaki aynı görev verilir.

## Ortak uygulama istemi

Tek bir HTML dosyasında, internet ve harici kütüphane gerektirmeden çalışan Türkçe bir “Kompleks Atlas” geliştir. Kompleks düzlemde z=x+iy girdisini örnekleyip f(z) fonksiyonunun üç boyutlu yüzeyini üret. Gerçek matematik kullan; dekoratif, önceden çizilmiş bir yüzey üretme.

1. Altı hazır fonksiyon sun: z², z³−1, exp(z), sin(z), (z−1)/(z+1), 1/z. Seçili formülü ve açıklamasını göster.
2. x ve y yatay eksenler olsun. Dikey eksen log(1+|f(z)|), |f(z)|, Re f(z) veya Im f(z) olarak değiştirilebilsin. Varsayılan log(1+|f(z)|) olsun. Renk arg f(z) fazını temsil etsin; bunu bir renk anahtarıyla açıkla.
3. Gerçek perspektifli 3B örgü üret. Sürükleyerek yörünge, tekerlek ve düğmelerle yakınlaştırma, kamerayı sıfırlama, otomatik dönme ve duraklatma olsun. Mobil dokunma ve dar ekran da kullanışlı olsun.
4. Alan yarıçapı 0.5–4, çözünürlük 32–160, yükseklik ölçeği 0.2–2 aralığında değiştirilebilsin. Tekillikler ve sonlu olmayan değerler örgüyü bozmasın. Kırpılan/maskelenen örneklerin sayısını göster.
5. Seçili x,y noktasında sayısal f(z), modül, faz ve yüksekliği gösteren bir hesaplayıcı ekle. Geçersiz girdiler açıkça reddedilsin.
6. PNG dışa aktarma, sürümlü JSON ayar dışa/içe aktarma, hata mesajları ve kullanım yardımı ekle. Bozuk JSON uygulamanın durumunu değiştirmesin.
7. Köşe/üçgen sayısı, son örgü üretim süresi ve gerçek kare aralıklarından FPS göster. Tarayıcı içinde çalıştırılabilir matematik doğrulama testleri ve makine tarafından okunabilir test/ölçüm arayüzü sun: window.atlas.test(), window.atlas.set(patch), window.atlas.stats(), window.atlas.sample(x,y). Testler fonksiyonların bağımsız bilinen sonuçlarına dayansın.
8. Okunabilir, erişilebilir etiketli, klavyeyle kullanılabilen, görsel olarak özenli bir arayüz üret. Kaynak kodu HTML dosyasının içinde olsun. Başlatırken ağ isteği yapma. WebGL yoksa anlaşılır hata göster.

## Önceden belirlenen değerlendirme

Toplam 100 puan. Her madde 5 puandır. Kanıtlanmayan madde 0; kısmi karşılanan madde 2.5; tam karşılanan madde 5. Estetikte iki alt koşul (görsel hiyerarşi ve dar ekran) ayrı 2.5 puandır. Otomatik test ile öznel inceleme raporda ayrılır.

- Matematik (25): altı fonksiyon; dört yükseklik; bilinen değerler; tekillik/sonluluk; faz renk eşlemesi.
- İşlevler (25): kamera; parametreler; hesaplayıcı/girdi; PNG; atomik JSON gidiş-dönüş.
- Sağlamlık (20): çevrimdışı/tek dosya; başlangıç ve etkileşim hata vermemesi; geçersiz girdiler; en yüksek çözünürlükte üretim ve kullanılabilirlik.
- Kullanılabilirlik/görsellik (20): açıklama ve renk anahtarı; etiket/klavye; hiyerarşi/dar ekran; yardım ve hata geri bildirimi.
- Ölçülebilirlik (10): gerçek üretim/FPS istatistiği; çalıştırılabilir ve bağımsız referanslı testler.

## Protokol

1. Bu ortak istemi ve ölçütleri kaydet.
2. Normal yöntem: Dizge kaynaklarını okumadan doğrudan HTML/CSS/JavaScript ile geliştir. İlk üretimi kaydet, kontrol et, gerekli düzeltmeleri yap; dosyayı hash ile sabitle.
3. Sonra kullanıcının verdiği Dizge deposunu belirli commit üzerinden incele. `.dzg` kurallarının gerçekte ne olduğunu belgele. Aynı istemi bu yaklaşımın gerektirdiği ara temsil/denetim akışıyla uygula. Normal uygulamanın kaynak kodunu kopyalama.
4. Her aşama için UTC başlangıç/bitiş, geçen duvar saati ve test sonuçlarını kaydet. Dizge okuma/uyarlama süresini ayrı göster. Süreler modelin yalnızca düşünme süresi veya API gecikmesi değildir; araç ve kontrol beklemelerini de içerir.
5. İki HTML'ye aynı testleri uygula. Tarayıcı/cihaz koşullarını, örnek sayısını ve test sınırlarını belirt. Aynı oturumdaki ikinci üretim ilk denemeden deneyim kazanabilir; bu bir kontrollü bağımsız model deneyi değildir.
6. İki dosyayı, Dizge ara kaynaklarını, test kanıtlarını ve karşılaştırma raporunu yerel teslim et. Dışarı yayınlama.

## Manuel kontrol rotası

İki HTML'yi sırayla aç. Altı fonksiyonu ve dört yüksekliği dene. Varsayılan kamera ile görüntüleri karşılaştır; sürükle/yakınlaştır/duraklat/sıfırla. Çözünürlüğü 160 yap. 1/z için (0,0) ve (1,0), Möbius için (-1,0) noktalarını dene. PNG ve JSON indir; ayarları değiştirip JSON'u geri yükle. Bozuk JSON dene. Dar pencere ve klavye odağını kontrol et. Kendi estetik puanını araştırmacının puanından ayrı ver.
