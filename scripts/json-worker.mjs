import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
export class JsonWorker {
  constructor(command,args){
    this.pending=new Map();this.sequence=0;this.failure=null;this.closed=false;
    this.ready=new Promise((resolve,reject)=>{this.markReady=resolve;this.failReady=reject;});this.ready.catch(()=>{});
    this.child=spawn(command,args,{stdio:['pipe','pipe','inherit']});
    this.fail=error=>{if(this.failure)return;this.failure=error;this.failReady(error);for(const item of this.pending.values())item.reject(error);this.pending.clear();};
    this.child.on('error',this.fail);this.child.on('close',()=>this.fail(Error(this.closed?'Speech recognizer closed.':'Speech recognizer stopped.')));
    createInterface({input:this.child.stdout}).on('line',line=>{
      let result;try{result=JSON.parse(line);}catch{return;}
      if(result.ready){this.markReady();return;}
      const item=this.pending.get(result.id);if(!item)return;this.pending.delete(result.id);
      result.error?item.reject(Error(result.error)):item.resolve(result);
    });
  }
  request(data,timeoutMs=60000){
    if(this.failure)return Promise.reject(this.failure);
    return new Promise((resolve,reject)=>{
      const id=++this.sequence;const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Speech recognition timed out.'));},timeoutMs);
      const item={resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}};
      this.pending.set(id,item);
      try{this.child.stdin.write(JSON.stringify({...data,id})+'\n',error=>{if(error){this.pending.delete(id);item.reject(error);}});}
      catch(error){this.pending.delete(id);item.reject(error);}
    });
  }
  close(){this.closed=true;if(!this.child.killed)this.child.kill('SIGTERM');}
}
