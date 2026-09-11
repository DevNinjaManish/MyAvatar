import '../styles/ui-fixture.css';
import {mountRivetWorkspace} from '../widget/rivet-workspace.js';
import {mountRivetTaskPresentation} from '../widget/rivet-task-presentation.js';
import {mountInteractionState} from '../widget/interaction-state.js';
import {mountWidgetAccessibility} from '../widget/accessibility-controller.js';

const FIXTURES=new Set(['compact','listening','thinking','speaking','chat','rivet','chat-rivet','menu','picker','running','approval','blocked','complete','cancelled','offline','limited','limited-approval','speaking-running','wide-diff']);

const taskFor=name=>{
  if(name==='running'||name==='speaking-running')return {id:'fixture-task',botId:'robot',goal:'Polish the companion toolbar',phase:'WORKING',status:'active',steps:[
    {id:'step-1',label:'Inspect UI structure',status:'complete'},
    {id:'step-2',label:'Refine component styles',status:'active'},
    {id:'step-3',label:'Run UI regression checks',status:'pending'},
  ]};
  if(name==='approval'||name==='limited-approval')return {id:'fixture-task',botId:'robot',goal:'Apply approved local changes',phase:'NEEDS_APPROVAL',status:'waiting',steps:[
    {id:'step-1',label:'Inspect project',status:'complete'},
    {id:'step-2',label:'Apply local change',status:'waiting'},
    {id:'step-3',label:'Verify result',status:'pending'},
  ]};
  if(name==='blocked')return {id:'fixture-task',botId:'robot',goal:'Verify local changes',phase:'BLOCKED',status:'blocked',steps:[
    {id:'step-1',label:'Inspect project',status:'complete'},
    {id:'step-2',label:'Run verification',status:'blocked'},
  ]};
  if(name==='complete')return {id:'fixture-task',botId:'robot',goal:'Polish the companion toolbar',phase:'COMPLETE',status:'success',steps:[
    {id:'step-1',label:'Inspect UI structure',status:'complete'},
    {id:'step-2',label:'Refine component styles',status:'complete'},
    {id:'step-3',label:'Run UI regression checks',status:'complete'},
  ]};
  if(name==='cancelled')return {id:'fixture-task',botId:'robot',goal:'Polish the companion toolbar',phase:'CANCELLED',status:'cancelled',steps:[
    {id:'step-1',label:'Inspect UI structure',status:'complete'},
    {id:'step-2',label:'Refine component styles',status:'cancelled'},
  ]};
  return null;
};

function show(node,visible=true){if(node)node.hidden=!visible;}

function seedCompanion(doc){
  const stage=doc.getElementById('stage');
  if(stage&&!stage.querySelector('.ui-fixture-bot')){
    const image=doc.createElement('img');
    image.className='ui-fixture-bot';
    image.src='/assets/bots/rivet/bust.png';
    image.alt='Rivet';
    stage.append(image);
  }
  const icon=doc.getElementById('widget-bot-icon');
  if(icon)icon.src='/assets/bots/rivet/portrait.png';
  const name=doc.getElementById('widget-name');
  if(name)name.textContent='Rivet';
  const project=doc.getElementById('widget-project-name');
  if(project)project.textContent='MyAvatar';
  const brief=doc.getElementById('widget-brief');
  if(brief)brief.value='Polish the companion toolbar and verify the UI states.';
  const controls={
    'widget-mic':'●',
    'widget-chat-toggle':'◫',
    'widget-specialist-toggle':'</>',
  };
  Object.entries(controls).forEach(([id,label])=>{const node=doc.getElementById(id);if(node&&!node.textContent.trim())node.textContent=label;});
  show(doc.getElementById('widget-specialist-toggle'),true);
}

function applySurfaceState(name,doc){
  const body=doc.body;
  body.className='widget ui-fixture';
  body.dataset.bot='robot';
  body.dataset.state='idle';
  body.classList.toggle('widget-chat-open',name==='chat'||name==='chat-rivet');
  body.classList.toggle('widget-panels-open',['rivet','chat-rivet','running','approval','blocked','complete','cancelled','limited-approval','speaking-running','wide-diff'].includes(name));
  body.classList.toggle('widget-wide-open',name==='wide-diff');
  show(doc.getElementById('widget-coding-panels'),body.classList.contains('widget-panels-open'));
  show(doc.getElementById('widget-code-wing'),name==='wide-diff');
  show(doc.getElementById('widget-menu'),name==='menu');
  show(doc.getElementById('bot-library'),name==='picker');
  if(name==='wide-diff'){
    const wing=doc.querySelector('#widget-code-wing .widget-wing-content');
    if(wing)wing.innerHTML='<pre>src/widget/example.js\n@@ -12,3 +12,5 @@\n+ keep the diff readable on a narrow display\n+ wrap long local paths without moving the companion</pre>';
  }
  if(name==='picker'){
    const cards=doc.getElementById('bot-cards');
    if(cards&&!cards.children.length){
      for(const [id,label,sub] of [['robot','Rivet','Coding agent'],['nova','Nova','Companion'],['butler','Sterling','Wise butler'],['pixel','Pixel','Marketing intern'],['luma','Luma','Product designer']]){
        const button=doc.createElement('button');button.className=`bot-card ${id}`;button.type='button';button.setAttribute('aria-pressed',String(id==='robot'));
        const img=doc.createElement('img');img.className='bot-mark';img.src=`/assets/bots/${id==='robot'?'rivet':id}/portrait.png`;img.alt='';
        const copy=doc.createElement('span');copy.innerHTML=`<b>${label}</b><small>${sub}</small>`;button.append(img,copy);cards.append(button);
      }
    }
  }
}

function applyVoiceState(name,win){
  if(name==='listening')win.dispatchEvent(new win.CustomEvent('myavatar:conversation-phase',{detail:{phase:'listening'}}));
  if(name==='thinking')win.dispatchEvent(new win.CustomEvent('myavatar:conversation-phase',{detail:{phase:'thinking'}}));
  if(name==='speaking'||name==='speaking-running')win.dispatchEvent(new win.CustomEvent('myavatar:conversation-phase',{detail:{phase:'speaking'}}));
}

export function mountUiFixture(win=window,doc=document){
  const params=new URLSearchParams(win.location.search);
  const requested=params.get('fixture')||'compact';
  const name=FIXTURES.has(requested)?requested:'compact';
  seedCompanion(doc);
  applySurfaceState(name,doc);
  mountRivetWorkspace(win,doc);
  mountRivetTaskPresentation(win,doc);
  const interaction=mountInteractionState(win,doc);
  mountWidgetAccessibility(win,doc);

  if(name==='offline')win.dispatchEvent(new win.CustomEvent('myavatar:socket-close'));
  else if(name==='limited'||name==='limited-approval')win.dispatchEvent(new win.CustomEvent('myavatar:readiness',{detail:{overall:'degraded'}}));
  else win.dispatchEvent(new win.CustomEvent('myavatar:readiness',{detail:{overall:'ready'}}));

  const task=taskFor(name);
  if(task)win.dispatchEvent(new win.CustomEvent('myavatar:agent-task',{detail:task}));
  applyVoiceState(name,win);

  doc.documentElement.dataset.fixture=name;
  win.__MYAVATAR_UI_FIXTURE__={name,snapshot:()=>interaction.snapshot()};
  requestAnimationFrame(()=>requestAnimationFrame(()=>{doc.documentElement.dataset.fixtureReady='true';}));
  return win.__MYAVATAR_UI_FIXTURE__;
}
