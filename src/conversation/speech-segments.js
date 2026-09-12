// Hold incomplete sentences so speech never ends in the middle of a word.
export class SpeechSegments {
  constructor({clauseThreshold=88}={}){this.pending='';this.clauseThreshold=clauseThreshold;}
  push(text,final=false){
    this.pending+=text;const result=[];
    let match;
    while((match=/^([\s\S]*?[.!?][”"']?)(?:\s+|$)/.exec(this.pending))){
      if(!final&&match[0].length===this.pending.length)break;
      result.push(match[1].trim());this.pending=this.pending.slice(match[0].length);
    }
    if(!final&&this.pending.length>=this.clauseThreshold){
      const boundary=Math.max(this.pending.lastIndexOf(', '),this.pending.lastIndexOf('; '),this.pending.lastIndexOf(': '),this.pending.lastIndexOf(' — '));
      if(boundary>=Math.floor(this.clauseThreshold*.55)){
        const separator=this.pending.startsWith(' — ',boundary)?3:1;
        result.push(this.pending.slice(0,boundary+separator).trim());
        this.pending=this.pending.slice(boundary+separator).trimStart();
      }
    }
    if(final&&this.pending.trim()){result.push(this.pending.trim());this.pending='';}
    return result.filter(Boolean);
  }
}
