import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {existsSync} from 'node:fs';
const token=randomBytes(24).toString('hex');
if(!existsSync('.venv/bin/python'))throw Error('Run setup commands in README first.');
const children=[];
function run(cmd,args,extra={}){const c=spawn(cmd,args,{stdio:'inherit',env:{...process.env,MYAVATAR_TOKEN:token,HF_HUB_OFFLINE:"1",MYAVATAR_WARMUP:"1",VITE_API_TOKEN:token,...extra}});children.push(c);return c;}
let stopping=false;function stop(){if(stopping)return;stopping=true;children.forEach(c=>c.kill('SIGTERM'));setTimeout(()=>process.exit(),300).unref();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
const backend=run('.venv/bin/python',['-m','uvicorn','backend.app:app','--host','127.0.0.1','--port','8765']);
const vite=run('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort']);
// The UI can be closed and re-opened without destroying the local services.
backend.on('exit',()=>stop());
vite.on('exit',()=>stop());
async function wait(url){for(let i=0;i<120;i++){if(stopping)return;try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('Startup timed out');}
try{await Promise.all([wait('http://127.0.0.1:5173'),wait('http://127.0.0.1:8765/health')]);if(!stopping)run('node_modules/.bin/electron',['.']);}catch(e){console.error(e);stop();}
