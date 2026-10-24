process.chdir(__dirname);
const fs=require('node:fs'),vm=require('node:vm');
const file=process.argv[2]||'normal-akis.js';
const code=fs.readFileSync('runtime.js','utf8')+'\n'+fs.readFileSync(file,'utf8')+'\n'+fs.readFileSync('testler.js','utf8')+'\nrunChecks(FLOW,REFERENCE,{benchmark:BENCHMARK}).then(result=>{fs.writeFileSync(OUTPUT,JSON.stringify(result,null,2));console.log(JSON.stringify({passed:result.passed,total:result.total,byGroup:result.byGroup,failed:result.results.filter(x=>!x.pass),performance:result.performance},null,2));if(result.results.some(x=>x.group!=="performance"&&!x.pass))process.exitCode=1;});';
const context={console,Float64Array,Float32Array,Math,Number,Object,Array,JSON,Error,Promise,Date,performance,fs,process,REFERENCE:JSON.parse(fs.readFileSync('referans.json')),OUTPUT:file.startsWith('normal')?'normal-node.json':'dizge-node.json',BENCHMARK:process.argv[3]!=='--no-benchmark'};
vm.runInNewContext(code,context);
