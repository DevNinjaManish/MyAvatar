// Install runtime event validation before main.js creates the WebSocket.
import {installRuntimeEventGuard} from './conversation/runtime-events.js';
installRuntimeEventGuard(window);
await import('./main.js');
import './widget-cockpit.css';
import './widget-panels.css';
import './widget-polish.css';
import './conversation/chat-actions.css';
import {mountWidgetPanels} from './widget/panels.js';
import {mountReadinessUI} from './conversation/readiness-ui.js';
import {installCaptureLifecycleGuards} from './audio/lifecycle.js';
import {mountCanonicalChat} from './conversation/chat-ui.js';
mountWidgetPanels(document, window.desktop);
mountReadinessUI(window,document);
installCaptureLifecycleGuards(window,document);
mountCanonicalChat(window,document);
