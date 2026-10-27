const D = require('../dizge');
const os = require('node:os');
const rows = Array.from({ length: 100000 }, (_, i) => ({ id: i, category: 'Group ' + i % 20, amount: (i * 17) % 10000 }));
const cases = {
  summary100k: () => D.stats.summary(rows.map(r => r.amount)),
  filterSort100k: () => D.data(rows).filter(r => r.amount > 5000).sort('amount').page(1, 25),
  group100k: () => D.data(rows).groupBy('category').aggregate({ sum: t => D.stats.summary(t.column('amount')).sum }),
  join100k: () => D.data(rows).join(Array.from({ length: 20 }, (_, i) => ({ category: 'Group ' + i, label: i })), { left: 'category' }),
  csv10k: () => D.csv.parse(D.csv.stringify(rows.slice(0, 10000)))
};
const results = {};
for (const [name, fn] of Object.entries(cases)) { fn(); const times = []; for (let i = 0; i < 7; i++) { const start = performance.now(); fn(); times.push(performance.now() - start); } times.sort((a, b) => a - b); results[name] = { medianMs: +times[3].toFixed(2), maxMs: +times[6].toFixed(2) }; }
console.log(JSON.stringify({ node: process.version, platform: process.platform, cpu: os.cpus()[0].model, rows: rows.length, results }, null, 2));
