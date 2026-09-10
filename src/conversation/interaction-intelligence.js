const BOT_QUICK_ACTIONS={
  robot:[
    ['Inspect project','Inspect this project and tell me the most useful next change.'],
    ['Run tests','Run the safe tests for the current project and explain any failures.'],
    ['Explain changes','Explain the current project changes in simple terms.'],
  ],
  nova:[
    ['Plan next','Help me choose the best next thing to do.'],
    ['Prioritize','Help me prioritize what I should focus on now.'],
    ['Draft message','Help me draft a concise message.'],
  ],
  butler:[
    ['Review priorities','Review my current priorities and identify the most important next step.'],
    ['What am I missing?','What important unfinished item might I be overlooking from this conversation?'],
    ['Prepare next steps','Turn what we discussed into a short next-steps plan.'],
  ],
  pixel:[
    ['Give me hooks','Give me three strong hooks for the current marketing objective.'],
    ['Improve copy','Help me sharpen the current caption or marketing copy.'],
    ['Next experiment','Suggest one small marketing experiment that would teach us something useful.'],
  ],
  luma:[
    ['Critique design','Critique the current design direction and name the highest-leverage improvement.'],
    ['Compare options','Help me compare two design options and choose between them.'],
    ['Visual direction','Help me define a clear visual direction for the current brief.'],
  ],
};

const SAFE_PHASES=new Set(['idle','listening','thinking','writing','speaking','complete','interrupted','failed']);

export function quickActionsForBot(botId){
  const actions=BOT_QUICK_ACTIONS[botId]||BOT_QUICK_ACTIONS.nova;
  return actions.map(([label,prompt])=>({label,prompt}));
}

export function conversationPhaseFromEvent(event,current='idle'){
  if(!event||typeof event!=='object')return current;
  if(event.type==='state'){
    const value=String(event.state||'').toLowerCase();
    if(['idle','listening','thinking','speaking'].includes(value))return value;
    return current;
  }
  if(event.type==='token'||event.type==='first_token')return 'writing';
  if(event.type==='audio')return 'speaking';
  if(event.type==='done')return current==='speaking'?'speaking':'complete';
  if(event.type==='error')return 'failed';
  return current;
}

export function safeConversationPhase(value){return SAFE_PHASES.has(value)?value:'idle';}

export function mountInteractionIntelligence(win=window,doc=document){
  if(win.__myavatarInteractionIntelligence)return win.__myavatarInteractionIntelligence;
  let phase='idle';
  const render=()=>{
    const value=safeConversationPhase(phase);
    doc.body.dataset.conversationPhase=value;
    const state=doc.getElementById('widget-chat-state');
    if(state){
      const labels={idle:'Ready',listening:'Listening',thinking:'Thinking…',writing:'Replying…',speaking:'Speaking',complete:'Ready',interrupted:'Interrupted',failed:'Needs attention'};
      state.textContent=labels[value]||'Ready';
    }
  };
  const onRuntime=event=>{phase=conversationPhaseFromEvent(event.detail||{},phase);render();};
  const onClient=event=>{
    if(event.detail?.type==='turn')phase='thinking';
    else if(event.detail?.type==='stop')phase='interrupted';
    render();
  };
  const onClose=()=>{phase='idle';render();};
  win.addEventListener('myavatar:runtime-event',onRuntime);
  win.addEventListener('myavatar:client-message',onClient);
  win.addEventListener('myavatar:socket-close',onClose);
  render();
  const api={snapshot:()=>({phase:safeConversationPhase(phase)}),dispose(){win.removeEventListener('myavatar:runtime-event',onRuntime);win.removeEventListener('myavatar:client-message',onClient);win.removeEventListener('myavatar:socket-close',onClose);delete win.__myavatarInteractionIntelligence;}};
  win.__myavatarInteractionIntelligence=api;return api;
}
