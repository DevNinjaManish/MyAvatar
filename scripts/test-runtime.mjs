import WebSocket from 'ws';

const socket=new WebSocket('ws://127.0.0.1:8787/?token=local-mvp');
let sawConfig=false,sawToken=false,text='';
const timer=setTimeout(()=>{console.error('runtime integration timeout');process.exit(1);},30000);
socket.on('message',data=>{
  const event=JSON.parse(data);
  if(event.type==='config'){sawConfig=true;socket.send(JSON.stringify({type:'turn',turn:1,text:'Reply with one short word.',mode:'typed'}));}
  if(event.type==='token'){sawToken=true;text+=event.text;}
  if(event.type==='done'){clearTimeout(timer);if(!sawConfig||!sawToken||!text.trim()){console.error('Runtime did not stream a response.');process.exit(1);}console.log(`Runtime integration passed: ${text.trim()}`);socket.close();}
  if(event.type==='error'){clearTimeout(timer);console.error(event.message);process.exit(1);}
});
socket.on('error',error=>{clearTimeout(timer);console.error(error.message);process.exit(1);});
