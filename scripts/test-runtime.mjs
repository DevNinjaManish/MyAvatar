import WebSocket from 'ws';

const socket=new WebSocket('ws://127.0.0.1:8787/?token=local-mvp');
let sawWarming=false,sawConfig=false,sawProfile=false,sawGreeting=false,sawHealth=false,sawToken=false,text='';
const timer=setTimeout(()=>{console.error('runtime integration timeout');process.exit(1);},30000);
socket.on('message',data=>{
  const event=JSON.parse(data);
  if(event.type==='readiness')sawWarming=event.readiness?.state==='warming'&&event.readiness?.ready===false;
  if(event.type==='config'){sawConfig=Boolean(event.runtime?.profileSettings?.maxTokens);socket.send(JSON.stringify({type:'set_profile',profile:'balanced'}));socket.send(JSON.stringify({type:'greeting'}));}
  if(event.type==='profile')sawProfile=event.profile==='balanced'&&event.settings?.maxTokens===256;
  if(event.type==='greeting'){sawGreeting=true;socket.send(JSON.stringify({type:'health'}));}
  if(event.type==='health'){sawHealth=true;socket.send(JSON.stringify({type:'turn',turn:1,text:'Reply with one short word.',mode:'typed'}));}
  if(event.type==='token'){sawToken=true;text+=event.text;}
  if(event.type==='done'){clearTimeout(timer);if(!sawWarming||!sawConfig||!sawProfile||!sawGreeting||!sawHealth||!sawToken||!text.trim()){console.error('Runtime did not pass warmup, config, profile, greeting, health, and streaming checks.');process.exit(1);}console.log(`Runtime integration passed: ${text.trim()}`);socket.close();}
  if(event.type==='error'){clearTimeout(timer);console.error(event.message);process.exit(1);}
});
socket.on('error',error=>{clearTimeout(timer);console.error(error.message);process.exit(1);});
