// Hold incomplete sentences so speech never ends in the middle of a word.
export class SpeechSegments {
  constructor(){this.pending='';}
  push(text,final=false){
    this.pending+=text;const result=[];
    let match;
    while((match=/^([\s\S]*?[.!?][”"']?)(?:\s+|$)/.exec(this.pending))){
      if(!final&&match[0].length===this.pending.length)break;
      result.push(match[1].trim());this.pending=this.pending.slice(match[0].length);
    }
    if(final&&this.pending.trim()){result.push(this.pending.trim());this.pending='';}
    return result.filter(Boolean);
  }
}
