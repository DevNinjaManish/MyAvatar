import assert from 'node:assert/strict';
import test from 'node:test';
import {createFakeProvider,checkProviderHealth} from '../../src/runtime/providers.js';
import {runProviderStream} from '../../src/runtime/stream-runner.js';

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('provider stream forwards tokens and completes normally',async()=>{
  const tokens=[];
  const provider=createFakeProvider({stream:async({onToken})=>{onToken('hello');onToken(' world');return {done:true};}});
  const result=await runProviderStream(provider,{text:'hi',onToken:token=>tokens.push(token),timeoutMs:50});
  assert.deepEqual(tokens,['hello',' world']);
  assert.deepEqual(result,{done:true});
});

test('provider stream hard timeout aborts a provider that ignores cancellation',async()=>{
  let aborted=false;
  const provider=createFakeProvider({stream:async({signal,onToken})=>{signal.addEventListener('abort',()=>{aborted=true});await wait(100);onToken('late');}});
  const started=Date.now();
  await assert.rejects(runProviderStream(provider,{text:'slow',timeoutMs:10}),error=>error.name==='TimeoutError');
  assert.equal(aborted,true);
  assert.ok(Date.now()-started<80);
});

test('provider stream cancellation stops forwarding late tokens',async()=>{
  const controller=new AbortController();const tokens=[];
  const provider=createFakeProvider({stream:async({onToken})=>{onToken('first');await wait(20);onToken('late');}});
  const running=runProviderStream(provider,{text:'cancel',signal:controller.signal,onToken:token=>tokens.push(token),timeoutMs:100});
  await wait(1);controller.abort(new Error('stopped'));
  await assert.rejects(running,/stopped/);
  assert.deepEqual(tokens,['first']);
});

test('provider health times out even when implementation ignores its signal',async()=>{
  const started=Date.now();
  const result=await checkProviderHealth({name:'hung',health:async()=>wait(100)},{timeoutMs:10});
  assert.equal(result.available,false);
  assert.match(result.reason,/timed out/i);
  assert.ok(Date.now()-started<80);
});
