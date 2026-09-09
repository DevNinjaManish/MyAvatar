export class TurnPlaybackCoordinator {
  constructor(){this.epoch=0;this.reset();}
  reset(){this.activeTurn=null;this.serverDone=false;this.expected=[];this.decoding=0;this.queued=0;this.playing=0;}
  beginTurn(turn){
    if(!Number.isInteger(turn)||turn<=0)return false;
    this.epoch++;this.reset();this.activeTurn=turn;return true;
  }
  cancelTurn(){this.epoch++;this.reset();}
  noteServerEvent(event){
    if(!event||!Number.isInteger(event.turn)||event.turn!==this.activeTurn)return false;
    if(event.type==='audio'){
      this.expected.push({epoch:this.epoch,turn:event.turn,state:'expected'});return true;
    }
    if(event.type==='done'){
      this.serverDone=true;this._settle();return true;
    }
    if(event.type==='error'){
      this.cancelTurn();return true;
    }
    return false;
  }
  beginAudioDecode(){
    const token=this.expected.shift();
    if(!this._valid(token)||token.state!=='expected')return null;
    token.state='decoding';this.decoding++;return token;
  }
  finishAudioDecode(token,accepted){
    if(!this._valid(token)||token.state!=='decoding')return false;
    this.decoding=Math.max(0,this.decoding-1);
    if(accepted){token.state='queued';this.queued++;}
    else token.state='dropped';
    this._settle();return true;
  }
  playbackStarted(token){
    if(!this._valid(token)||token.state!=='queued')return false;
    this.queued=Math.max(0,this.queued-1);token.state='playing';this.playing++;return true;
  }
  playbackEnded(token){
    if(!this._valid(token)||token.state!=='playing')return false;
    this.playing=Math.max(0,this.playing-1);token.state='done';this._settle();return true;
  }
  discardAudio(token){
    if(!this._valid(token))return false;
    if(token.state==='expected')this.expected=this.expected.filter(item=>item!==token);
    else if(token.state==='decoding')this.decoding=Math.max(0,this.decoding-1);
    else if(token.state==='queued')this.queued=Math.max(0,this.queued-1);
    else if(token.state==='playing')this.playing=Math.max(0,this.playing-1);
    else return false;
    token.state='dropped';this._settle();return true;
  }
  canResumeListening(){
    return this.activeTurn===null&&this.expected.length===0&&this.decoding===0&&this.queued===0&&this.playing===0;
  }
  snapshot(){
    return {epoch:this.epoch,activeTurn:this.activeTurn,serverDone:this.serverDone,expected:this.expected.length,decoding:this.decoding,queued:this.queued,playing:this.playing,canResumeListening:this.canResumeListening()};
  }
  _valid(token){return !!token&&token.epoch===this.epoch&&token.turn===this.activeTurn;}
  _settle(){
    if(this.serverDone&&this.expected.length===0&&this.decoding===0&&this.queued===0&&this.playing===0){
      this.activeTurn=null;this.serverDone=false;
    }
  }
}

export const turnPlayback=new TurnPlaybackCoordinator();
