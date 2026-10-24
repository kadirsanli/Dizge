"""
dizge_parser.py — Dizge SOV Sözdizim Çözümleyicisi (Token → AST)
================================================================

Türkçe cümle Özne-Nesne-Yüklem (SOV) dizilimindedir: yüklem (fiil) sondadır,
ondan önceki ad öbeklerinin GÖREVİNİ sıraları değil HÂL EKLERİ belirler.
Bu yüzden parser bir "kaydır-indirge" (shift-reduce) makinesidir:

    • Ad öbekleri yığına itilir (kaydır).
    • İyelikli bir işlev kökü gelince ("…-ın ortalaması") yığının tepesindeki
      hâl ekli öbekleri imzasına göre tüketir (indirge):  ilgi→1. parametre,
      ayrılma→'…den', sayı→'iki katı' ...
    • Yüklem (son fiil) gelince kalan öbekler hâllerine göre ROL olur:
      yalın→özne, belirtme→nesne, yönelme→hedef, 'göre'→ölçüt, 'olarak'→etiket.

Cümle türleri:
    Tanım     :  AD , <ad öbeği>-DIr .              ortalama, tutarların ortalamasıdır.
    Zincir    :  <halka> (-Ip | -ArAk) ... <emir> .  verinin karekökünü alıp beşten büyüklerini ayıkla.
    Koşullu   :  <koşul>-DIğI takdirde <zincir> .   risk puanı doksanı aştığı takdirde ... raporla.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field, fields

import dizge_cekirdek as çekirdek
from dizge_lexer import Çözümleme, HamCümle, Kip, Token, TokenTürü, Tür, tr_küçük

log = logging.getLogger("dizge.parser")


class DizgeSözdizimHatası(Exception):
    def __init__(self, mesaj: str, satır: int | None = None):
        super().__init__(f"satır {satır}: {mesaj}" if satır else mesaj)
        self.satır = satır


# =============================================================================
# 1. AST DÜĞÜMLERİ
# =============================================================================

@dataclass(eq=False)
class Düğüm:
    pass


@dataclass(eq=False)
class Sayı(Düğüm):
    değer: int | float
    metin: str = ""


@dataclass(eq=False)
class Metin(Düğüm):
    değer: str
    metin: str = ""


@dataclass(eq=False)
class Ad(Düğüm):
    """Programda tanımlanmış değişkene başvuru."""
    ad: str
    metin: str = ""


@dataclass(eq=False)
class Bağlam(Düğüm):
    """Örtük sahip: zincirde bir önceki halkanın sonucu ('onun')."""
    metin: str = "onun"


@dataclass(eq=False)
class SütunAdı(Düğüm):
    """Sözlük dışı isim: bağlama göre sütun/öznitelik adı."""
    adaylar: list[str]
    metin: str = ""


@dataclass(eq=False)
class İşlevAdı(Düğüm):
    ad: str
    metin: str = ""


@dataclass(eq=False)
class Liste(Düğüm):
    öğeler: list[Düğüm]
    metin: str = ""


@dataclass(eq=False)
class Uygula(Düğüm):
    """İyelik tamlaması = işlev uygulaması:  X-in Y-si  →  Y(X)."""
    işlev: str
    argümanlar: dict[str, Düğüm]
    metin: str = ""


@dataclass(eq=False)
class Öznitelik(Düğüm):
    """X-in Y-si, Y bir işlev değilse: X.Y"""
    sahip: Düğüm
    adaylar: list[str]
    metin: str = ""


@dataclass(eq=False)
class Yüklem(Düğüm):
    """Tekli yüklem: '(özniteliği) değer işleç' — süzgeçlerde kullanılır."""
    işleç: str
    değer: Düğüm
    öznitelik: list[str] | None = None
    olumsuz: bool = False
    metin: str = ""


@dataclass(eq=False)
class Süzgeç(Düğüm):
    kaynak: Düğüm
    yüklem: Yüklem
    metin: str = ""


@dataclass(eq=False)
class Karşılaştırma(Düğüm):
    """İkili koşul: sol işleç sağ — vektörse maske üretir."""
    işleç: str
    sol: Düğüm
    sağ: Düğüm
    olumsuz: bool = False
    metin: str = ""


@dataclass(eq=False)
class Yön(Düğüm):
    azalan: bool
    metin: str = ""


@dataclass(eq=False)
class Halka(Düğüm):
    """Zincirin tek bir eylemi (fiil + rolleri)."""
    fiil: str
    çatı: str                       # etken | edilgen
    kip: str
    bağ: str | None                 # 'ıp' (sonucu aktar) | 'arak' (aynı nesneyi aktar) | None
    roller: dict[str, Düğüm]
    parametreler: dict[str, Düğüm] = field(default_factory=dict)
    metin: str = ""


@dataclass(eq=False)
class Tanım(Düğüm):
    ad: str
    değer: Düğüm
    satır: int = 0
    metin: str = ""


@dataclass(eq=False)
class Zincir(Düğüm):
    halkalar: list[Halka]
    koşul: Düğüm | None = None
    satır: int = 0
    metin: str = ""


@dataclass(eq=False)
class Program(Düğüm):
    cümleler: list[Düğüm]


def ağaç(d, önek: str = "", son: bool = True, kök: bool = True) -> list[str]:
    """AST'yi okunur ağaç olarak çizer."""
    if not isinstance(d, Düğüm):
        return [f"{önek}{'' if kök else ('└─ ' if son else '├─ ')}{d!r}"]
    özellikler, çocuklar = [], []
    for f in fields(d):
        v = getattr(d, f.name)
        if f.name in ("metin", "satır"):
            continue
        if isinstance(v, Düğüm):
            çocuklar.append((f.name, v))
        elif isinstance(v, list) and v and all(isinstance(x, Düğüm) for x in v):
            çocuklar += [(f"{f.name}[{i}]", x) for i, x in enumerate(v)]
        elif isinstance(v, dict) and v and all(isinstance(x, Düğüm) for x in v.values()):
            çocuklar += [(k, x) for k, x in v.items()]
        elif v not in (None, [], {}):
            özellikler.append(f"{f.name}={v!r}")
    başlık = f"{type(d).__name__}" + (f"({', '.join(özellikler)})" if özellikler else "")
    satırlar = [f"{önek}{'' if kök else ('└─ ' if son else '├─ ')}{başlık}"]
    alt_önek = önek + ("" if kök else ("   " if son else "│  "))
    for i, (ad, ç) in enumerate(çocuklar):
        alt = ağaç(ç, alt_önek, i == len(çocuklar) - 1, kök=False)
        alt[0] = alt[0].replace("└─ ", f"└─ {ad}: ", 1).replace("├─ ", f"├─ {ad}: ", 1)
        satırlar += alt
    return satırlar


# =============================================================================
# 2. YIĞIN ÖĞESİ (öbek)
# =============================================================================

@dataclass
class Öbek:
    tür: str                       # değer | bağ | kwarg | rol | önad | yön_baş | yüklem
    düğüm: Düğüm | None = None
    durum: str = "yalın"
    çoğul: bool = False
    iyelik: bool = False
    ad: str | None = None
    yalın_kök: bool = False        # eksiz serbest isim (bileşik tamlama adayı)
    sözel: list[int] | None = None # birleşebilir sayı sözcükleri


DURUM_ROL = {"yalın": "özne", "belirtme": "belirtme", "yönelme": "yönelme",
             "ayrılma": "ayrılma", "bulunma": "bulunma", "vasıta": "vasıta", "ilgi": "ilgi"}
KOŞUL_EDATLARI = {"takdirde", "durumunda", "halinde", "hâlinde"}


def _metin(*parçalar) -> str:
    return " ".join(p.metin if isinstance(p, Düğüm) else str(p) for p in parçalar if p is not None
                    and (not isinstance(p, Düğüm) or p.metin))


def _sayı_birleştir(sıra: list[int]) -> int:
    """['iki','bin','beş','yüz'] → 2500"""
    toplam = mevcut = 0
    for v in sıra:
        if v == 100:
            mevcut = (mevcut or 1) * 100
        elif v >= 1000:
            toplam += (mevcut or 1) * v
            mevcut = 0
        else:
            mevcut += v
    return toplam + mevcut


# =============================================================================
# 3. PARSER
# =============================================================================

class Parser:
    def __init__(self):
        self.seçimler: list[tuple[int, str, Çözümleme, Çözümleme]] = []   # belirsizlik giderme kaydı

    def ayrıştır(self, cümleler: list[HamCümle]) -> Program:
        return Program([self._cümle(c) for c in cümleler])

    # --- cümle düzeyi ------------------------------------------------------
    def _cümle(self, c: HamCümle) -> Düğüm:
        self._satır = c.satır
        t = c.tokenlar
        # Tanım:  AD , ... -DIr
        if len(t) >= 3 and t[1].tür == TokenTürü.VİRGÜL and t[0].tür == TokenTürü.KELİME \
                and any(ç.tür == Tür.AD and not ç.ekler for ç in t[0].çözümlemeler) \
                and t[-1].tür == TokenTürü.KELİME and any(ç.ekfiil for ç in t[-1].çözümlemeler):
            değer = self._ifade(t[2:])
            if isinstance(değer, İşlevAdı):
                değer = Uygula(değer.ad, {}, değer.metin)
            return Tanım(t[0].ç.kök, değer, c.satır, c.metin)

        # Koşul ayrımı
        koşul = None
        for i, tok in enumerate(t):
            if tok.tür == TokenTürü.KELİME and tok.yüzey in KOŞUL_EDATLARI:
                koşul, t = self._koşul(t[:i]), t[i + 1:]
                break
            ç = self._fiil(tok, {Kip.ŞART}) or self._fiil(tok, {Kip.ADFİİL})
            if ç and (ç.kip == Kip.ŞART or ç.durum == "bulunma"):
                koşul, t = self._koşul(t[:i + 1]), t[i + 1:]
                break

        halkalar, baş, i = [], 0, 0
        while i < len(t):
            tok = t[i]
            ç = self._fiil(tok, {Kip.ULAÇ_IP, Kip.ULAÇ_ARAK})
            if ç:
                halkalar.append(self._halka(t[baş:i], ç, "ıp" if ç.kip == Kip.ULAÇ_IP else "arak"))
                baş = i + 1
            elif (ç := self._fiil(tok, {Kip.EMİR, Kip.İSTEK})) and i + 1 < len(t) \
                    and t[i + 1].yüzey == "ve" and i + 2 < len(t):
                halkalar.append(self._halka(t[baş:i], ç, "ıp"))   # "ayıkla ve yazdır"
                baş = i + 2
                i += 1
            i += 1
        son = t[-1] if t else None
        ç = self._fiil(son, {Kip.EMİR, Kip.İSTEK}) if son else None
        if not ç:
            raise DizgeSözdizimHatası(
                f"cümle bir yüklemle bitmeli (SOV). Son sözcük {son.yüzey if son else '∅'!r} "
                "çekimli bir fiil değil. Örn: '... sırala.', '... yazdır.' ya da tanım için 'X, ...-dır.'",
                c.satır)
        halkalar.append(self._halka(t[baş:-1], ç, None))
        return Zincir(halkalar, koşul, c.satır, c.metin)

    @staticmethod
    def _yalın(tok: Token, ç: Çözümleme) -> str:
        """Etiketler için hâl eki ve ek-fiilden arındırılmış yüzey: 'sayısını' → 'sayısı'."""
        s = tok.yüzey
        for e in reversed(ç.ekler):
            if not (e.etiket.startswith("DURUM:") or e.etiket == "EKFİİL"):
                break
            if e.yüzey and s.endswith(e.yüzey):
                s = s[:-len(e.yüzey)]
        return s.replace("_", " ")

    @staticmethod
    def _fiil(tok: Token | None, kipler: set[Kip]) -> Çözümleme | None:
        if tok is None or tok.tür != TokenTürü.KELİME:
            return None
        return next((ç for ç in tok.çözümlemeler if ç.tür == Tür.FİİL and ç.kip in kipler), None)

    def _halka(self, toks: list[Token], fiil: Çözümleme, bağ: str | None) -> Halka:
        yığın = self._öbekle(toks)
        roller: dict[str, Düğüm] = {}
        parametreler: dict[str, Düğüm] = {}
        for ö in yığın:
            if ö.tür == "değer":
                rol = DURUM_ROL[ö.durum]
                if rol in roller:
                    önceki = roller[rol]
                    roller[rol] = Liste((önceki.öğeler if isinstance(önceki, Liste) else [önceki]) + [ö.düğüm],
                                        _metin(önceki, ö.düğüm))
                else:
                    roller[rol] = ö.düğüm
            elif ö.tür == "rol":
                roller[ö.ad] = ö.düğüm
            elif ö.tür == "yüklem":
                roller["yüklem"] = ö.düğüm
            elif ö.tür == "kwarg":
                parametreler[ö.ad] = ö.düğüm
        if "ilgi" in roller:
            raise DizgeSözdizimHatası(
                f"'{roller['ilgi'].metin}' ilgi hâlinde (-ın) ama sahip olduğu bir öğe yok. "
                f"Örn: '{roller['ilgi'].metin} ortalamasını ...'", self._satır)
        return Halka(fiil.kök, "edilgen" if fiil.edilgen else "etken", fiil.kip.value, bağ, roller,
                     parametreler, _metin(*[ö.düğüm for ö in yığın if ö.düğüm is not None]))

    def _koşul(self, toks: list[Token]) -> Düğüm:
        if not toks:
            raise DizgeSözdizimHatası("koşul edatından önce bir koşul cümleciği olmalı", self._satır)
        fiil = self._fiil(toks[-1], {Kip.ADFİİL, Kip.ŞART})
        if not fiil:
            raise DizgeSözdizimHatası(
                f"'{toks[-1].yüzey}' koşul fiili değil; '...-dığı takdirde' ya da '...-rsa' kullanın.",
                self._satır)
        yığın = self._öbekle(toks[:-1])
        değerler = [ö for ö in yığın if ö.tür in ("değer", "yüklem")]
        if fiil.kök == "ol" and değerler and değerler[-1].tür == "yüklem":
            y = değerler[-1].düğüm
            özne = değerler[-2].düğüm if len(değerler) >= 2 else Bağlam()
            return Karşılaştırma(y.işleç, özne, y.değer, fiil.olumsuz ^ y.olumsuz, _metin(özne, y, "ol"))
        işleç = çekirdek.KARŞILAŞTIRMA_FİİLLERİ.get(fiil.kök)
        if işleç is None or len(değerler) < 2:
            raise DizgeSözdizimHatası(
                f"koşul '{_metin(*[ö.düğüm for ö in değerler])} {toks[-1].yüzey}' çözümlenemedi: "
                "bir özne ve karşılaştırılacak bir değer gerekli (örn: 'puanı doksanı aştığı').",
                self._satır)
        sol, sağ = değerler[-2].düğüm, değerler[-1].düğüm
        return Karşılaştırma(işleç, sol, sağ, fiil.olumsuz, _metin(sol, sağ, toks[-1].yüzey))

    def _ifade(self, toks: list[Token]) -> Düğüm:
        yığın = [ö for ö in self._öbekle(toks) if ö.tür not in ("bağ",)]
        if len(yığın) != 1 or yığın[0].tür != "değer":
            raise DizgeSözdizimHatası(
                "tanımın sağ tarafı tek bir ad öbeğine indirgenemedi: "
                + ", ".join(f"{ö.tür}:{ö.düğüm.metin if ö.düğüm else ö.ad}" for ö in yığın), self._satır)
        return yığın[0].düğüm

    # --- ad öbeği indirgeyici (shift-reduce) ---------------------------------
    def _öbekle(self, toks: list[Token]) -> list[Öbek]:
        y: list[Öbek] = []
        for tok in toks:
            if tok.tür == TokenTürü.METİN:
                self._it(y, Öbek("değer", Metin(tok.değer, tok.yüzey)))
            elif tok.tür == TokenTürü.VİRGÜL:
                y.append(Öbek("bağ", ad=","))
            elif tok.tür == TokenTürü.SAYI:
                self._sayı(y, tok, self._seç_sayı(tok, y), sözel=False)
            else:
                ç = self._seç(tok, y)
                if len(tok.çözümlemeler) > 1 and ç is not tok.çözümlemeler[0]:
                    self.seçimler.append((self._satır, tok.yüzey, tok.çözümlemeler[0], ç))
                getattr(self, f"_k_{tr_küçük(ç.tür.name)}")(y, tok, ç)
        return y

    # tepe yardımcıları
    @staticmethod
    def _tepe(y: list[Öbek], tür: str = "değer", durum: str | None = None) -> Öbek | None:
        if y and y[-1].tür == tür and (durum is None or y[-1].durum == durum):
            return y[-1]
        return None

    def _it(self, y: list[Öbek], ö: Öbek) -> None:
        """Değer iter; 'A, B ve C' biçimindeki sıralamaları Liste'ye katlar."""
        if ö.tür == "değer" and len(y) >= 2 and y[-1].tür == "bağ" and y[-2].tür == "değer" \
                and (y[-2].durum == ö.durum or y[-2].durum == "yalın"):
            y.pop()
            önceki = y.pop()
            öğeler = (önceki.düğüm.öğeler if isinstance(önceki.düğüm, Liste) else [önceki.düğüm]) + [ö.düğüm]
            ö = Öbek("değer", Liste(öğeler, _metin(önceki.düğüm, ö.düğüm)), ö.durum, True)
        y.append(ö)

    def _sahip_bekliyor(self, y: list[Öbek]) -> bool:
        """Yığında bir işlev başının tüketebileceği ilgi hâlli öbek var mı?"""
        for ö in reversed(y):
            if ö.tür == "değer" and ö.durum == "ilgi":
                return True
            if not (ö.tür in ("kwarg", "rol") or (ö.tür == "değer" and ö.durum in ("ayrılma", "yönelme", "yalın"))):
                return False
        return False

    # analiz seçimi (bağlama duyarlı belirsizlik giderme)
    def _seç(self, tok: Token, y: list[Öbek]) -> Çözümleme:
        çs = tok.çözümlemeler
        sayı_önde = self._tepe(y) is not None and isinstance(y[-1].düğüm, (Sayı, Ad)) and y[-1].durum == "yalın"
        if sayı_önde:                                       # "1000 satırlık", "42 tohumlu"
            for ç in çs:
                if ç.türetim in ("LIK", "LI") and len(ç.ekler) == 1:
                    return ç
        sahip = self._sahip_bekliyor(y)
        for ç in çs:
            if ç.tür in (Tür.EDAT, Tür.BAĞLAÇ, Tür.SAYI_SÖZ):
                return ç
        for ç in çs:                                        # çekimli ara fiiller
            if ç.tür == Tür.FİİL and ç.kip in (Kip.SIFATFİİL, Kip.ADFİİL):
                return ç
        if sahip:
            for ç in çs:
                if ç.tür == Tür.İŞLEV and ç.iyelik:
                    return ç
        işlevler = [ç for ç in çs if ç.tür == Tür.İŞLEV]
        adlar = [ç for ç in çs if ç.tür == Tür.AD]
        if adlar:
            if sahip:
                return next((ç for ç in adlar if ç.iyelik), adlar[0])
            return next((ç for ç in adlar if not ç.iyelik), adlar[0])
        if işlevler:
            return next((ç for ç in işlevler if ç.iyelik), işlevler[0])
        for ç in çs:
            if ç.tür == Tür.SIFAT:
                return ç
        isimler = [ç for ç in çs if ç.tür == Tür.İSİM]
        if isimler:
            return next((ç for ç in isimler if ç.iyelik), isimler[0])
        return çs[0]

    def _seç_sayı(self, tok: Token, y: list[Öbek]) -> Çözümleme:
        önad = self._tepe(y, "önad") is not None
        for ç in tok.çözümlemeler:
            if ç.iyelik == önad:
                return ç
        return tok.çözümlemeler[0]

    # --- kök türüne göre indirgeme kuralları ---------------------------------
    def _k_edat(self, y, tok, ç):
        rol = {"göre": "göre", "olarak": "olarak", "ile": "vasıta"}.get(ç.kök)
        tepe = self._tepe(y)
        if rol is None or tepe is None:
            raise DizgeSözdizimHatası(f"'{ç.kök}' edatından önce bir ad öbeği bekleniyordu", self._satır)
        y.pop()
        y.append(Öbek("rol", tepe.düğüm, ad=rol))

    def _k_bağlaç(self, y, tok, ç):
        y.append(Öbek("bağ", ad=ç.kök))

    def _k_sayı_söz(self, y, tok, ç):
        if tok.tür == TokenTürü.KELİME:
            ç = next((a for a in tok.çözümlemeler if a.tür == Tür.SAYI_SÖZ
                      and a.iyelik == (self._tepe(y, "önad") is not None)), ç)
        self._sayı(y, tok, ç, sözel=True)

    def _sayı(self, y, tok, ç: Çözümleme, sözel: bool):
        değer, metin = ç.bilgi, self._yalın(tok, ç)
        tepe = self._tepe(y, durum="yalın")
        if sözel and tepe and tepe.sözel is not None:      # "bin beş yüz" → 1500
            y.pop()
            sıra = tepe.sözel + [değer]
            değer, metin = _sayı_birleştir(sıra), f"{tepe.düğüm.metin} {self._yalın(tok, ç)}"
        else:
            sıra = [değer] if sözel else None
        düğüm = Sayı(değer, metin)
        if ç.türetim in ("LIK", "LI"):
            y.append(Öbek("kwarg", düğüm, ad="boyut"))
            return
        if ç.iyelik and self._tepe(y, "önad"):             # "ilk onu"
            önad = y.pop()
            bilgi = çekirdek.İŞLEVLER[önad.ad]
            düğüm = Uygula(önad.ad, {bilgi.roller["ilgi"]: Bağlam(), bilgi.roller["sayı"]: düğüm},
                           f"{önad.ad} {metin}")
        self._it(y, Öbek("değer", düğüm, ç.durum, ç.çoğul, ç.iyelik,
                         sözel=sıra if not ç.ekler else None))

    def _kwarg_mı(self, y, ç: Çözümleme, ad: str) -> bool:
        if ç.türetim not in ("LIK", "LI"):
            return False
        tepe = self._tepe(y, durum="yalın")
        değer = y.pop().düğüm if tepe and isinstance(tepe.düğüm, (Sayı, Ad, Metin)) else Sayı(True, "evet")
        y.append(Öbek("kwarg", değer, ad=ad))
        return True

    def _k_sıfat(self, y, tok, ç):
        işleç = ç.bilgi
        if ç.durum == "ayrılma" and not (ç.çoğul or ç.iyelik):   # "büyükten küçüğe"
            y.append(Öbek("yön_baş", ad=ç.kök))
            return
        if ç.durum == "yönelme" and self._tepe(y, "yön_baş"):
            baş = y.pop()
            y.append(Öbek("rol", Yön(çekirdek.KARŞILAŞTIRMA_SIFATLARI[baş.ad] == ">",
                                     f"{baş.ad}ten {ç.kök}e"), ad="yön"))
            return
        işlenen = self._tepe(y, durum="ayrılma")
        if işlenen is None:
            raise DizgeSözdizimHatası(
                f"'{tok.yüzey}' bir karşılaştırma sıfatı; önünde ayrılma hâlinde bir değer olmalı "
                f"(örn: 'beşten {tok.yüzey}').", self._satır)
        y.pop()
        yük = Yüklem(işleç, işlenen.düğüm, None, False, _metin(işlenen.düğüm, ç.kök))
        if ç.çoğul or ç.iyelik:                                 # "beşten büyükleri"
            kaynak = y.pop().düğüm if self._tepe(y, durum="ilgi") else Bağlam()
            self._it(y, Öbek("değer", Süzgeç(kaynak, yük, _metin(kaynak, self._yalın(tok, ç))), ç.durum, True))
        else:
            y.append(Öbek("yüklem", yük))

    def _k_fiil(self, y, tok, ç):
        if ç.kip == Kip.SIFATFİİL:
            yük = self._yüklem_kur(y, ç, tok)
            kaynak = Bağlam()
            if self._tepe(y, durum="ayrılma") or self._tepe(y, durum="ilgi"):
                kaynak = y.pop().düğüm
            self._it(y, Öbek("değer", Süzgeç(kaynak, yük, _metin(kaynak, yük, self._yalın(tok, ç))),
                             ç.durum, True, ç.iyelik))
            return
        raise DizgeSözdizimHatası(
            f"'{tok.yüzey}' cümlenin ortasında çekimli bir fiil. Eylemleri '-ıp' / '-arak' ile bağlayın "
            f"(örn: '{ç.kök}ıp ...').", self._satır)

    def _yüklem_kur(self, y, ç: Çözümleme, tok: Token) -> Yüklem:
        if ç.kök == "ol" and self._tepe(y, "yüklem"):             # "beşten büyük olanlar"
            yük = y.pop().düğüm
        else:
            işleç = çekirdek.KARŞILAŞTIRMA_FİİLLERİ.get(ç.kök)
            değer = self._tepe(y)
            if işleç is None or değer is None:
                raise DizgeSözdizimHatası(
                    f"'{tok.yüzey}' sıfat-fiili için karşılaştırılacak değer bulunamadı.", self._satır)
            y.pop()
            yük = Yüklem(işleç, değer.düğüm, None, False, _metin(değer.düğüm, ç.kök))
        öz = self._tepe(y, durum="yalın")
        if öz and öz.iyelik and isinstance(öz.düğüm, SütunAdı):   # "durumu Anormal olanlar"
            y.pop()
            yük.öznitelik = öz.düğüm.adaylar
            yük.metin = _metin(öz.düğüm, yük)
        yük.olumsuz ^= ç.olumsuz
        return yük

    def _k_işlev(self, y, tok, ç):
        if self._kwarg_mı(y, ç, ç.kök):
            return
        bilgi: çekirdek.İşlevBilgisi = ç.bilgi
        if bilgi.önad and not ç.iyelik and ç.durum == "yalın":
            y.append(Öbek("önad", ad=ç.kök))
            return
        kabul = dict(bilgi.roller)
        args: dict[str, Düğüm] = {}
        tüketilen = []
        while y:
            tepe = y[-1]
            if tepe.tür == "kwarg":
                args[tepe.ad] = tepe.düğüm
                tüketilen.append(y.pop().düğüm)
                continue
            rol = None
            if tepe.tür == "değer":
                if tepe.durum == "yalın" and isinstance(tepe.düğüm, (Sayı, Ad, Liste)):
                    rol = "sayı" if "sayı" in kabul else ("öğeler" if "öğeler" in kabul else None)
                elif tepe.durum in ("ilgi", "ayrılma", "yönelme"):
                    rol = tepe.durum
            elif tepe.tür == "rol" and tepe.ad in kabul:
                rol = tepe.ad
            if rol is None or rol not in kabul or kabul[rol] in args:
                break
            args[kabul[rol]] = tepe.düğüm
            tüketilen.append(y.pop().düğüm)
            if rol == "ilgi":
                break
        if "ilgi" in kabul and kabul["ilgi"] not in args:
            if not ç.iyelik and not args:
                self._it(y, Öbek("değer", İşlevAdı(ç.kök, self._yalın(tok, ç)), ç.durum))
                return
            # "örneğin ortalamasını ve standart sapmasını": ortak sahip
            if len(y) >= 2 and y[-1].tür == "bağ" and isinstance(y[-2].düğüm, Uygula):
                ortak = çekirdek.İŞLEVLER[y[-2].düğüm.işlev].roller.get("ilgi")
                if ortak and ortak in y[-2].düğüm.argümanlar:
                    args[kabul["ilgi"]] = y[-2].düğüm.argümanlar[ortak]
                    tüketilen.append(args[kabul["ilgi"]])
            args.setdefault(kabul["ilgi"], Bağlam())
        düğüm = Uygula(ç.kök, args, _metin(*reversed(tüketilen), self._yalın(tok, ç)))
        self._it(y, Öbek("değer", düğüm, ç.durum, ç.çoğul, ç.iyelik))

    def _k_ad(self, y, tok, ç):
        if self._kwarg_mı(y, ç, ç.kök):
            return
        if ç.iyelik and self._tepe(y, durum="ilgi"):               # "işlemlerin tutarları"
            sahip = y.pop().düğüm
            adaylar = [ç.kök] + ([ç.kök[:-3]] if ç.kök.endswith(("lar", "ler")) else [])
            düğüm = Öznitelik(sahip, adaylar, _metin(sahip, self._yalın(tok, ç)))
        else:
            düğüm = Ad(ç.kök, tok.yüzey.replace("_", " "))
        self._it(y, Öbek("değer", düğüm, ç.durum, ç.çoğul, ç.iyelik))

    def _k_isim(self, y, tok, ç):
        if self._kwarg_mı(y, ç, ç.kök):
            return
        adaylar = list(dict.fromkeys([ç.kök] + [a.kök for a in tok.çözümlemeler if a.tür == Tür.İSİM]
                                     + [tok.yüzey]))
        metin = self._yalın(tok, ç)
        tepe = self._tepe(y, durum="yalın")
        if ç.iyelik and tepe and tepe.yalın_kök:                    # "risk puanı" bileşiği
            önceki = y.pop()
            ilk = önceki.düğüm.adaylar[0]
            adaylar = [f"{ilk}_{tok.yüzey}"] + [f"{ilk}_{a}" for a in adaylar]
            metin = f"{önceki.düğüm.metin} {self._yalın(tok, ç)}"
        if ç.iyelik and self._tepe(y, durum="ilgi"):
            sahip = y.pop().düğüm
            self._it(y, Öbek("değer", Öznitelik(sahip, adaylar, _metin(sahip, metin)), ç.durum, ç.çoğul, True))
            return
        self._it(y, Öbek("değer", SütunAdı(adaylar, metin), ç.durum, ç.çoğul, ç.iyelik,
                         yalın_kök=not ç.ekler))
