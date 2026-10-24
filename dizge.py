#!/usr/bin/env python3
"""
dizge.py — Dizge çalışma ortamı (runtime) ve komut satırı arayüzü

Kullanım:
    python3 dizge.py hesaplama.dzg              # tüm aşamaların loglarıyla çalıştır
    python3 dizge.py hesaplama.dzg --sessiz     # yalnızca program çıktısı
    python3 dizge.py hesaplama.dzg --py-yaz derlenmis/hesaplama.py

Boru hattı:  .dzg ──LEXER──▶ biçimbirimler ──PARSER──▶ AST ──DERLEYİCİ──▶ Python/NumPy ──▶ ÇALIŞMA
"""
from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import dizge_cekirdek as çekirdek                                  # noqa: E402
from dizge_compiler import Derleyici, DerlenmişProgram, DizgeDerlemeHatası  # noqa: E402
from dizge_lexer import EK_ANLAMLARI, DizgeSözcükHatası, Lexer, TokenTürü  # noqa: E402
from dizge_parser import DizgeSözdizimHatası, Parser, ağaç           # noqa: E402

SÜRÜM = "0.1.0"
_AŞAMA = {"dizge.lexer": "LEXER", "dizge.parser": "PARSER", "dizge.derleyici": "DERLEYİCİ",
          "dizge.optimize": "OPTİMİZE", "dizge.çalışma": "ÇALIŞMA", "dizge.sistem": "SİSTEM"}


class _Biçim(logging.Formatter):
    def __init__(self):
        super().__init__()
        self.t0 = time.perf_counter()

    def format(self, kayıt):
        ms = (time.perf_counter() - self.t0) * 1000
        aşama = _AŞAMA.get(kayıt.name, kayıt.name)
        düzey = "" if kayıt.levelno == logging.INFO else f"{kayıt.levelname}: "
        return "\n".join(f"[{ms:9.2f} ms] [{aşama:<9}] {düzey}{satır}"
                         for satır in kayıt.getMessage().splitlines() or [""])


def _logları_kur(sessiz: bool) -> None:
    işleyici = logging.StreamHandler(sys.stdout)
    işleyici.setFormatter(_Biçim())
    kök = logging.getLogger("dizge")
    kök.handlers[:] = [işleyici]
    kök.setLevel(logging.WARNING if sessiz else logging.INFO)
    kök.propagate = False


def _kısa_ek(ç) -> str:
    if not ç.ekler:
        return f"{ç.kök}⟨{ç.tür.value}⟩"
    return f"{ç.kök}⟨{ç.tür.value}⟩ " + " ".join(
        f"+{e.yüzey or '∅'}[{e.etiket.split(':')[-1]}]" for e in ç.ekler)


def derle(kaynak: str, ad: str = "<dizge>") -> tuple[DerlenmişProgram, float]:
    """Kaynak metni derler; aşama loglarını basar."""
    sist = logging.getLogger("dizge.sistem")
    llog, plog, dlog = (logging.getLogger(f"dizge.{n}") for n in ("lexer", "parser", "derleyici"))
    t0 = time.perf_counter()

    # ---------------- LEXER -------------------------------------------------
    lexer = Lexer()
    cümleler = lexer.tokenize(kaynak)
    n_tok = sum(len(c.tokenlar) for c in cümleler)
    llog.info(f"{len(cümleler)} cümle, {n_tok} token. Ön tarama ile tanımlanan adlar: "
              f"{', '.join(sorted(lexer.sözlük.adlar)) or '—'}")
    kullanılan_ekler = set()
    for c in cümleler:
        llog.info(f"satır {c.satır:>2} │ {c.metin}")
        for t in c.tokenlar:
            if t.tür == TokenTürü.KELİME:
                ç = t.ç
                kullanılan_ekler.update(e.etiket for e in ç.ekler)
                alt = f"   (+{len(t.çözümlemeler) - 1} alternatif)" if len(t.çözümlemeler) > 1 else ""
                llog.info(f"        │   {t.yüzey:<26} → {_kısa_ek(ç)}{alt}")
            elif t.tür == TokenTürü.SAYI:
                llog.info(f"        │   {t.yüzey:<26} → SAYI {t.değer!r}"
                          + (" " + " ".join(f"+{e.yüzey}[{e.etiket.split(':')[-1]}]" for e in t.ç.ekler)
                             if t.ç.ekler else ""))
            elif t.tür == TokenTürü.METİN:
                llog.info(f"        │   {t.yüzey:<26} → METİN")
    llog.info("Bu programda işlemsel anlam taşıyan ekler:")
    for e in sorted(kullanılan_ekler):
        if e in EK_ANLAMLARI:
            llog.info(f"    {e:<18} = {EK_ANLAMLARI[e]}")

    # ---------------- PARSER ------------------------------------------------
    parser = Parser()
    program = parser.ayrıştır(cümleler)
    plog.info(f"SOV kaydır-indirge ayrıştırması tamam: {len(program.cümleler)} üst düzey düğüm")
    for satır, yüzey, varsayılan, seçilen in parser.seçimler:
        plog.info(f"belirsizlik giderildi (satır {satır}): '{yüzey}'  {_kısa_ek(varsayılan)}  ⇒  "
                  f"{_kısa_ek(seçilen)}   [yığın bağlamına göre]")
    for c in program.cümleler:
        plog.info(f"satır {c.satır:>2} │ {c.metin}")
        for s in ağaç(c):
            plog.info(f"        │   {s}")

    # ---------------- DERLEYİCİ ---------------------------------------------
    d = Derleyici(ad).derle(program)
    olog = logging.getLogger("dizge.optimize")
    for n in d.notlar:
        olog.info(n)
    for u in d.uyarılar:
        dlog.warning(u)
    ist = d.istatistik
    olog.info(f"Özet: {ist['kopya']} kopya / {ist['yerinde']} yerinde eylem, "
              f"{ist['dalsız_koşul']} dalsız koşul maskesi, {ist['dallı_koşul']} dallı koşul, "
              f"{ist['vektörel_süzgeç']} vektörel süzgeç, {ist['sabit_katlama']} sabit katlama")
    dlog.info("Üretilen Python/NumPy kodu:")
    for i, satır in enumerate(d.modül.splitlines(), 1):
        dlog.info(f"  {i:>3} │ {satır}")
    süre = (time.perf_counter() - t0) * 1000
    sist.info(f"Derleme süresi: {süre:.2f} ms")
    return d, süre


def çalıştır(d: DerlenmişProgram) -> dict:
    """Derlenmiş adımları sırayla çalıştırır; bellek davranışını loglar."""
    clog = logging.getLogger("dizge.çalışma")
    ad_alanı: dict = {"ç": çekirdek}
    for a in d.adımlar:
        clog.info(f"▶ satır {a.satır}: {a.kaynak}")
        önce = {h: (id(ad_alanı.get(h)), çekirdek.bellek_adresi(ad_alanı.get(h))) for h in a.yerinde}
        t0 = time.perf_counter()
        sys.stdout.flush()
        try:
            exec(compile(a.py, f"<dzg satır {a.satır}>", "exec"), ad_alanı)
        except çekirdek.DizgeÇalışmaHatası as h:
            raise çekirdek.DizgeÇalışmaHatası(f"satır {a.satır}: {h}") from None
        sys.stdout.flush()
        ms = (time.perf_counter() - t0) * 1000
        for ad in a.atananlar:
            clog.info(f"  ✓ {ad} ← {çekirdek.özetle(ad_alanı[ad])}   [{ms:.3f} ms]")
        if "_k" in ad_alanı and a.py.startswith("_k"):
            clog.info(f"    koşul maskesi: {çekirdek.özetle(ad_alanı['_k'])}")
        for h in a.yerinde:
            nesne = ad_alanı[h]
            aynı = id(nesne) == önce[h][0]
            adres = "" if isinstance(nesne, çekirdek.Tablo) else \
                f", veri tamponu {önce[h][1]} → {çekirdek.bellek_adresi(nesne)}"
            clog.info(f"  ✓ {h} YERİNDE güncellendi: nesne {hex(önce[h][0])} "
                      f"{'korundu (kopya yok)' if aynı else 'DEĞİŞTİ (yeni nesne)'}{adres}   [{ms:.3f} ms]")
            if isinstance(nesne, çekirdek.Tablo) and "durum" in nesne.sütunlar:
                durumlar, sayılar = __import__("numpy").unique(nesne.sütunlar["durum"].astype(str),
                                                               return_counts=True)
                clog.info("    durum dağılımı: " + ", ".join(f"{k}={v}" for k, v in zip(durumlar, sayılar)))
        if not a.atananlar and not a.yerinde:
            clog.info(f"  ✓ tamam   [{ms:.3f} ms]")
    return ad_alanı


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Dizge (.dzg) derleyici ve çalışma ortamı")
    p.add_argument("dosya")
    p.add_argument("--sessiz", action="store_true", help="yalnızca program çıktısı")
    p.add_argument("--py-yaz", metavar="YOL", help="üretilen Python modülünü bu yola yaz")
    p.add_argument("--yalnız-derle", action="store_true", help="çalıştırmadan derle")
    a = p.parse_args(argv)

    _logları_kur(a.sessiz)
    sist = logging.getLogger("dizge.sistem")
    yol = Path(a.dosya)
    if yol.suffix != ".dzg":
        sist.warning(f"'{yol.name}' .dzg uzantılı değil")
    kaynak = yol.read_text(encoding="utf-8")
    sist.info(f"Dizge {SÜRÜM} │ Python {sys.version.split()[0]} │ NumPy {__import__('numpy').__version__}")
    sist.info(f"Kaynak: {yol} ({len(kaynak.encode())} bayt, {kaynak.count(chr(10)) + 1} satır)")
    try:
        d, _ = derle(kaynak, yol.name)
        hedef = Path(a.py_yaz) if a.py_yaz else yol.parent / "derlenmis" / (yol.stem + ".py")
        hedef.parent.mkdir(parents=True, exist_ok=True)
        hedef.write_text(d.modül, encoding="utf-8")
        sist.info(f"Python modülü yazıldı: {hedef}")
        if a.yalnız_derle:
            return 0
        sist.info("─" * 30 + " ÇALIŞMA BAŞLIYOR " + "─" * 30)
        t0 = time.perf_counter()
        çalıştır(d)
        sist.info(f"Program başarıyla tamamlandı. Çalışma süresi: {(time.perf_counter() - t0) * 1000:.2f} ms")
        return 0
    except (DizgeSözcükHatası, DizgeSözdizimHatası, DizgeDerlemeHatası, çekirdek.DizgeÇalışmaHatası) as h:
        tür = {DizgeSözcükHatası: "Sözcük", DizgeSözdizimHatası: "Sözdizim",
               DizgeDerlemeHatası: "Derleme"}.get(type(h), "Çalışma")
        logging.getLogger("dizge.sistem").error(f"{tür} hatası — {h}")
        if a.sessiz:
            print(f"HATA ({tür}): {h}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
