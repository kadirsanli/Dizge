"""Upstream lexer/parser/compiler + küçük, açık kapsamlı AST→JS arka ucu.
Yalnızca bu atlasın saf Tanım/Uygula/Ad/Sayı alt kümesini destekler.
Genel amaçlı Dizge→JavaScript derleyicisi olduğu iddia edilmez.
"""
from pathlib import Path
import dataclasses, hashlib, json, time
import atlas_eklentisi as ext
from dizge_lexer import Lexer
from dizge_parser import Parser, Tanım, Uygula, Ad, Sayı, ağaç
from dizge_compiler import Derleyici
import dizge_cekirdek as çekirdek
import numpy as np

root=Path(__file__).parent
out=root/'derleme'; out.mkdir(exist_ok=True)
t=time.perf_counter()
source=(root/'atlas.dzg').read_text(encoding='utf-8')
tokens=Lexer().tokenize(source)
ast=Parser().ayrıştır(tokens)
compiled=Derleyici('atlas.dzg').derle(ast)
(out/'atlas-upstream.py').write_text(compiled.modül,encoding='utf-8')
bootstrap="from pathlib import Path\nimport sys\nsys.path.insert(0,str(Path(__file__).resolve().parent.parent))\nimport atlas_eklentisi\n"
(out/'atlas.py').write_text(bootstrap+compiled.modül,encoding='utf-8')
env={'ç':çekirdek}
for step in compiled.adımlar: exec(step.py,env)
definitions={node.ad:node.değer for node in ast.cümleler if isinstance(node,Tanım)}
if len(definitions)!=len(ast.cümleler): raise ValueError('Bu arka uç yalnızca tanımları destekler.')
def ir(node):
    if isinstance(node,Sayı): return {'number':node.değer}
    if isinstance(node,Ad): return {'ref':node.ad}
    if isinstance(node,Uygula): return {'op':ext.JS_OPERATIONS[node.işlev], 'args':{k:ir(v) for k,v in node.argümanlar.items()}}
    raise ValueError('Desteklenmeyen AST: '+str(type(node)))
intermediate={k:ir(v) for k,v in definitions.items()}
def js(node,parameter='z'):
    if isinstance(node,Sayı): return json.dumps(node.değer)
    if isinstance(node,Ad):
        if node.ad=='düzlem': return parameter
        return js(definitions[node.ad],parameter)
    if isinstance(node,Uygula):
        op=ext.JS_OPERATIONS[node.işlev]
        if op=='grid': return parameter
        if set(node.argümanlar)!={'veri'}: raise ValueError('Beklenmeyen rol')
        return 'DZ.'+op+'('+js(node.argümanlar['veri'],parameter)+')'
    raise ValueError('Desteklenmeyen AST')
functions={'square':'kareler','cubic':'küpler','exp':'üsteller','sin':'sinüsler','mobius':'möbiyuslar','reciprocal':'tersler'}
code='// atlas.dzg gerçek AST çıktısı; elle yazılmış formül tablosu değildir.\n'
code+='const DZG_FUNCTIONS = Object.freeze({\n'+',\n'.join(json.dumps(k)+': z => '+js(definitions[v]) for k,v in functions.items())+'\n});\n'
# Yükseklikler ve faz da aynı AST'den kök operandına kadar izlenir.
def transform(node,stop):
    if isinstance(node,Ad) and node.ad==stop:return 'w'
    if isinstance(node,Ad):return transform(definitions[node.ad],stop)
    if isinstance(node,Uygula):return 'DZ.'+ext.JS_OPERATIONS[node.işlev]+'('+transform(node.argümanlar['veri'],stop)+')'
    raise ValueError('Desteklenmeyen yükseklik')
targets={'log':'yükseklikler','abs':'genlikler','re':'gerçeller','im':'sanallar'}
code+='const DZG_HEIGHTS = Object.freeze({\n'+',\n'.join(json.dumps(k)+': w => '+transform(definitions[v],'kareler') for k,v in targets.items())+'\n});\n'
code+='const DZG_PHASE = w => '+transform(definitions['fazlar'],'kareler')+';\n'
(out/'atlas-uretilen.js').write_text(code,encoding='utf-8')
(out/'atlas-ast.json').write_text(json.dumps(intermediate,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'atlas-ast.txt').write_text('\n'.join(line for c in ast.cümleler for line in ağaç(c)),encoding='utf-8')
fixtures=[]
points=[(-1.3,.7),(.2,-.4),(1,1),(0,1),(2,-1)]
for fn,var in functions.items():
    operation=definitions[var].işlev
    f=getattr(çekirdek,çekirdek.İŞLEVLER[operation].py)
    for x,y in points:
        value=complex(f(x+1j*y)); fixtures.append({'fn':fn,'x':x,'y':y,'re':value.real,'im':value.imag})
(out/'numpy-referans.json').write_text(json.dumps(fixtures,ensure_ascii=False,indent=2),encoding='utf-8')
assert env['düzlem'].shape==(97,97)
assert np.allclose(env['kareler'],env['düzlem']**2)
assert np.allclose(env['yükseklikler'],np.log1p(np.abs(env['kareler'])))
report={'upstreamCommit':'6622ff41165db958d677d68e095a848502666a11','sourceSHA256':hashlib.sha256(source.encode()).hexdigest(),'definitions':len(definitions),'numpyVersion':np.__version__,'gridShape':list(env['düzlem'].shape),'fixtureCount':len(fixtures),'compileAndExecutionMs':(time.perf_counter()-t)*1000,'warnings':compiled.uyarılar,'generatedJS':code}
(out/'derleme-kaniti.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
