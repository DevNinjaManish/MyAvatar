const BACKCHANNELS=Object.freeze({
  nova:Object.freeze({question:['Mm-hm. I’m thinking that through.','I’m with you. Let me consider that.'],task:['Got it. I’m on it.','Okay. I’m working through that.'],explain:['I follow. Keep going.','Okay, I’m with you.']}),
  sterling:Object.freeze({question:['Understood. I’m considering it.','A good question. Let me examine it.'],task:['Certainly. I’m handling the details.','Understood. I’ll work through it.'],explain:['I follow. Please continue.','Understood. I’m listening.']}),
  rivet:Object.freeze({question:['Good question. Let me crack it.','Yep. I’m untangling that.'],task:['Got it. Working on it.','I’m on it. Give me a beat.'],explain:['Yep, I follow.','Got it. Keep going.']}),
  luma:Object.freeze({question:['Mm. Let me follow that thread.','I’m with you. Let me shape an answer.'],task:['Got it. I’m bringing it together.','I see it. Let me shape that.'],explain:['I’m following the thread.','I see what you mean.']})
});

function contextFor(text){
  const value=String(text).toLowerCase();
  if(/[?]$/.test(value)||/^(how|why|what|when|where|who|can|could|should|would|is|are|do|does|kya|kaise|kyun|kaha|kab)\b/u.test(value))return 'question';
  if(/\b(please|make|create|fix|check|find|open|close|remind|plan|compare|build|update|bana|karo|karna|dikhao)\b/u.test(value))return 'task';
  return 'explain';
}

export function backchannelFor(bot='nova',turn=0,text=''){
  const persona=BACKCHANNELS[bot]||BACKCHANNELS.nova;const options=persona[contextFor(text)];
  const seed=[...String(text)].reduce((sum,char)=>sum+char.codePointAt(0),Number(turn)||0);
  return options[Math.abs(seed)%options.length];
}

export function shouldBackchannel(text=''){
  return String(text).trim().split(/\s+/).filter(Boolean).length>=7;
}
