// atlas.dzg gerçek AST çıktısı; elle yazılmış formül tablosu değildir.
const DZG_FUNCTIONS = Object.freeze({
"square": z => DZ.square(z),
"cubic": z => DZ.cubic(z),
"exp": z => DZ.exp(z),
"sin": z => DZ.sin(z),
"mobius": z => DZ.mobius(z),
"reciprocal": z => DZ.reciprocal(z)
});
const DZG_HEIGHTS = Object.freeze({
"log": w => DZ.log1p(DZ.abs(w)),
"abs": w => DZ.abs(w),
"re": w => DZ.re(w),
"im": w => DZ.im(w)
});
const DZG_PHASE = w => DZ.phase(w);
