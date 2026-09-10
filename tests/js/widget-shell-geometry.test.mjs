import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const shell = readFileSync(new URL('../../src/styles/widget-stack.css', import.meta.url), 'utf8');
const entry = readFileSync(new URL('../../src/app/entry.js', import.meta.url), 'utf8');

test('widget shell exposes canonical geometry tokens', () => {
  for (const token of [
    '--widget-shell-column-width',
    '--widget-shell-specialist-width',
    '--widget-shell-platform-top',
    '--widget-shell-tools-top',
    '--widget-toolbar-height',
    '--widget-toolbar-slot-1',
    '--widget-toolbar-slot-4',
  ]) {
    assert.match(shell, new RegExp(token));
  }
});

test('toolbar placement is owned by the shell stylesheet', () => {
  assert.match(shell, /#widget-mic[\s\S]*--widget-toolbar-slot-1/);
  assert.match(shell, /#widget-chat-toggle[\s\S]*--widget-toolbar-slot-2/);
  assert.match(shell, /#widget-specialist-toggle[\s\S]*--widget-toolbar-slot-3/);
  assert.match(shell, /#widget-more[\s\S]*--widget-toolbar-slot-4/);
});

test('canonical shell stylesheet loads after legacy polish layers', () => {
  const polish = entry.indexOf("../styles/widget-polish.css");
  const fullPolish = entry.indexOf("../styles/full-polish.css");
  const shellIndex = entry.indexOf("../styles/widget-stack.css");
  assert.ok(polish >= 0 && fullPolish >= 0 && shellIndex >= 0);
  assert.ok(shellIndex > polish);
  assert.ok(shellIndex > fullPolish);
});
