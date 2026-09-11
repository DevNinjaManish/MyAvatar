import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('widget semantics expose visible controls to assistive tech',()=>{
  const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
  assert.match(html,/id="widget-stop-slot"(?![^>]*aria-hidden)/);
  assert.match(html,/class="widget-toolbar" role="toolbar" aria-label="Companion controls"/);
  assert.match(html,/id="widget-specialist-toggle"[^>]*aria-expanded="false"/);
  assert.match(html,/id="widget-mini-calendar-title" tabindex="-1"/);
  assert.match(html,/id="widget-creative-title" tabindex="-1"/);
  assert.match(html,/id="widget-wing-title" tabindex="-1"/);
});

test('accessibility controller owns focus return, Escape, and class-driven chat visibility',()=>{
  const code=readFileSync(new URL('../../src/widget/accessibility-controller.js',import.meta.url),'utf8');
  assert.match(code,/className:'widget-chat-open'/);
  assert.match(code,/event\.key!==['"]Escape['"]/);
  assert.match(code,/opener\.focus\(\{preventScroll:true\}\)/);
  assert.match(code,/panel\.setAttribute\('aria-hidden'/);
  assert.match(code,/observer\.observe\(doc\.body,\{attributes:true,attributeFilter:\['class'\]\}\)/);
});

test('compact chat and picker controls meet minimum target sizing',()=>{
  const css=readFileSync(new URL('../../src/styles/widget-components.css',import.meta.url),'utf8');
  assert.match(css,/widget-chat-actions button\{min-height:var\(--ds-control-sm\)/);
  assert.match(css,/#widget-chat-close\{width:var\(--ds-control-sm\);height:var\(--ds-control-sm\)/);
  assert.match(css,/#library-close\{width:var\(--ds-control-sm\);height:var\(--ds-control-sm\)/);
  assert.match(css,/\.bot-card\{[^}]*min-height:36px/);
});

test('accessibility controller mounts after interaction state',()=>{
  const code=readFileSync(new URL('../../src/app/entry.js',import.meta.url),'utf8');
  assert.ok(code.includes('mountWidgetAccessibility(window,document)'));
  assert.ok(code.indexOf('mountWidgetAccessibility(window,document)')>code.indexOf('mountInteractionState(window,document)'));
});
