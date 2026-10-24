# Kompleks Atlas

`dizge.html` ve `normal.html` çevrimdışı tek dosyalık uygulamalardır. GitHub HTML kaynak gösterir; indirip yerelde açın veya depo kökünde `python -m http.server 8000` ile servis edin.

![Gerçek uygulama kaydı](../../docs/gifs/kompleks-atlas.gif)

`atlas.dzg` resmi lexer/parser/compiler'dan geçer. `atlas_eklentisi.py`, `@işlev` ile kompleks işlemleri kaydeder. Python/NumPy doğrulamasından sonra göreve özel saf AST→JS alt kümesi HTML'ye gömülür. Arayüz ve WebGL ayrıca JS ile yazılmıştır.

Depo kökünden:

```bash
python ornekler/kompleks-atlas/dizge_derle.py
node ornekler/kompleks-atlas/paketle.cjs
```

Tarayıcı tezgâhı: `http://localhost:8000/ornekler/kompleks-atlas/test.html`. İki sürümü aynı ayarlarda deneyin. Normal 76/78, Dizge 78/78 geçti. Normaldeki enum tür açıkları deney kaydını korumak için düzeltilmedi; `tur-hatasi-test.json` ile yeniden üretilebilir.

[İstem](DENEY_PROMPTU.md) · [Ayrıntılı rapor](RAPOR.md) · [Normal ham sonuç](normal-test.json) · [Dizge ham sonuç](dizge-test.json) · [Karşılaştırma](karsilastirma.html)

Raporun “dizge-kaynak” ifadesi ilk yerel upstream kopyasını anlatır. Bu depoda çekirdek iki klasör yukarıdadır; eklenti yolu buna göre taşınmıştır. Yerel yol içerebilen üretilmiş Python dosyaları izlenmez. Kaynak commit: `6622ff41165db958d677d68e095a848502666a11`.
