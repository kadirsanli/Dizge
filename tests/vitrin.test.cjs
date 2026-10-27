const { test } = require('node:test');
const assert = require('node:assert/strict');
const { paketle } = require('../scripts/vitrin.cjs');

test('vitrin iç HTML\'yi Base64 iframe\'e gömer ve dış kabukta script bırakmaz', () => {
  const iç = '<!doctype html><html><body><script>const x = 1;</script>Merhaba</body></html>';
  const dış = paketle({ uygulama: iç, başlık: 'Deneme <x>', açıklama: 'Açıklama & test', kaynak: 'satırlar, verilerdir.' });
  assert.match(dış, /data:text\/html;base64,/);
  assert.ok(!/<script[\s>]/i.test(dış));
  assert.match(dış, /Deneme &lt;x&gt;/);
  assert.match(dış, /Açıklama &amp; test/);
  assert.match(dış, /Türkçe kaynak özeti/);
  const base64 = dış.match(/base64,([A-Za-z0-9+/=]+)"/)[1];
  assert.equal(Buffer.from(base64, 'base64').toString('utf8'), iç);
});

test('vitrin boş uygulamayı reddeder', () => {
  assert.throws(() => paketle({ uygulama: '' }), /uygulama HTML/);
  assert.throws(() => paketle({ uygulama: '   ' }), /uygulama HTML/);
});
