"""
dizge_lexer.py — Dizge (.dzg) Sözcüksel ve Biçimbirimsel Çözümleyici
======================================================================

Geleneksel lexer'lar kaynak kodu "kelime + noktalama" diye böler. Dizge'de
anlamın çoğu **eklerde** taşındığı için lexer iki katmanlıdır:

  1. Yüzey tokenları   : KELİME, SAYI, METİN, VİRGÜL, NOKTA   (alt çizgi = boşluk)
  2. Biçimbirim katmanı: her KELİME → (kök, kök türü, ek dizisi) çözümlemeleri

Ek dizisi, Türkçe ad ve fiil çekiminin sonlu durum makinesiyle (FSM) çözülür;
ünlü uyumu arşifonemlerle (A=a/e, I=ı/i/u/ü, D=d/t, K=k/ğ) ve kaynaştırma
ünsüzleri (y, n, s) ses kuralıyla denetlenir. Süreksiz ünsüz yumuşaması
(eşik → eşiğ-i, küçük → küçüğ-e) kökte geri alınır.

İSİM EK DİLİMLERİ (sıra sabittir):
    kök + [TÜRETİM: -lIk, -lI, -sIz] + [ÇOĞUL: -lAr] + [İYELİK: -(s)I]
        + [DURUM: ilgi|belirtme|yönelme|bulunma|ayrılma|vasıta] + [EKFİİL: -DIr]

FİİL EK DİLİMLERİ:
    kök + [ÇATI: edilgen -(I)l/-(I)n] + [OLUMSUZ: -mA]
        + KİP: EMİR(∅) | İSTEK -sIn | ULAÇ -(y)Ip | ULAÇ -(y)ArAk
             | SIFATFİİL -(y)An(+isim ekleri) | ADFİİL -DIK+iyelik(+durum) | ŞART -(A)r-sA

Her ekin Dizge'deki işlemsel anlamı EK_ANLAMLARI tablosundadır.
"""
from __future__ import annotations

import logging
import re
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum

import dizge_cekirdek as çekirdek

log = logging.getLogger("dizge.lexer")

ÜNLÜLER = frozenset("aeıioöuüâîû")
SERTLEŞME = {"b": "p", "c": "ç", "d": "t", "ğ": "k"}      # yumuşamış -> asıl
ARŞİFONEMLER = {"A": "ae", "I": "ıiuü", "D": "dt", "K": "kğ", "C": "cç"}


def tr_küçük(s: str) -> str:
    return s.replace("I", "ı").replace("İ", "i").lower()


# =============================================================================
# 1. TOKEN YAPISI
# =============================================================================

class TokenTürü(Enum):
    KELİME = "KELİME"
    SAYI = "SAYI"
    METİN = "METİN"
    VİRGÜL = "VİRGÜL"
    NOKTA = "NOKTA"


class Tür(Enum):
    """Kök türleri."""
    AD = "AD"                # programda tanımlanmış değişken
    İŞLEV = "İŞLEV"          # standart kütüphane isim kökü (ortalama, matris, ...)
    FİİL = "FİİL"            # eylem kökü (sırala, ayıkla, aş, ol, ...)
    SIFAT = "SIFAT"          # karşılaştırma sıfatı (büyük, küçük, eşit, ...)
    SAYI_SÖZ = "SAYI_SÖZ"    # sayı sözcüğü (beş, doksan, bin, ...)
    EDAT = "EDAT"            # göre, olarak, takdirde, ile
    BAĞLAÇ = "BAĞLAÇ"        # ve, veya
    İSİM = "İSİM"            # sözlükte olmayan serbest isim (sütun/öznitelik adı)


class Kip(Enum):
    EMİR = "EMİR"
    İSTEK = "İSTEK"
    ULAÇ_IP = "ULAÇ_IP"
    ULAÇ_ARAK = "ULAÇ_ARAK"
    SIFATFİİL = "SIFATFİİL"
    ADFİİL = "ADFİİL"
    ŞART = "ŞART"


EK_ANLAMLARI = {
    "TÜRETİM:LIK": "ölçü/boyut parametresi (1000 satırlık → satır=1000)",
    "TÜRETİM:LI": "nitelik parametresi (42 tohumlu → tohum=42)",
    "TÜRETİM:SIZ": "yokluk niteleyicisi",
    "ÇOĞUL": "küme / vektörel seçim",
    "İYELİK": "sahiplik: işlev uygulaması veya öznitelik (X-in Y-si → Y(X))",
    "DURUM:ilgi": "bağlam/sahip: 1. parametre (genitif)",
    "DURUM:belirtme": "belirli nesne: eylemin girdisi (akuzatif)",
    "DURUM:yönelme": "hedef/eşik (datif)",
    "DURUM:bulunma": "kapsam (lokatif)",
    "DURUM:ayrılma": "kaynak/karşılaştırma tabanı (ablatif)",
    "DURUM:vasıta": "ikinci işlenen (ile)",
    "EKFİİL": "tanım/atama kopulası (A, B'dir → A := B)",
    "ÇATI:edilgen": "YERİNDE değişim (mutable, in-place)",
    "OLUMSUZ": "yüklem değillemesi",
    "KİP:EMİR": "eylem: yeni değer üretir (immutable)",
    "KİP:İSTEK": "-sın kipi: özne üzerinde eylem",
    "KİP:ULAÇ_IP": "boru hattı: sonucu sonraki eyleme aktar (→)",
    "KİP:ULAÇ_ARAK": "eşlik eden eylem: AYNI nesneyi sonraki eyleme aktar (tee)",
    "KİP:SIFATFİİL": "ilgi cümleciği: süzgeç/yüklem (… olanlar)",
    "KİP:ADFİİL": "koşul cümleciği (…dığı takdirde) → maske",
    "KİP:ŞART": "koşul (…rsa) → maske",
}


@dataclass(frozen=True)
class Ek:
    etiket: str
    yüzey: str


@dataclass
class Çözümleme:
    kök: str
    tür: Tür
    ekler: tuple[Ek, ...] = ()
    bilgi: object = None

    def _var(self, etiket: str) -> bool:
        return any(e.etiket == etiket for e in self.ekler)

    @property
    def çoğul(self) -> bool:
        return self._var("ÇOĞUL")

    @property
    def iyelik(self) -> bool:
        return self._var("İYELİK")

    @property
    def ekfiil(self) -> bool:
        return self._var("EKFİİL")

    @property
    def edilgen(self) -> bool:
        return self._var("ÇATI:edilgen")

    @property
    def olumsuz(self) -> bool:
        return self._var("OLUMSUZ")

    @property
    def durum(self) -> str:
        for e in self.ekler:
            if e.etiket.startswith("DURUM:"):
                return e.etiket[6:]
        return "yalın"

    @property
    def türetim(self) -> str | None:
        for e in self.ekler:
            if e.etiket.startswith("TÜRETİM:"):
                return e.etiket[8:]
        return None

    @property
    def kip(self) -> Kip | None:
        for e in self.ekler:
            if e.etiket.startswith("KİP:"):
                return Kip(e.etiket[4:])
        return None

    def __str__(self) -> str:
        ekler = "".join(f" +{e.yüzey or '∅'}[{e.etiket}]" for e in self.ekler)
        return f"{self.kök}({self.tür.value}){ekler}"


@dataclass
class Token:
    tür: TokenTürü
    yüzey: str
    satır: int
    sütun: int
    çözümlemeler: list[Çözümleme] = field(default_factory=list)
    değer: object = None

    @property
    def ç(self) -> Çözümleme | None:
        return self.çözümlemeler[0] if self.çözümlemeler else None

    def __repr__(self) -> str:
        return f"Token({self.tür.value}, {self.yüzey!r}, {self.satır}:{self.sütun})"


@dataclass
class HamCümle:
    tokenlar: list[Token]
    metin: str
    satır: int


# =============================================================================
# 2. EK EŞLEME (ünlü uyumu + kaynaştırma)
# =============================================================================

def _öğeler(kalıp: str) -> list[tuple[str, str]]:
    out, i = [], 0
    while i < len(kalıp):
        if kalıp[i] == "(":
            out.append(("tampon", kalıp[i + 1]))
            i += 3
        else:
            out.append(("harf", kalıp[i]))
            i += 1
    return out


_KALIP_ÖNBELLEK: dict[str, list] = {}


def _eşle(kalıp: str, metin: str, konum: int, önceki: str | None) -> list[int]:
    """Kalıbı metin[konum:]'a uygular; olası bitiş konumlarını döner.

    (y)/(n)/(s) kaynaştırma ünsüzü yalnızca ünlüden sonra gelir, ünsüzden sonra
    gelmez. `önceki` None ise (rakamdan sonra) iki biçim de kabul edilir.
    """
    öğeler = _KALIP_ÖNBELLEK.setdefault(kalıp, _öğeler(kalıp))
    durumlar = [(konum, önceki)]
    for tür, h in öğeler:
        yeni = []
        for pos, prev in durumlar:
            if tür == "tampon":
                var = pos < len(metin) and metin[pos] == h
                if prev is None:
                    yeni.append((pos, prev))
                    if var:
                        yeni.append((pos + 1, h))
                elif prev in ÜNLÜLER:
                    if var:
                        yeni.append((pos + 1, h))
                else:
                    yeni.append((pos, prev))
            elif pos < len(metin) and metin[pos] in ARŞİFONEMLER.get(h, h):
                yeni.append((pos + 1, metin[pos]))
        durumlar = yeni
    return [p for p, _ in durumlar]


_TÜRETİM = [("TÜRETİM:LIK", "lIK"), ("TÜRETİM:LI", "lI"), ("TÜRETİM:SIZ", "sIz")]
_ÇOĞUL = [("ÇOĞUL", "lAr")]
_İYELİK = [("İYELİK", "(s)I")]
_DURUM_YALIN = [("DURUM:ilgi", "(n)In"), ("DURUM:belirtme", "(y)I"), ("DURUM:yönelme", "(y)A"),
                ("DURUM:bulunma", "DA"), ("DURUM:ayrılma", "DAn"), ("DURUM:vasıta", "(y)lA")]
_DURUM_İYELİKLİ = [("DURUM:ilgi", "nIn"), ("DURUM:belirtme", "nI"), ("DURUM:yönelme", "nA"),
                   ("DURUM:bulunma", "nDA"), ("DURUM:ayrılma", "nDAn"), ("DURUM:vasıta", "ylA")]
_EKFİİL = [("EKFİİL", "DIr")]
_DİLİMLER = ["türetim", "çoğul", "iyelik", "durum", "ekfiil"]


def isim_ekleri(metin: str, pos: int, önceki: str | None, dilim: int = 0,
                iyelikli: bool = False, birikim: tuple = ()):
    """Ad çekimi FSM'i: metin[pos:]'u tamamen tüketen tüm ek dizilerini üretir."""
    if pos == len(metin):
        yield birikim
        return
    for i in range(dilim, len(_DİLİMLER)):
        ad = _DİLİMLER[i]
        if ad == "türetim":
            seçenekler = _TÜRETİM
        elif ad == "çoğul":
            seçenekler = _ÇOĞUL
        elif ad == "iyelik":
            seçenekler = _İYELİK
        elif ad == "durum":
            seçenekler = _DURUM_İYELİKLİ if iyelikli else _DURUM_YALIN
        else:
            # ek-fiil yalnızca yalın ya da bulunma hâlinden sonra gelir
            if any(e.etiket.startswith("DURUM:") and e.etiket != "DURUM:bulunma" for e in birikim):
                continue
            seçenekler = _EKFİİL
        for etiket, kalıp in seçenekler:
            for son in _eşle(kalıp, metin, pos, önceki):
                if son > pos:
                    yield from isim_ekleri(metin, son, metin[son - 1], i + 1,
                                           iyelikli or ad == "iyelik",
                                           birikim + (Ek(etiket, metin[pos:son]),))


def fiil_ekleri(metin: str, önceki: str):
    """Fiil çekimi FSM'i (kök sonrası kalan metin için)."""
    çatılar = [((), 0, önceki)]
    if önceki in ÜNLÜLER:
        edilgen = ["n"]
    elif önceki == "l":
        edilgen = ["ın", "in", "un", "ün"]
    else:
        edilgen = ["ıl", "il", "ul", "ül"]
    for p in edilgen:
        if metin.startswith(p):
            çatılar.append(((Ek("ÇATI:edilgen", p),), len(p), p[-1]))

    for ç_ekler, p1, v1 in çatılar:
        olumluluk = [(ç_ekler, p1, v1, False)]
        for son in _eşle("mA", metin, p1, v1):
            olumluluk.append((ç_ekler + (Ek("OLUMSUZ", metin[p1:son]),), son, metin[son - 1], True))
        for ekler, p2, v2, olumsuz in olumluluk:
            if p2 == len(metin) and not olumsuz:
                yield ekler + (Ek("KİP:EMİR", ""),)
            for son in _eşle("sIn", metin, p2, v2):
                if son == len(metin):
                    yield ekler + (Ek("KİP:İSTEK", metin[p2:son]),)
                for son2 in _eşle("lAr", metin, son, metin[son - 1]):
                    if son2 == len(metin):
                        yield ekler + (Ek("KİP:İSTEK", metin[p2:son2]),)
            for kalıp, kip in (("(y)Ip", "KİP:ULAÇ_IP"), ("(y)ArAk", "KİP:ULAÇ_ARAK")):
                for son in _eşle(kalıp, metin, p2, v2):
                    if son == len(metin):
                        yield ekler + (Ek(kip, metin[p2:son]),)
            for son in _eşle("(y)An", metin, p2, v2):
                for isim in isim_ekleri(metin, son, metin[son - 1], dilim=1):
                    yield ekler + (Ek("KİP:SIFATFİİL", metin[p2:son]),) + isim
            for son in _eşle("DIK", metin, p2, v2):
                for isim in isim_ekleri(metin, son, metin[son - 1], dilim=2):
                    if any(e.etiket == "İYELİK" for e in isim):
                        yield ekler + (Ek("KİP:ADFİİL", metin[p2:son]),) + isim
            geniş = ["z"] if olumsuz else (["r"] if v2 in ÜNLÜLER else ["ar", "er", "ır", "ir", "ur", "ür"])
            for g in geniş:
                if metin.startswith(g, p2):
                    for son in _eşle("sA", metin, p2 + len(g), g[-1]):
                        if son == len(metin):
                            yield ekler + (Ek("KİP:ŞART", metin[p2:son]),)


# =============================================================================
# 3. SÖZLÜK (kök deposu)
# =============================================================================

SAYI_SÖZCÜKLERİ = {
    "sıfır": 0, "bir": 1, "iki": 2, "üç": 3, "dört": 4, "beş": 5, "altı": 6, "yedi": 7,
    "sekiz": 8, "dokuz": 9, "on": 10, "yirmi": 20, "otuz": 30, "kırk": 40, "elli": 50,
    "altmış": 60, "yetmiş": 70, "seksen": 80, "doksan": 90, "yüz": 100, "bin": 1000,
    "milyon": 1_000_000, "milyar": 1_000_000_000,
}
TAM_SÖZCÜKLER = {
    "göre": Tür.EDAT, "olarak": Tür.EDAT, "takdirde": Tür.EDAT, "durumunda": Tür.EDAT,
    "halinde": Tür.EDAT, "hâlinde": Tür.EDAT, "ile": Tür.EDAT,
    "ve": Tür.BAĞLAÇ, "veya": Tür.BAĞLAÇ,
}
_TÜR_ÖNCELİĞİ = {Tür.EDAT: 0, Tür.BAĞLAÇ: 0, Tür.AD: 1, Tür.SAYI_SÖZ: 2, Tür.FİİL: 3,
                 Tür.İŞLEV: 4, Tür.SIFAT: 5, Tür.İSİM: 9}


class Sözlük:
    def __init__(self):
        self.kökler: dict[str, list[tuple[Tür, object]]] = defaultdict(list)
        for k, b in çekirdek.İŞLEVLER.items():
            self.kökler[k].append((Tür.İŞLEV, b))
        for k, b in çekirdek.EYLEMLER.items():
            self.kökler[k].append((Tür.FİİL, b))
        for k in çekirdek.KARŞILAŞTIRMA_FİİLLERİ:
            if k not in çekirdek.EYLEMLER:
                self.kökler[k].append((Tür.FİİL, None))
        for k, op in çekirdek.KARŞILAŞTIRMA_SIFATLARI.items():
            self.kökler[k].append((Tür.SIFAT, op))
        for k, v in SAYI_SÖZCÜKLERİ.items():
            self.kökler[k].append((Tür.SAYI_SÖZ, v))
        self.adlar: set[str] = set()

    def ad_ekle(self, ad: str) -> None:
        if ad not in self.adlar:
            self.adlar.add(ad)
            self.kökler[ad].insert(0, (Tür.AD, None))

    def bileşikler(self) -> list[tuple[str, ...]]:
        return sorted((tuple(k.split("_")) for k in self.kökler if "_" in k), key=len, reverse=True)

    # --- çözümleme ---------------------------------------------------------
    def çözümle(self, kelime: str) -> list[Çözümleme]:
        if kelime in TAM_SÖZCÜKLER:
            return [Çözümleme(kelime, TAM_SÖZCÜKLER[kelime])]
        if "'" in kelime:                                   # Ahmet'in, a'nın
            kök, ek = kelime.split("'", 1)
            türler = self.kökler.get(kök) or [(Tür.İSİM, None)]
            # kesme işaretli adlarda okunuş bilinmez (c'nin = ce'nin): kaynaştırma serbest
            return [Çözümleme(kök, t, e, b) for t, b in türler
                    for e in isim_ekleri(ek, 0, None)] or [Çözümleme(kelime, Tür.İSİM)]

        sonuçlar: list[Çözümleme] = []
        for L in range(len(kelime), 0, -1):
            önek, kalan = kelime[:L], kelime[L:]
            adaylar = [(önek, t, b) for t, b in self.kökler.get(önek, [])]
            if kalan and kalan[0] in ÜNLÜLER and önek[-1] in SERTLEŞME:
                sert = önek[:-1] + SERTLEŞME[önek[-1]]
                adaylar += [(sert, t, b) for t, b in self.kökler.get(sert, [])]
            for kök, tür, bilgi in adaylar:
                ekdizileri = fiil_ekleri(kalan, önek[-1]) if tür == Tür.FİİL \
                    else isim_ekleri(kalan, 0, önek[-1])
                for ekler in ekdizileri:
                    sonuçlar.append(Çözümleme(kök, tür, ekler, bilgi))
        if sonuçlar:
            sonuçlar.sort(key=lambda ç: (-len(ç.kök), _TÜR_ÖNCELİĞİ[ç.tür], len(ç.ekler)))
            return sonuçlar

        # Sözlük dışı kök: en kısa makul kökü, türetim eki cezasıyla seç
        serbest = []
        for L in range(len(kelime), 2, -1):
            önek, kalan = kelime[:L], kelime[L:]
            for ekler in isim_ekleri(kalan, 0, önek[-1]):
                ceza = sum(e.etiket.startswith("TÜRETİM") for e in ekler)
                serbest.append((ceza, L, len(ekler), Çözümleme(önek, Tür.İSİM, ekler)))
            if kalan and kalan[0] in ÜNLÜLER and önek[-1] in SERTLEŞME:
                sert = önek[:-1] + SERTLEŞME[önek[-1]]
                for ekler in isim_ekleri(kalan, 0, önek[-1]):
                    serbest.append((1, L, len(ekler), Çözümleme(sert, Tür.İSİM, ekler)))
        serbest.sort(key=lambda t: t[:3])
        return [t[3] for t in serbest] or [Çözümleme(kelime, Tür.İSİM)]


# =============================================================================
# 4. LEXER
# =============================================================================

_DESEN = re.compile(r"""
    (?P<yorum>\#[^\n]*)
  | (?P<metin>"[^"\n]*"|“[^”\n]*”)
  | (?P<sayı>\d+(?:[.,]\d+)?(?:['’][^\W\d_]+)?)
  | (?P<kelime>[^\W\d_]+(?:['’][^\W\d_]+)?)
  | (?P<virgül>,)
  | (?P<nokta>[.;!?])
  | (?P<boşluk>[\s_]+)
  | (?P<hata>.)
""", re.X)

_KOPULA = re.compile(r"[dt][ıiuü]r$")


class DizgeSözcükHatası(Exception):
    pass


class Lexer:
    def __init__(self, sözlük: Sözlük | None = None):
        self.sözlük = sözlük or Sözlük()

    # --- 1. yüzey tokenları ---------------------------------------------
    def _ham(self, kaynak: str) -> list[tuple[Token, int, int]]:
        tokenlar = []
        satır, satır_baş = 1, 0
        for m in _DESEN.finditer(kaynak):
            tür, metin = m.lastgroup, m.group()
            sütun = m.start() - satır_baş + 1
            if tür == "hata":
                raise DizgeSözcükHatası(f"{satır}:{sütun}: tanınmayan karakter {metin!r}")
            if tür == "metin":
                tokenlar.append((Token(TokenTürü.METİN, metin, satır, sütun, değer=metin[1:-1]),
                                 m.start(), m.end()))
            elif tür == "sayı":
                parçalar = re.split(r"['’]", metin, maxsplit=1)
                rakam, ek = parçalar[0], tr_küçük(parçalar[1]) if len(parçalar) > 1 else ""
                değer = float(rakam.replace(",", ".")) if re.search(r"[.,]", rakam) else int(rakam)
                ç = [Çözümleme(rakam, Tür.SAYI_SÖZ, e, değer) for e in isim_ekleri(ek, 0, None)] if ek else []
                ç = ç or [Çözümleme(rakam, Tür.SAYI_SÖZ, (), değer)]
                tokenlar.append((Token(TokenTürü.SAYI, metin, satır, sütun, ç, değer), m.start(), m.end()))
            elif tür == "kelime":
                tokenlar.append((Token(TokenTürü.KELİME, tr_küçük(metin).replace("’", "'"), satır, sütun),
                                 m.start(), m.end()))
            elif tür == "virgül":
                tokenlar.append((Token(TokenTürü.VİRGÜL, metin, satır, sütun), m.start(), m.end()))
            elif tür == "nokta":
                tokenlar.append((Token(TokenTürü.NOKTA, metin, satır, sütun), m.start(), m.end()))
            satır_artış = metin.count("\n")
            if satır_artış:
                satır += satır_artış
                satır_baş = m.start() + metin.rfind("\n") + 1
        return tokenlar

    # --- 2. ön tarama: tanımlanan adları sözlüğe ekle -------------------
    def _adları_topla(self, cümleler: list[list[Token]]) -> None:
        for toks in cümleler:
            kelimeler = [t for t in toks if t.tür == TokenTürü.KELİME]
            if not kelimeler:
                continue
            # "AD, ...-dIr."  (tanım)
            if TokenTürü.VİRGÜL in (t.tür for t in toks):
                i = next(i for i, t in enumerate(toks) if t.tür == TokenTürü.VİRGÜL)
                özne = toks[:i]
                son = toks[-1]
                if 1 <= len(özne) <= 3 and all(t.tür == TokenTürü.KELİME for t in özne) \
                        and son.tür == TokenTürü.KELİME and _KOPULA.search(son.yüzey) \
                        and not self._emir_mi(son.yüzey):
                    self.sözlük.ad_ekle("_".join(t.yüzey for t in özne))
            # "... AD olarak sakla."
            for j in range(1, len(toks) - 1):
                if toks[j].yüzey == "olarak" and toks[j + 1].yüzey.startswith("sakla") \
                        and toks[j - 1].tür == TokenTürü.KELİME:
                    self.sözlük.ad_ekle(toks[j - 1].yüzey)

    def _emir_mi(self, kelime: str) -> bool:
        return any(ç.tür == Tür.FİİL and ç.kip == Kip.EMİR for ç in self.sözlük.çözümle(kelime))

    # --- 3. bileşik kök birleştirme (standart sapma, veri seti, ...) ------
    def _bileşikleri_birleştir(self, toks: list[Token]) -> list[Token]:
        bileşikler = self.sözlük.bileşikler()
        out, i = [], 0
        while i < len(toks):
            birleşti = False
            for parçalar in bileşikler:
                k = len(parçalar)
                aday = toks[i:i + k]
                if len(aday) < k or any(t.tür != TokenTürü.KELİME for t in aday):
                    continue
                if [t.yüzey for t in aday[:-1]] != list(parçalar[:-1]):
                    continue
                son, p = aday[-1].yüzey, parçalar[-1]
                yumuşak = p[:-1] + {"p": "b", "ç": "c", "t": "d", "k": "ğ"}.get(p[-1], p[-1])
                if son.startswith(p) or son.startswith(yumuşak):
                    out.append(Token(TokenTürü.KELİME, "_".join(t.yüzey for t in aday),
                                     aday[0].satır, aday[0].sütun))
                    i += k
                    birleşti = True
                    break
            if not birleşti:
                out.append(toks[i])
                i += 1
        return out

    # --- ana giriş ---------------------------------------------------------
    def tokenize(self, kaynak: str) -> list[HamCümle]:
        ham = self._ham(kaynak)
        gruplar: list[list[tuple[Token, int, int]]] = [[]]
        for t in ham:
            if t[0].tür == TokenTürü.NOKTA:
                if gruplar[-1]:
                    gruplar.append([])
            else:
                gruplar[-1].append(t)
        gruplar = [g for g in gruplar if g]

        self._adları_topla([[t for t, _, _ in g] for g in gruplar])

        cümleler = []
        for g in gruplar:
            toks = self._bileşikleri_birleştir([t for t, _, _ in g])
            for t in toks:
                if t.tür == TokenTürü.KELİME:
                    t.çözümlemeler = self.sözlük.çözümle(t.yüzey)
            metin = " ".join(kaynak[g[0][1]:g[-1][2]].split())
            cümleler.append(HamCümle(toks, metin, g[0][0].satır))
        log.debug("%d cümle, %d token", len(cümleler), sum(len(c.tokenlar) for c in cümleler))
        return cümleler
