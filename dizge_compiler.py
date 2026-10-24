"""
dizge_compiler.py — Dizge Derleyicisi (AST → optimize Python/NumPy)
===================================================================

Arka uç: AST, `dizge_cekirdek` üzerinde çalışan vektörel Python koduna çevrilir.
Her Dizge cümlesi bir "adım" olur; adımlar hem tek tek (izlenerek) çalıştırılabilir
hem de bağımsız bir .py modülü olarak diske yazılabilir.

Derleme geçişleri:
  1. Ad çözümleme      : tanımsız adlar için Türkçe hata + yazım önerisi (difflib)
  2. Rol denetimi      : fiilin kabul etmediği hâl/rol → derleme hatası
  3. Sabit katlama     : saf işlevler sabit argümanlarla derleme anında hesaplanır
  4. Çatı → bellek     : etken fiil → kopya üreten çağrı, edilgen fiil → *_yerinde çağrı
  5. Dalsız koşul      : '-dığı takdirde' → boolean maske; maskeli eylemlere argüman
                         olarak geçer, Python `if` dalı üretilmez (vektörel/SIMD)
  6. Akış analizi      : '-arak' ile atılan kopya sonuçları, kullanılmayan tanımlar
"""
from __future__ import annotations

import difflib
import inspect
import keyword
import logging
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

import dizge_cekirdek as çekirdek
from dizge_parser import (Ad, Bağlam, Halka, İşlevAdı, Karşılaştırma, Liste, Metin, Öznitelik,
                          Program, Sayı, SütunAdı, Süzgeç, Tanım, Uygula, Yön, Yüklem, Zincir, Düğüm)

log = logging.getLogger("dizge.derleyici")


class DizgeDerlemeHatası(Exception):
    def __init__(self, mesaj: str, satır: int | None = None):
        super().__init__(f"satır {satır}: {mesaj}" if satır else mesaj)
        self.satır = satır


@dataclass
class Adım:
    satır: int
    kaynak: str
    py: str
    atananlar: list[str] = field(default_factory=list)
    yerinde: list[str] = field(default_factory=list)


@dataclass
class DerlenmişProgram:
    adımlar: list[Adım]
    modül: str
    uyarılar: list[str]
    notlar: list[str]
    istatistik: Counter


def _py_ad(ad: str) -> str:
    return f"{ad}_" if keyword.iskeyword(ad) or ad == "ç" else ad


def _uyum(kelime: str, ek: str) -> str:
    """Basit ünlü uyumu: ek içindeki A → a/e, I → ı/i/u/ü (son ünlüye göre)."""
    son = next((h for h in reversed(kelime) if h in "aeıioöuü"), "e")
    A = "a" if son in "aıou" else "e"
    I = {"a": "ı", "ı": "ı", "e": "i", "i": "i", "o": "u", "u": "u", "ö": "ü", "ü": "ü"}[son]
    çıktı = kelime
    for h in ek:
        çıktı += A if h == "A" else (I if h == "I" else h)
        son = çıktı[-1] if çıktı[-1] in "aeıioöuü" else son
        A = "a" if son in "aıou" else "e"
        I = {"a": "ı", "ı": "ı", "e": "i", "i": "i", "o": "u", "u": "u", "ö": "ü", "ü": "ü"}[son]
    return çıktı


def edilgen_biçim(kök: str, kip: str) -> str:
    """sırala → sıralansın / sıralanarak ;  durdur → durdurulsun / durdurularak"""
    gövde = kök + "n" if kök[-1] in "aeıioöuü" else _uyum(kök, "In" if kök[-1] == "l" else "Il")
    return _uyum(gövde, "ArAk" if kip == "arak" else "sIn")


def _öneri(ad: str, havuz) -> str:
    yakın = difflib.get_close_matches(ad, list(havuz), n=1, cutoff=0.6)
    return f" Şunu mu demek istediniz: '{yakın[0]}'?" if yakın else ""


class Derleyici:
    def __init__(self, kaynak_adı: str = "<dizge>"):
        self.kaynak_adı = kaynak_adı
        self.tanımlı: dict[str, int] = {}
        self.kullanılan: set[str] = set()
        self.uyarılar: list[str] = []
        self.notlar: list[str] = []
        self.ist: Counter = Counter()
        self._geçici = 0
        self._satır = 0

    # ------------------------------------------------------------------ giriş
    def derle(self, program: Program) -> DerlenmişProgram:
        adımlar = []
        for c in program.cümleler:
            self._satır = c.satır
            adımlar.append(self._tanım(c) if isinstance(c, Tanım) else self._zincir(c))
        for ad, satır in self.tanımlı.items():
            if ad not in self.kullanılan:
                self.uyarılar.append(f"satır {satır}: '{ad}' tanımlandı ama hiç kullanılmadı (ölü tanım).")
        return DerlenmişProgram(adımlar, self._modül(adımlar), self.uyarılar, self.notlar, self.ist)

    def _hata(self, mesaj: str):
        raise DizgeDerlemeHatası(mesaj, self._satır)

    # ------------------------------------------------------------- cümleler
    def _tanım(self, t: Tanım) -> Adım:
        py = f"{_py_ad(t.ad)} = {self._ifade(t.değer, None)}"
        self.tanımlı[t.ad] = t.satır
        self.ist["tanım"] += 1
        return Adım(t.satır, t.metin, py, [t.ad])

    def _zincir(self, z: Zincir) -> Adım:
        satırlar: list[str] = []
        koşul = None
        if z.koşul is not None:
            satırlar.append(f"_k = {self._ifade(z.koşul, None)}")
            koşul = "_k"
        maskesiz = koşul is not None and any(not self._eylem(h).maskeli for h in z.halkalar)
        if koşul and not maskesiz:
            self.ist["dalsız_koşul"] += 1
            self.notlar.append(f"satır {z.satır}: koşul dalsız maskeye derlendi "
                               f"({', '.join(h.fiil for h in z.halkalar)} → maske=_k, if/else yok)")
        elif maskesiz:
            self.ist["dallı_koşul"] += 1

        gövde, bağlam = [], None
        atananlar, yerinde_hedefler = [], []
        for i, h in enumerate(z.halkalar):
            son = i == len(z.halkalar) - 1
            ifade, kaynak, atama, yerinde = self._halka(h, bağlam, None if maskesiz else koşul)
            if atama:
                gövde.append(f"{_py_ad(atama)} = {ifade}")
                atananlar.append(atama)
                bağlam = _py_ad(atama)
            elif yerinde:
                gövde.append(f"{_py_ad(yerinde)} = {ifade}")
                yerinde_hedefler.append(yerinde)
                bağlam = _py_ad(yerinde)
            elif son:
                gövde.append(ifade)
                e = self._eylem(h)
                if e.tür in ("dönüşüm", "kimlik", "uygulama"):
                    self.uyarılar.append(
                        f"satır {z.satır}: '{h.fiil}' (etken) yeni bir değer üretti ama sonuç kullanılmıyor. "
                        f"Sonucu '... X olarak sakla' ile adlandırın ya da yerinde değişim için edilgen çatı "
                        f"kullanın ('{edilgen_biçim(h.fiil, 'sın')}').")
            else:
                self._geçici += 1
                ad = f"_b{self._geçici}"
                gövde.append(f"{ad} = {ifade}")
                bağlam = ad
            if h.bağ == "arak":
                e = self._eylem(h)
                if e.tür == "dönüşüm" and not yerinde:
                    self.uyarılar.append(
                        f"satır {z.satır}: '-arak' eşlik eden eylemdir, '{h.fiil}' (etken çatı) ürettiği kopya "
                        f"atılıyor; asıl nesne değişmez. Kalıcı etki için edilgen çatı kullanın "
                        f"(örn: '{edilgen_biçim(h.fiil, 'arak')}' / '{edilgen_biçim(h.fiil, 'sın')}').")
                bağlam = kaynak
        if maskesiz:
            satırlar.append("if ç.koşul_doğru(_k):")
            satırlar += ["    " + g for g in gövde]
        else:
            satırlar += gövde
        return Adım(z.satır, z.metin, "\n".join(satırlar), atananlar, yerinde_hedefler)

    # --------------------------------------------------------------- eylemler
    def _eylem(self, h: Halka) -> çekirdek.EylemBilgisi:
        e = çekirdek.EYLEMLER.get(h.fiil)
        if e is None:
            self._hata(f"'{h.fiil}' bir Dizge eylemi değil.{_öneri(h.fiil, çekirdek.EYLEMLER)} "
                       f"Bilinen eylemler: {', '.join(sorted(çekirdek.EYLEMLER))}")
        return e

    def _halka(self, h: Halka, bağlam: str | None, maske: str | None):
        """→ (python ifadesi, kaynak ifadesi, atama hedefi, yerinde hedefi)"""
        e = self._eylem(h)
        argümanlar: dict[str, Düğüm] = {}
        for rol, düğüm in h.roller.items():
            param = e.roller.get(rol)
            if param is None:
                self._hata(f"'{h.fiil}' eylemi '{rol}' rolünde bir öğe almaz ('{düğüm.metin}'). "
                           f"Kabul ettiği roller: {', '.join(e.roller)}")
            if param in argümanlar:
                self._hata(f"'{h.fiil}' eyleminin '{param}' girdisi iki kez verildi.")
            argümanlar[param] = düğüm
        birincil = next(iter(e.roller.values()))
        if birincil not in argümanlar:
            if bağlam is None:
                self._hata(f"'{h.fiil}' eyleminin nesnesi yok. Örn: 'X-i {h.fiil}' ya da önceki "
                           f"eylemi '-ıp' ile bağlayın.")
            argümanlar[birincil] = Bağlam()
        kaynak_düğüm = argümanlar[birincil]
        kaynak = self._ifade(kaynak_düğüm, bağlam)

        if e.tür == "kimlik":
            return kaynak, kaynak, None, None
        if e.tür == "atama":
            hedef = argümanlar.get("ad")
            ad = hedef.ad if isinstance(hedef, Ad) else (hedef.adaylar[0] if isinstance(hedef, SütunAdı) else None)
            if ad is None:
                self._hata("'sakla' için 'X olarak' biçiminde bir ad gerekli.")
            self.tanımlı[ad] = self._satır
            return kaynak, kaynak, ad, None
        if e.tür == "uygulama":
            hedef = argümanlar.get("hedef")
            if not isinstance(hedef, İşlevAdı):
                self._hata("'dönüştür' yönelme hâlinde bir işlev adı bekler (örn: 'matrise dönüştür').")
            return f"ç.{çekirdek.İŞLEVLER[hedef.ad].py}({kaynak})", kaynak, None, None

        if e.tür == "çıktı":
            nesneler = kaynak_düğüm.öğeler if isinstance(kaynak_düğüm, Liste) else [kaynak_düğüm]
            parçalar = [self._ifade(n, bağlam) for n in nesneler]
            adlar = [n.ad if isinstance(n, Ad) else
                     ((bağlam if bağlam and not bağlam.startswith("_") else "sonuç")
                      if isinstance(n, Bağlam) else n.metin or None)
                     for n in nesneler]
            ek = f", maske={maske}" if maske else ""
            if h.çatı == "edilgen":
                self.notlar.append(f"satır {self._satır}: '{h.fiil}' çıktı eylemi; edilgen çatının bellek etkisi yok.")
            return f"ç.{e.py}({', '.join(parçalar)}, adlar={adlar!r}{ek})", kaynak, None, None

        # dönüşüm eylemleri: çatı → bellek modeli
        çağrı_arg = [kaynak]
        for param, düğüm in argümanlar.items():
            if param == birincil:
                continue
            çağrı_arg.append(f"{param}={self._rol_değeri(param, düğüm, bağlam)}")
        for ad, düğüm in h.parametreler.items():
            çağrı_arg.append(f"{ad}={self._ifade(düğüm, bağlam)}")
        if maske:
            çağrı_arg.append(f"maske={maske}")
        if h.çatı == "edilgen":
            if e.yerinde is None:
                self._hata(f"'{h.fiil}' eyleminin yerinde (edilgen) biçimi yok; etken çatı kullanın.")
            if not isinstance(kaynak_düğüm, Ad):
                self._hata(f"yerinde değişim için hedef adlandırılmış bir değişken olmalı "
                           f"('{kaynak_düğüm.metin}' değil).")
            self.kullanılan.add(kaynak_düğüm.ad)
            self.ist["yerinde"] += 1
            self.notlar.append(f"satır {self._satır}: '{h.fiil}' edilgen çatı → YERİNDE "
                               f"({kaynak_düğüm.ad} belleği değişir, kopya yok)")
            return f"ç.{e.yerinde}({', '.join(çağrı_arg)})", kaynak, None, kaynak_düğüm.ad
        self.ist["kopya"] += 1
        self.notlar.append(f"satır {self._satır}: '{h.fiil}' etken çatı → KOPYA (kaynak korunur)")
        return f"ç.{e.py}({', '.join(çağrı_arg)})", kaynak, None, None

    def _rol_değeri(self, param: str, d: Düğüm, bağlam: str | None) -> str:
        if isinstance(d, SütunAdı):              # "tutara göre" → 'tutar'
            return repr(d.adaylar[0])
        if isinstance(d, Yüklem):
            return self._ölçüt(d, bağlam)
        return self._ifade(d, bağlam)

    # ---------------------------------------------------------------- ifadeler
    def _sabit(self, d: Düğüm):
        if isinstance(d, Sayı):
            return True, d.değer
        if isinstance(d, Uygula):
            bilgi = çekirdek.İŞLEVLER[d.işlev]
            if bilgi.saf and d.argümanlar:
                değerler = {}
                for k, v in d.argümanlar.items():
                    ok, x = self._sabit(v)
                    if not ok:
                        return False, None
                    değerler[k] = x
                return True, getattr(çekirdek, bilgi.py)(**değerler)
        return False, None

    def _ifade(self, d: Düğüm, b: str | None) -> str:
        if isinstance(d, Sayı):
            return repr(d.değer)
        if isinstance(d, Metin):
            return repr(d.değer)
        if isinstance(d, Ad):
            if d.ad not in self.tanımlı:
                self._hata(f"'{d.ad}' tanımlı değil.{_öneri(d.ad, self.tanımlı)}")
            self.kullanılan.add(d.ad)
            return _py_ad(d.ad)
        if isinstance(d, Bağlam):
            if b is None:
                self._hata("bir iyelikli ifadenin sahibi belirsiz (örtük 'onun'). "
                           "Sahibi ilgi ekiyle belirtin: 'X-in ...-ı'.")
            return b
        if isinstance(d, SütunAdı):
            if b is not None:
                return f"ç.öznitelik({b}, {d.adaylar!r})"
            self._hata(f"'{d.metin}' tanımlı bir ad değil ve sahibi yok.{_öneri(d.adaylar[0], self.tanımlı)}")
        if isinstance(d, Liste):
            return "[" + ", ".join(self._ifade(x, b) for x in d.öğeler) + "]"
        if isinstance(d, İşlevAdı):
            self._hata(f"'{d.ad}' bir işlev; neyin {d.ad}ı olduğunu ilgi ekiyle belirtin (örn: 'X-in {d.ad}ı').")
        if isinstance(d, Uygula):
            return self._uygula(d, b)
        if isinstance(d, Öznitelik):
            return f"ç.öznitelik({self._ifade(d.sahip, b)}, {d.adaylar!r})"
        if isinstance(d, Süzgeç):
            self.ist["vektörel_süzgeç"] += 1
            return f"ç.süz({self._ifade(d.kaynak, b)}, {self._ölçüt(d.yüklem, b)})"
        if isinstance(d, Yüklem):
            return self._ölçüt(d, b)
        if isinstance(d, Karşılaştırma):
            ek = ", olumsuz=True" if d.olumsuz else ""
            return f"ç.karşılaştır({d.işleç!r}, {self._ifade(d.sol, b)}, {self._ifade(d.sağ, b)}{ek})"
        if isinstance(d, Yön):
            return repr(d.azalan)
        self._hata(f"derlenemeyen düğüm: {type(d).__name__}")

    def _ölçüt(self, y: Yüklem, b: str | None) -> str:
        return f"ç.Ölçüt({y.işleç!r}, {self._ifade(y.değer, b)}, {y.öznitelik!r}, {y.olumsuz})"

    def _uygula(self, d: Uygula, b: str | None) -> str:
        bilgi = çekirdek.İŞLEVLER[d.işlev]
        imza = inspect.signature(getattr(çekirdek, bilgi.py))
        for k in d.argümanlar:
            if k not in imza.parameters:
                self._hata(f"'{d.işlev.replace('_', ' ')}' işlevi '{k}' niteliğini almaz. "
                           f"Kabul ettikleri: {', '.join(imza.parameters)}.{_öneri(k, imza.parameters)}")
        ok, değer = self._sabit(d)
        if ok and isinstance(değer, (int, float)):
            self.ist["sabit_katlama"] += 1
            self.notlar.append(f"satır {self._satır}: sabit katlama '{d.metin}' → {değer!r}")
            return repr(değer)
        sıra = list(imza.parameters)
        args = ", ".join(f"{k}={self._ifade(d.argümanlar[k], b)}"
                         for k in sorted(d.argümanlar, key=sıra.index))
        return f"ç.{bilgi.py}({args})"

    # ------------------------------------------------------------------ modül
    def _modül(self, adımlar: list[Adım]) -> str:
        kök = Path(__file__).resolve().parent
        out = [
            "# -*- coding: utf-8 -*-",
            f"# Bu dosya dizge_compiler tarafından {self.kaynak_adı} kaynağından otomatik üretildi.",
            "import sys",
            f"sys.path.insert(0, {str(kök)!r})",
            "import dizge_cekirdek as ç",
            "",
        ]
        for a in adımlar:
            out.append(f"# [satır {a.satır}] {a.kaynak}")
            out.append(a.py)
            out.append("")
        return "\n".join(out)
