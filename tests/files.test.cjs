const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const D = require('../dizge.js');
D.configure({ xlsx: require('xlsx'), pdf: require('pdf-lib'), fontkit: require('@pdf-lib/fontkit'), pdfjs: () => import('pdfjs-dist/legacy/build/pdf.mjs') });
test('real XLSX round trip retains numbers, dates, text and multiple sheets', async () => {
  const rows = [{ city: 'İstanbul', amount: 23.5, code: '0001', formulaText: '=2+2', date: new Date('2026-01-02T00:00:00Z') }];
  const output = await D.xlsx.write({ Sales: rows, Other: [{ x: 2 }] }); assert.equal(output[0], 80); assert.equal(output[1], 75);
  const book = await D.xlsx.read(output); assert.deepEqual(book.sheets, ['Sales', 'Other']); assert.equal(book.rows[0].amount, 23.5); assert.equal(book.rows[0].city, 'İstanbul'); assert.equal(book.rows[0].code, '0001'); assert.equal(book.rows[0].formulaText, '=2+2'); assert.ok(book.rows[0].date instanceof Date);
  assert.equal((await D.xlsx.read(output, { sheet: 'Other' })).rows[0].x, 2);
  await assert.rejects(D.xlsx.read(output, { maxBytes: 2 })); await assert.rejects(D.xlsx.read(output, { sheet: 'missing' }));
  await assert.rejects(D.xlsx.write({ 'bad/name': [] }));
  await assert.rejects(D.xlsx.write({ Data: [{ value: { f: '1+1' } }] }), /scalar/);
  await assert.rejects(D.xlsx.write({ Data: [{ value: Infinity }] }), /finite/);
});
test('XLSX row limit rejects oversized sheets', async () => {
  const output = await D.xlsx.write({ Data: Array.from({ length: 12 }, (_, i) => ({ i })) });
  await assert.rejects(D.xlsx.read(output, { maxRows: 2 }), /maxRows/);
});
test('PDF produces valid paginated bytes, extracts text and merges pages', async () => {
  const first = await D.pdf.report({ title: 'Analysis', lines: Array.from({ length: 130 }, (_, i) => `Line ${i} - revenue report`) });
  assert.equal(Buffer.from(first).subarray(0, 5).toString(), '%PDF-');
  const extracted = await D.pdf.text(first); assert.ok(extracted.pages.length >= 3); assert.match(extracted.text, /Line 129/);
  const merged = await D.pdf.merge([first, first]); assert.equal((await D.pdf.text(merged)).pages.length, extracted.pages.length * 2);
  await assert.rejects(D.pdf.text(first, { maxPages: 1 }), /maxPages/); await assert.rejects(D.pdf.merge([]));
});
test('Turkish PDF uses embedded Unicode font and preserves text on extraction', async () => {
  const font = fs.readFileSync(path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts/LiberationSans-Regular.ttf'));
  const output = await D.pdf.report({ title: 'Türkçe çalışma', lines: ['İstanbul, ığüşöç İĞÜŞÖÇ'], fontBytes: font });
  const result = await D.pdf.text(output); assert.match(result.text, /İstanbul/); assert.match(result.text, /ığüşöç/);
});
test('lazy adapter load is deduplicated and failures are retryable', async () => {
  let loads = 0;
  D.configure({ xlsx: async () => { loads++; if (loads === 1) throw Error('offline'); return require('xlsx'); } });
  await assert.rejects(D.xlsx.write({ S: [] }), /offline/);
  await Promise.all([D.xlsx.write({ S: [] }), D.xlsx.write({ S: [] })]); assert.equal(loads, 2);
});
