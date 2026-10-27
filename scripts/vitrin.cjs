#!/usr/bin/env node
/* Dizge Vitrin: iç HTML'yi Base64'e çevirip JS'siz, Türkçe dış kabuğa gömer. */
const fs = require('node:fs');
const path = require('node:path');
const varsayılanŞablon = path.join(__dirname, '..', 'templates', 'vitrin.html');
const satırSonu = metin => String(metin).replace(/\r\n/g, '\n');

function kaçır(değer) {
  return String(değer ?? '').replace(/[&<>"']/g, karakter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[karakter]));
}

function şablonOku(yol = varsayılanŞablon) {
  return satırSonu(fs.readFileSync(yol, 'utf8'));
}

function paketle({ uygulama, başlık = 'Dizge Vitrin', açıklama = '', kaynak = '', şablon = şablonOku() } = {}) {
  if (typeof uygulama !== 'string' || !uygulama.trim()) throw new Error('Gömülecek uygulama HTML metni gerekli');
  const veri = Buffer.from(satırSonu(uygulama), 'utf8').toString('base64');
  const html = satırSonu(şablon)
    .replaceAll('/*__BASLIK__*/', kaçır(başlık))
    .replaceAll('/*__ACIKLAMA__*/', kaçır(açıklama))
    .replaceAll('/*__KAYNAK__*/', kaçır(kaynak))
    .replace('/*__VERI__*/', veri);
  if (/\/\*__[A-Z]+__\*\//.test(html)) throw new Error('Vitrin şablonunda doldurulmamış yer tutucu kaldı');
  if (/<script[\s>]/i.test(html)) throw new Error('Dış vitrin kabuğunda script olmamalı');
  return html;
}

module.exports = { paketle, şablonOku, kaçır, varsayılanŞablon };

if (require.main === module) {
  const args = process.argv.slice(2);
  const seçenek = ad => { const i = args.indexOf(ad); return i >= 0 ? args[i + 1] : undefined; };
  const konumlar = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
  if (args.includes('--yardim') || args.includes('--help') || konumlar.length < 2) {
    console.log('Kullanım: dizge-vitrin <girdi.html> <çıktı.html> [--baslik "..."] [--aciklama "..."] [--kaynak "..."] [--sablon dosya.html]');
    process.exit(konumlar.length < 2 ? 1 : 0);
  }
  const [girdi, çıktı] = konumlar;
  const uygulama = fs.readFileSync(path.resolve(girdi), 'utf8');
  const html = paketle({
    uygulama,
    başlık: seçenek('--baslik'),
    açıklama: seçenek('--aciklama'),
    kaynak: seçenek('--kaynak'),
    şablon: seçenek('--sablon') ? şablonOku(path.resolve(seçenek('--sablon'))) : undefined
  });
  fs.writeFileSync(path.resolve(çıktı), html);
  console.log(JSON.stringify({ girdi, çıktı, uygulamaBayt: Buffer.byteLength(uygulama), vitrinBayt: Buffer.byteLength(html) }));
}
