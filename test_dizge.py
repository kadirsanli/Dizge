"""Dizge birim ve uçtan uca testleri:  python3 -m unittest -v test_dizge"""
import contextlib
import io
import unittest
from pathlib import Path

import numpy as np

import dizge_cekirdek as ç
from dizge import çalıştır
from dizge_compiler import Derleyici, DizgeDerlemeHatası
from dizge_lexer import Kip, Lexer, Sözlük, Tür
from dizge_parser import Karşılaştırma, Parser, Süzgeç, Tanım, Uygula, Zincir

KÖK = Path(__file__).resolve().parent


def derle(kaynak):
    return Derleyici().derle(Parser().ayrıştır(Lexer().tokenize(kaynak)))


def koş(kaynak):
    with contextlib.redirect_stdout(io.StringIO()) as çıktı:
        ns = çalıştır(derle(kaynak))
    return ns, çıktı.getvalue()


class BiçimbirimTesti(unittest.TestCase):
    def setUp(self):
        self.s = Sözlük()
        for ad in ("eşik", "işlemler", "veri_seti"):
            self.s.ad_ekle(ad)

    def ilk(self, kelime):
        return self.s.çözümle(kelime)[0]

    def test_ilgi_ve_bileşik_ad(self):
        ç_ = self.ilk("veri_setinin")
        self.assertEqual((ç_.kök, ç_.durum), ("veri_seti", "ilgi"))

    def test_ünsüz_yumuşaması(self):
        self.assertEqual(self.ilk("eşiği").kök, "eşik")
        self.assertEqual(self.ilk("küçüğe").kök, "küçük")
        self.assertEqual(self.ilk("uzaklığı").kök, "uzaklık")

    def test_iyelik_artı_belirtme(self):
        ç_ = self.ilk("karekökünü")
        self.assertTrue(ç_.iyelik)
        self.assertEqual(ç_.durum, "belirtme")

    def test_edilgen_çatı(self):
        for k in ("sıralansın", "etiketlensin", "durdurularak"):
            self.assertTrue(self.ilk(k).edilgen, k)
        self.assertFalse(self.ilk("sırala").edilgen)

    def test_kipler(self):
        self.assertEqual(self.ilk("alıp").kip, Kip.ULAÇ_IP)
        self.assertEqual(self.ilk("durdurarak").kip, Kip.ULAÇ_ARAK)
        self.assertEqual(self.ilk("aştığı").kip, Kip.ADFİİL)
        self.assertEqual(self.ilk("aşmazsa").kip, Kip.ŞART)
        self.assertTrue(self.ilk("aşmazsa").olumsuz)
        ç_ = self.ilk("olanların")
        self.assertEqual((ç_.kip, ç_.çoğul, ç_.durum), (Kip.SIFATFİİL, True, "ilgi"))

    def test_sayı_sözcüğü(self):
        ç_ = self.ilk("beşten")
        self.assertEqual((ç_.tür, ç_.bilgi, ç_.durum), (Tür.SAYI_SÖZ, 5, "ayrılma"))

    def test_ekfiil_belirtmeden_sonra_gelmez(self):
        self.assertFalse(any(c.ekfiil and c.durum == "belirtme" for c in self.s.çözümle("eşiğidir")))


class SözdizimTesti(unittest.TestCase):
    def ayrıştır(self, kaynak):
        return Parser().ayrıştır(Lexer().tokenize(kaynak)).cümleler

    def test_tanım_ve_tamlama(self):
        c = self.ayrıştır("v, 1, 2 ve 3 dizisidir. s, v'nin standart sapmasıdır.")[1]
        self.assertIsInstance(c, Tanım)
        self.assertIsInstance(c.değer, Uygula)
        self.assertEqual(c.değer.işlev, "standart_sapma")

    def test_hâl_ekleri_sıradan_bağımsız(self):
        a = self.ayrıştır("a, 5 dizisidir. b, 2 dizisidir. c, a'nın b'den farkıdır.")[2].değer
        self.assertEqual(set(a.argümanlar), {"a", "b"})
        self.assertEqual(a.argümanlar["a"].ad, "a")
        self.assertEqual(a.argümanlar["b"].ad, "b")

    def test_koşul_ve_zincir(self):
        c = self.ayrıştır("t, 10 satırlık rastgele işlem tablosudur. "
                          "t'nin risk puanı doksanı aştığı takdirde t durdurularak raporlansın.")[1]
        self.assertIsInstance(c, Zincir)
        self.assertIsInstance(c.koşul, Karşılaştırma)
        self.assertEqual([h.bağ for h in c.halkalar], ["arak", None])
        self.assertEqual(c.halkalar[0].çatı, "edilgen")

    def test_süzgeç(self):
        c = self.ayrıştır("v, 1, 9 ve 7 dizisidir. v'nin beşten büyüklerini yazdır.")[1]
        self.assertIsInstance(c.halkalar[0].roller["belirtme"], Süzgeç)


class BellekModeliTesti(unittest.TestCase):
    def test_etken_kopya_edilgen_yerinde(self):
        ns, _ = koş("s, 3, 1 ve 2 dizisidir. sı sıralayıp k olarak sakla.")
        self.assertEqual(list(ns["s"]), [3, 1, 2])          # kaynak dokunulmadı
        self.assertEqual(list(ns["k"]), [1, 2, 3])
        self.assertIsNot(ns["s"], ns["k"])

        d = derle("s, 3, 1 ve 2 dizisidir. s sıralansın.")
        ns = {"ç": ç}
        exec(d.adımlar[0].py, ns)
        önce = ns["s"]
        exec(d.adımlar[1].py, ns)
        self.assertIs(ns["s"], önce)                        # aynı nesne, yerinde
        self.assertEqual(list(ns["s"]), [1, 2, 3])
        self.assertEqual(d.istatistik["yerinde"], 1)

    def test_arak_ile_atılan_kopya_uyarısı(self):
        d = derle("t, 10 satırlık rastgele işlem tablosudur. "
                  "t'nin risk puanı doksanı aştığı takdirde t'yi durdurarak raporla.")
        self.assertTrue(any("-arak" in u for u in d.uyarılar))

    def test_sabit_katlama(self):
        d = derle("x, yirmi beşin karekökünün iki katıdır.")
        self.assertEqual(d.adımlar[0].py, "x = 10.0")
        self.assertEqual(d.istatistik["sabit_katlama"], 1)


class HataMesajıTesti(unittest.TestCase):
    def test_tanımsız_ad_önerisi(self):
        with self.assertRaisesRegex(DizgeDerlemeHatası, "sayılar"):
            derle("sayılar, 1 ve 2 dizisidir. sayların ortalamasını raporla.")

    def test_bilinmeyen_nitelik(self):
        with self.assertRaisesRegex(DizgeDerlemeHatası, "satır, tohum"):
            derle("x, 3 renkli rastgele işlem tablosudur.")


class UçtanUçTest(unittest.TestCase):
    def test_hesaplama_dzg(self):
        ns, çıktı = koş((KÖK / "hesaplama.dzg").read_text(encoding="utf-8"))
        tutar = ç.rastgele_işlem_tablo(satır=1000).sütunlar["tutar"]
        μ, σ = tutar.mean(), tutar.std(ddof=1)
        beklenen = np.abs(tutar - μ) > 2 * σ
        self.assertAlmostEqual(ns["sapma"], σ)
        self.assertEqual(int((ns["işlemler"].sütunlar["durum"] == "Anormal").sum()), int(beklenen.sum()))
        self.assertIsInstance(ns["anormaller"], ç.Matris)
        self.assertEqual(ns["anormaller"].şekil[0], int(beklenen.sum()))
        self.assertTrue(np.all(np.abs(ns["anormaller"].veri[:, 2] - μ) > 2 * σ))
        self.assertIn("RAPOR ▸ sapma", çıktı)

    def test_tüm_örnekler_çalışır(self):
        for yol in sorted((KÖK / "ornekler").glob("*.dzg")):
            with self.subTest(yol.name):
                koş(yol.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
