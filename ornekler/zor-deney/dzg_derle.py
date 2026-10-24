from pathlib import Path
import json, hashlib, time
import dzg_eklentisi as ext
from dizge_lexer import Lexer
from dizge_parser import Parser,Tanım,Uygula,Ad,ağaç
from dizge_compiler import Derleyici
import numpy as np
root=Path(__file__).parent;out=root/'derleme';out.mkdir(exist_ok=True)
start=time.perf_counter();source=(root/'akıslar.dzg').read_text(encoding='utf-8');ast=Parser().ayrıştır(Lexer().tokenize(source));program=Derleyici('akıslar.dzg').derle(ast)
(out/'upstream.py').write_text(program.modül,encoding='utf-8');env={'ç':ext.core}
for step in program.adımlar:exec(step.py,env)
nodes={s.ad:s.değer for s in ast.cümleler if isinstance(s,Tanım)}
def js(node,stop):
 if isinstance(node,Ad):return 'input' if node.ad==stop else js(nodes[node.ad],stop)
 if isinstance(node,Uygula):
  if set(node.argümanlar)!={'veri'}:raise ValueError('Yalnızca ilgi→veri desteklenir')
  return 'K.'+ext.OPS[node.işlev]+'('+js(node.argümanlar['veri'],stop)+')'
 raise ValueError('Bu arka uçta desteklenmeyen AST düğümü')
targets={'newton':('kökadımı','başlangıç'),'gravity':('soncisimler','cisimler'),'quantum':('sondalga','dalga')}
code='// Resmi Dizge AST çıktısı; elle yazılmış boru hattı değildir.\nconst FLOW=Object.freeze({\n'+',\n'.join(json.dumps(name)+': input => '+js(nodes[output],initial) for name,(output,initial) in targets.items())+'\n});\n'
(root/'dizge-akis.js').write_text(code,encoding='utf-8')
(out/'ast.txt').write_text('\n'.join(line for s in ast.cümleler for line in ağaç(s)),encoding='utf-8')
z=.5+.2j;assert abs(env['kökadımı']['z']-(z-(z**3-1)/(3*z*z)))<1e-13
assert abs(np.sum(abs(env['sondalga']['psi'])**2)*env['sondalga']['dx']**2-1)<1e-12
assert not np.shares_memory(env['cisimler']['p'],env['soncisimler']['p'])
report=dict(upstreamCommit='6622ff41165db958d677d68e095a848502666a11',sourceSHA256=hashlib.sha256(source.encode()).hexdigest(),definitions=len(nodes),pythonVerified=['Newton one step','Gravity copy semantics','Quantum unit norm one step'],compileAndExecuteMs=(time.perf_counter()-start)*1000,warnings=program.uyarılar,generatedJS=code)
(out/'kanit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
