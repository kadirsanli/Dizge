const fs = require('node:fs');
const zlib = require('node:zlib');
require('esbuild').buildSync({ entryPoints: ['dizge.js'], outfile: 'dizge.min.js', minify: true, target: ['es2020'], legalComments: 'inline' });
const source = fs.readFileSync('dizge.js'), min = fs.readFileSync('dizge.min.js');
console.log(JSON.stringify({ sourceBytes: source.length, minBytes: min.length, gzipBytes: zlib.gzipSync(min).length }, null, 2));
