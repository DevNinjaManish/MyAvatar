import test from 'node:test';
import assert from 'node:assert/strict';
import {languageInstruction,responseLanguageFor} from '../../src/conversation/language-routing.js';

test('the newest request can explicitly switch back to English',()=>{
  assert.equal(responseLanguageFor('Nova, switch back to English'), 'english');
  assert.match(languageInstruction('english'),/Do not continue in Hindi/i);
});
test('Hindi is selected from an explicit request or Hindi transcription',()=>{
  assert.equal(responseLanguageFor('Please reply in Hindi'), 'hindi');
  assert.equal(responseLanguageFor('kaise ho','hi'), 'hindi');
});
