/* Klasik worker; dizge.js ile aynı klasörde sunulmalıdır. */
importScripts('./dizge.js');
self.onmessage = event => {
  try {
    const paket = event.data;
    const satırlar = paket.satırlar ?? paket.rows;
    const işlemler = paket.işlemler ?? paket.operations;
    self.postMessage({ result: Dizge.analizEt(satırlar, işlemler) });
  } catch (error) {
    self.postMessage({ error: error.message || String(error) });
  }
};
