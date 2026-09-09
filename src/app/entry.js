// Install runtime event validation before widget-runtime.js creates the WebSocket.
import {installRuntimeEventGuard} from '../conversation/runtime-events.js';
installRuntimeEventGuard(window);
await import('./widget-runtime.js');
import '../styles/widget-cockpit.css';
import '../styles/widget-panels.css';
import '../styles/widget-polish.css';
import '../conversation/chat-actions.css';
import {mountWidgetPanels} from '../widget/panels.js';
import {mountReadinessUI} from '../conversation/readiness-ui.js';
import {installCaptureLifecycleGuards} from '../audio/lifecycle.js';
import {mountCanonicalChat} from '../conversation/chat-ui.js';
mountWidgetPanels(document, window.desktop);
mountReadinessUI(window,document);
installCaptureLifecycleGuards(window,document);
mountCanonicalChat(window,document);
