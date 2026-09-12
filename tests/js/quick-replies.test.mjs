import test from 'node:test';
import assert from 'node:assert/strict';
import {quickReply} from '../../src/conversation/quick-replies.js';
test('simple English and Hindi greetings use a direct reply',()=>{
  for(const text of ['How are you?','Hi Nova कैसे हो?','kaise ho','कैसी हो'])assert.ok(quickReply(text));
});
test('questions containing greetings are not intercepted',()=>{
  for(const text of ['How are you going to fix this bug?','Hi, please explain my error','Thank you but I need more help'])assert.equal(quickReply(text),null);
});
