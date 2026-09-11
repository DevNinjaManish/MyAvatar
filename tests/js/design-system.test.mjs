import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url),'utf8');

test('design tokens load before component styles', () => {
  const entry=read('../../src/app/entry.js');
  const tokens=entry.indexOf("'../styles/design-tokens.css'");
  assert.ok(tokens>=0);
  for(const style of ['widget-cockpit.css','widget-panels.css','widget-polish.css']) {
    assert.ok(tokens < entry.indexOf(`'../styles/${style}'`));
  }
});

test('shared design tokens expose spacing, radius, type, surface, border and control scales', () => {
  const css=read('../../src/styles/design-tokens.css');
  for(const token of ['--ds-space-3','--ds-radius-md','--ds-text-md','--ds-surface-raised','--ds-border-default','--ds-control-md']) {
    assert.ok(css.includes(token), `missing ${token}`);
  }
});

test('high-impact surfaces consume design tokens directly', () => {
  const files=[
    '../../src/workspace/agent-task.css',
    '../../src/workspace/system-cockpit.css',
    '../../src/conversation/chat-actions.css',
    '../../src/styles/widget-polish.css',
  ];
  for(const file of files) {
    const css=read(file);
    assert.match(css,/var\(--ds-(?:space|radius|text|surface|border|control)-/);
  }
});

test('widget semantic defaults are owned by design tokens while contrast may override them', () => {
  const tokens=read('../../src/styles/design-tokens.css');
  const polish=read('../../src/styles/widget-polish.css');
  assert.match(tokens,/--widget-surface:\s*var\(--ds-surface-raised\)/);
  assert.match(tokens,/--widget-text-soft:/);
  assert.doesNotMatch(polish,/body\.widget\s*\{[^}]*--widget-surface\s*:/s);
  const softOverrides=[...polish.matchAll(/--widget-text-soft\s*:/g)];
  assert.ok(softOverrides.length<=1);
  if(softOverrides.length) assert.match(polish,/@media \(prefers-contrast:more\)[\s\S]*--widget-text-soft:/);
});
