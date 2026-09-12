import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';

/** A persistent JSON-lines worker that can emit many events for one stream. */
export class JsonEventWorker {
  constructor(command,args,onEvent){
    this.failure=null;this.closed=false;this.onEvent=onEvent;
    this.ready=new Promise((resolve,reject)=>{this.markReady=resolve;this.failReady=reject;});this.ready.catch(()=>{});
    this.child=spawn(command,args,{stdio:['pipe','pipe','inherit']});
    this.fail=error=>{if(this.failure)return;this.failure=error;this.failReady(error);};
    this.child.on('error',this.fail);this.child.on('close',()=>this.fail(Error(this.closed?'Streaming recognizer closed.':'Streaming recognizer stopped.')));
    createInterface({input:this.child.stdout}).on('line',line=>{try{const event=JSON.parse(line);if(event.ready)this.markReady();else this.onEvent?.(event);}catch{}});
  }
  send(event){
    if(this.failure)return false;
    try{
      this.child.stdin.write(JSON.stringify(event)+'\n',error=>{if(error)this.fail(error);});
      return true;
    }catch(error){this.fail(error);return false;}
  }
  close(){this.closed=true;if(!this.child.killed)this.child.kill('SIGTERM');}
}
