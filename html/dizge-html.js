/* Dizge HTML | MIT | Türkçe etiketlerden standart, erişilebilir DOM üretir. */
'use strict';
const Dizge = require('../dizge.js');
const sürüm = '0.1.0';

function kur() {
  if (typeof window === 'undefined' || !window.customElements) throw new Error('Dizge HTML için Custom Elements destekleyen bir tarayıcı gerekir.');
  const sicil = window.customElements;
  if (sicil.get('dz-sayfa')) {
    if (sicil.get('dz-sayfa').dizgeHTML === sürüm) return;
    throw new Error('dz-sayfa başka bir motor veya sürüm tarafından kaydedilmiş.');
  }
  const A = Dizge.arayüz;
  const kapsam = öğe => öğe.closest('dz-sayfa') || document;
  const bul = (öğe, etiket, kimlik) => {
    if (!kimlik) throw new Error('Kaynak veya hedef kimliği belirtilmeli.');
    const kök = kapsam(öğe);
    const adaylar = [...kök.querySelectorAll(etiket)].filter(x => kapsam(x) === kök && x.getAttribute('kimlik') === kimlik);
    if (adaylar.length !== 1) throw new Error(`“${kimlik}” için tam bir ${etiket} bulunmalı; bulunan: ${adaylar.length}.`);
    return adaylar[0];
  };
  const sayı = (öğe, ad, varsayılan, tam = false) => {
    if (!öğe.hasAttribute(ad)) return varsayılan;
    const metin = öğe.getAttribute(ad).trim(), değer = Number(metin);
    if (!metin || !Number.isFinite(değer) || (tam && !Number.isSafeInteger(değer))) throw new Error(`“${ad}” geçerli bir ${tam ? 'tam sayı' : 'sayı'} olmalı.`);
    return değer;
  };
  const mantık = (öğe, ad, varsayılan) => {
    if (!öğe.hasAttribute(ad)) return varsayılan;
    const değer = öğe.getAttribute(ad);
    if (['', 'evet', 'doğru'].includes(değer)) return true;
    if (['hayır', 'yanlış'].includes(değer)) return false;
    throw new Error(`“${ad}” evet veya hayır olmalı.`);
  };
  const satırlarıDoğrula = değer => {
    if (!Array.isArray(değer) || değer.some(x => x === null || typeof x !== 'object' || Array.isArray(x))) throw new Error('Veri, nesnelerden oluşan bir JSON dizisi olmalı.');
    return değer;
  };
  const olay = (öğe, ad, veri) => öğe.dispatchEvent(new CustomEvent(ad, { bubbles: true, detail: veri }));
  function stilleriKur() {
    A.stilleriKur();
    if (document.getElementById('dizge-html-stilleri')) return;
    const stil = document.createElement('style'); stil.id = 'dizge-html-stilleri';
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
    constructor() { super(); this._bekliyor = false; }
    connectedCallback() { this._bağlan?.(); this.yenile(); }
    disconnectedCallback() { this._ayrıl?.(); this._temizle(); }
    attributeChangedCallback(ad, önceki, yeni) { if (önceki !== yeni) this.yenile(); }
    yenile() {
      if (!this.isConnected || this._bekliyor) return;
      this._bekliyor = true;
      const çalıştır = () => {
        this._bekliyor = false;
        if (!this.isConnected) return;
        this._temizle();
        this._alan = document.createElement('div');
        if (!this.closest('dz-sayfa')) this._alan.className = 'dz';
        this.prepend(this._alan);
        try { stilleriKur(); this._çiz(this._alan); this.removeAttribute('hatalı'); }
        catch (hata) {
          this.setAttribute('hatalı', '');
          this._alan.replaceChildren(A.öğe('div', { role: 'alert', class: 'dz-error' }, `${this.localName}: ${hata.message}`));
          olay(this, 'dz-hata', { ileti: hata.message, etiket: this.localName });
        }
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', çalıştır, { once: true });
      else queueMicrotask(çalıştır);
    }
    _temizle() { this._bileşen?.yokEt(); this._bileşen = null; this._alan?.remove(); this._alan = null; }
  }

  class Sayfa extends Bileşen {
    static dizgeHTML = sürüm;
    static observedAttributes = ['başlık', 'açıklama', 'tema'];
    _çiz(alan) {
      const tema = this.getAttribute('tema') || 'açık';
      if (!['açık', 'koyu'].includes(tema)) throw new Error('Tema açık veya koyu olmalı.');
      this.classList.add('dz', 'dz-stack'); this.dataset.theme = tema === 'koyu' ? 'dark' : 'light';
      if (!this.hasAttribute('role')) this.setAttribute('role', 'main');
      alan.classList.add('dz-header');
      alan.append(A.öğe('header', {}, A.öğe('span', { class: 'dz-badge' }, 'DİZGE · TÜRKÇE HTML'),
        A.öğe('h1', {}, this.getAttribute('başlık') || 'Dizge'),
        A.öğe('p', { class: 'dz-muted' }, this.getAttribute('açıklama') || '')));
    }
  }

  class Veri extends HTMLElement {
    static observedAttributes = ['kimlik'];
    connectedCallback() {
      this.hidden = true;
      this._kapsam = kapsam(this);
      this._izleyici = new MutationObserver(() => this._bildir());
      this._izleyici.observe(this, { childList: true, characterData: true, subtree: true });
      this._bildir();
    }
    disconnectedCallback() { this._izleyici?.disconnect(); this._bildir(); }
    attributeChangedCallback() { if (this.isConnected) this._bildir(); }
    _bildir() { document.dispatchEvent(new CustomEvent('dizge:veri', { detail: { kök: this._kapsam || kapsam(this) } })); }
    oku() {
      if (this.children.length) throw new Error('Veri içinde HTML etiketi bulunamaz; JSON metnindeki < karakterini \\u003c olarak yazın.');
      let veri;
      try { veri = JSON.parse(this.textContent); } catch { throw new Error('Veri geçerli JSON değil; çift tırnakları ve virgülleri kontrol edin.'); }
      return satırlarıDoğrula(veri);
    }
    güncelle(satırlar) {
      const metin = JSON.stringify(satırlarıDoğrula(satırlar));
      // Tekrar HTML olarak kaydedilse de metin, etiket oluşturamasın.
      this.textContent = metin.replace(/</g, '\\u003c').replace(/&/g, '\\u0026');
    }
  }

  class Tablo extends Bileşen {
    static observedAttributes = ['kaynak', 'sütunlar', 'sayfa-boyu', 'aranabilir', 'etiket'];
    _bağlan() { this._veriDinle = e => { if (e.detail.kök === kapsam(this)) this.yenile(); }; document.addEventListener('dizge:veri', this._veriDinle); }
    _ayrıl() { document.removeEventListener('dizge:veri', this._veriDinle); }
    _çiz(alan) {
      const satırlar = bul(this, 'dz-veri', this.getAttribute('kaynak')).oku();
      const sayfaBoyu = sayı(this, 'sayfa-boyu', 10, true);
      if (sayfaBoyu < 1 || sayfaBoyu > 1000) throw new Error('Sayfa boyu 1–1000 arasında olmalı.');
      const sütunlar = this.hasAttribute('sütunlar') ? this.getAttribute('sütunlar').split(',').map(x => x.trim()) : null;
      if (sütunlar && (sütunlar.some(x => !x) || new Set(sütunlar).size !== sütunlar.length)) throw new Error('Sütunlar boş veya yinelenen ad içermemeli.');
      this._bileşen = A.tablo({ satırlar, sayfaBoyu, aranabilir: mantık(this, 'aranabilir', true),
        etiket: this.getAttribute('etiket') || 'Veri tablosu',
        ...(sütunlar ? { sütunlar: sütunlar.map(anahtar => ({ anahtar, etiket: anahtar })) } : {}) });
      alan.append(this._bileşen.el);
    }
  }

  class Sayaç extends Bileşen {
    static observedAttributes = ['başlangıç', 'adım', 'etiket'];
    attributeChangedCallback(ad, önceki, yeni) {
      if (ad === 'başlangıç' && önceki !== yeni) this._değer = undefined;
      super.attributeChangedCallback(ad, önceki, yeni);
    }
    get değer() { return this._değer; }
    işle(işlem) {
      const adım = sayı(this, 'adım', 1, true), başlangıç = sayı(this, 'başlangıç', 0, true);
      if (adım <= 0) throw new Error('Sayaç adımı pozitif olmalı.');
      if (!['artır', 'azalt', 'sıfırla'].includes(işlem)) throw new Error('Sayaç işlemi artır, azalt veya sıfırla olmalı.');
      const değer = işlem === 'sıfırla' ? başlangıç : (this._değer ?? başlangıç) + (işlem === 'artır' ? adım : -adım);
      if (!Number.isSafeInteger(değer)) throw new Error('Sayaç güvenli tam sayı sınırını aşıyor.');
      this._değer = değer;
      if (this._çıktı) this._çıktı.textContent = String(değer);
      olay(this, 'dz-değişti', { değer });
    }
    _çiz(alan) {
      const başlangıç = sayı(this, 'başlangıç', 0, true), adım = sayı(this, 'adım', 1, true);
      if (adım <= 0) throw new Error('Sayaç adımı pozitif olmalı.');
      this._değer ??= başlangıç;
      this._çıktı = A.öğe('output', { 'aria-label': this.getAttribute('etiket') || 'Sayaç', 'aria-live': 'polite' }, this._değer);
      const hata = A.öğe('div', { role: 'alert', class: 'dz-error' });
      alan.append(this._çıktı, A.öğe('div', { class: 'dz-row' }, ...['azalt', 'sıfırla', 'artır'].map(işlem => A.düğme(
        ({ azalt: 'Azalt', sıfırla: 'Başlangıca dön', artır: 'Artır' })[işlem], () => {
          try { this.işle(işlem); hata.textContent = ''; } catch (e) { hata.textContent = e.message; }
        }))), hata);
    }
  }

  class Düğme extends Bileşen {
    static observedAttributes = ['hedef', 'işlem', 'etiket'];
    _çiz(alan) {
      const işlem = this.getAttribute('işlem');
      if (!['artır', 'azalt', 'sıfırla'].includes(işlem)) throw new Error('Düğme işlemi artır, azalt veya sıfırla olmalı.');
      const hedef = bul(this, 'dz-sayaç', this.getAttribute('hedef'));
      const hata = A.öğe('span', { role: 'alert', class: 'dz-error' });
      alan.append(A.düğme(this.getAttribute('etiket') || işlem, () => {
        try { hedef.işle(işlem); hata.textContent = ''; } catch (e) { hata.textContent = e.message; }
      }), hata);
    }
  }

  class Form extends Bileşen {
    static observedAttributes = ['kaynak', 'düğme', 'başarı'];
    _çiz(alan) {
      const türler = { metin: 'text', sayı: 'number', eposta: 'email', tarih: 'date', telefon: 'tel' };
      const tanımlar = [...this.children].filter(x => x.localName === 'dz-alan');
      if (!tanımlar.length) throw new Error('Form en az bir dz-alan içermeli.');
      const alanlar = tanımlar.map(x => {
        const ad = x.getAttribute('ad'), tür = x.getAttribute('tür') || 'metin';
        if (!ad?.trim()) throw new Error('Her form alanının adı olmalı.');
        if (!Object.hasOwn(türler, tür)) throw new Error(`Desteklenmeyen alan türü: ${tür}.`);
        const enAz = sayı(x, 'en-az', undefined), enÇok = sayı(x, 'en-çok', undefined), adım = sayı(x, 'adım', undefined);
        if (enAz !== undefined && enÇok !== undefined && enAz > enÇok) throw new Error('Alan alt sınırı üst sınırdan büyük olamaz.');
        if (adım !== undefined && adım <= 0) throw new Error('Alan adımı pozitif olmalı.');
        return { ad, tür: türler[tür], etiket: x.getAttribute('etiket') || ad, zorunlu: mantık(x, 'zorunlu', false),
          değer: x.getAttribute('değer') ?? '', enAz, enÇok, adım };
      });
      const sonuç = A.öğe('div', { role: 'status', class: 'dz-html-sonuç' });
      this._bileşen = A.form({ alanlar, düğmeMetni: this.getAttribute('düğme') || 'Kaydet', gönder: kayıt => {
        if (this.hasAttribute('kaynak')) {
          const veri = bul(this, 'dz-veri', this.getAttribute('kaynak'));
          veri.güncelle([...veri.oku(), kayıt]);
        }
        sonuç.textContent = (this.getAttribute('başarı') || 'Kayıt alındı.') + '\n' + alanlar.map(x => `${x.etiket}: ${kayıt[x.ad] ?? ''}`).join('\n');
        olay(this, 'dz-gönder', { değerler: kayıt });
      }});
      alan.append(this._bileşen.el, sonuç);
    }
  }

  class Başlık extends HTMLElement {
    connectedCallback() { if (!this.hasAttribute('role')) this.setAttribute('role', 'heading'); if (!this.hasAttribute('aria-level')) this.setAttribute('aria-level', '2'); }
  }
  const tanımlar = { 'dz-sayfa': Sayfa, 'dz-veri': Veri, 'dz-tablo': Tablo, 'dz-sayaç': Sayaç, 'dz-düğme': Düğme, 'dz-form': Form, 'dz-başlık': Başlık };
  for (const ad of ['dz-kart', 'dz-metin', 'dz-ızgara', 'dz-alan']) tanımlar[ad] = class extends HTMLElement {};
  // Kısmi kurulum bırakmadan önce tüm adları kontrol et.
  for (const ad of Object.keys(tanımlar)) if (sicil.get(ad)) throw new Error(`“${ad}” zaten kaydedilmiş.`);
  for (const [ad, sınıf] of Object.entries(tanımlar)) sicil.define(ad, sınıf);
}

module.exports = { sürüm, kur };
if (typeof window !== 'undefined' && window.customElements) kur();
