/** View state only. No model calls, filesystem access, or simulated agent output. */
export const PANEL_IDS = Object.freeze(['task', 'changes', 'terminal', 'tests', 'diff']);
export function initialPanelState() {
  return {open: false, expanded: ['task'], wide: null};
}
export function reducePanelState(state, action) {
  switch (action.type) {
    case 'toggle-tools': return {...state, open: !state.open, wide: null};
    case 'close-tools': return {...state, open: false, wide: null};
    case 'collapse-all': return {...state, expanded: []};
    case 'toggle-panel': {
      if (!PANEL_IDS.includes(action.id)) return state;
      const expanded = state.expanded.includes(action.id)
        ? state.expanded.filter(id => id !== action.id)
        : [...state.expanded, action.id].slice(-2);
      return {...state, open: true, expanded};
    }
    case 'open-wide':
      return ['changes', 'diff'].includes(action.id)
        ? {...state, open: true, wide: action.id} : state;
    case 'close-wide': return {...state, wide: null};
    default: return state;
  }
}
export function readPanelPreferences(storage) {
  try {
    const value = JSON.parse(storage?.getItem('myavatar.widget.panels.v1') || 'null');
    if (!Array.isArray(value?.expanded)) return initialPanelState();
    return {...initialPanelState(), expanded: [...new Set(value.expanded.filter(id => PANEL_IDS.includes(id)))].slice(-2)};
  } catch { return initialPanelState(); }
}
export function savePanelPreferences(storage, state) {
  try { storage?.setItem('myavatar.widget.panels.v1', JSON.stringify({expanded: state.expanded})); }
  catch { /* Storage is optional; panels continue to work in memory. */ }
}
