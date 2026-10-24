process.chdir(__dirname);
const fs=require('node:fs');
let html=fs.readFileSync('dizge.template','utf8');
html=html.replace('/*__SOURCE__*/',fs.readFileSync('atlas.dzg','utf8').replace(/<\/script/gi,'<\\/script'));
html=html.replace('/*__GENERATED__*/',fs.readFileSync('derleme/atlas-uretilen.js','utf8'));
html=html.replace('/*__FIXTURES__*/',fs.readFileSync('derleme/numpy-referans.json','utf8'));
if(/\/\*__\w+__\*\//.test(html))throw Error('Yer tutucu kaldı');
fs.writeFileSync('dizge.html',html);
for(const f of ['normal.html','dizge.html']){const scripts=[...fs.readFileSync(f,'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)];for(const s of scripts)new(require('node:vm').Script)(s[1]);console.log(f+' syntax OK');}
