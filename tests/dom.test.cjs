const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const D = require('../dizge.js');
let window;
beforeEach(() => { window?.close(); window = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', { url: 'https://example.test' }).window; global.document = window.document; });
test('text and CSV-shaped attack strings never become HTML', () => {
  const node = D.ui.el('div', {}, '<img src=x onerror=alert(1)>'); assert.equal(node.querySelector('img'), null);
  assert.throws(() => D.ui.el('div', { innerHTML: 'x' })); assert.throws(() => D.ui.el('a', { href: 'javascript:alert(1)' })); assert.throws(() => D.ui.el('img', { onerror: 'alert(1)' }));
  assert.throws(() => D.ui.el('script')); assert.equal(D.ui.el('button', { disabled: true }).disabled, true);
});
test('100k-row table bounds DOM, sorts, pages, searches and cleans timers', async () => {
  const rows = Array.from({ length: 100000 }, (_, i) => ({ id: i, name: 'Row ' + i }));
  const table = D.ui.table({ rows, pageSize: 20 }); document.body.append(table.el);
  assert.equal(table.el.querySelectorAll('tbody tr').length, 20);
  table.el.querySelector('[aria-label="Next page"]').click(); assert.equal(table.el.querySelector('tbody td').textContent, '20');
  table.el.querySelector('th button').click(); table.el.querySelector('th button').click(); assert.equal(table.el.querySelector('th').getAttribute('aria-sort'), 'descending');
  const search = table.el.querySelector('input'); search.value = 'Row 99999'; search.dispatchEvent(new window.Event('input')); await new Promise(r => setTimeout(r, 180));
  assert.equal(table.el.querySelectorAll('tbody tr').length, 1); assert.match(table.el.textContent, /99999/);
  table.setRows([]); assert.match(table.el.textContent, /Sonuç yok/); table.destroy(); assert.equal(table.el.isConnected, false);
});
test('tab keyboard navigation follows ARIA selection and focus', () => {
  const tabs = D.ui.tabs([{ label: 'One', content: 'A' }, { label: 'Two', content: 'B' }]); document.body.append(tabs);
  const buttons = tabs.querySelectorAll('[role=tab]'); buttons[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(buttons[1].getAttribute('aria-selected'), 'true'); assert.equal(document.activeElement, buttons[1]); assert.equal(tabs.querySelector('[role=tabpanel]').hidden, true);
});
test('chart bounds geometry, handles negatives/empty and rejects nonfinite', () => {
  const chart = D.ui.chart({ values: Array.from({ length: 100000 }, (_, i) => i % 10 - 5), maxPoints: 100 });
  assert.equal(chart.querySelectorAll('rect').length, 100); assert.ok(!chart.outerHTML.includes('NaN')); assert.equal(chart.getAttribute('role'), 'img');
  assert.throws(() => D.ui.chart({ values: [NaN] })); assert.match(D.ui.chart().textContent, /No data/);
});
test('form converts numbers, validates, and reports async errors', async () => {
  let received;
  const form = D.ui.form({ fields: [{ name: 'n', type: 'number', value: 12 }, { name: 'city', options: ['A', 'B'], value: 'B' }], onSubmit: values => { received = values; throw Error('Save failed'); } }); document.body.append(form.el);
  form.el.dispatchEvent(new window.Event('submit', { cancelable: true })); await Promise.resolve();
  assert.deepEqual(received, { n: 12, city: 'B' }); assert.equal(form.el.querySelector('[role=alert]').textContent, 'Save failed'); assert.equal(form.el.querySelector('button').disabled, false);
});
test('app owns registered component disposal and injects one stylesheet', () => {
  const a = D.ui.app('#root', { title: 'Test' }), b = D.ui.app('#root'); let disposed = false;
  a.use({ el: D.ui.el('div'), destroy() { disposed = true; } }); a.theme('dark'); assert.equal(a.el.dataset.theme, 'dark');
  assert.equal(document.querySelectorAll('#dizge-styles').length, 1); a.destroy(); assert.equal(disposed, true); b.destroy();
});
