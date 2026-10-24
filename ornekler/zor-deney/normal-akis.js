// Doğrudan JavaScript orkestrasyonu. Sayısal aşamalar iki yöntemde ortaktır.
const FLOW=Object.freeze({
  newton: input=>{const evaluated=K.evaluate(input);const corrected=K.correction(evaluated);return K.advance(corrected);},
  gravity: input=>{const forced=K.force(input);const kicked=K.kick(forced);const drifted=K.drift(kicked);const refreshed=K.force(drifted);return K.kick(refreshed);},
  quantum: input=>{const half=K.potential(input);const spectrum=K.forward(half);const evolved=K.kinetic(spectrum);const back=K.inverse(evolved);return K.potential(back);}
});
