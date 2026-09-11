import '../styles/base.css';
import '../styles/design-tokens.css';
import '../styles/widget-components.css';
import '../styles/widget-cockpit.css';
import '../styles/widget-panels.css';
import '../styles/widget-polish.css';
import '../styles/full-polish.css';
import '../styles/widget-stack.css';
import '../conversation/chat-actions.css';
import '../conversation/coding-edits.css';
import '../avatar/presence-orchestrator.css';
import '../workspace/unified-workspace.css';
import '../workspace/companion-workspace.css';
import '../workspace/agent-task.css';
import '../workspace/system-cockpit.css';
import '../avatar/readiness-presence.css';
import {assertRuntimeDomContract,renderBootFailure} from './dom-contract.js';

const fixtureMode=new URLSearchParams(window.location.search).has('fixture');

function recordModuleFailure(name,error){
  const message=String(error?.message||error||'Unknown module error');
  console.error(`[MyAvatar] ${name} failed to mount`,error);
  window.__myavatarModuleHealth ||= {failures:[]};
  window.__myavatarModuleHealth.failures.push({name,message});
  document.body.dataset.degraded='true';
  window.dispatchEvent(new CustomEvent('myavatar:module-failure',{detail:{name,message}}));
}

async function loadOptionalModules(){
  const specs=[
    ['widget-panels',()=>import('../widget/panels.js'),'mountWidgetPanels',(m)=>[document,window.desktop]],
    ['specialist-state',()=>import('../widget/specialist-state.js'),'mountSpecialistState',(m)=>[window,document]],
    ['agent-ux-guard',()=>import('../widget/agent-ux-guard.js'),'mountAgentUxGuard',(m)=>[window,document]],
    ['rivet-task-controller',()=>import('../widget/rivet-task-controller.js'),'mountRivetTaskController',(m)=>[window,document,window.desktop]],
    ['rivet-workspace',()=>import('../widget/rivet-workspace.js'),'mountRivetWorkspace',(m)=>[window,document]],
    ['rivet-task-presentation',()=>import('../widget/rivet-task-presentation.js'),'mountRivetTaskPresentation',(m)=>[window,document]],
    ['interaction-state',()=>import('../widget/interaction-state.js'),'mountInteractionState',(m)=>[window,document]],
    ['widget-accessibility',()=>import('../widget/accessibility-controller.js'),'mountWidgetAccessibility',(m)=>[window,document]],
    ['readiness-ui',()=>import('../conversation/readiness-ui.js'),'mountReadinessUI',(m)=>[window,document]],
    ['capture-lifecycle',()=>import('../audio/lifecycle.js'),'installCaptureLifecycleGuards',(m)=>[window,document]],
    ['canonical-chat',()=>import('../conversation/chat-ui.js'),'mountCanonicalChat',(m)=>[window,document]],
    ['coding-edits',()=>import('../conversation/coding-edits.js'),'mountCodingEdits',(m)=>[window,document]],
    ['latency-ui',()=>import('../conversation/latency-ui.js'),'mountLatencyUI',(m)=>[window,document]],
    ['interaction-intelligence',()=>import('../conversation/interaction-intelligence.js'),'mountInteractionIntelligence',(m)=>[window,document]],
    ['idle-presence',()=>import('../avatar/idle-presence.js'),'mountIdlePresence',(m)=>[window,document]],
    ['presence-orchestrator',()=>import('../avatar/presence-orchestrator.js'),'mountPresenceOrchestrator',(m)=>[window,document]],
    ['readiness-presence',()=>import('../avatar/readiness-presence.js'),'mountReadinessPresence',(m)=>[window,document]],
    ['unified-workspace',()=>import('../workspace/unified-workspace.js'),'mountUnifiedWorkspace',(m)=>[window,document]],
    ['system-cockpit',()=>import('../workspace/system-cockpit.js'),'mountSystemCockpit',(m)=>[window,document]],
  ];

  const settled=await Promise.allSettled(specs.map(([,loader])=>loader()));
  window.__myavatarModuleHealth={failures:[]};

  for(let index=0;index<specs.length;index++){
    const [name,,exportName,argsFor]=specs[index];
    const result=settled[index];
    if(result.status==='rejected'){
      recordModuleFailure(name,result.reason);
      continue;
    }
    try{
      const mount=result.value?.[exportName];
      if(typeof mount!=='function')throw new Error(`Missing export ${exportName}`);
      mount(...argsFor(result.value));
    }catch(error){
      recordModuleFailure(name,error);
    }
  }
}

if(fixtureMode){
  const {mountUiFixture}=await import('./ui-fixture.js');
  mountUiFixture(window,document);
}else{
  let coreReady=false;
  try{
    assertRuntimeDomContract(document);
    const bridgeModules=await Promise.all([
      import('../conversation/socket-bridge.js'),
      import('../conversation/runtime-events.js'),
      import('../avatar/dual-speaker-patch.js'),
    ]);
    const [{installSocketBridge},{installRuntimeEventGuard},{installDualSpeakerEqualizers}]=bridgeModules;
    installSocketBridge(window);
    installRuntimeEventGuard(window);
    installDualSpeakerEqualizers();
    await import('./widget-runtime.js');
    coreReady=true;
  }catch(error){
    renderBootFailure(document,error);
    console.error('[MyAvatar] core renderer startup failed',error);
  }

  if(coreReady)await loadOptionalModules();
}
