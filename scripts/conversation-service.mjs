import {randomUUID} from 'node:crypto';
import {WebSocketServer} from 'ws';

const port=8787;
const token=process.env.MYAVATAR_RUNTIME_TOKEN||'local-mvp';
const model='qwen3.5:0.8b';
const ollamaUrl='http://127.0.0.1:11434/api/chat';

const server=new WebSocketServer({host:'127.0.0.1',port});
server.on('connection',(socket,request)=>{
  if(new URL(request.url,'ws://127.0.0.1').searchParams.get('token')!==token){socket.close(1008,'Unauthorized');return;}
  const sessionId=randomUUID();let sequence=0;let stopped=new Set();
  const send=(event)=>socket.send(JSON.stringify({runtimeVersion:1,sessionId,sequence:++sequence,botId:'rivet',...event}));
  send({type:'config',config:{conversation:{persona:'rivet'},bots:{rivet:{name:'Rivet'}}}});
  socket.on('message',async raw=>{
    let message;try{message=JSON.parse(raw.toString());}catch{return;}
    if(message.type==='stop'){stopped.add(message.turn);return;}
    if(message.type!=='turn'||!Number.isInteger(message.turn)||typeof message.text!=='string')return;
    const turn=message.turn;
    try{
      const response=await fetch(ollamaUrl,{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(30000),body:JSON.stringify({model,stream:true,think:false,options:{num_predict:256},messages:[{role:'user',content:message.text}]})});
      if(!response.ok)throw Error(`Local model returned HTTP ${response.status}.`);
      const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';
      while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines){if(stopped.has(turn)){reader.cancel();break;}if(!line.trim())continue;const part=JSON.parse(line);const text=part.message?.content||'';if(text)send({type:'token',turn,text});}if(stopped.has(turn))break;}
      if(buffer.trim()&&!stopped.has(turn)){const part=JSON.parse(buffer);const text=part.message?.content||'';if(text)send({type:'token',turn,text});}
      if(stopped.has(turn)){stopped.delete(turn);return;}
      send({type:'done',turn});
    }catch(error){if(!stopped.has(turn))send({type:'error',turn,message:`Conversation service unavailable: ${error.message}`});stopped.delete(turn);}
  });
});
server.on('listening',()=>console.log(`Conversation service listening on ws://127.0.0.1:${port}`));
