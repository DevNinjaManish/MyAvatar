// Hold incomplete sentences so speech never ends in the middle of a word.
// A complete terminal sentence is safe to release even when it is the newest
// streamed text. Waiting for the next token added a perceptible, unnecessary
// gap before the first spoken reply.
const terminalNeedsContext=text=>/\.\.\.$|(?:\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|No|Fig|Inc|Ltd|Co|U\.S|U\.K)|(?:^|\s)[A-Z])\.$/iu.test(text);
export class SpeechSegments {
  constructor({clauseThreshold=88}={}){this.pending='';this.clauseThreshold=clauseThreshold;}
  push(text,final=false){
    this.pending+=text;const result=[];
    let match;
    while((match=/^([\s\S]*?[.!?][”"']?)(?:\s+|$)/.exec(this.pending))){
      if(terminalNeedsContext(match[1])){
        const remainder=this.pending.slice(match[0].length);
        const continuation=/^([\s\S]*?[.!?][”"']?)(?:\s+|$)/.exec(remainder);
        if(continuation&&!terminalNeedsContext(continuation[1])){
          result.push(`${match[1]} ${continuation[1]}`.replace(/\s+/g,' ').trim());
          this.pending=remainder.slice(continuation[0].length);continue;
        }
        if(!final)break;
      }
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
