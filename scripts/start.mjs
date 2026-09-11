import {spawn} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import electronPath from 'electron';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const vite=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{cwd:root,stdio:'inherit'});
let electron;
let stopping=false;
const stop=()=>{if(stopping)return;stopping=true;vite.kill('SIGTERM');electron?.kill('SIGTERM');setTimeout(()=>process.exit(),300).unref();};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
vite.on('exit',(code)=>{if(!stopping&&code!==0)stop();});

const waitForVite=async()=>{
  for(let attempt=0;attempt<60;attempt++){
    try{const response=await fetch('http://127.0.0.1:5173',{signal:AbortSignal.timeout(1000)});if(response.ok){await response.body?.cancel();return;}}catch{}
    await new Promise(resolveDelay=>setTimeout(resolveDelay,250));
  }
  throw Error('Vite did not become ready.');
};

try{await waitForVite();electron=spawn(electronPath,[root],{cwd:root,stdio:'inherit'});electron.on('exit',stop);}catch(error){console.error(error);stop();}
