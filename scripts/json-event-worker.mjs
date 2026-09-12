import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';

/** A persistent JSON-lines worker that can emit many events for one stream. */
export class JsonEventWorker {
  constructor(command,args,onEvent){
    this.failure=null;this.onEvent=onEvent;
    this.ready=new Promise((resolve,reject)=>{this.markReady=resolve;this.failReady=reject;});this.ready.catch(()=>{});
    this.child=spawn(command,args,{stdio:['pipe','pipe','inherit']});
    const fail=error=>{this.failure=error;this.failReady(error);};
    this.child.on('error',fail);this.child.on('close',()=>fail(Error('Streaming recognizer stopped.')));
    createInterface({input:this.child.stdout}).on('line',line=>{try{const event=JSON.parse(line);if(event.ready)this.markReady();else this.onEvent?.(event);}catch{}});
  }
  send(event){
    if(this.failure)return false;
    this.child.stdin.write(JSON.stringify(event)+'\n');return true;
  }
  close(){this.child.kill('SIGTERM');}
}
