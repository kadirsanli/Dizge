"use strict";
var DizgeHTML = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // dizge.js
  var require_dizge = __commonJS({
    "dizge.js"(exports, module) {
      (function(kök, üretici) {
        if (typeof module === "object" && module.exports) module.exports = üretici();
        else kök.Dizge = üretici();
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const sürüm = "0.3.0";
        const kendi = (nesne, anahtar) => Object.prototype.hasOwnProperty.call(nesne, anahtar);
        const kayıt = (girdiler) => Object.fromEntries(girdiler);
        const sonlu = (x) => typeof x === "number" && Number.isFinite(x);
        const tamsayı = (n, enAz = 1) => {
          if (!Number.isSafeInteger(n) || n < enAz) throw new RangeError("En az " + enAz + " olan bir tam sayı bekleniyor");
          return n;
        };
        const alan = (anahtar) => typeof anahtar === "function" ? anahtar : (satır) => kendi(satır, anahtar) ? satır[anahtar] : void 0;
        const iptal = (sinyal) => {
          if (sinyal?.aborted) throw sinyal.reason || new DOMException("İptal edildi", "AbortError");
        };
        const seçenekÇöz = (seçenekler = {}, eşleme = {}) => {
          const sonuç = { ...seçenekler };
          for (const [türkçe, ingilizce] of Object.entries(eşleme)) if (sonuç[türkçe] === void 0 && sonuç[ingilizce] !== void 0) sonuç[türkçe] = sonuç[ingilizce];
          return sonuç;
        };
        function özet(değerler) {
          let sayı = 0, eksik = 0, ortalama = 0, m2 = 0, toplam = 0, düzeltme = 0, enKüçük = Infinity, enBüyük = -Infinity;
          for (const x of değerler) {
            if (!sonlu(x)) {
              eksik++;
              continue;
            }
            sayı++;
            const fark = x - ortalama;
            ortalama += fark / sayı;
            m2 += fark * (x - ortalama);
            const y = x - düzeltme, t = toplam + y;
            düzeltme = t - toplam - y;
            toplam = t;
            enKüçük = Math.min(enKüçük, x);
            enBüyük = Math.max(enBüyük, x);
          }
          const ortalamaDeğer = sayı ? ortalama : null, enKüçükDeğer = sayı ? enKüçük : null, enBüyükDeğer = sayı ? enBüyük : null;
          const varyans = sayı ? Math.max(0, m2 / sayı) : null;
          const standartSapma = varyans === null ? null : Math.sqrt(varyans);
          const örnekVaryans = sayı > 1 ? Math.max(0, m2 / (sayı - 1)) : null;
          return {
            sayı,
            eksik,
            toplam,
            ortalama: ortalamaDeğer,
            enKüçük: enKüçükDeğer,
            enBüyük: enBüyükDeğer,
            varyans,
            standartSapma,
            örnekVaryans,
            count: sayı,
            missing: eksik,
            sum: toplam,
            mean: ortalamaDeğer,
            min: enKüçükDeğer,
            max: enBüyükDeğer,
            variance: varyans,
            std: standartSapma,
            sampleVariance: örnekVaryans
          };
        }
        function yüzdelik(değerler, p = 0.5) {
          if (!sonlu(p) || p < 0 || p > 1) throw new RangeError("p [0, 1] aralığında olmalıdır");
          const dizi = Array.from(değerler).filter(sonlu).sort((a, b) => a - b);
          if (!dizi.length) return null;
          const i = (dizi.length - 1) * p, alt = Math.floor(i);
          return dizi[alt] + (dizi[Math.ceil(i)] - dizi[alt]) * (i - alt);
        }
        function regresyon(xs, ys) {
          if (xs.length !== ys.length) throw new RangeError("Eşit uzunlukta girdiler gerekir");
          let sayı = 0, mx = 0, my = 0, xx = 0, yy = 0, xy = 0;
          for (let i = 0; i < xs.length; i++) {
            const x = xs[i], y = ys[i];
            if (!sonlu(x) || !sonlu(y)) continue;
            sayı++;
            const dx = x - mx, dy = y - my;
            mx += dx / sayı;
            my += dy / sayı;
            xx += dx * (x - mx);
            yy += dy * (y - my);
            xy += dx * (y - my);
          }
          const eğim = sayı > 1 && xx > 0 ? xy / xx : null;
          const r = xx > 0 && yy > 0 ? Math.max(-1, Math.min(1, xy / Math.sqrt(xx * yy))) : null;
          const kesişim = eğim === null ? null : my - eğim * mx;
          return { sayı, eğim, kesişim, r, r2: r === null ? null : r * r, count: sayı, slope: eğim, intercept: kesişim };
        }
        function histogram(değerler, kutu = 10) {
          tamsayı(kutu);
          if (kutu > 1e4) throw new RangeError("En çok 10000 kutu kullanılabilir");
          const dizi = Array.from(değerler).filter(sonlu), s = özet(dizi);
          if (!s.sayı) return [];
          const genişlik = s.enKüçük === s.enBüyük ? 1 : (s.enBüyük - s.enKüçük) / kutu;
          const sonuç = Array.from({ length: s.enKüçük === s.enBüyük ? 1 : kutu }, (_, i) => ({ enAz: s.enKüçük + i * genişlik, enÇok: s.enKüçük + (i + 1) * genişlik, sayı: 0, min: s.enKüçük + i * genişlik, max: s.enKüçük + (i + 1) * genişlik, count: 0 }));
          for (const x of dizi) {
            const kutuNo = Math.min(sonuç.length - 1, Math.floor((x - s.enKüçük) / genişlik));
            sonuç[kutuNo].sayı++;
            sonuç[kutuNo].count++;
          }
          return sonuç;
        }
        function karşılaştır(a, b) {
          if (Object.is(a, b)) return 0;
          if (a == null || typeof a === "number" && !sonlu(a)) return 1;
          if (b == null || typeof b === "number" && !sonlu(b)) return -1;
          return typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
        }
        class Tablo {
          constructor(satırlar) {
            if (!Array.isArray(satırlar) || satırlar.some((s) => !s || typeof s !== "object" || Array.isArray(s))) throw new TypeError("Kayıt dizisi bekleniyor");
            this._satırlar = satırlar.slice();
          }
          get uzunluk() {
            return this._satırlar.length;
          }
          diziye() {
            return this._satırlar.slice();
          }
          sütunlar() {
            return [...new Set(this._satırlar.flatMap(Object.keys))];
          }
          sütun(anahtar) {
            return this._satırlar.map(alan(anahtar));
          }
          süz(fn) {
            return new Tablo(this._satırlar.filter(fn));
          }
          seç(...anahtarlar) {
            return new Tablo(this._satırlar.map((satır) => kayıt(anahtarlar.map((k) => [k, alan(k)(satır)]))));
          }
          türet(tanımlar) {
            return new Tablo(this._satırlar.map((satır, i) => ({ ...satır, ...kayıt(Object.entries(tanımlar).map(([k, fn]) => [k, fn(satır, i)])) })));
          }
          sırala(anahtar, yön = "asc") {
            if (!["asc", "desc"].includes(yön)) throw new TypeError("yön: asc | desc");
            const al = alan(anahtar), işaret = yön === "asc" ? 1 : -1;
            return new Tablo(this._satırlar.slice().sort((a, b) => işaret * karşılaştır(al(a), al(b))));
          }
          dilimle(baş, son) {
            return new Tablo(this._satırlar.slice(baş, son));
          }
          sayfala(sayı = 1, boy = 25) {
            tamsayı(sayı);
            tamsayı(boy);
            return this.dilimle((sayı - 1) * boy, sayı * boy);
          }
          tekil(anahtar) {
            const görülen = /* @__PURE__ */ new Set(), al = alan(anahtar);
            return this.süz((satır) => {
              const k = al(satır);
              if (görülen.has(k)) return false;
              görülen.add(k);
              return true;
            });
          }
          grupla(...anahtarlar) {
            if (!anahtarlar.length) throw new TypeError("En az bir grup anahtarı gerekir");
            const kök = /* @__PURE__ */ new Map(), gruplar = [];
            for (const satır of this._satırlar) {
              let harita = kök;
              anahtarlar.forEach((anahtar, i) => {
                const değer = alan(anahtar)(satır);
                if (!harita.has(değer)) {
                  if (i === anahtarlar.length - 1) {
                    const grup = { anahtarlar: kayıt(anahtarlar.map((k) => [k, alan(k)(satır)])), satırlar: [] };
                    harita.set(değer, grup);
                    gruplar.push(grup);
                  } else harita.set(değer, /* @__PURE__ */ new Map());
                }
                if (i === anahtarlar.length - 1) harita.get(değer).satırlar.push(satır);
                else harita = harita.get(değer);
              });
            }
            const sonuç = {
              özetle: (indirgeyiciler) => new Tablo(gruplar.map((g) => ({ ...g.anahtarlar, ...satırlarıİndirge(g.satırlar, indirgeyiciler) }))),
              girdiler: () => gruplar.map((g) => ({ anahtarlar: { ...g.anahtarlar }, tablo: new Tablo(g.satırlar), keys: { ...g.anahtarlar }, table: new Tablo(g.satırlar) }))
            };
            sonuç.aggregate = sonuç.özetle;
            sonuç.entries = sonuç.girdiler;
            return sonuç;
          }
          özetle(indirgeyiciler) {
            return satırlarıİndirge(this._satırlar, indirgeyiciler);
          }
          betimle(...anahtarlar) {
            return kayıt((anahtarlar.length ? anahtarlar : this.sütunlar()).map((k) => [k, özet(this.sütun(k))]));
          }
          birleştir(diğeri, seçenekler = {}) {
            const sol = seçenekler.sol ?? seçenekler.left;
            const sağ = seçenekler.sağ ?? seçenekler.right ?? sol;
            const tür = seçenekler.tür ?? seçenekler.how ?? "inner";
            const sonEk = seçenekler.sonEk ?? seçenekler.suffix ?? "_right";
            const enÇokSatır = seçenekler.enÇokSatır ?? seçenekler.maxRows ?? 1e6;
            if (!["inner", "left"].includes(tür) || !sol) throw new TypeError("Birleştirme sol anahtar ve inner/left türü ister");
            tamsayı(enÇokSatır);
            const satırlar = diğeri instanceof Tablo ? diğeri._satırlar : new Tablo(diğeri)._satırlar, dizin = /* @__PURE__ */ new Map(), sonuç = [];
            for (const satır of satırlar) {
              const k = alan(sağ)(satır);
              if (k == null) continue;
              if (!dizin.has(k)) dizin.set(k, []);
              dizin.get(k).push(satır);
            }
            for (const satır of this._satırlar) {
              const eşleşmeler = dizin.get(alan(sol)(satır));
              for (const eşleşme of eşleşmeler || (tür === "left" ? [null] : [])) {
                if (sonuç.length >= enÇokSatır) throw new RangeError("Birleştirme çıktısı enÇokSatır sınırını aşıyor");
                const çıktı = { ...satır };
                if (eşleşme) for (const [k, v] of Object.entries(eşleşme)) {
                  if (k === sağ && sol === sağ) continue;
                  const hedef = kendi(çıktı, k) ? k + sonEk : k;
                  if (kendi(çıktı, hedef)) throw new Error("Birleştirme sütunu çakışması: " + hedef);
                  Object.defineProperty(çıktı, hedef, { value: v, enumerable: true, writable: true, configurable: true });
                }
                sonuç.push(çıktı);
              }
            }
            return new Tablo(sonuç);
          }
        }
        Object.defineProperty(Tablo.prototype, "length", { get() {
          return this.uzunluk;
        } });
        Tablo.prototype.toArray = Tablo.prototype.diziye;
        Tablo.prototype.columns = Tablo.prototype.sütunlar;
        Tablo.prototype.column = Tablo.prototype.sütun;
        Tablo.prototype.filter = Tablo.prototype.süz;
        Tablo.prototype.select = Tablo.prototype.seç;
        Tablo.prototype.derive = Tablo.prototype.türet;
        Tablo.prototype.sort = Tablo.prototype.sırala;
        Tablo.prototype.slice = Tablo.prototype.dilimle;
        Tablo.prototype.page = Tablo.prototype.sayfala;
        Tablo.prototype.unique = Tablo.prototype.tekil;
        Tablo.prototype.groupBy = Tablo.prototype.grupla;
        Tablo.prototype.aggregate = Tablo.prototype.özetle;
        Tablo.prototype.describe = Tablo.prototype.betimle;
        Tablo.prototype.join = Tablo.prototype.birleştir;
        function satırlarıİndirge(satırlar, indirgeyiciler) {
          return kayıt(Object.entries(indirgeyiciler).map(([ad, fn]) => [ad, fn(new Tablo(satırlar))]));
        }
        const veri = (satırlar) => new Tablo(satırlar);
        const istatistik = {
          özet,
          yüzdelik,
          ortanca: (değerler) => yüzdelik(değerler),
          histogram,
          regresyon,
          korelasyon: (xs, ys) => regresyon(xs, ys).r
        };
        Object.assign(istatistik, {
          summary: istatistik.özet,
          quantile: istatistik.yüzdelik,
          median: istatistik.ortanca,
          regression: istatistik.regresyon,
          correlation: istatistik.korelasyon
        });
        function csvÇöz(metin, seçenekler = {}) {
          if (typeof metin !== "string") throw new TypeError("CSV girdisi metin olmalıdır");
          const ayırıcı = seçenekler.ayırıcı ?? seçenekler.delimiter ?? ",";
          const başlık = seçenekler.başlık ?? seçenekler.header ?? true;
          const enÇokSatır = seçenekler.enÇokSatır ?? seçenekler.maxRows ?? 1e6;
          if (ayırıcı.length !== 1 || /["\r\n]/.test(ayırıcı)) throw new TypeError("Geçersiz ayırıcı");
          tamsayı(enÇokSatır);
          metin = metin.replace(/^\uFEFF/, "");
          if (!metin) return [];
          const satırlar = [];
          let satır = [], hücre = "", tırnaklı = false, kapandı = false;
          function satırEkle() {
            satır.push(hücre);
            satırlar.push(satır);
            if (satırlar.length > enÇokSatır + (başlık ? 1 : 0)) throw new RangeError("CSV enÇokSatır sınırını aşıyor");
            satır = [];
            hücre = "";
            kapandı = false;
          }
          for (let i = 0; i < metin.length; i++) {
            const c = metin[i];
            if (tırnaklı) {
              if (c === '"') {
                if (metin[i + 1] === '"') {
                  hücre += '"';
                  i++;
                } else {
                  tırnaklı = false;
                  kapandı = true;
                }
              } else hücre += c;
              continue;
            }
            if (c === ayırıcı) {
              satır.push(hücre);
              hücre = "";
              kapandı = false;
            } else if (c === "\n" || c === "\r") {
              if (c === "\r" && metin[i + 1] === "\n") i++;
              satırEkle();
            } else if (c === '"' && !hücre && !kapandı) tırnaklı = true;
            else {
              if (kapandı || c === '"') throw new SyntaxError("Bozuk tırnaklı CSV hücresi");
              hücre += c;
            }
          }
          if (tırnaklı) throw new SyntaxError("Kapanmayan CSV tırnağı");
          if (hücre || satır.length || kapandı || !/[\r\n]$/.test(metin)) satırEkle();
          if (!başlık) return satırlar;
          const anahtarlar = satırlar.shift();
          if (new Set(anahtarlar).size !== anahtarlar.length) throw new Error("Yinelenen CSV başlığı");
          return satırlar.map((r, i) => {
            if (r.length !== anahtarlar.length) throw new Error("CSV sütun sayısı " + (i + 2) + ". satırda tutarsız");
            return kayıt(anahtarlar.map((k, j) => [k, r[j]]));
          });
        }
        function csvYaz(satırlar, seçenekler = {}) {
          const ayırıcı = seçenekler.ayırıcı ?? seçenekler.delimiter ?? ",";
          const güvenli = seçenekler.güvenli ?? seçenekler.safe ?? true;
          if (ayırıcı.length !== 1 || /["\r\n]/.test(ayırıcı)) throw new TypeError("Geçersiz ayırıcı");
          const tablo = veri(satırlar), sütunlar = seçenekler.sütunlar ?? seçenekler.columns ?? tablo.sütunlar();
          const kaçır = (değer) => {
            let s = değer == null ? "" : String(değer);
            if (güvenli && typeof değer === "string" && /^[\s]*[=+@-]/.test(s)) s = "'" + s;
            return /["\r\n]/.test(s) || s.includes(ayırıcı) ? '"' + s.replace(/"/g, '""') + '"' : s;
          };
          return [sütunlar, ...satırlar.map((satır) => sütunlar.map((anahtar) => kendi(satır, anahtar) ? satır[anahtar] : ""))].map((satır) => satır.map(kaçır).join(ayırıcı)).join("\r\n");
        }
        const csv = { çöz: csvÇöz, yaz: csvYaz, parse: csvÇöz, stringify: csvYaz };
        const bağlayıcılar = /* @__PURE__ */ new Map(), yükleniyor = /* @__PURE__ */ new Map();
        function yapılandır(değerler) {
          for (const [ad, değer] of Object.entries(değerler)) {
            bağlayıcılar.set(ad, değer);
            yükleniyor.delete(ad);
          }
        }
        async function bağlayıcıAl(ad) {
          if (!bağlayıcılar.has(ad)) throw new Error("Önce " + ad + " bağlayıcısını yapılandırın: Dizge.yapılandır({ " + ad + ": kütüphaneVeyaYükleyici })");
          if (!yükleniyor.has(ad)) {
            const değer = bağlayıcılar.get(ad);
            const söz = Promise.resolve().then(() => typeof değer === "function" ? değer() : değer).then((x) => x?.default || x);
            yükleniyor.set(ad, söz);
            söz.catch(() => {
              if (yükleniyor.get(ad) === söz) yükleniyor.delete(ad);
            });
          }
          return yükleniyor.get(ad);
        }
        async function baytlara(girdi, enÇokBayt = 50 * 1024 * 1024) {
          tamsayı(enÇokBayt);
          if (girdi?.size > enÇokBayt || girdi?.byteLength > enÇokBayt) throw new RangeError("Dosya enÇokBayt sınırını aşıyor");
          if (girdi && typeof girdi.arrayBuffer === "function") girdi = await girdi.arrayBuffer();
          const çıktı = girdi instanceof ArrayBuffer ? new Uint8Array(girdi) : ArrayBuffer.isView(girdi) ? new Uint8Array(girdi.buffer, girdi.byteOffset, girdi.byteLength) : null;
          if (!çıktı) throw new TypeError("Dosya, Blob, ArrayBuffer veya tipli dizi bekleniyor");
          if (çıktı.byteLength > enÇokBayt) throw new RangeError("Dosya enÇokBayt sınırını aşıyor");
          return çıktı;
        }
        function indir(içerik, dosyaAdı, tür = "application/octet-stream") {
          const adres = URL.createObjectURL(içerik instanceof Blob ? içerik : new Blob([içerik], { type: tür }));
          const bağ = document.createElement("a");
          bağ.href = adres;
          bağ.download = dosyaAdı;
          document.body.append(bağ);
          bağ.click();
          bağ.remove();
          setTimeout(() => URL.revokeObjectURL(adres), 1e3);
        }
        const xlsx = {
          async oku(girdi, seçenekler = {}) {
            const sayfa = seçenekler.sayfa ?? seçenekler.sheet;
            const enÇokBayt = seçenekler.enÇokBayt ?? seçenekler.maxBytes;
            const enÇokSatır = seçenekler.enÇokSatır ?? seçenekler.maxRows ?? 1e5;
            const sinyal = seçenekler.sinyal ?? seçenekler.signal;
            tamsayı(enÇokSatır);
            iptal(sinyal);
            const kütüphane = await bağlayıcıAl("xlsx"), tampon = await baytlara(girdi, enÇokBayt);
            iptal(sinyal);
            const kitap = kütüphane.read(tampon, { type: "array", sheetRows: enÇokSatır + 2, cellDates: true, cellFormula: false, bookVBA: false });
            const ad = sayfa ?? kitap.SheetNames[0];
            if (!kitap.Sheets[ad]) throw new Error("Bilinmeyen sayfa: " + ad);
            const çalışma = kitap.Sheets[ad];
            if (çalışma["!fullref"]) throw new RangeError("Sayfa enÇokSatır (maxRows) sınırını aşıyor");
            const satırlar = kütüphane.utils.sheet_to_json(çalışma, { defval: null });
            if (satırlar.length > enÇokSatır) throw new RangeError("Sayfa enÇokSatır (maxRows) sınırını aşıyor");
            iptal(sinyal);
            return { sheets: kitap.SheetNames.slice(), sheet: ad, sayfalar: kitap.SheetNames.slice(), sayfa: ad, rows: satırlar, satırlar };
          },
          async yaz(sayfalar) {
            const kütüphane = await bağlayıcıAl("xlsx"), kitap = kütüphane.utils.book_new();
            if (!Object.keys(sayfalar).length) throw new Error("En az bir sayfa gerekir");
            for (const [ad, satırlar] of Object.entries(sayfalar)) {
              if (!ad || ad.length > 31 || /[\\/?*\[\]:]/.test(ad)) throw new Error("Geçersiz sayfa adı: " + ad);
              veri(satırlar);
              for (const satır of satırlar) for (const değer of Object.values(satır)) {
                if (değer != null && !["string", "number", "boolean"].includes(typeof değer) && !(değer instanceof Date)) throw new TypeError("XLSX hücreleri skaler değer veya tarih olmalıdır");
                if (typeof değer === "number" && !sonlu(değer)) throw new TypeError("XLSX sayıları sonlu olmalıdır");
                if (değer instanceof Date && !sonlu(değer.getTime())) throw new TypeError("Geçersiz XLSX tarihi");
              }
              kütüphane.utils.book_append_sheet(kitap, kütüphane.utils.json_to_sheet(satırlar), ad);
            }
            return new Uint8Array(kütüphane.write(kitap, { type: "array", bookType: "xlsx", compression: true }));
          }
        };
        xlsx.read = xlsx.oku;
        xlsx.write = xlsx.yaz;
        const pdf = {
          async metin(girdi, seçenekler = {}) {
            const enÇokBayt = seçenekler.enÇokBayt ?? seçenekler.maxBytes;
            const enÇokSayfa = seçenekler.enÇokSayfa ?? seçenekler.maxPages ?? 1e3;
            const sinyal = seçenekler.sinyal ?? seçenekler.signal;
            const parola = seçenekler.parola ?? seçenekler.password;
            tamsayı(enÇokSayfa);
            iptal(sinyal);
            const kütüphane = await bağlayıcıAl("pdfjs"), tampon = await baytlara(girdi, enÇokBayt);
            iptal(sinyal);
            const görev = kütüphane.getDocument({ data: tampon.slice(), password: parola, isEvalSupported: false });
            const iptalEt = () => {
              void görev.destroy();
            };
            sinyal?.addEventListener("abort", iptalEt, { once: true });
            try {
              const belge = await görev.promise;
              if (belge.numPages > enÇokSayfa) throw new RangeError("PDF enÇokSayfa (maxPages) sınırını aşıyor");
              const sayfalar = [];
              for (let i = 1; i <= belge.numPages; i++) {
                iptal(sinyal);
                const sayfa = await belge.getPage(i), içerik = await sayfa.getTextContent();
                sayfalar.push(içerik.items.map((x) => (x.str || "") + (x.hasEOL ? "\n" : " ")).join("").trim());
                sayfa.cleanup();
              }
              return { pages: sayfalar, text: sayfalar.join("\n\n"), sayfalar, metin: sayfalar.join("\n\n") };
            } finally {
              sinyal?.removeEventListener("abort", iptalEt);
              await görev.destroy();
            }
          },
          async rapor(seçenekler = {}) {
            const başlık = seçenekler.başlık ?? seçenekler.title ?? "Rapor";
            const satırlar = seçenekler.satırlar ?? seçenekler.lines ?? [];
            const veriSatırları = seçenekler.veriSatırları ?? seçenekler.rows ?? [];
            const sütunlar = seçenekler.sütunlar ?? seçenekler.columns;
            const yazıTipiBaytları = seçenekler.yazıTipiBaytları ?? seçenekler.fontBytes;
            const yazıBoyu = seçenekler.yazıBoyu ?? seçenekler.fontSize ?? 11;
            const kenarBoşluğu = seçenekler.kenarBoşluğu ?? seçenekler.margin ?? 44;
            if (!sonlu(yazıBoyu) || yazıBoyu < 6 || yazıBoyu > 36 || !sonlu(kenarBoşluğu) || kenarBoşluğu < 10 || kenarBoşluğu > 150) throw new RangeError("Geçersiz PDF yerleşimi");
            const kütüphane = await bağlayıcıAl("pdf"), belge = await kütüphane.PDFDocument.create();
            if (yazıTipiBaytları) belge.registerFontkit(await bağlayıcıAl("fontkit"));
            const yazıTipi = await belge.embedFont(yazıTipiBaytları ? await baytlara(yazıTipiBaytları) : kütüphane.StandardFonts.Helvetica);
            let sayfa, y;
            const yükseklik = 841.89, genişlik = 595.28, satırYüksekliği = yazıBoyu * 1.5;
            function yeniSayfa() {
              sayfa = belge.addPage([genişlik, yükseklik]);
              y = yükseklik - kenarBoşluğu;
            }
            yeniSayfa();
            function yaz(satır) {
              if (y < kenarBoşluğu + satırYüksekliği) yeniSayfa();
              sayfa.drawText(satır, { x: kenarBoşluğu, y: y - yazıBoyu, size: yazıBoyu, font: yazıTipi });
              y -= satırYüksekliği;
            }
            function sar(değer) {
              for (const paragraf of String(değer).split(/\r?\n/)) {
                let satır = "";
                for (const karakter of paragraf) {
                  if (yazıTipi.widthOfTextAtSize(satır + karakter, yazıBoyu) > genişlik - kenarBoşluğu * 2) {
                    yaz(satır);
                    satır = karakter;
                  } else satır += karakter;
                }
                yaz(satır);
              }
            }
            sar(başlık);
            yaz("");
            satırlar.forEach(sar);
            if (veriSatırları.length) {
              const anahtarlar = sütunlar || veri(veriSatırları).sütunlar();
              sar(anahtarlar.join(" | "));
              for (const satır of veriSatırları) sar(anahtarlar.map((k) => alan(k)(satır) ?? "").join(" | "));
            }
            belge.setTitle(başlık);
            belge.setCreator("Dizge.js");
            return belge.save();
          },
          async birleştir(girdiler, seçenekler = {}) {
            const enÇokBayt = seçenekler.enÇokBayt ?? seçenekler.maxBytes;
            if (!girdiler.length) throw new Error("En az bir PDF gerekir");
            const kütüphane = await bağlayıcıAl("pdf"), çıktı = await kütüphane.PDFDocument.create();
            for (const girdi of girdiler) {
              const belge = await kütüphane.PDFDocument.load(await baytlara(girdi, enÇokBayt));
              for (const sayfa of await çıktı.copyPages(belge, belge.getPageIndices())) çıktı.addPage(sayfa);
            }
            return çıktı.save();
          }
        };
        pdf.text = pdf.metin;
        pdf.report = pdf.rapor;
        pdf.merge = pdf.birleştir;
        function depo(başlangıç) {
          let durum = başlangıç, sırada = false, yokEdildi = false;
          const aboneler = /* @__PURE__ */ new Set();
          function boşalt() {
            sırada = false;
            if (!yokEdildi) for (const fn of [...aboneler]) fn(durum);
          }
          const sonuç = {
            al: () => durum,
            ayarla(sonraki) {
              if (yokEdildi) throw new Error("Depo kapatıldı");
              const değer = typeof sonraki === "function" ? sonraki(durum) : sonraki;
              if (Object.is(değer, durum)) return;
              durum = değer;
              if (!sırada) {
                sırada = true;
                queueMicrotask(boşalt);
              }
            },
            aboneOl(fn, hemen = true) {
              if (yokEdildi) throw new Error("Depo kapatıldı");
              aboneler.add(fn);
              if (hemen) fn(durum);
              return () => aboneler.delete(fn);
            },
            yokEt() {
              yokEdildi = true;
              aboneler.clear();
            }
          };
          sonuç.get = sonuç.al;
          sonuç.set = sonuç.ayarla;
          sonuç.subscribe = sonuç.aboneOl;
          sonuç.destroy = sonuç.yokEt;
          return sonuç;
        }
        function geciktir(fn, gecikme = 150) {
          let zamanlayıcı;
          const sarmal = (...args) => {
            clearTimeout(zamanlayıcı);
            zamanlayıcı = setTimeout(() => fn(...args), gecikme);
          };
          sarmal.iptal = () => clearTimeout(zamanlayıcı);
          sarmal.cancel = sarmal.iptal;
          return sarmal;
        }
        async function parçala(öğeler, fn, seçenekler = {}) {
          const boyut = seçenekler.boyut ?? seçenekler.size ?? 1e3;
          const sinyal = seçenekler.sinyal ?? seçenekler.signal;
          const ilerleme = seçenekler.ilerleme ?? seçenekler.onProgress;
          tamsayı(boyut);
          const sonuç = [];
          for (let baş = 0; baş < öğeler.length; baş += boyut) {
            iptal(sinyal);
            const son = Math.min(öğeler.length, baş + boyut);
            for (let i = baş; i < son; i++) sonuç.push(fn(öğeler[i], i));
            ilerleme?.(son / öğeler.length);
            await new Promise((r) => setTimeout(r, 0));
          }
          iptal(sinyal);
          return sonuç;
        }
        function eşzamansızAnalizEt(satırlar, işlemler, seçenekler = {}) {
          const işçiAdresi = seçenekler.işçiAdresi ?? seçenekler.workerUrl;
          const sinyal = seçenekler.sinyal ?? seçenekler.signal;
          if (!işçiAdresi) return Promise.reject(new Error("işçiAdresi (workerUrl) gerekli"));
          return new Promise((çöz, reddet) => {
            iptal(sinyal);
            const işçi = new Worker(işçiAdresi);
            const bitir = (hata, değer) => {
              işçi.terminate();
              sinyal?.removeEventListener("abort", iptalEt);
              hata ? reddet(hata) : çöz(değer);
            };
            const iptalEt = () => bitir(sinyal.reason || new DOMException("İptal edildi", "AbortError"));
            sinyal?.addEventListener("abort", iptalEt, { once: true });
            işçi.onmessage = (e) => e.data.error ? bitir(new Error(e.data.error)) : bitir(null, e.data.result);
            işçi.onerror = (e) => bitir(new Error(e.message));
            try {
              işçi.postMessage({ rows: satırlar, operations: işlemler });
            } catch (hata) {
              bitir(hata);
            }
          });
        }
        function analizEt(satırlar, işlemler) {
          let tablo = veri(satırlar);
          for (const işlem of işlemler) {
            const tür = işlem.tür ?? işlem.type;
            const anahtar = işlem.anahtar ?? işlem.key;
            const yön = işlem.yön ?? işlem.direction;
            const anahtarlar = işlem.anahtarlar ?? işlem.keys;
            const baş = işlem.baş ?? işlem.start;
            const son = işlem.son ?? işlem.end;
            const işleç = işlem.işleç ?? işlem.operator;
            const değer = işlem.değer ?? işlem.value;
            if (tür === "sort" || tür === "sırala") tablo = tablo.sırala(anahtar, yön);
            else if (tür === "select" || tür === "seç") tablo = tablo.seç(...anahtarlar);
            else if (tür === "slice" || tür === "dilimle") tablo = tablo.dilimle(baş, son);
            else if (tür === "filter" || tür === "süz") {
              const yüklemler = {
                eq: (a, b) => a === b,
                gt: (a, b) => a > b,
                gte: (a, b) => a >= b,
                lt: (a, b) => a < b,
                lte: (a, b) => a <= b,
                contains: (a, b) => String(a ?? "").includes(String(b)),
                eşit: (a, b) => a === b,
                büyük: (a, b) => a > b,
                büyükEşit: (a, b) => a >= b,
                küçük: (a, b) => a < b,
                küçükEşit: (a, b) => a <= b,
                içerir: (a, b) => String(a ?? "").includes(String(b))
              };
              if (!kendi(yüklemler, işleç)) throw new Error("Bilinmeyen süzme işleci");
              tablo = tablo.süz((satır) => yüklemler[işleç](alan(anahtar)(satır), değer));
            } else if (tür === "describe" || tür === "betimle") return tablo.betimle(...anahtarlar || []);
            else throw new Error("Bilinmeyen işlem: " + tür);
          }
          return tablo.diziye();
        }
        const analyze = analizEt;
        const analyzeAsync = eşzamansızAnalizEt;
        const stiller = `
  .dz{--dz-bg:#f4f6fb;--dz-panel:#fff;--dz-text:#17243a;--dz-muted:#59677e;--dz-line:#dce3ef;--dz-accent:#364ccc;--dz-soft:#edf0ff;--dz-radius:16px;color:var(--dz-text);background:var(--dz-bg);font:15px/1.55 system-ui,sans-serif;color-scheme:light}
  .dz[data-theme=dark]{--dz-bg:#101521;--dz-panel:#1a2232;--dz-text:#eef2ff;--dz-muted:#aab8d0;--dz-line:#35415a;--dz-accent:#a6b4ff;--dz-soft:#29334d;color-scheme:dark}
  .dz *{box-sizing:border-box}.dz button,.dz input,.dz select{font:inherit}.dz button{cursor:pointer}.dz button:disabled{cursor:default;opacity:.5}.dz :focus-visible{outline:3px solid var(--dz-accent);outline-offset:3px}
  .dz-app{max-width:1280px;margin:auto;padding:clamp(16px,4vw,48px)}.dz-header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:28px}.dz h1{font-size:clamp(28px,4vw,44px);line-height:1.12;letter-spacing:-.04em;margin:8px 0}.dz h2{font-size:18px;margin:0 0 14px}.dz p{margin:8px 0}.dz-muted{color:var(--dz-muted)}.dz-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:18px}.dz-stack{display:grid;gap:20px}.dz-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
  .dz-card{background:var(--dz-panel);border:1px solid var(--dz-line);border-radius:var(--dz-radius);padding:24px;min-width:0;box-shadow:0 8px 28px #17243a06}.dz-metric{font-size:32px;font-weight:700;letter-spacing:-.04em;font-variant-numeric:tabular-nums}.dz-button{border:1px solid var(--dz-line);border-radius:9px;padding:9px 15px;background:var(--dz-panel);color:var(--dz-text)}.dz-button[data-variant=primary]{background:var(--dz-accent);border-color:var(--dz-accent);color:var(--dz-bg)}
  .dz-field{display:grid;gap:6px}.dz-input{min-width:0;width:100%;border:1px solid var(--dz-line);border-radius:9px;padding:10px 12px;background:var(--dz-panel);color:var(--dz-text)}.dz-table-wrap{overflow:auto;max-width:100%;border:1px solid var(--dz-line);border-radius:12px}.dz table{border-collapse:collapse;width:100%;text-align:left;white-space:nowrap}.dz th,.dz td{padding:12px 16px;border-bottom:1px solid var(--dz-line)}.dz th{background:var(--dz-soft);font-size:12px;letter-spacing:.04em}.dz th button{border:0;background:transparent;color:inherit;font:inherit;padding:0}.dz tbody tr:hover{background:var(--dz-soft)}.dz-pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px}.dz-error{color:#bd2439}.dz-badge{display:inline-block;background:var(--dz-soft);color:var(--dz-accent);border-radius:999px;padding:4px 10px;font-size:12px;font-weight:650}.dz-chart{width:100%;height:auto;display:block}.dz dialog{border:1px solid var(--dz-line);border-radius:16px;background:var(--dz-panel);color:var(--dz-text);max-width:min(560px,90vw);padding:28px}.dz dialog::backdrop{background:#10152199}.dz-toast{position:fixed;bottom:24px;right:24px;max-width:calc(100vw - 48px);z-index:1000}.dz-tabs [role=tablist]{display:flex;gap:8px;border-bottom:1px solid var(--dz-line);padding-bottom:12px;margin-bottom:18px}.dz-tabs [aria-selected=true]{background:var(--dz-soft);color:var(--dz-accent)}
  .dz-chart text{font-size:14px}@media(max-width:600px){.dz-header{align-items:flex-start;flex-direction:column}.dz-card{padding:18px}.dz-pagination{flex-wrap:wrap}.dz-chart text{font-size:21px}}@media(prefers-reduced-motion:reduce){.dz *{scroll-behavior:auto!important;animation:none!important}}
  `;
        function stilleriKur({ nonce } = {}) {
          if (document.getElementById("dizge-styles")) return;
          const stil = document.createElement("style");
          stil.id = "dizge-styles";
          if (nonce) stil.nonce = nonce;
          stil.textContent = stiller;
          document.head.append(stil);
        }
        function öğe(etiket, özellikler = {}, ...çocuklar) {
          if (!/^[a-z][a-z0-9-]*$/i.test(etiket) || /^(script|iframe|object|embed|style)$/i.test(etiket)) throw new Error("Desteklenmeyen öğe");
          const düğüm = document.createElement(etiket);
          for (const [anahtar, değer] of Object.entries(özellikler || {})) {
            if (anahtar === "className" || anahtar === "class") düğüm.className = değer;
            else if (anahtar === "text") düğüm.textContent = değer;
            else if (anahtar === "on") {
              for (const [olay, fn] of Object.entries(değer)) düğüm.addEventListener(olay, fn);
            } else if (anahtar === "style") {
              for (const [k, v] of Object.entries(değer)) düğüm.style.setProperty(k, v);
            } else if (/^on/i.test(anahtar) || ["innerHTML", "outerHTML", "srcdoc"].includes(anahtar)) throw new Error("Güvensiz DOM özelliği: " + anahtar);
            else if (["href", "src", "action", "formaction", "xlink:href"].includes(anahtar.toLowerCase())) {
              const adres = new URL(String(değer), document.baseURI);
              if (!["http:", "https:", "mailto:", "tel:", "blob:"].includes(adres.protocol)) throw new Error("Desteklenmeyen URL protokolü");
              düğüm.setAttribute(anahtar, değer);
            } else if (değer != null && değer !== false) {
              if (anahtar === "value" || anahtar === "checked" || anahtar === "selected") düğüm[anahtar] = değer;
              else düğüm.setAttribute(anahtar, değer === true ? "" : String(değer));
            }
          }
          function ekle(çocuk) {
            if (Array.isArray(çocuk)) çocuk.forEach(ekle);
            else if (çocuk != null && çocuk !== false) düğüm.append(çocuk?.nodeType ? çocuk : document.createTextNode(String(çocuk)));
          }
          çocuklar.forEach(ekle);
          return düğüm;
        }
        const düğme = (etiket, tıklama, özellikler = {}) => öğe("button", { type: "button", class: "dz-button", ...özellikler, on: { click: tıklama } }, etiket);
        const kart = (başlık, ...çocuklar) => öğe("section", { class: "dz-card" }, başlık ? öğe("h2", {}, başlık) : null, çocuklar);
        const ölçüt = (etiket, değer, not) => kart(null, öğe("div", { class: "dz-muted" }, etiket), öğe("div", { class: "dz-metric" }, değer), not ? öğe("p", { class: "dz-muted" }, not) : null);
        let kimlik = 0;
        function tabloBileşeni(seçenekler = {}) {
          const s = seçenekÇöz(seçenekler, { satırlar: "rows", sütunlar: "columns", sayfaBoyu: "pageSize", aranabilir: "searchable", etiket: "label", yerel: "locale" });
          const yerel = s.yerel ?? "tr-TR";
          tamsayı(s.sayfaBoyu ?? 25);
          let kaynak = veri(s.satırlar ?? []), süzülmüş = kaynak, sayfa = 1, sıralamaAnahtarı, yön = "asc", sorgu = "";
          const sütunlar = (s.sütunlar ?? kaynak.sütunlar().map((anahtar) => ({ anahtar }))).map((sütun) => ({
            anahtar: sütun.anahtar ?? sütun.key,
            etiket: sütun.etiket ?? sütun.label,
            sıralanabilir: sütun.sıralanabilir ?? sütun.sortable,
            biçimle: sütun.biçimle ?? sütun.format
          }));
          const etiket = s.etiket ?? "Veri tablosu", sayfaBoyu = s.sayfaBoyu ?? 25;
          const kök = öğe("div"), sarmal = öğe("div", { class: "dz-table-wrap", tabindex: "0", "aria-label": etiket }), tablo = öğe("table", {}, öğe("caption", { class: "dz-muted" }, etiket));
          const başlık = öğe("thead"), gövde = öğe("tbody"), durum = öğe("span", { role: "status" });
          tablo.append(başlık, gövde);
          sarmal.append(tablo);
          const önceki = düğme("←", () => {
            sayfa--;
            çiz();
          }, { "aria-label": "Önceki sayfa" });
          const sonraki = düğme("→", () => {
            sayfa++;
            çiz();
          }, { "aria-label": "Sonraki sayfa" });
          const arama = öğe("input", { class: "dz-input", type: "search", placeholder: "Ara", "aria-label": "Tabloda ara" });
          const aramayıGüncelle = geciktir(() => {
            sorgu = arama.value.toLocaleLowerCase(yerel);
            sayfa = 1;
            yenidenHesapla();
          });
          arama.addEventListener("input", aramayıGüncelle);
          if (s.aranabilir !== false) kök.append(öğe("label", { class: "dz-field" }, öğe("span", { class: "dz-muted" }, "Ara"), arama));
          kök.className = "dz-stack";
          kök.append(sarmal, öğe("div", { class: "dz-pagination" }, durum, öğe("div", { class: "dz-row" }, önceki, sonraki)));
          function yenidenHesapla() {
            süzülmüş = sorgu ? kaynak.süz((satır) => sütunlar.some((sütun) => String(alan(sütun.anahtar)(satır) ?? "").toLocaleLowerCase(yerel).includes(sorgu))) : kaynak;
            if (sıralamaAnahtarı) süzülmüş = süzülmüş.sırala(sıralamaAnahtarı, yön);
            çiz();
          }
          function çiz() {
            const sayfalar = Math.max(1, Math.ceil(süzülmüş.uzunluk / sayfaBoyu));
            sayfa = Math.max(1, Math.min(sayfa, sayfalar));
            başlık.replaceChildren(öğe("tr", {}, sütunlar.map((sütun) => öğe(
              "th",
              { scope: "col", "aria-sort": sıralamaAnahtarı === sütun.anahtar ? yön === "asc" ? "ascending" : "descending" : "none" },
              sütun.sıralanabilir === false ? sütun.etiket || sütun.anahtar : düğme((sütun.etiket || sütun.anahtar) + (sıralamaAnahtarı === sütun.anahtar ? yön === "asc" ? " ↑" : " ↓" : ""), () => {
                yön = sıralamaAnahtarı === sütun.anahtar && yön === "asc" ? "desc" : "asc";
                sıralamaAnahtarı = sütun.anahtar;
                yenidenHesapla();
              })
            ))));
            const parça = document.createDocumentFragment();
            for (const satır of süzülmüş.sayfala(sayfa, sayfaBoyu)._satırlar) parça.append(öğe("tr", {}, sütunlar.map((sütun) => öğe("td", {}, sütun.biçimle ? sütun.biçimle(alan(sütun.anahtar)(satır), satır) : alan(sütun.anahtar)(satır) ?? "—"))));
            if (!süzülmüş.uzunluk) parça.append(öğe("tr", {}, öğe("td", { colspan: Math.max(1, sütunlar.length) }, "Sonuç yok")));
            gövde.replaceChildren(parça);
            durum.textContent = `${süzülmüş.uzunluk} kayıt · ${sayfa} / ${sayfalar}`;
            önceki.disabled = sayfa === 1;
            sonraki.disabled = sayfa === sayfalar;
          }
          çiz();
          const sonuç = { el: kök };
          sonuç.satırlarıAyarla = (satırlar) => {
            kaynak = veri(satırlar);
            sayfa = 1;
            yenidenHesapla();
          };
          sonuç.setRows = sonuç.satırlarıAyarla;
          sonuç.yokEt = () => {
            aramayıGüncelle.iptal();
            kök.remove();
          };
          sonuç.destroy = sonuç.yokEt;
          return sonuç;
        }
        function grafik(seçenekler = {}) {
          const s = seçenekÇöz(seçenekler, { değerler: "values", etiketler: "labels", tür: "type", etiket: "label", enÇokNokta: "maxPoints" });
          const değerler = s.değerler ?? [], etiketler = s.etiketler ?? [], tür = s.tür ?? "bar", etiket = s.etiket ?? "Grafik", enÇokNokta = s.enÇokNokta ?? 300;
          if (!["bar", "line"].includes(tür)) throw new Error("Grafik türü: bar | line");
          tamsayı(enÇokNokta);
          if (enÇokNokta > 1e4) throw new RangeError("En çok 10000 grafik noktası kullanılabilir");
          if (değerler.some((v) => !sonlu(v))) throw new TypeError("Grafik değerleri sonlu olmalıdır");
          const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
          svg.setAttribute("viewBox", "0 0 640 240");
          svg.setAttribute("class", "dz-chart");
          svg.setAttribute("role", "img");
          svg.setAttribute("aria-label", etiket);
          const ekle = (tag, nitelikler, metin) => {
            const düğüm = document.createElementNS(ns, tag);
            for (const [k, v] of Object.entries(nitelikler)) düğüm.setAttribute(k, v);
            if (metin != null) düğüm.textContent = metin;
            svg.append(düğüm);
            return düğüm;
          };
          ekle("title", {}, etiket);
          if (!değerler.length) {
            ekle("text", { x: 30, y: 120, fill: "currentColor" }, "Veri yok");
            return svg;
          }
          const adım = Math.ceil(değerler.length / enÇokNokta), örnekler = [];
          for (let i = 0; i < değerler.length; i += adım) örnekler.push({ değer: özet(değerler.slice(i, i + adım)).ortalama, etiket: etiketler[i] ?? String(i + 1) });
          const enKüçük = Math.min(0, ...örnekler.map((x) => x.değer)), enBüyük = Math.max(0, ...örnekler.map((x) => x.değer)), aralık = enBüyük - enKüçük || 1;
          const y = (v) => 195 - (v - enKüçük) / aralık * 165, adımX = 550 / örnekler.length, sıfır = y(0);
          ekle("line", { x1: 55, y1: sıfır, x2: 605, y2: sıfır, stroke: "var(--dz-line)" });
          const eksenEtiketi = (değer) => new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(değer);
          ekle("text", { x: 4, y: 35, fill: "currentColor", "font-size": 11 }, eksenEtiketi(enBüyük));
          ekle("text", { x: 4, y: 195, fill: "currentColor", "font-size": 11 }, eksenEtiketi(enKüçük));
          if (tür === "line") ekle("polyline", { points: örnekler.map((s2, i) => `${55 + adımX * (i + 0.5)},${y(s2.değer)}`).join(" "), fill: "none", stroke: "var(--dz-accent)", "stroke-width": 3 });
          örnekler.forEach((s2, i) => {
            if (tür === "bar") {
              const dikdörtgen = ekle("rect", { x: 55 + adımX * i + adımX * 0.14, y: Math.min(sıfır, y(s2.değer)), width: adımX * 0.72, height: Math.max(0.5, Math.abs(y(s2.değer) - sıfır)), rx: 3, fill: "var(--dz-accent)" });
              const başlık = document.createElementNS(ns, "title");
              başlık.textContent = `${s2.etiket}: ${s2.değer}`;
              dikdörtgen.append(başlık);
            }
            if (i % Math.max(1, Math.ceil(örnekler.length / 6)) === 0) ekle("text", { x: 55 + adımX * (i + 0.5), y: 220, "text-anchor": "middle", fill: "currentColor", "font-size": 11 }, String(s2.etiket).slice(0, 12));
          });
          return svg;
        }
        function form(seçenekler = {}) {
          const s = seçenekÇöz(seçenekler, { alanlar: "fields", gönder: "onSubmit", düğmeMetni: "submitLabel" });
          const alanlar = (s.alanlar ?? []).map((alan2) => ({
            ad: alan2.ad ?? alan2.name,
            etiket: alan2.etiket ?? alan2.label,
            tür: alan2.tür ?? alan2.type ?? "text",
            değer: alan2.değer ?? alan2.value,
            zorunlu: alan2.zorunlu ?? alan2.required,
            enAz: alan2.enAz ?? alan2.min,
            enÇok: alan2.enÇok ?? alan2.max,
            adım: alan2.adım ?? alan2.step,
            seçenekler: alan2.seçenekler ?? alan2.options,
            doğrula: alan2.doğrula ?? alan2.validate
          }));
          const denetimler = /* @__PURE__ */ new Map(), kök = öğe("form", { class: "dz-stack" }), hata = öğe("div", { class: "dz-error", role: "alert" });
          let yokEdildi = false;
          for (const alan2 of alanlar) {
            if (denetimler.has(alan2.ad)) throw new Error("Yinelenen alan: " + alan2.ad);
            const kimlikNo = "dz-field-" + ++kimlik;
            const özellikler = { id: kimlikNo, name: alan2.ad, class: "dz-input", required: !!alan2.zorunlu, value: alan2.değer ?? "", min: alan2.enAz, max: alan2.enÇok, step: alan2.adım };
            const girdi = alan2.seçenekler ? öğe("select", özellikler, alan2.seçenekler.map((v) => öğe("option", { value: v }, v))) : öğe("input", { ...özellikler, type: alan2.tür });
            if (alan2.seçenekler && alan2.değer != null) girdi.value = alan2.değer;
            denetimler.set(alan2.ad, { girdi, alan: alan2 });
            kök.append(öğe("label", { class: "dz-field", for: kimlikNo }, alan2.etiket || alan2.ad, girdi));
          }
          const gönder = öğe("button", { type: "submit", class: "dz-button", "data-variant": "primary" }, s.düğmeMetni ?? "Kaydet");
          kök.append(hata, gönder);
          kök.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (gönder.disabled || !kök.reportValidity()) return;
            const girdiler = [];
            hata.textContent = "";
            for (const [ad, { girdi, alan: alan2 }] of denetimler) {
              const değer = alan2.tür === "number" ? girdi.value === "" ? null : Number(girdi.value) : girdi.value;
              const mesaj = alan2.doğrula?.(değer);
              if (mesaj) {
                hata.textContent = mesaj;
                girdi.focus();
                return;
              }
              girdiler.push([ad, değer]);
            }
            gönder.disabled = true;
            try {
              await s.gönder?.(kayıt(girdiler));
            } catch (hataNesnesi) {
              if (!yokEdildi) hata.textContent = hataNesnesi.message || String(hataNesnesi);
            } finally {
              if (!yokEdildi) gönder.disabled = false;
            }
          });
          const sonuç = { el: kök };
          sonuç.yokEt = () => {
            yokEdildi = true;
            kök.remove();
          };
          sonuç.destroy = sonuç.yokEt;
          return sonuç;
        }
        function sekmeler(öğeler) {
          if (!öğeler.length) throw new Error("En az bir sekme gerekir");
          const kök = öğe("div", { class: "dz-tabs" }), gezinme = öğe("div", { role: "tablist", "aria-label": "Bölümler" }), paneller = [], düğmeler = [];
          function seç(i, odakla = false) {
            düğmeler.forEach((b, j) => {
              b.setAttribute("aria-selected", String(i === j));
              b.tabIndex = i === j ? 0 : -1;
              paneller[j].hidden = i !== j;
            });
            if (odakla) düğmeler[i].focus();
          }
          öğeler.forEach((öğeVerisi, i) => {
            const kimlikNo = "dz-tab-" + ++kimlik;
            const panel = öğe("section", { id: kimlikNo + "-panel", role: "tabpanel", "aria-labelledby": kimlikNo, tabindex: "0" }, öğeVerisi.içerik ?? öğeVerisi.content);
            const düğmeVerisi = düğme(öğeVerisi.etiket ?? öğeVerisi.label, () => seç(i), { id: kimlikNo, role: "tab", "aria-controls": kimlikNo + "-panel" });
            düğmeVerisi.addEventListener("keydown", (e) => {
              const sonraki = e.key === "ArrowRight" ? (i + 1) % öğeler.length : e.key === "ArrowLeft" ? (i - 1 + öğeler.length) % öğeler.length : e.key === "Home" ? 0 : e.key === "End" ? öğeler.length - 1 : -1;
              if (sonraki >= 0) {
                e.preventDefault();
                seç(sonraki, true);
              }
            });
            paneller.push(panel);
            düğmeler.push(düğmeVerisi);
            gezinme.append(düğmeVerisi);
          });
          kök.append(gezinme, ...paneller);
          seç(0);
          return kök;
        }
        function pencere(seçenekler = {}) {
          const s = seçenekÇöz(seçenekler, { başlık: "title", içerik: "content", üst: "parent" });
          const öncekiOdak = document.activeElement, kimlikNo = "dz-dialog-" + ++kimlik;
          const kutu = öğe("dialog", { "aria-labelledby": kimlikNo }, öğe("h2", { id: kimlikNo }, s.başlık), s.içerik);
          const kapat = () => {
            kutu.close();
            kutu.remove();
            öncekiOdak?.focus();
          };
          kutu.append(düğme("Kapat", kapat));
          kutu.addEventListener("cancel", (e) => {
            e.preventDefault();
            kapat();
          });
          (s.üst ?? document.body).append(kutu);
          kutu.showModal();
          return { el: kutu, close: kapat, kapat };
        }
        function bildirim(mesaj, seçenekler = {}) {
          const s = seçenekÇöz(seçenekler, { üst: "parent", süre: "duration" });
          const düğüm = öğe("div", { class: "dz dz-card dz-toast", role: "status" }, mesaj);
          (s.üst ?? document.body).append(düğüm);
          const zamanlayıcı = setTimeout(() => düğüm.remove(), s.süre ?? 4e3);
          return () => {
            clearTimeout(zamanlayıcı);
            düğüm.remove();
          };
        }
        function uygulama(hedef, seçenekler = {}) {
          const s = seçenekÇöz(seçenekler, { başlık: "title", altBaşlık: "subtitle", tema: "theme", eylemler: "actions", içerik: "content" });
          const üst = typeof hedef === "string" ? document.querySelector(hedef) : hedef;
          if (!üst) throw new Error("Uygulama hedefi bulunamadı");
          stilleriKur({ nonce: s.nonce });
          const kök = öğe("div", { class: "dz", "data-theme": s.tema ?? "light" }, öğe(
            "main",
            { class: "dz-app dz-stack" },
            öğe("header", { class: "dz-header" }, öğe("div", {}, öğe("span", { class: "dz-badge" }, "DİZGE.JS"), öğe("h1", {}, s.başlık ?? "Dizge"), s.altBaşlık ? öğe("p", { class: "dz-muted" }, s.altBaşlık) : null), öğe("div", { class: "dz-row" }, s.eylemler)),
            s.içerik
          ));
          üst.append(kök);
          const temizleyiciler = /* @__PURE__ */ new Set();
          const sonuç = {
            el: kök,
            tema(değer) {
              kök.dataset.theme = değer;
            },
            kullan(bileşen) {
              if (bileşen.destroy) temizleyiciler.add(() => bileşen.destroy());
              return bileşen.el || bileşen;
            },
            yokEt() {
              for (const temizle of temizleyiciler) temizle();
              temizleyiciler.clear();
              kök.remove();
            }
          };
          sonuç.theme = sonuç.tema;
          sonuç.use = sonuç.kullan;
          sonuç.destroy = sonuç.yokEt;
          return sonuç;
        }
        const arayüz = {
          öğe,
          düğme,
          kart,
          ölçüt,
          tablo: tabloBileşeni,
          grafik,
          form,
          sekmeler,
          pencere,
          bildirim,
          uygulama,
          stilleriKur,
          ızgara: (...çocuklar) => öğe("div", { class: "dz-grid" }, çocuklar),
          yığın: (...çocuklar) => öğe("div", { class: "dz-stack" }, çocuklar)
        };
        Object.assign(arayüz, {
          el: öğe,
          button: düğme,
          card: kart,
          metric: ölçüt,
          table: tabloBileşeni,
          chart: grafik,
          form,
          tabs: sekmeler,
          modal: pencere,
          toast: bildirim,
          app: uygulama,
          installStyles: stilleriKur,
          grid: arayüz.ızgara,
          stack: arayüz.yığın
        });
        const biçim = {
          sayı: (n, seçenekler = {}, yerel = "tr-TR") => new Intl.NumberFormat(yerel, seçenekler).format(n),
          para: (n, birim = "TRY", yerel = "tr-TR") => new Intl.NumberFormat(yerel, { style: "currency", currency: birim }).format(n),
          tarih: (değer, seçenekler = {}, yerel = "tr-TR") => new Intl.DateTimeFormat(yerel, seçenekler).format(new Date(değer))
        };
        biçim.number = biçim.sayı;
        biçim.currency = biçim.para;
        biçim.date = biçim.tarih;
        return {
          sürüm,
          version: sürüm,
          veri,
          data: veri,
          Tablo,
          Table: Tablo,
          istatistik,
          stats: istatistik,
          csv,
          yapılandır,
          configure: yapılandır,
          xlsx,
          pdf,
          indir,
          download: indir,
          depo,
          store: depo,
          geciktir,
          debounce: geciktir,
          parçala,
          chunks: parçala,
          analizEt,
          analyze: analizEt,
          eşzamansızAnalizEt,
          analyzeAsync: eşzamansızAnalizEt,
          arayüz,
          ui: arayüz,
          biçim,
          format: biçim,
          stiller,
          styles: stiller
        };
      });
    }
  });

  // html/dizge-html.js
  var require_dizge_html = __commonJS({
    "html/dizge-html.js"(exports, module) {
      var Dizge = require_dizge();
      var sürüm = "0.1.0";
      function kur() {
        if (typeof window === "undefined" || !window.customElements) throw new Error("Dizge HTML için Custom Elements destekleyen bir tarayıcı gerekir.");
        const sicil = window.customElements;
        if (sicil.get("dz-sayfa")) {
          if (sicil.get("dz-sayfa").dizgeHTML === sürüm) return;
          throw new Error("dz-sayfa başka bir motor veya sürüm tarafından kaydedilmiş.");
        }
        const A = Dizge.arayüz;
        const kapsam = (öğe) => öğe.closest("dz-sayfa") || document;
        const bul = (öğe, etiket, kimlik) => {
          if (!kimlik) throw new Error("Kaynak veya hedef kimliği belirtilmeli.");
          const kök = kapsam(öğe);
          const adaylar = [...kök.querySelectorAll(etiket)].filter((x) => kapsam(x) === kök && x.getAttribute("kimlik") === kimlik);
          if (adaylar.length !== 1) throw new Error(`“${kimlik}” için tam bir ${etiket} bulunmalı; bulunan: ${adaylar.length}.`);
          return adaylar[0];
        };
        const sayı = (öğe, ad, varsayılan, tam = false) => {
          if (!öğe.hasAttribute(ad)) return varsayılan;
          const metin = öğe.getAttribute(ad).trim(), değer = Number(metin);
          if (!metin || !Number.isFinite(değer) || tam && !Number.isSafeInteger(değer)) throw new Error(`“${ad}” geçerli bir ${tam ? "tam sayı" : "sayı"} olmalı.`);
          return değer;
        };
        const mantık = (öğe, ad, varsayılan) => {
          if (!öğe.hasAttribute(ad)) return varsayılan;
          const değer = öğe.getAttribute(ad);
          if (["", "evet", "doğru"].includes(değer)) return true;
          if (["hayır", "yanlış"].includes(değer)) return false;
          throw new Error(`“${ad}” evet veya hayır olmalı.`);
        };
        const satırlarıDoğrula = (değer) => {
          if (!Array.isArray(değer) || değer.some((x) => x === null || typeof x !== "object" || Array.isArray(x))) throw new Error("Veri, nesnelerden oluşan bir JSON dizisi olmalı.");
          return değer;
        };
        const olay = (öğe, ad, veri) => öğe.dispatchEvent(new CustomEvent(ad, { bubbles: true, detail: veri }));
        function stilleriKur() {
          A.stilleriKur();
          if (document.getElementById("dizge-html-stilleri")) return;
          const stil = document.createElement("style");
          stil.id = "dizge-html-stilleri";
          stil.textContent = `
      dz-sayfa,dz-kart,dz-metin,dz-başlık,dz-sayaç,dz-tablo,dz-form,dz-ızgara{display:block;min-width:0}
      dz-veri,dz-alan{display:none!important}
      dz-sayfa.dz{min-height:100vh;box-sizing:border-box;padding:clamp(16px,4vw,48px);max-width:1200px;margin:auto}
      dz-ızgara{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:20px;align-items:start}
      dz-kart{padding:24px;border:1px solid var(--dz-line);border-radius:16px;background:var(--dz-panel);}
      dz-kart>*+*{margin-top:16px} dz-başlık{font-size:1.3rem;font-weight:700}
      dz-metin{line-height:1.65;color:var(--dz-muted)} dz-sayaç output{font-size:2.5rem;font-weight:700;display:block;margin:12px 0}
      .dz-html-sonuç{white-space:pre-wrap;overflow-wrap:anywhere;margin-top:16px}
      dz-sayfa [hidden]{display:none!important}
    `;
          document.head.append(stil);
        }
        class Bileşen extends HTMLElement {
          constructor() {
            super();
            this._bekliyor = false;
          }
          connectedCallback() {
            this._bağlan?.();
            this.yenile();
          }
          disconnectedCallback() {
            this._ayrıl?.();
            this._temizle();
          }
          attributeChangedCallback(ad, önceki, yeni) {
            if (önceki !== yeni) this.yenile();
          }
          yenile() {
            if (!this.isConnected || this._bekliyor) return;
            this._bekliyor = true;
            const çalıştır = () => {
              this._bekliyor = false;
              if (!this.isConnected) return;
              this._temizle();
              this._alan = document.createElement("div");
              if (!this.closest("dz-sayfa")) this._alan.className = "dz";
              this.prepend(this._alan);
              try {
                stilleriKur();
                this._çiz(this._alan);
                this.removeAttribute("hatalı");
              } catch (hata) {
                this.setAttribute("hatalı", "");
                this._alan.replaceChildren(A.öğe("div", { role: "alert", class: "dz-error" }, `${this.localName}: ${hata.message}`));
                olay(this, "dz-hata", { ileti: hata.message, etiket: this.localName });
              }
            };
            if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", çalıştır, { once: true });
            else queueMicrotask(çalıştır);
          }
          _temizle() {
            this._bileşen?.yokEt();
            this._bileşen = null;
            this._alan?.remove();
            this._alan = null;
          }
        }
        class Sayfa extends Bileşen {
          static dizgeHTML = sürüm;
          static observedAttributes = ["başlık", "açıklama", "tema"];
          _çiz(alan) {
            const tema = this.getAttribute("tema") || "açık";
            if (!["açık", "koyu"].includes(tema)) throw new Error("Tema açık veya koyu olmalı.");
            this.classList.add("dz", "dz-stack");
            this.dataset.theme = tema === "koyu" ? "dark" : "light";
            if (!this.hasAttribute("role")) this.setAttribute("role", "main");
            alan.classList.add("dz-header");
            alan.append(A.öğe(
              "header",
              {},
              A.öğe("span", { class: "dz-badge" }, "DİZGE · TÜRKÇE HTML"),
              A.öğe("h1", {}, this.getAttribute("başlık") || "Dizge"),
              A.öğe("p", { class: "dz-muted" }, this.getAttribute("açıklama") || "")
            ));
          }
        }
        class Veri extends HTMLElement {
          static observedAttributes = ["kimlik"];
          connectedCallback() {
            this.hidden = true;
            this._kapsam = kapsam(this);
            this._izleyici = new MutationObserver(() => this._bildir());
            this._izleyici.observe(this, { childList: true, characterData: true, subtree: true });
            this._bildir();
          }
          disconnectedCallback() {
            this._izleyici?.disconnect();
            this._bildir();
          }
          attributeChangedCallback() {
            if (this.isConnected) this._bildir();
          }
          _bildir() {
            document.dispatchEvent(new CustomEvent("dizge:veri", { detail: { kök: this._kapsam || kapsam(this) } }));
          }
          oku() {
            if (this.children.length) throw new Error("Veri içinde HTML etiketi bulunamaz; JSON metnindeki < karakterini \\u003c olarak yazın.");
            let veri;
            try {
              veri = JSON.parse(this.textContent);
            } catch {
              throw new Error("Veri geçerli JSON değil; çift tırnakları ve virgülleri kontrol edin.");
            }
            return satırlarıDoğrula(veri);
          }
          güncelle(satırlar) {
            const metin = JSON.stringify(satırlarıDoğrula(satırlar));
            this.textContent = metin.replace(/</g, "\\u003c").replace(/&/g, "\\u0026");
          }
        }
        class Tablo extends Bileşen {
          static observedAttributes = ["kaynak", "sütunlar", "sayfa-boyu", "aranabilir", "etiket"];
          _bağlan() {
            this._veriDinle = (e) => {
              if (e.detail.kök === kapsam(this)) this.yenile();
            };
            document.addEventListener("dizge:veri", this._veriDinle);
          }
          _ayrıl() {
            document.removeEventListener("dizge:veri", this._veriDinle);
          }
          _çiz(alan) {
            const satırlar = bul(this, "dz-veri", this.getAttribute("kaynak")).oku();
            const sayfaBoyu = sayı(this, "sayfa-boyu", 10, true);
            if (sayfaBoyu < 1 || sayfaBoyu > 1e3) throw new Error("Sayfa boyu 1–1000 arasında olmalı.");
            const sütunlar = this.hasAttribute("sütunlar") ? this.getAttribute("sütunlar").split(",").map((x) => x.trim()) : null;
            if (sütunlar && (sütunlar.some((x) => !x) || new Set(sütunlar).size !== sütunlar.length)) throw new Error("Sütunlar boş veya yinelenen ad içermemeli.");
            this._bileşen = A.tablo({
              satırlar,
              sayfaBoyu,
              aranabilir: mantık(this, "aranabilir", true),
              etiket: this.getAttribute("etiket") || "Veri tablosu",
              ...sütunlar ? { sütunlar: sütunlar.map((anahtar) => ({ anahtar, etiket: anahtar })) } : {}
            });
            alan.append(this._bileşen.el);
          }
        }
        class Sayaç extends Bileşen {
          static observedAttributes = ["başlangıç", "adım", "etiket"];
          attributeChangedCallback(ad, önceki, yeni) {
            if (ad === "başlangıç" && önceki !== yeni) this._değer = void 0;
            super.attributeChangedCallback(ad, önceki, yeni);
          }
          get değer() {
            return this._değer;
          }
          işle(işlem) {
            const adım = sayı(this, "adım", 1, true), başlangıç = sayı(this, "başlangıç", 0, true);
            if (adım <= 0) throw new Error("Sayaç adımı pozitif olmalı.");
            if (!["artır", "azalt", "sıfırla"].includes(işlem)) throw new Error("Sayaç işlemi artır, azalt veya sıfırla olmalı.");
            const değer = işlem === "sıfırla" ? başlangıç : (this._değer ?? başlangıç) + (işlem === "artır" ? adım : -adım);
            if (!Number.isSafeInteger(değer)) throw new Error("Sayaç güvenli tam sayı sınırını aşıyor.");
            this._değer = değer;
            if (this._çıktı) this._çıktı.textContent = String(değer);
            olay(this, "dz-değişti", { değer });
          }
          _çiz(alan) {
            const başlangıç = sayı(this, "başlangıç", 0, true), adım = sayı(this, "adım", 1, true);
            if (adım <= 0) throw new Error("Sayaç adımı pozitif olmalı.");
            this._değer ??= başlangıç;
            this._çıktı = A.öğe("output", { "aria-label": this.getAttribute("etiket") || "Sayaç", "aria-live": "polite" }, this._değer);
            const hata = A.öğe("div", { role: "alert", class: "dz-error" });
            alan.append(this._çıktı, A.öğe("div", { class: "dz-row" }, ...["azalt", "sıfırla", "artır"].map((işlem) => A.düğme(
              { azalt: "Azalt", sıfırla: "Başlangıca dön", artır: "Artır" }[işlem],
              () => {
                try {
                  this.işle(işlem);
                  hata.textContent = "";
                } catch (e) {
                  hata.textContent = e.message;
                }
              }
            ))), hata);
          }
        }
        class Düğme extends Bileşen {
          static observedAttributes = ["hedef", "işlem", "etiket"];
          _çiz(alan) {
            const işlem = this.getAttribute("işlem");
            if (!["artır", "azalt", "sıfırla"].includes(işlem)) throw new Error("Düğme işlemi artır, azalt veya sıfırla olmalı.");
            const hedef = bul(this, "dz-sayaç", this.getAttribute("hedef"));
            const hata = A.öğe("span", { role: "alert", class: "dz-error" });
            alan.append(A.düğme(this.getAttribute("etiket") || işlem, () => {
              try {
                hedef.işle(işlem);
                hata.textContent = "";
              } catch (e) {
                hata.textContent = e.message;
              }
            }), hata);
          }
        }
        class Form extends Bileşen {
          static observedAttributes = ["kaynak", "düğme", "başarı"];
          _çiz(alan) {
            const türler = { metin: "text", sayı: "number", eposta: "email", tarih: "date", telefon: "tel" };
            const tanımlar2 = [...this.children].filter((x) => x.localName === "dz-alan");
            if (!tanımlar2.length) throw new Error("Form en az bir dz-alan içermeli.");
            const alanlar = tanımlar2.map((x) => {
              const ad = x.getAttribute("ad"), tür = x.getAttribute("tür") || "metin";
              if (!ad?.trim()) throw new Error("Her form alanının adı olmalı.");
              if (!Object.hasOwn(türler, tür)) throw new Error(`Desteklenmeyen alan türü: ${tür}.`);
              const enAz = sayı(x, "en-az", void 0), enÇok = sayı(x, "en-çok", void 0), adım = sayı(x, "adım", void 0);
              if (enAz !== void 0 && enÇok !== void 0 && enAz > enÇok) throw new Error("Alan alt sınırı üst sınırdan büyük olamaz.");
              if (adım !== void 0 && adım <= 0) throw new Error("Alan adımı pozitif olmalı.");
              return {
                ad,
                tür: türler[tür],
                etiket: x.getAttribute("etiket") || ad,
                zorunlu: mantık(x, "zorunlu", false),
                değer: x.getAttribute("değer") ?? "",
                enAz,
                enÇok,
                adım
              };
            });
            const sonuç = A.öğe("div", { role: "status", class: "dz-html-sonuç" });
            this._bileşen = A.form({ alanlar, düğmeMetni: this.getAttribute("düğme") || "Kaydet", gönder: (kayıt) => {
              if (this.hasAttribute("kaynak")) {
                const veri = bul(this, "dz-veri", this.getAttribute("kaynak"));
                veri.güncelle([...veri.oku(), kayıt]);
              }
              sonuç.textContent = (this.getAttribute("başarı") || "Kayıt alındı.") + "\n" + alanlar.map((x) => `${x.etiket}: ${kayıt[x.ad] ?? ""}`).join("\n");
              olay(this, "dz-gönder", { değerler: kayıt });
            } });
            alan.append(this._bileşen.el, sonuç);
          }
        }
        class Başlık extends HTMLElement {
          connectedCallback() {
            if (!this.hasAttribute("role")) this.setAttribute("role", "heading");
            if (!this.hasAttribute("aria-level")) this.setAttribute("aria-level", "2");
          }
        }
        const tanımlar = { "dz-sayfa": Sayfa, "dz-veri": Veri, "dz-tablo": Tablo, "dz-sayaç": Sayaç, "dz-düğme": Düğme, "dz-form": Form, "dz-başlık": Başlık };
        for (const ad of ["dz-kart", "dz-metin", "dz-ızgara", "dz-alan"]) tanımlar[ad] = class extends HTMLElement {
        };
        for (const ad of Object.keys(tanımlar)) if (sicil.get(ad)) throw new Error(`“${ad}” zaten kaydedilmiş.`);
        for (const [ad, sınıf] of Object.entries(tanımlar)) sicil.define(ad, sınıf);
      }
      module.exports = { sürüm, kur };
      if (typeof window !== "undefined" && window.customElements) kur();
    }
  });
  return require_dizge_html();
})();
