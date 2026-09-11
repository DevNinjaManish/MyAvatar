import test from 'node:test';
import assert from 'node:assert/strict';
import {installSocketBridge} from '../../src/conversation/socket-bridge.js';

class FakeSocket extends EventTarget{
  static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;static instances=[];
  constructor(url){super();this.url=url;this.readyState=FakeSocket.CONNECTING;this.sent=[];FakeSocket.instances.push(this);}
  open(){this.readyState=FakeSocket.OPEN;this.dispatchEvent(new Event('open'));}
  message(data){this.dispatchEvent(new MessageEvent('message',{data}));}
  send(data){this.sent.push(data);}
  fail(){this.readyState=FakeSocket.CLOSED;this.dispatchEvent(new Event('close'));}
  close(){this.readyState=FakeSocket.CLOSED;this.dispatchEvent(new Event('close'));}
}

const makeWin=()=>({WebSocket:FakeSocket,EventTarget,Event,MessageEvent,dispatchEvent(){}});

test('socket bridge preserves WebSocket constants and exposes latest socket',()=>{
  FakeSocket.instances=[];const win=makeWin();installSocketBridge(win);const socket=new win.WebSocket('ws://local');
  assert.equal(win.__myAvatarSocket,socket);assert.equal(win.WebSocket.OPEN,1);assert.equal(socket.url,'ws://local');
});

test('startup messages dispatch exactly once when legacy onmessage attaches late',async()=>{
  FakeSocket.instances=[];const win=makeWin();installSocketBridge(win);const socket=new win.WebSocket('ws://local');
  const native=FakeSocket.instances[0];const observed=[];const received=[];
  socket.addEventListener('message',event=>observed.push(event.data));
  native.open();native.message('config');native.message('ready');
  assert.deepEqual(observed,[]);
  socket.onmessage=event=>received.push(event.data);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(observed,['config','ready']);
  assert.deepEqual(received,['config','ready']);
  socket.close();
});

test('socket bridge reconnects after an unexpected close',async()=>{
  FakeSocket.instances=[];const win=makeWin();installSocketBridge(win);const socket=new win.WebSocket('ws://local');
  FakeSocket.instances[0].open();assert.equal(socket.readyState,win.WebSocket.OPEN);
  FakeSocket.instances[0].fail();assert.equal(socket.readyState,win.WebSocket.CONNECTING);
  await new Promise(resolve=>setTimeout(resolve,300));
  assert.equal(FakeSocket.instances.length,2);FakeSocket.instances[1].open();assert.equal(socket.readyState,win.WebSocket.OPEN);
  socket.send('hello');assert.deepEqual(FakeSocket.instances[1].sent,['hello']);socket.close();
});

test('explicit close does not reconnect',async()=>{
  FakeSocket.instances=[];const win=makeWin();installSocketBridge(win);const socket=new win.WebSocket('ws://local');FakeSocket.instances[0].open();socket.close();await new Promise(resolve=>setTimeout(resolve,300));assert.equal(FakeSocket.instances.length,1);
});

test('socket bridge installs only once',()=>{
  FakeSocket.instances=[];const win=makeWin();installSocketBridge(win);const Bridged=win.WebSocket;installSocketBridge(win);assert.equal(win.WebSocket,Bridged);
});
