/* İki uygulamayı aynı dış referanslar ve aynı sıra ile ölçen ortak test. */
async function auditAtlas(frame) {
  const w=frame.contentWindow,a=w.atlas,results=[];
  if(!a)throw Error('atlas arayüzü bulunamadı');
  const check=(name,pass,detail='')=>results.push({name,pass:!!pass,detail});
  const close=(x,y)=>Number.isFinite(x)&&Math.abs(x-y)<1e-9;
  const initial=a.exportSettings(),original=JSON.stringify(initial);
  const references=[['square',1,1,0,2],['square',-2,1,3,-4],['cubic',0,1,-1,-1],['cubic',1,0,0,0],['exp',0,0,1,0],['exp',Math.log(2),Math.PI/2,0,2],['sin',Math.PI/2,0,1,0],['sin',0,Math.log(2),0,.75],['mobius',0,1,0,1],['mobius',2,0,1/3,0],['reciprocal',1,1,.5,-.5],['reciprocal',-2,0,-.5,0]];
  const own=a.test();check('Dahili matematik testleri',own.passed===own.total,`${own.passed}/${own.total}`);
  for(const[f,x,y,re,im]of references){a.set({fn:f});const v=a.sample(x,y);check(`${f} bağımsız referans (${x},${y})`,v.valid&&close(v.re,re)&&close(v.im,im));}
  a.set({fn:'square'});for(const[mode,h]of Object.entries({log:Math.log(3),abs:2,re:0,im:2})){a.set({mode});check('Yükseklik '+mode,close(a.sample(1,1).height,h));}
  a.set({fn:'reciprocal'});check('1/z kutbu',!a.sample(0,0).valid);a.set({fn:'mobius'});check('Möbius kutbu',!a.sample(-1,0).valid);a.set({fn:'square'});check('NaN girdi reddi',!a.sample(NaN,0).valid);check('Infinity girdi reddi',!a.sample(0,Infinity).valid);check('Sıfır fazı tanımsız',a.sample(0,0).phase===null);
  const invalid=[{resolution:161},{resolution:32.5},{radius:0},{scale:NaN},{fn:'__proto__'},{fn:'missing'},{fn:['square']},{mode:['abs']},{mode:'missing'},{auto:'true'},{yaw:Infinity},{distance:0},{unknown:1},null,[]];
  for(const patch of invalid){const before=JSON.stringify(a.exportSettings());let rejected=false;try{a.set(patch)}catch(e){rejected=true}check('Geçersiz ayar '+JSON.stringify(patch),rejected&&before===JSON.stringify(a.exportSettings()));a.importSettings(before);}
  a.importSettings(original);a.set({fn:'sin',radius:3,resolution:160,scale:1.2,mode:'im',yaw:1,pitch:.5,distance:9,auto:false});const saved=JSON.stringify(a.exportSettings());a.set({fn:'square',radius:1});a.importSettings(saved);check('JSON tam gidiş dönüş',saved===JSON.stringify(a.exportSettings()));
  const bad=['{bad}',JSON.stringify({...initial,version:999}),JSON.stringify({...initial,state:{...initial.state,radius:10}}),JSON.stringify({...initial,state:{fn:'square'}}),JSON.stringify({...initial,state:{...initial.state,fn:'__proto__'}})];
  for(const text of bad){const before=JSON.stringify(a.exportSettings());let rejected=false;try{a.importSettings(text)}catch(e){rejected=true}check('Bozuk JSON atomik reddi '+text.slice(0,55),rejected&&before===JSON.stringify(a.exportSettings()));}
  a.importSettings(original);a.set({resolution:160,auto:false});const performanceRuns=[];
  for(let k=0;k<7;k++){a.set({fn:k%2?'cubic':'square'});performanceRuns.push(a.stats().buildMs)}
  check('160 çözünürlük köşe/üçgen sayısı',a.stats().vertices===25921&&a.stats().triangles===51200,JSON.stringify(a.stats()));
  a.set({fn:'reciprocal',resolution:160,mode:'abs'});const singular=a.stats();check('Tekil örgü maskeleme/kırpma',singular.masked>0&&singular.clipped>0);
  const allStates=[];for(const fn of['square','cubic','exp','sin','mobius','reciprocal'])for(const mode of['log','abs','re','im']){a.set({fn,mode,radius:4,resolution:160,scale:2});const s=a.stats();allStates.push({fn,mode,triangles:s.triangles,buildMs:s.buildMs});check('En yüksek parametreler '+fn+'/'+mode,Number.isFinite(s.buildMs)&&s.triangles>0&&s.triangles<=51200)}
  a.importSettings(original);a.set({auto:true});
  // Eşzamanlı örgü testlerinden sonra ilk karelerin birikmiş gecikmesini dışla.
  const fps=await new Promise(resolve=>{let start,prev,count=0,warmup=0;const d=[];function tick(t){if(warmup++<8){w.requestAnimationFrame(tick);return}if(!start){start=t;prev=t;}else{d.push(t-prev);prev=t;count++}if(t-start>=1200)resolve({fps:1000*count/(t-start),frames:count,durationMs:t-start,p95Ms:d.sort((x,y)=>x-y)[Math.floor(d.length*.95)],sufficientFrames:count>=30,visibility:w.document.visibilityState,warmupFrames:8});else w.requestAnimationFrame(tick)}w.requestAnimationFrame(tick)});
  a.importSettings(original);const canvas=w.document.querySelector('canvas');let png='';try{png=canvas.toDataURL('image/png')}catch(e){}check('Gerçek PNG kodlama',png.startsWith('data:image/png;base64,')&&png.length>10000,`${png.length} karakter`);
  const gl=canvas.getContext('webgl');check('WebGL çizim hatası yok',gl&&gl.getError()===gl.NO_ERROR);check('Gerçek sayaçlar',a.stats().fps>0&&a.stats().buildMs>0);
  const cameraStart=a.exportSettings().state;
  canvas.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));check('Klavye yörünge',a.exportSettings().state.yaw>cameraStart.yaw);
  canvas.dispatchEvent(new w.KeyboardEvent('keydown',{key:'+',bubbles:true,cancelable:true}));check('Klavye yakınlaşma',a.exportSettings().state.distance<cameraStart.distance);
  canvas.dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));check('Klavye otomatik dönme',a.exportSettings().state.auto===true);
  canvas.dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));check('Dönmeyi duraklat',a.exportSettings().state.auto===false);
  canvas.dispatchEvent(new w.KeyboardEvent('keydown',{key:'r',bubbles:true,cancelable:true}));check('Kamera sıfırlama',Math.abs(a.exportSettings().state.yaw-cameraStart.yaw)<1e-8&&a.exportSettings().state.distance===cameraStart.distance);
  const input=w.document.querySelector('input[type=number]'),oldValue=input.value;input.value='';check('Boş sayı alanı native reddedilir',!input.checkValidity());input.value=oldValue;
  a.importSettings(original);
  const sort=performanceRuns.slice(1).sort((x,y)=>x-y),renderer=gl?{vendor:gl.getParameter(gl.VENDOR),renderer:gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION)}:null;
  return{timestamp:new Date().toISOString(),userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},renderer,passed:results.filter(x=>x.pass).length,total:results.length,results,performance:{buildSamplesMs:performanceRuns,warmupDiscarded:1,medianMs:(sort[2]+sort[3])/2,animation:fps},maxStates:allStates,ownTests:own};
}
