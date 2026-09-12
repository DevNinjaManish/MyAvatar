import assert from 'node:assert/strict';
import WebSocket from 'ws';
const socket=new WebSocket('ws://127.0.0.1:8787/?token=local-mvp');
const waiters=[];
socket.on('message',raw=>{const event=JSON.parse(raw);for(const waiter of [...waiters])if(waiter.accept(event)){waiters.splice(waiters.indexOf(waiter),1);clearTimeout(waiter.timer);waiter.resolve(event);}});
function wait(accept){return new Promise((resolve,reject)=>{const waiter={accept,resolve,timer:setTimeout(()=>reject(Error('Dialogue test timed out')),90000)};waiters.push(waiter);});}
function send(message){socket.send(JSON.stringify(message));}
async function turn(id,text){
  let chunks=0,reply='';const listener=raw=>{const e=JSON.parse(raw);if(e.turn!==id)return;if(e.type==='audio'){const wav=Buffer.from(e.audio,'base64');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.ok(wav.length>44);chunks++;}if(e.type==='token')reply+=e.text;};
  socket.on('message',listener);const done=wait(e=>e.turn===id&&['done','error'].includes(e.type));send({type:'turn',turn:id,text,speak:true});const result=await done;socket.off('message',listener);assert.equal(result.type,'done',result.message);assert.ok(chunks>0);return {reply,chunks};
}
try{
  await wait(e=>e.type==='config');const profile=wait(e=>e.type==='profile');send({type:'set_profile',profile:'balanced'});await profile;
  console.log(await turn(1,'Remember that my favourite fruit is mango. Confirm briefly.'));
  const recall=await turn(2,'What is my favourite fruit?');assert.match(recall.reply,/mango/i);console.log('Conversation recall:',recall);
  const multi=await turn(3,'Say exactly these two sentences: The sun is bright. The moon is quiet.');assert.ok(multi.chunks>=2);console.log('Ordered sentence audio:',multi.chunks);
  for(const [index,botId] of ['sterling','rivet','luma'].entries()){
    const switched=wait(e=>e.type==='config'&&e.botId===botId);send({type:'switch_bot',botId});await switched;
    console.log(botId,await turn(index+4,'Say hello in one short sentence.'));
  }
  console.log('Voice dialogue checks passed.');
}finally{for(const waiter of waiters)clearTimeout(waiter.timer);socket.close();}
