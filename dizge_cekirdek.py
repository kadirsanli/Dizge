"""
dizge_cekirdek.py — Dizge Standart Kütüphanesi (Çekirdek)
=========================================================

Bu modül iki iş yapar:

1. **Kayıt defteri (sözlük kaynağı):** Dizge'deki her kavramsal işlev (isim kökü)
   ve eylem (fiil kökü) burada `@işlev` / `@eylem` ile kaydedilir. Lexer kök
   sözlüğünü buradan kurar; parser parametreleri *ismin hâl ekine göre* bağlar.
   Yani `tutarların ortalamadan uzaklığı` ifadesinde `-ın` (ilgi hâli) birinci
   parametreye, `-dan` (ayrılma hâli) ikinci parametreye gider; sözcük sırası
   değil, ek belirleyicidir.

2. **Çalışma zamanı:** Vektörel (NumPy) istatistik, matris cebiri, olasılık
   dağılımları ve sütun odaklı `Tablo` / `Matris` veri yapıları.

Bellek sözleşmesi (eylem çatısı):
    - etken (geçişli) fiil   → `sırala(x)`          : yeni nesne döner, x dokunulmaz
    - edilgen/dönüşlü fiil   → `sırala_yerinde(x)`  : x'in kendi belleği değişir,
                                                       aynı nesne (aynı id) döner
"""
from __future__ import annotations

import difflib
import math
from dataclasses import dataclass

import numpy as np


class DizgeÇalışmaHatası(Exception):
    """Dizge programı çalışırken oluşan, kullanıcıya Türkçe açıklanan hata."""


# =============================================================================
# 1. KAYIT DEFTERİ
# =============================================================================

@dataclass
class İşlevBilgisi:
    kök: str                 # sözlük kökü, bileşikler '_' ile: "standart_sapma"
    py: str                  # Python karşılığı
    roller: dict[str, str]   # dilbilgisel rol (hâl) -> parametre adı
    saf: bool = True         # yan etkisiz mi? (sabit katlamaya uygun)
    önad: bool = False       # "ilk", "son" gibi sayıdan önce gelen niteleyici
    açıklama: str = ""


@dataclass
class EylemBilgisi:
    kök: str
    py: str | None
    yerinde: str | None      # edilgen çatı karşılığı (in-place); yoksa None
    roller: dict[str, str]
    tür: str = "dönüşüm"     # dönüşüm | çıktı | kimlik | atama | uygulama
    maskeli: bool = False    # koşul maskesini dalsız (vektörel) uygulayabilir mi?
    açıklama: str = ""


İŞLEVLER: dict[str, İşlevBilgisi] = {}
EYLEMLER: dict[str, EylemBilgisi] = {}

# Karşılaştırma bildiren fiil ve sıfat kökleri -> işleç
KARŞILAŞTIRMA_FİİLLERİ = {"aş": ">", "geç": ">", "ol": "=="}
KARŞILAŞTIRMA_SIFATLARI = {
    "büyük": ">", "fazla": ">", "yüksek": ">",
    "küçük": "<", "az": "<", "düşük": "<",
    "eşit": "==",
}


def _ilk_satır(doc: str | None) -> str:
    return (doc or "").strip().splitlines()[0] if doc and doc.strip() else ""


def işlev(kök: str, roller: dict[str, str] | None = None, *, saf: bool = True, önad: bool = False):
    """İsim köklü kavramsal işlev kaydeder. Varsayılan rol: ilgi hâli -> 'veri'."""
    def kaydet(f):
        İŞLEVLER[kök] = İşlevBilgisi(kök, f.__name__, {"ilgi": "veri"} if roller is None else roller,
                                     saf, önad, _ilk_satır(f.__doc__))
        return f
    return kaydet


def eylem(kök: str, roller: dict[str, str], *, tür: str = "dönüşüm",
          yerinde: str | None = None, maskeli: bool = False):
    """Fiil köklü eylem kaydeder."""
    def kaydet(f):
        EYLEMLER[kök] = EylemBilgisi(kök, f.__name__ if f else None, yerinde, roller, tür,
                                     maskeli, _ilk_satır(f.__doc__) if f else "")
        return f
    return kaydet


def _kimlik_eylemi(kök: str, açıklama: str):
    EYLEMLER[kök] = EylemBilgisi(kök, None, None, {"belirtme": "kaynak", "özne": "kaynak"},
                                 "kimlik", False, açıklama)


# =============================================================================
# 2. VERİ YAPILARI
# =============================================================================

def tr_sayı(x, ondalık: int = 2) -> str:
    """Türkçe sayı biçimi: 12.345,67"""
    if isinstance(x, (bool, np.bool_)):
        return "doğru" if x else "yanlış"
    if isinstance(x, (int, np.integer)):
        return f"{int(x):,}".replace(",", ".")
    if isinstance(x, (float, np.floating)):
        if math.isnan(x):
            return "tanımsız"
        s = f"{float(x):,.{ondalık}f}"
        return s.replace(",", "\x00").replace(".", ",").replace("\x00", ".")
    return str(x)


def _hücre(sütun_adı: str, v) -> str:
    if isinstance(v, (float, np.floating)) and float(v).is_integer() and abs(v) < 1e15 \
            and (sütun_adı.endswith("_no") or sütun_adı in {"saat", "risk_puanı"}):
        v = int(v)
    if sütun_adı.endswith("_no"):
        return str(int(v)) if isinstance(v, (int, float, np.integer, np.floating)) else str(v)
    return tr_sayı(v)


def _tablo_metni(başlık: str, sütunlar: list[str], satırlar: list[list[str]],
                 toplam: int, gösterilen: int) -> str:
    gen = [max(len(s), *(len(r[i]) for r in satırlar)) if satırlar else len(s)
           for i, s in enumerate(sütunlar)]
    çizgi = "─┼─".join("─" * g for g in gen)
    out = [f"┌─ {başlık}", "│ " + " │ ".join(s.ljust(g) for s, g in zip(sütunlar, gen)), "├─" + çizgi]
    for r in satırlar:
        out.append("│ " + " │ ".join(h.rjust(g) for h, g in zip(r, gen)))
    if toplam > gösterilen:
        out.append(f"│ … ({tr_sayı(toplam - gösterilen)} satır daha)")
    out.append("└─")
    return "\n".join(out)


class Tablo:
    """Sütun odaklı (columnar) kayıt tablosu. Her sütun bir NumPy dizisidir."""

    def __init__(self, sütunlar: dict[str, np.ndarray]):
        self.sütunlar: dict[str, np.ndarray] = dict(sütunlar)

    def __len__(self) -> int:
        return len(next(iter(self.sütunlar.values()))) if self.sütunlar else 0

    def kopya(self) -> "Tablo":
        return Tablo({k: v.copy() for k, v in self.sütunlar.items()})

    def seç(self, dizin) -> "Tablo":
        return Tablo({k: v[dizin] for k, v in self.sütunlar.items()})

    def metin(self, en_fazla: int = 10, başlık: str | None = None) -> str:
        n = len(self)
        adlar = list(self.sütunlar)
        satırlar = [[_hücre(a, self.sütunlar[a][i]) for a in adlar] for i in range(min(n, en_fazla))]
        return _tablo_metni(başlık or f"Tablo: {tr_sayı(n)} satır × {len(adlar)} sütun",
                            adlar, satırlar, n, min(n, en_fazla))

    def __repr__(self) -> str:
        return f"Tablo({tr_sayı(len(self))}×{len(self.sütunlar)})"


class Matris:
    """Sayısal 2B matris; sütun adlarını korur (sıralama/öznitelik için)."""

    def __init__(self, veri, sütun_adları: list[str] | None = None):
        self.veri = np.atleast_2d(np.asarray(veri, dtype=float))
        self.sütun_adları = sütun_adları or [f"s{i + 1}" for i in range(self.veri.shape[1])]

    @property
    def şekil(self):
        return self.veri.shape

    def metin(self, en_fazla: int = 10, başlık: str | None = None) -> str:
        n, m = self.veri.shape
        satırlar = [[_hücre(a, self.veri[i, j]) for j, a in enumerate(self.sütun_adları)]
                    for i in range(min(n, en_fazla))]
        return _tablo_metni(başlık or f"Matris: {tr_sayı(n)} × {m} (float64, bitişik bellek)",
                            self.sütun_adları, satırlar, n, min(n, en_fazla))

    def __repr__(self) -> str:
        return f"Matris({self.veri.shape[0]}×{self.veri.shape[1]})"


def _dizi(x) -> np.ndarray:
    if isinstance(x, Matris):
        return x.veri
    if isinstance(x, Tablo):
        raise DizgeÇalışmaHatası(
            "Bu işlem bir sayı dizisi bekliyor ama bir Tablo aldı. "
            "Önce bir sütun seçin, örn: 'işlemlerin tutarları'.")
    return np.asarray(x, dtype=float)


def _sütun_bul(adlar, adaylar: list[str]) -> str:
    for a in adaylar:
        if a in adlar:
            return a
    yakın = difflib.get_close_matches(adaylar[0], list(adlar), n=1, cutoff=0.5)
    öneri = f" Şunu mu demek istediniz: '{yakın[0]}'?" if yakın else ""
    raise DizgeÇalışmaHatası(
        f"'{adaylar[0]}' adlı sütun bulunamadı. Mevcut sütunlar: {', '.join(adlar)}.{öneri}")


def öznitelik(nesne, adaylar: list[str]):
    """'X-in Y-si' yapısında Y bir işlev değilse: X'in Y sütunu/özniteliği."""
    if isinstance(nesne, Tablo):
        return nesne.sütunlar[_sütun_bul(nesne.sütunlar, adaylar)]
    if isinstance(nesne, Matris):
        return nesne.veri[:, nesne.sütun_adları.index(_sütun_bul(nesne.sütun_adları, adaylar))]
    yakın = difflib.get_close_matches(adaylar[0], list(İŞLEVLER), n=1, cutoff=0.6)
    öneri = f" '{yakın[0].replace('_', ' ')}' işlevini mi kastettiniz?" if yakın else ""
    raise DizgeÇalışmaHatası(f"{özetle(nesne)} değerinin '{adaylar[0]}' özniteliği yok.{öneri}")


# =============================================================================
# 3. YÜKLEM / KOŞUL (dalsız, vektörel)
# =============================================================================

_İŞLEÇLER = {
    ">": np.greater, "<": np.less, "==": np.equal,
    ">=": np.greater_equal, "<=": np.less_equal,
}


def karşılaştır(işleç: str, a, b, olumsuz: bool = False):
    """Skalerde bool, dizide boolean maske döner (if/else yerine maske)."""
    if isinstance(a, (Tablo, Matris)) or isinstance(b, (Tablo, Matris)):
        raise DizgeÇalışmaHatası("Tablo/Matris doğrudan karşılaştırılamaz; bir sütunu karşılaştırın.")
    a_ = np.asarray(a) if isinstance(a, (list, tuple)) else a
    sonuç = _İŞLEÇLER[işleç](a_, b)
    return np.logical_not(sonuç) if olumsuz else sonuç


def koşul_doğru(k) -> bool:
    return bool(np.any(k))


@dataclass
class Ölçüt:
    """Süzgeç yüklemi: (öznitelik) işleç değer."""
    işleç: str
    değer: object
    öznitelik: list[str] | None = None
    olumsuz: bool = False


def süz(kaynak, ölçüt: Ölçüt):
    """'beşten büyükleri', 'durumu Anormal olanlar' gibi seçimleri uygular."""
    if isinstance(kaynak, Tablo):
        adaylar = ölçüt.öznitelik
        if adaylar is None:
            if isinstance(ölçüt.değer, str) and "durum" in kaynak.sütunlar:
                adaylar = ["durum"]
            else:
                raise DizgeÇalışmaHatası(
                    "Tablo süzülürken hangi sütunun karşılaştırılacağı belirsiz. "
                    "Örn: 'işlemlerden tutarı 5000'den büyük olanlar'.")
        sütun = kaynak.sütunlar[_sütun_bul(kaynak.sütunlar, adaylar)]
        return kaynak.seç(karşılaştır(ölçüt.işleç, sütun, ölçüt.değer, ölçüt.olumsuz))
    if isinstance(kaynak, Matris):
        if ölçüt.öznitelik is None:
            raise DizgeÇalışmaHatası("Matris süzülürken sütun belirtin: 'matrisin tutarı ... olanlar'.")
        sütun = öznitelik(kaynak, ölçüt.öznitelik)
        m = karşılaştır(ölçüt.işleç, sütun, ölçüt.değer, ölçüt.olumsuz)
        return Matris(kaynak.veri[m], kaynak.sütun_adları)
    d = _dizi(kaynak)
    return d[karşılaştır(ölçüt.işleç, d, ölçüt.değer, ölçüt.olumsuz)]


# =============================================================================
# 4. KAVRAMSAL İŞLEVLER (isim kökleri)
# =============================================================================

# --- Betimsel istatistik -----------------------------------------------------
@işlev("ortalama")
def ortalama(veri):
    """Aritmetik ortalama (μ)."""
    return float(np.mean(_dizi(veri)))


@işlev("standart_sapma")
def standart_sapma(veri):
    """Örneklem standart sapması (σ, n-1 paydalı)."""
    return float(np.std(_dizi(veri), ddof=1))


@işlev("varyans")
def varyans(veri):
    """Örneklem varyansı (σ², n-1 paydalı)."""
    return float(np.var(_dizi(veri), ddof=1))


@işlev("medyan")
def medyan(veri):
    """Ortanca değer."""
    return float(np.median(_dizi(veri)))


@işlev("toplam")
def toplam(veri):
    """Elemanların toplamı (Σ)."""
    return float(np.sum(_dizi(veri)))


@işlev("en_büyük")
def en_büyük(veri):
    """Maksimum."""
    return float(np.max(_dizi(veri)))


@işlev("en_küçük")
def en_küçük(veri):
    """Minimum."""
    return float(np.min(_dizi(veri)))


@işlev("yüzdelik", {"ilgi": "veri", "sayı": "p"})
def yüzdelik(veri, p):
    """p. yüzdelik dilim."""
    return float(np.percentile(_dizi(veri), p))


@işlev("z_puan")
def z_puan(veri):
    """Standart puan: (x-μ)/σ."""
    d = _dizi(veri)
    return (d - d.mean()) / d.std(ddof=1)


@işlev("korelasyon", {"ilgi": "a", "vasıta": "b"})
def korelasyon(a, b):
    """Pearson korelasyon katsayısı."""
    return float(np.corrcoef(_dizi(a), _dizi(b))[0, 1])


@işlev("kovaryans", {"ilgi": "a", "vasıta": "b"})
def kovaryans(a, b):
    """Örneklem kovaryansı."""
    return float(np.cov(_dizi(a), _dizi(b))[0, 1])


# --- Aritmetik (vektörel) ----------------------------------------------------
@işlev("karekök")
def karekök(veri):
    """Karekök (√)."""
    return np.sqrt(veri) if np.ndim(veri) else math.sqrt(veri)


@işlev("kare")
def kare(veri):
    """Karesi."""
    return np.square(veri) if np.ndim(veri) else veri * veri


@işlev("mutlak_değer")
def mutlak_değer(veri):
    """Mutlak değer |x|."""
    return np.abs(veri) if np.ndim(veri) else abs(veri)


@işlev("uzaklık", {"ilgi": "a", "ayrılma": "b"})
def uzaklık(a, b):
    """a'nın b'den uzaklığı: |a - b|."""
    return np.abs(np.asarray(a) - b) if np.ndim(a) else abs(a - b)


@işlev("fark", {"ilgi": "a", "ayrılma": "b"})
def fark(a, b):
    """a'nın b'den farkı: a - b."""
    return np.asarray(a) - b if np.ndim(a) else a - b


@işlev("kat", {"ilgi": "veri", "sayı": "k"})
def kat(veri, k):
    """veri'nin k katı: k · veri."""
    if isinstance(veri, Matris):
        return Matris(veri.veri * k, list(veri.sütun_adları))
    return np.asarray(veri) * k if np.ndim(veri) else veri * k


@işlev("yarı")
def yarı(veri):
    """Yarısı: veri / 2."""
    return np.asarray(veri) / 2 if np.ndim(veri) else veri / 2


@işlev("oran", {"ilgi": "a", "yönelme": "b"})
def oran(a, b):
    """a'nın b'ye oranı: a / b."""
    return np.asarray(a) / b if np.ndim(a) else a / b


# --- Yapılar ve boyut --------------------------------------------------------
@işlev("dizi", {"öğeler": "öğeler"})
def dizi(öğeler):
    """Sayı dizisi (vektör) oluşturur."""
    return np.asarray(öğeler if isinstance(öğeler, (list, tuple, np.ndarray)) else [öğeler], dtype=float)


@işlev("matris", {"ilgi": "veri"})
def matris(veri):
    """Tablonun sayısal sütunlarından bitişik bellekli 2B matris kurar."""
    if isinstance(veri, Matris):
        return Matris(veri.veri.copy(), list(veri.sütun_adları))
    if isinstance(veri, Tablo):
        sayısal = [a for a, s in veri.sütunlar.items() if s.dtype.kind in "iuf"]
        if not sayısal:
            raise DizgeÇalışmaHatası("Tabloda sayısal sütun yok; matris kurulamaz.")
        return Matris(np.column_stack([veri.sütunlar[a].astype(float) for a in sayısal]), sayısal)
    return Matris(veri)


@işlev("birim_matris", {})
def birim_matris(boyut=3):
    """n×n birim matris (I)."""
    return Matris(np.eye(int(boyut)))


@işlev("satır_sayı")
def satır_sayı(veri):
    """Satır (kayıt) sayısı."""
    if isinstance(veri, Matris):
        return int(veri.veri.shape[0])
    return int(len(veri))


@işlev("sütun_sayı")
def sütun_sayı(veri):
    """Sütun sayısı."""
    if isinstance(veri, Tablo):
        return len(veri.sütunlar)
    return int(_dizi(veri).shape[1]) if np.ndim(_dizi(veri)) == 2 else 1


@işlev("ilk", {"ilgi": "veri", "sayı": "n"}, önad=True)
def ilk(veri, n=1):
    """İlk n eleman/satır."""
    n = int(n)
    if isinstance(veri, Tablo):
        return veri.seç(slice(0, n))
    if isinstance(veri, Matris):
        return Matris(veri.veri[:n], veri.sütun_adları)
    return np.asarray(veri)[:n]


@işlev("son", {"ilgi": "veri", "sayı": "n"}, önad=True)
def son(veri, n=1):
    """Son n eleman/satır."""
    n = int(n)
    if isinstance(veri, Tablo):
        return veri.seç(slice(len(veri) - n, None))
    if isinstance(veri, Matris):
        return Matris(veri.veri[-n:], veri.sütun_adları)
    return np.asarray(veri)[-n:]


# --- Matris cebiri -----------------------------------------------------------
@işlev("çarpım", {"ilgi": "a", "vasıta": "b"})
def çarpım(a, b):
    """Matris çarpımı (a · b)."""
    return Matris(_dizi(a) @ _dizi(b))


@işlev("devrik")
def devrik(veri):
    """Transpoz (Aᵀ)."""
    return Matris(_dizi(veri).T.copy())


@işlev("ters")
def ters(veri):
    """Ters matris (A⁻¹)."""
    return Matris(np.linalg.inv(_dizi(veri)))


@işlev("determinant")
def determinant(veri):
    """Determinant |A|."""
    return float(np.linalg.det(_dizi(veri)))


@işlev("iz")
def iz(veri):
    """İz (köşegen toplamı)."""
    return float(np.trace(_dizi(veri)))


# --- Olasılık dağılımları ----------------------------------------------------
@işlev("normal_dağılım", {}, saf=False)
def normal_dağılım(eleman=1000, ortalama=0.0, sapma=1.0, tohum=None):
    """N(μ, σ²) dağılımından örneklem."""
    return np.random.default_rng(tohum).normal(ortalama, sapma, int(eleman))


@işlev("düzgün_dağılım", {}, saf=False)
def düzgün_dağılım(eleman=1000, alt=0.0, üst=1.0, tohum=None):
    """U(alt, üst) dağılımından örneklem."""
    return np.random.default_rng(tohum).uniform(alt, üst, int(eleman))


@işlev("birikimli_olasılık")
def birikimli_olasılık(veri):
    """Standart normal birikimli dağılım Φ(z)."""
    f = np.vectorize(lambda z: 0.5 * (1 + math.erf(z / math.sqrt(2))))
    return f(veri) if np.ndim(veri) else float(f(veri))


# --- Veri üretimi ------------------------------------------------------------
@işlev("rastgele_işlem_tablo", {}, saf=False)
def rastgele_işlem_tablo(satır=1000, tohum=2026):
    """Sentetik finansal işlem tablosu (sağa çarpık tutarlar + ~%2 sıra dışı kayıt)."""
    n = int(satır)
    rng = np.random.default_rng(tohum)
    tutar = rng.lognormal(mean=math.log(8_000), sigma=0.35, size=n)
    sıra_dışı = rng.choice(n, size=max(1, n // 50), replace=False)
    tutar[sıra_dışı] *= rng.uniform(3.0, 6.0, size=len(sıra_dışı))
    risk = np.clip(rng.normal(35, 15, n), 0, 100)
    risk[sıra_dışı] = np.clip(risk[sıra_dışı] + rng.uniform(30, 60, len(sıra_dışı)), 0, 100)
    return Tablo({
        "işlem_no": np.arange(1, n + 1),
        "müşteri_no": rng.integers(100_000, 999_999, n),
        "kanal": rng.choice(np.array(["Şube", "İnternet", "Mobil", "ATM"], dtype=object), n,
                            p=[0.2, 0.3, 0.4, 0.1]),
        "tutar": np.round(tutar, 2),
        "risk_puanı": np.round(risk).astype(int),
        "saat": rng.integers(0, 24, n),
    })


# =============================================================================
# 5. EYLEMLER (fiil kökleri) — etken: kopya, edilgen: yerinde
# =============================================================================

_kimlik_eylemi("al", "Değeri alır (işlev uygulamasını tamamlar).")
_kimlik_eylemi("hesapla", "İfadeyi hesaplar.")
_kimlik_eylemi("bul", "İfadeyi hesaplar.")


def _maske_uygunluğu(nesne, maske):
    if maske is None:
        return None
    m = np.asarray(maske)
    if m.ndim == 0:
        return None if bool(m) else np.zeros(len(nesne), dtype=bool)
    if len(m) != len(nesne):
        raise DizgeÇalışmaHatası(
            f"Koşul maskesi {len(m)} elemanlı, hedef {len(nesne)} elemanlı; boyutlar uyuşmuyor.")
    return m


@eylem("ayıkla", {"belirtme": "kaynak", "özne": "kaynak", "yüklem": "ölçüt"},
       yerinde="ayıkla_yerinde", maskeli=True)
def ayıkla(kaynak, ölçüt: Ölçüt | None = None, maske=None):
    """Seçimi yeni bir nesneye ayırır (kaynak korunur)."""
    if ölçüt is not None:
        kaynak = süz(kaynak, ölçüt)
    m = _maske_uygunluğu(kaynak, maske)
    if m is not None:
        return kaynak.seç(m) if isinstance(kaynak, Tablo) else _dizi(kaynak)[m]
    return kaynak.kopya() if isinstance(kaynak, Tablo) else np.array(kaynak, copy=True)


def ayıkla_yerinde(kaynak, ölçüt: Ölçüt | None = None, maske=None):
    sonuç = ayıkla(kaynak, ölçüt, maske)
    if isinstance(kaynak, Tablo):
        kaynak.sütunlar = sonuç.sütunlar          # aynı Tablo nesnesi güncellenir
        return kaynak
    return sonuç                                  # NumPy dizisi yerinde küçültülemez


def _sıra_dizini(kaynak, ölçüt, azalan):
    if isinstance(kaynak, Tablo):
        anahtar = kaynak.sütunlar[_sütun_bul(kaynak.sütunlar, [ölçüt] if ölçüt else ["tutar"])]
    elif isinstance(kaynak, Matris):
        anahtar = kaynak.veri[:, kaynak.sütun_adları.index(
            _sütun_bul(kaynak.sütun_adları, [ölçüt] if ölçüt else [kaynak.sütun_adları[0]]))]
    else:
        anahtar = _dizi(kaynak)
    sıra = np.argsort(anahtar, kind="stable")
    return sıra[::-1] if azalan else sıra


@eylem("sırala", {"belirtme": "kaynak", "özne": "kaynak", "göre": "ölçüt", "yön": "azalan"},
       yerinde="sırala_yerinde")
def sırala(kaynak, ölçüt: str | None = None, azalan: bool = False):
    """Sıralanmış YENİ kopya döner (immutable)."""
    sıra = _sıra_dizini(kaynak, ölçüt, azalan)
    if isinstance(kaynak, Tablo):
        return kaynak.seç(sıra)
    if isinstance(kaynak, Matris):
        return Matris(kaynak.veri[sıra], list(kaynak.sütun_adları))
    return _dizi(kaynak)[sıra]


def sırala_yerinde(kaynak, ölçüt: str | None = None, azalan: bool = False):
    """Kaynağın KENDİ belleğini sıralar (in-place), aynı nesneyi döner."""
    if isinstance(kaynak, np.ndarray) and kaynak.ndim == 1:
        kaynak.sort(kind="stable")
        if azalan:
            kaynak[:] = kaynak[::-1].copy()
        return kaynak
    sıra = _sıra_dizini(kaynak, ölçüt, azalan)
    if isinstance(kaynak, Tablo):
        for s in kaynak.sütunlar.values():
            s[:] = s[sıra]
        return kaynak
    if isinstance(kaynak, Matris):
        kaynak.veri[:] = kaynak.veri[sıra]
        return kaynak
    raise DizgeÇalışmaHatası(f"{özetle(kaynak)} yerinde sıralanamaz (değiştirilemez değer).")


@eylem("etiketle", {"belirtme": "hedef", "özne": "hedef", "olarak": "etiket"},
       yerinde="etiketle_yerinde", maskeli=True)
def etiketle(hedef, etiket: str, maske=None, sütun: str = "durum"):
    """Etiketli YENİ tablo döner."""
    return etiketle_yerinde(hedef.kopya(), etiket, maske, sütun)


def etiketle_yerinde(hedef, etiket: str, maske=None, sütun: str = "durum"):
    """Maskeyi sağlayan satırlara etiketi yerinde yazar (dalsız, vektörel)."""
    if not isinstance(hedef, Tablo):
        raise DizgeÇalışmaHatası("Etiketleme yalnızca Tablo üzerinde yapılabilir.")
    if sütun not in hedef.sütunlar:
        hedef.sütunlar[sütun] = np.full(len(hedef), "Normal", dtype=object)
    m = _maske_uygunluğu(hedef, maske)
    hedef.sütunlar[sütun][slice(None) if m is None else m] = etiket
    return hedef


@eylem("durdur", {"belirtme": "hedef", "özne": "hedef"}, yerinde="durdur_yerinde", maskeli=True)
def durdur(hedef, maske=None):
    """İşlemleri durdurulmuş olarak işaretlenmiş YENİ tablo döner."""
    return durdur_yerinde(hedef.kopya(), maske)


def durdur_yerinde(hedef, maske=None):
    return etiketle_yerinde(hedef, "DURDURULDU", maske, sütun="işlem_durumu")


@eylem("normalleştir", {"belirtme": "kaynak", "özne": "kaynak"}, yerinde="normalleştir_yerinde")
def normalleştir(kaynak):
    """z-puanına dönüştürülmüş YENİ dizi."""
    return z_puan(kaynak)


def normalleştir_yerinde(kaynak):
    d = kaynak if isinstance(kaynak, np.ndarray) else _dizi(kaynak)
    d -= d.mean()
    d /= d.std(ddof=1)
    return d


def _yaz(önek: str, nesneler, adlar, maske, en_fazla: int):
    adlar = adlar or [None] * len(nesneler)
    for nesne, ad in zip(nesneler, adlar):
        m = None
        if maske is not None and isinstance(nesne, Tablo):
            m = _maske_uygunluğu(nesne, maske)
        if m is not None:
            seçim = nesne.seç(m)
            print(f"{önek} {ad or ''}: koşulu sağlayan {tr_sayı(len(seçim))} / {tr_sayı(len(nesne))} kayıt")
            print(seçim.metin(en_fazla))
        elif isinstance(nesne, (Tablo, Matris)):
            print(f"{önek} {ad or ''}")
            print(nesne.metin(en_fazla))
        elif isinstance(nesne, np.ndarray):
            tam = bool(np.all(np.mod(nesne[:en_fazla], 1) == 0))
            gövde = "; ".join(tr_sayı(int(x)) if tam else tr_sayı(float(x)) for x in nesne[:en_fazla])
            ek = f", … (+{len(nesne) - en_fazla})" if len(nesne) > en_fazla else ""
            print(f"{önek} {ad or 'dizi'} = [{gövde}{ek}]")
        else:
            if isinstance(nesne, (float, np.floating)) and float(nesne).is_integer():
                nesne = int(nesne)
            print(f"{önek} {ad or ''} = {tr_sayı(nesne)}")
    return nesneler[-1] if nesneler else None


@eylem("yazdır", {"belirtme": "nesneler", "özne": "nesneler"}, tür="çıktı", maskeli=True)
def yazdır(*nesneler, adlar=None, maske=None):
    """Değerleri çıktıya basar."""
    return _yaz("▸", nesneler, adlar, maske, en_fazla=20)


@eylem("raporla", {"belirtme": "nesneler", "özne": "nesneler"}, tür="çıktı", maskeli=True)
def raporla(*nesneler, adlar=None, maske=None):
    """Değerleri adlarıyla birlikte rapor satırı olarak basar."""
    return _yaz("RAPOR ▸", nesneler, adlar, maske, en_fazla=10)


EYLEMLER["sakla"] = EylemBilgisi("sakla", None, None, {"belirtme": "kaynak", "olarak": "ad"},
                                 "atama", False, "Sonucu verilen adla saklar.")
EYLEMLER["dönüştür"] = EylemBilgisi("dönüştür", None, None,
                                    {"belirtme": "kaynak", "özne": "kaynak", "yönelme": "hedef"},
                                    "uygulama", False, "Kaynağa yönelme hâlindeki işlevi uygular.")


# =============================================================================
# 6. GÖZLEM YARDIMCILARI (loglar için)
# =============================================================================

def özetle(x) -> str:
    if isinstance(x, Tablo):
        return f"Tablo[{tr_sayı(len(x))} satır × {len(x.sütunlar)} sütun]"
    if isinstance(x, Matris):
        return f"Matris[{x.veri.shape[0]}×{x.veri.shape[1]}]"
    if isinstance(x, np.ndarray):
        if x.dtype == bool:
            return f"Maske[{len(x)}] ({int(x.sum())} doğru)"
        return f"Dizi[{len(x)}] ({x.dtype})"
    if isinstance(x, (int, float, np.integer, np.floating)):
        return tr_sayı(x, 4 if isinstance(x, (float, np.floating)) and abs(x) < 10 else 2)
    return repr(x)


def bellek_adresi(x) -> str:
    """Nesnenin veri tamponunun adresi (yerinde/kopya ayrımını göstermek için)."""
    if isinstance(x, np.ndarray):
        return hex(x.__array_interface__["data"][0])
    if isinstance(x, Matris):
        return hex(x.veri.__array_interface__["data"][0])
    return hex(id(x))


# Kayıt bütünlüğü: her edilgen karşılık gerçekten tanımlı olmalı
for _e in EYLEMLER.values():
    assert _e.yerinde is None or callable(globals().get(_e.yerinde)), _e.yerinde
