import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('base CSS no longer owns compact chat, cockpit, or bot picker presentation', () => {
  const base = read('../../src/styles/base.css');
  for (const selector of ['.widget-chat-heading','.widget-toolbar {','body.widget #bot-library','.bot-card {','#widget-menu>button']) {
    assert.equal(base.includes(selector), false, `base.css must not own ${selector}`);
  }
  assert.match(base,/Widget foundation only/);
});

test('widget components own chat, menu, and bot picker styling', () => {
  const css = read('../../src/styles/widget-components.css');
  assert.match(css,/body\.widget \.widget-chat-heading/);
  assert.match(css,/body\.widget #widget-menu>button/);
  assert.match(css,/body\.widget #bot-library/);
  assert.match(css,/var\(--ds-/);
});

test('cockpit remains the sole presentation owner for primary toolbar and identity strip', () => {
  const css = read('../../src/styles/widget-cockpit.css');
  assert.match(css,/\.widget-toolbar/);
  assert.match(css,/\.widget-caption/);
  assert.match(css,/#widget-status/);
});

test('component stylesheet loads after tokens and before cockpit polish', () => {
  const entry = read('../../src/app/entry.js');
  const tokens = entry.indexOf("'../styles/design-tokens.css'");
  const components = entry.indexOf("'../styles/widget-components.css'");
  const cockpit = entry.indexOf("'../styles/widget-cockpit.css'");
  assert.ok(tokens >= 0 && components > tokens && cockpit > components);
});
