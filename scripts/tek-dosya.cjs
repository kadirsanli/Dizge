const fs = require('node:fs');
const path = require('node:path');
const { paketle } = require('./vitrin.cjs');
const kök = path.resolve(__dirname, '..');
const satırSonu = metin => metin.replace(/\r\n/g, '\n');
const içŞablon = satırSonu(fs.readFileSync(path.join(kök, 'examples/tek-dosya.kaynak.html'), 'utf8'));
const kütüphane = satırSonu(fs.readFileSync(path.join(kök, 'dizge.js'), 'utf8')).replace(/<\/script/gi, '<\\/script');
const içHtml = içŞablon.replace('/*__DIZGE__*/', kütüphane);
if (/\/\*__\w+__\*\//.test(içHtml)) throw new Error('İç uygulama şablonunda yer tutucu kaldı');

const dışHtml = paketle({
  uygulama: içHtml,
  başlık: 'Satış Paneli',
  açıklama: 'Dizge.js ile kurulmuş tek dosya uygulama. Görünen kaynak HTML; çalışan arayüz Base64 çerçevede.',
  kaynak: 'satırlar, verilerdir.\ntoplam, satırların tutar toplamıdır.\ntablo, satırların sayfalı tablosudur.'
});

const dosyalar = [
  { yol: path.join(kök, 'examples/tek-dosya-uygulama.html'), içerik: içHtml },
  { yol: path.join(kök, 'examples/tek-dosya.html'), içerik: dışHtml }
];

if (process.argv.includes('--check')) {
  for (const { yol, içerik } of dosyalar) {
    if (!fs.existsSync(yol) || fs.readFileSync(yol, 'utf8') !== içerik) {
      console.error(path.relative(kök, yol) + ' güncel değil; npm run build:tek çalıştırın.');
      process.exit(1);
    }
  }
  console.log('Tek dosya ve vitrin güncel.');
} else {
  for (const { yol, içerik } of dosyalar) {
    fs.writeFileSync(yol, içerik);
    console.log(JSON.stringify({ dosya: path.relative(kök, yol).replaceAll('\\', '/'), bayt: Buffer.byteLength(içerik) }));
  }
}
