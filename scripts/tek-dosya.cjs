const fs = require('node:fs');
const path = require('node:path');
const kök = path.resolve(__dirname, '..');
const şablon = fs.readFileSync(path.join(kök, 'examples/tek-dosya.kaynak.html'), 'utf8');
const kütüphane = fs.readFileSync(path.join(kök, 'dizge.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const html = şablon.replace('/*__DIZGE__*/', kütüphane);
if (/\/\*__\w+__\*\//.test(html)) throw new Error('Yer tutucu kaldı');
const hedef = path.join(kök, 'examples/tek-dosya.html');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(hedef) || fs.readFileSync(hedef, 'utf8') !== html) {
    console.error('examples/tek-dosya.html güncel değil; npm run build:tek çalıştırın.');
    process.exit(1);
  }
  console.log('examples/tek-dosya.html güncel.');
} else {
  fs.writeFileSync(hedef, html);
  console.log(JSON.stringify({ dosya: 'examples/tek-dosya.html', bayt: Buffer.byteLength(html) }));
}
