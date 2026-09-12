import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {JsonWorker} from './json-worker.mjs';
const exec=promisify(execFile);
const dir=await mkdtemp(join(tmpdir(),'myavatar-recognition-'));
const python=process.env.MYAVATAR_WHISPER_PYTHON||'.venv/bin/python';
const worker=new JsonWorker(python,['scripts/whisper-worker.py',process.env.MYAVATAR_WHISPER_MODEL||'large-v3-turbo']);
try{
  for(const [index,voice,text] of [[0,'af_nova','Please remind me to call my brother tomorrow morning.'],[1,'hf_alpha','कल सुबह मुझे अपने भाई को फोन करना याद दिलाना।'],[2,'hf_alpha','कल morning मेरी meeting है, please मुझे reminder देना।']]){
    const path=join(dir,`${index}.wav`);const audio=await exec(python,['scripts/kokoro-tts.py','models/kokoro-v1.0.onnx','models/voices-v1.0.bin',voice,'1',index?'hi':'en-us',text],{maxBuffer:8*1024*1024});await writeFile(path,Buffer.from(audio.stdout.trim(),'base64'));
    const result=await worker.request({path,language:null},120000);if(!result.text)throw Error(`Recognition failed: ${JSON.stringify(result)}`);
    console.log(JSON.stringify({fixture:text,...result}));
    if(index===0&&!result.text.toLowerCase().includes('brother tomorrow'))throw Error('English recognition regression');
    if(index===1&&!result.text.includes('फोन'))throw Error('Hindi recognition regression');
    if(index===2&&!result.uncertain&&!/meeting|मीटिंग|मिटिंग/i.test(result.text))throw Error('Mixed-language error was accepted confidently');
  }
}finally{worker.close();await rm(dir,{recursive:true,force:true});}
