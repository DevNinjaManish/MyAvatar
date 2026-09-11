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

const fixtureMode=new URLSearchParams(window.location.search).has('fixture');

if(fixtureMode){
  const {mountUiFixture}=await import('./ui-fixture.js');
  mountUiFixture(window,document);
}else{
  // Install socket capture and runtime guards before widget-runtime.js creates the WebSocket.
  const [{installSocketBridge},{installRuntimeEventGuard},{installDualSpeakerEqualizers}]=await Promise.all([
    import('../conversation/socket-bridge.js'),
    import('../conversation/runtime-events.js'),
    import('../avatar/dual-speaker-patch.js'),
  ]);
  installSocketBridge(window);
  installRuntimeEventGuard(window);
  installDualSpeakerEqualizers();
  await import('./widget-runtime.js');

  const [
    {mountWidgetPanels},
    {mountSpecialistState},
    {mountAgentUxGuard},
    {mountRivetTaskController},
    {mountRivetWorkspace},
    {mountRivetTaskPresentation},
    {mountInteractionState},
    {mountWidgetAccessibility},
    {mountReadinessUI},
    {installCaptureLifecycleGuards},
    {mountCanonicalChat},
    {mountCodingEdits},
    {mountLatencyUI},
    {mountInteractionIntelligence},
    {mountIdlePresence},
    {mountPresenceOrchestrator},
    {mountReadinessPresence},
    {mountUnifiedWorkspace},
    {mountSystemCockpit},
  ]=await Promise.all([
    import('../widget/panels.js'),
    import('../widget/specialist-state.js'),
    import('../widget/agent-ux-guard.js'),
    import('../widget/rivet-task-controller.js'),
    import('../widget/rivet-workspace.js'),
    import('../widget/rivet-task-presentation.js'),
    import('../widget/interaction-state.js'),
    import('../widget/accessibility-controller.js'),
    import('../conversation/readiness-ui.js'),
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
  mountSpecialistState(window,document);
  mountWidgetPanels(document,window.desktop);
  mountRivetTaskController(window,document,window.desktop);
  mountAgentUxGuard(window,document);
  mountRivetWorkspace(window,document);
  mountRivetTaskPresentation(window,document);
  mountReadinessUI(window,document);
  mountInteractionState(window,document);
  mountWidgetAccessibility(window,document);
  installCaptureLifecycleGuards(window,document);
  mountCanonicalChat(window,document);
  mountCodingEdits(window,document);
  mountLatencyUI(window,document);
  mountInteractionIntelligence(window,document);
  mountIdlePresence(window,document);
  mountPresenceOrchestrator(window,document);
  mountReadinessPresence(window,document);
  mountUnifiedWorkspace(window,document);
  mountSystemCockpit(window,document);
}
