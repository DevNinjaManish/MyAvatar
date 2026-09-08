import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const config=JSON.parse(readFileSync(resolve(root,'config.json'),'utf8'));
const json=process.argv.includes('--json');
const checks=[];
const add=(name,status,detail)=>checks.push({name,status,detail});
const command=(name,args)=>spawnSync(name,args,{encoding:'utf8',timeout:4000});
const modelFor=profile=>config.performanceProfiles[profile].llm.model;

add('macOS',process.platform==='darwin'?'pass':'fail',process.platform==='darwin'?'Supported platform':'MyAvatar V1 currently supports macOS only.');
add('Apple Silicon',process.arch==='arm64'?'pass':'fail',process.arch==='arm64'?'Apple Silicon detected':'Apple Silicon is required for the current MLX speech stack.');
const memory=process.platform==='darwin'?command('sysctl',['-n','hw.memsize']):null;
if(memory?.status===0){
  const gigabytes=Math.round(Number(memory.stdout.trim())/1024**3);
  add('Memory',gigabytes>=16?'pass':'warn',gigabytes>=16?gigabytes+' GB unified memory':gigabytes+' GB unified memory — Low mode is recommended.');
} else add('Memory','warn','Could not determine installed memory.');
const nodeMajor=Number(process.versions.node.split('.')[0]);
add('Node.js',nodeMajor>=20?'pass':'fail',nodeMajor>=20?'Node '+process.versions.node:'Node 20 or newer is required.');
const uv=command('uv',['--version']);
add('uv',uv.status===0?'pass':'fail',uv.status===0?uv.stdout.trim():'Install uv: brew install uv');
add('Python environment',existsSync(resolve(root,'.venv/bin/python'))?'pass':'fail',existsSync(resolve(root,'.venv/bin/python'))?'Found .venv/bin/python':'Run npm run setup.');
add('JavaScript dependencies',existsSync(resolve(root,'node_modules/vite'))?'pass':'fail',existsSync(resolve(root,'node_modules/vite'))?'node_modules installed':'Run npm run setup.');
const speechFiles=['models/kokoro-v1.0.onnx','models/voices-v1.0.bin'];
const missingSpeech=speechFiles.filter(file=>!existsSync(resolve(root,file)));
add('Speech assets',missingSpeech.length?'fail':'pass',missingSpeech.length?'Missing '+missingSpeech.join(', ')+'. Run .venv/bin/python scripts/download_models.py':'Kokoro model and voices found.');
const ollama=command('ollama',['--version']);
if(ollama.status!==0)add('Ollama','fail','Install Ollama: brew install --cask ollama, then open -a Ollama.');
else {
  try {
    const response=await fetch(config.llm.url+'/api/tags',{signal:AbortSignal.timeout(2500)});
    if(!response.ok)throw Error('Ollama did not return its model list.');
    // Ollama normalizes tags to lowercase when it writes its local manifest,
    // while model references such as 4B remain valid at runtime.
    const installed=new Set((await response.json()).models?.map(model=>model.name.toLowerCase())||[]);
    add('Ollama','pass','Ollama is running locally.');
    for(const profile of Object.keys(config.performanceProfiles)){
      const model=modelFor(profile);
      const available=installed.has(model.toLowerCase());
      add('Model: '+profile,available?'pass':'warn',available?model:'Missing '+model+'. Run: ollama pull '+model);
    }
  } catch {
    add('Ollama','fail','Ollama is installed but not responding on 127.0.0.1:11434. Open the Ollama app and try again.');
  }
}
const summary={checks,ready:checks.every(check=>check.status!=='fail')};
if(json)console.log(JSON.stringify(summary,null,2));
else {
  console.log('MyAvatar local readiness');
  for(const check of checks)console.log((check.status==='pass'?'✓':check.status==='warn'?'!':'✗')+' '+check.name+': '+check.detail);
  console.log(summary.ready?'\\nReady to start MyAvatar.':'\\nSetup needs attention before MyAvatar can start.');
}
process.exitCode=summary.ready?0:1;
