import test from 'node:test';
import assert from 'node:assert/strict';
import {mountReadinessUI} from '../../src/conversation/readiness-ui.js';

function fakeElement(id){return {id,textContent:'',disabled:false,attrs:{},parentElement:null,getAttribute(k){return this.attrs[k]??null;},setAttribute(k,v){this.attrs[k]=v;},closest(selector){return selector.includes(`#${id}`)?this:null;}};}

class FakeWindow extends EventTarget{}

test('readiness UI keeps text gate open while disabling voice input',()=>{
  const win=new FakeWindow();
  const status=fakeElement('status'),widgetStatus=fakeElement('widget-status'),mic=fakeElement('mic'),widgetMic=fakeElement('widget-mic');
  status.parentElement=new EventTarget();
  const elements={status,'widget-status':widgetStatus,mic,'widget-mic':widgetMic};
  const doc={body:{dataset:{}},getElementById:id=>elements[id]||null,addEventListener(){},removeEventListener(){}};
  const Original=globalThis.MutationObserver;globalThis.MutationObserver=class{observe(){}disconnect(){}};
  const mounted=mountReadinessUI(win,doc);
  win.dispatchEvent(new CustomEvent('myavatar:readiness',{detail:{overall:'degraded',capabilities:{chat:true,listen:false,speak:true,voice:false}}}));
  assert.equal(mic.disabled,false);
  assert.equal(widgetMic.disabled,true);
  assert.match(status.textContent,/microphone input unavailable/i);
  assert.equal(doc.body.dataset.runtimeReadiness,'degraded');
  mounted.dispose();globalThis.MutationObserver=Original;
});

test('readiness observer settles without mutating its own watched content',()=>{
  let observerCallback,observerOptions;
  const tracked=(id)=>{
    let text='',disabled=false;const writes={text:0,disabled:0,attribute:0};
    return {id,writes,attrs:{},parentElement:null,
      get textContent(){return text;},set textContent(value){text=value;writes.text++;},
      get disabled(){return disabled;},set disabled(value){disabled=value;writes.disabled++;},
      getAttribute(key){return this.attrs[key]??null;},setAttribute(key,value){this.attrs[key]=value;writes.attribute++;},
      closest(selector){return selector.includes(`#${id}`)?this:null;}};
  };
  const status=tracked('status'),widgetStatus=tracked('widget-status'),mic=tracked('mic'),widgetMic=tracked('widget-mic');
  status.parentElement=new EventTarget();
  const elements={status,'widget-status':widgetStatus,mic,'widget-mic':widgetMic};
  const doc={body:{dataset:{}},getElementById:id=>elements[id]||null,addEventListener(){},removeEventListener(){}};
  const Original=globalThis.MutationObserver;
  globalThis.MutationObserver=class{constructor(callback){observerCallback=callback;}observe(_target,options){observerOptions=options;}disconnect(){}};
  const win=new FakeWindow();
  const mounted=mountReadinessUI(win,doc);
  win.dispatchEvent(new CustomEvent('myavatar:readiness',{detail:{overall:'ready',capabilities:{chat:true,listen:true,speak:true,voice:true}}}));
  const writes={status:status.writes.text,widgetStatus:widgetStatus.writes.text,mic:mic.writes.disabled,widgetMic:widgetMic.writes.disabled,aria:widgetMic.writes.attribute};
  observerCallback([]);
  assert.deepEqual({status:status.writes.text,widgetStatus:widgetStatus.writes.text,mic:mic.writes.disabled,widgetMic:widgetMic.writes.disabled,aria:widgetMic.writes.attribute},writes);
  mounted.dispose();
  globalThis.MutationObserver=Original;
  assert.equal(observerOptions.attributes,undefined);
  assert.equal(observerOptions.characterData,true);
  assert.equal(typeof observerCallback,'function');
});
