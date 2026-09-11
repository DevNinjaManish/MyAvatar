import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('design tokens load before component presentation styles', () => {
  const entry = read('../../src/app/entry.js');
  const tokens = entry.indexOf("'../styles/design-tokens.css'");
  assert.ok(tokens >= 0);
  for (const style of ["'../styles/widget-cockpit.css'", "'../styles/widget-polish.css'", "'../styles/full-polish.css'", "'../workspace/agent-task.css'", "'../workspace/system-cockpit.css'"]) {
    assert.ok(tokens < entry.indexOf(style), `${style} should load after design tokens`);
  }
});

test('cockpit consumes shared surface, spacing, radius, text and state tokens', () => {
  const css = read('../../src/styles/widget-cockpit.css');
  for (const token of ['--ds-surface-raised','--ds-space-','--ds-radius-','--ds-text-','--ds-border-','--ds-warning','--ds-danger','--ds-transition-']) {
    assert.ok(css.includes(token), `cockpit should use ${token}`);
  }
});

test('full workspace consumes the shared token system', () => {
  const css = read('../../src/styles/full-polish.css');
  for (const token of ['--ds-surface-','--ds-space-','--ds-radius-','--ds-text-','--ds-border-','--ds-shadow-raised']) {
    assert.ok(css.includes(token), `full workspace should use ${token}`);
  }
});

test('token layer owns widget semantic aliases', () => {
  const tokens = read('../../src/styles/design-tokens.css');
  assert.match(tokens, /--widget-surface:\s*var\(--ds-surface-raised\)/);
  assert.match(tokens, /--widget-text-soft:\s*var\(--ds-text-secondary\)/);
  assert.match(tokens, /--widget-hairline:\s*var\(--ds-border-default\)/);
  assert.match(tokens, /--widget-inset:\s*var\(--ds-surface-inset\)/);
});
