// Resmi Dizge AST çıktısı; elle yazılmış boru hattı değildir.
const FLOW=Object.freeze({
"newton": input => K.advance(K.correction(K.evaluate(input))),
"gravity": input => K.kick(K.force(K.drift(K.kick(K.force(input))))),
"quantum": input => K.potential(K.inverse(K.kinetic(K.forward(K.potential(input)))))
});
