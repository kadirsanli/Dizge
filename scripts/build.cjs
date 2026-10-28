const fs = require('node:fs');
const zlib = require('node:zlib');
require('esbuild').buildSync({ entryPoints: ['dizge.js'], outfile: 'dizge.min.js', minify: true, target: ['es2020'], legalComments: 'inline' });
const source = fs.readFileSync('dizge.js'), min = fs.readFileSync('dizge.min.js');
console.log(JSON.stringify({ sourceBytes: source.length, minBytes: min.length, gzipBytes: zlib.gzipSync(min).length }, null, 2));
for (const minify of [false, true]) {
  require('esbuild').buildSync({ entryPoints: ['html/dizge-html.js'], outfile: minify ? 'dizge-html.min.js' : 'dizge-html.js',
    bundle: true, format: 'iife', globalName: 'DizgeHTML', platform: 'browser', charset: 'utf8', minify,
    target: ['es2022'], legalComments: 'inline' });
}
