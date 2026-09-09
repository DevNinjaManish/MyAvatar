// Preserve one existing avatar/audio session. Load overrides after the base UI.
import './main.js';
import './widget-cockpit.css';
import './widget-panels.css';
import {mountWidgetPanels} from './widget/panels.js';
mountWidgetPanels(document, window.desktop);
