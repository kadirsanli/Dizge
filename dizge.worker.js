/* Classic worker; serve beside dizge.js on the same origin. */
importScripts('./dizge.js');
self.onmessage = event => {
  try { self.postMessage({ result: Dizge.analyze(event.data.rows, event.data.operations) }); }
  catch (error) { self.postMessage({ error: error.message || String(error) }); }
};
