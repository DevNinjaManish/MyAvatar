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

function safeMount(name,mount){
  try{mount();}
  catch(error){recordModuleFailure(name,error);}
}

function moduleExport(result,name,exportName){
  if(result.status==='rejected'){
    recordModuleFailure(name,result.reason);
    return null;
  }
  const value=result.value?.[exportName];
  if(typeof value!=='function'){
    recordModuleFailure(name,new Error(`Missing export ${exportName}`));
    return null;
  }
  return value;
}

async function loadOptionalModules(){
  const settled=await Promise.allSettled([
    import('../widget/panels.js'),
    import('../widget/specialist-state.js'),
    import('../widget/agent-ux-guard.js'),
    import('../widget/rivet-task-controller.js'),
    import('../widget/rivet-workspace.js'),
    import('../widget/rivet-task-presentation.js'),
    import('../conversation/readiness-ui.js'),
    import('../widget/interaction-state.js'),
    import('../widget/accessibility-controller.js'),
    import('../audio/lifecycle.js'),
    import('../conversation/chat-ui.js'),
    import('../conversation/coding-edits.js'),
    import('../conversation/latency-ui.js'),
    import('../conversation/interaction-intelligence.js'),
    import('../avatar/idle-presence.js'),
    import('../avatar/presence-orchestrator.js'),
    import('../avatar/readiness-presence.js'),
    import('../workspace/unified-workspace.js'),
    import('../workspace/system-cockpit.js'),
  ]);
  window.__myavatarModuleHealth={failures:[]};

  const mountWidgetPanels=moduleExport(settled[0],'widget-panels','mountWidgetPanels');
  const mountSpecialistState=moduleExport(settled[1],'specialist-state','mountSpecialistState');
  const mountAgentUxGuard=moduleExport(settled[2],'agent-ux-guard','mountAgentUxGuard');
  const mountRivetTaskController=moduleExport(settled[3],'rivet-task-controller','mountRivetTaskController');
  const mountRivetWorkspace=moduleExport(settled[4],'rivet-workspace','mountRivetWorkspace');
  const mountRivetTaskPresentation=moduleExport(settled[5],'rivet-task-presentation','mountRivetTaskPresentation');
  const mountReadinessUI=moduleExport(settled[6],'readiness-ui','mountReadinessUI');
  const mountInteractionState=moduleExport(settled[7],'interaction-state','mountInteractionState');
  const mountWidgetAccessibility=moduleExport(settled[8],'widget-accessibility','mountWidgetAccessibility');
  const installCaptureLifecycleGuards=moduleExport(settled[9],'capture-lifecycle','installCaptureLifecycleGuards');
  const mountCanonicalChat=moduleExport(settled[10],'canonical-chat','mountCanonicalChat');
  const mountCodingEdits=moduleExport(settled[11],'coding-edits','mountCodingEdits');
  const mountLatencyUI=moduleExport(settled[12],'latency-ui','mountLatencyUI');
  const mountInteractionIntelligence=moduleExport(settled[13],'interaction-intelligence','mountInteractionIntelligence');
  const mountIdlePresence=moduleExport(settled[14],'idle-presence','mountIdlePresence');
  const mountPresenceOrchestrator=moduleExport(settled[15],'presence-orchestrator','mountPresenceOrchestrator');
  const mountReadinessPresence=moduleExport(settled[16],'readiness-presence','mountReadinessPresence');
  const mountUnifiedWorkspace=moduleExport(settled[17],'unified-workspace','mountUnifiedWorkspace');
  const mountSystemCockpit=moduleExport(settled[18],'system-cockpit','mountSystemCockpit');

  if(mountSpecialistState)safeMount('specialist-state',()=>mountSpecialistState(window,document));
  if(mountWidgetPanels)safeMount('widget-panels',()=>mountWidgetPanels(document,window.desktop));
  if(mountRivetTaskController)safeMount('rivet-task-controller',()=>mountRivetTaskController(window,document,window.desktop));
  if(mountAgentUxGuard)safeMount('agent-ux-guard',()=>mountAgentUxGuard(window,document));
  if(mountRivetWorkspace)safeMount('rivet-workspace',()=>mountRivetWorkspace(window,document));
  if(mountRivetTaskPresentation)safeMount('rivet-task-presentation',()=>mountRivetTaskPresentation(window,document));
  if(mountReadinessUI)safeMount('readiness-ui',()=>mountReadinessUI(window,document));
  if(mountInteractionState)safeMount('interaction-state',()=>mountInteractionState(window,document));
  if(mountWidgetAccessibility)safeMount('widget-accessibility',()=>mountWidgetAccessibility(window,document));
  if(installCaptureLifecycleGuards)safeMount('capture-lifecycle',()=>installCaptureLifecycleGuards(window,document));
  if(mountCanonicalChat)safeMount('canonical-chat',()=>mountCanonicalChat(window,document));
  if(mountCodingEdits)safeMount('coding-edits',()=>mountCodingEdits(window,document));
  if(mountLatencyUI)safeMount('latency-ui',()=>mountLatencyUI(window,document));
  if(mountInteractionIntelligence)safeMount('interaction-intelligence',()=>mountInteractionIntelligence(window,document));
  if(mountIdlePresence)safeMount('idle-presence',()=>mountIdlePresence(window,document));
  if(mountPresenceOrchestrator)safeMount('presence-orchestrator',()=>mountPresenceOrchestrator(window,document));
  if(mountReadinessPresence)safeMount('readiness-presence',()=>mountReadinessPresence(window,document));
  if(mountUnifiedWorkspace)safeMount('unified-workspace',()=>mountUnifiedWorkspace(window,document));
  if(mountSystemCockpit)safeMount('system-cockpit',()=>mountSystemCockpit(window,document));
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
