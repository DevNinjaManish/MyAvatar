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

const SAFE_PHASES=new Set(['idle','listening','understanding','context','planning','working','verifying','needs_approval','thinking','writing','speaking','complete','blocked','cancelled','error','interrupted','failed']);
const LONG_WORK_MS=4500;
const MAX_FOCUS_PROMPT_CHARS=120;

function compactFocus(value){
  const text=String(value||'').replace(/\s+/g,' ').trim();
  if(!text)return '';
  return text.length<=MAX_FOCUS_PROMPT_CHARS?text:text.slice(0,MAX_FOCUS_PROMPT_CHARS-1).trimEnd()+'…';
}

export function quickActionsForBot(botId,{focus='',excludeLabels=[]}={}){
  const actions=BOT_QUICK_ACTIONS[botId]||BOT_QUICK_ACTIONS.nova;
  const excluded=new Set(Array.isArray(excludeLabels)?excludeLabels:[]);
  const context=compactFocus(focus);
  const available=actions.filter(([label])=>!excluded.has(label));
  const selected=(available.length?available:actions).slice(0,3);
  return selected.map(([label,prompt])=>({
    label,
    prompt:context?`${prompt} Current focus: ${context}`:prompt,
  }));
}

export function conversationPhaseFromEvent(event,current='idle'){
  if(!event||typeof event!=='object')return current;
  if(event.type==='state'){
    const value=String(event.state||'').toLowerCase();
    if(['idle','listening','thinking','speaking'].includes(value))return value;
    return current;
  }
  if(event.type==='agent_state'){
    const value=String(event.agentState?.phase||'').toLowerCase();
    if(['understanding','context','planning','working','verifying','needs_approval','complete','blocked','cancelled','error'].includes(value))return value;
  }
  if(event.type==='token'||event.type==='first_token')return 'writing';
  if(event.type==='audio')return 'speaking';
  if(event.type==='done')return current==='speaking'?'speaking':'complete';
  if(event.type==='error')return 'failed';
  return current;
}

export function safeConversationPhase(value){return SAFE_PHASES.has(value)?value:'idle';}
export function phaseLabel(phase,{longRunning=false}={}){
  const labels={idle:'Ready',listening:'Listening',understanding:'Understanding…',context:'Checking context…',planning:'Planning…',working:'Working…',verifying:'Verifying…',needs_approval:'Needs approval',thinking:longRunning?'Still thinking locally…':'Thinking…',writing:longRunning?'Still preparing reply…':'Replying…',speaking:'Speaking',complete:'Ready',blocked:'Blocked',cancelled:'Cancelled',error:'Needs attention',interrupted:'Interrupted',failed:'Needs attention'};
  return labels[safeConversationPhase(phase)]||'Ready';
}

export function mountInteractionIntelligence(win=window,doc=document){
  if(win.__myavatarInteractionIntelligence)return win.__myavatarInteractionIntelligence;
  let phase='idle',longRunning=false,longTimer=null;
  const armLongWork=()=>{
    clearTimeout(longTimer);longTimer=null;longRunning=false;
    if(!['thinking','writing'].includes(phase))return;
    longTimer=setTimeout(()=>{if(['thinking','writing'].includes(phase)){longRunning=true;render();}},LONG_WORK_MS);
  };
  const render=()=>{
    const value=safeConversationPhase(phase);
    doc.body.dataset.conversationPhase=value;
    doc.body.dataset.longWork=String(longRunning&&['thinking','writing'].includes(value));
    const state=doc.getElementById('widget-chat-state');
    if(state)state.textContent=phaseLabel(value,{longRunning});
  };
  const setPhase=next=>{
    const value=safeConversationPhase(next);
    if(value!==phase){phase=value;armLongWork();}
    render();
  };
  const onRuntime=event=>setPhase(conversationPhaseFromEvent(event.detail||{},phase));
  const onAgentTask=event=>setPhase(conversationPhaseFromEvent({type:'agent_state',agentState:event.detail||{}},phase));
  const onClient=event=>{
    if(event.detail?.type==='turn')setPhase('thinking');
    else if(event.detail?.type==='stop')setPhase('interrupted');
  };
  const onClose=()=>setPhase('idle');
  win.addEventListener('myavatar:runtime-event',onRuntime);
  win.addEventListener('myavatar:agent-task',onAgentTask);
  win.addEventListener('myavatar:client-message',onClient);
  win.addEventListener('myavatar:socket-close',onClose);
  render();
  const api={snapshot:()=>({phase:safeConversationPhase(phase),longRunning}),dispose(){clearTimeout(longTimer);win.removeEventListener('myavatar:runtime-event',onRuntime);win.removeEventListener('myavatar:agent-task',onAgentTask);win.removeEventListener('myavatar:client-message',onClient);win.removeEventListener('myavatar:socket-close',onClose);delete win.__myavatarInteractionIntelligence;}};
  win.__myavatarInteractionIntelligence=api;return api;
}
