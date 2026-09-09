import test from 'node:test';
import assert from 'node:assert/strict';
import {TurnPlaybackCoordinator} from '../src/audio/turn-playback.js';

test('listening stays gated until server completion and all audio finishes',()=>{
 const flow=new TurnPlaybackCoordinator();
 assert.equal(flow.canResumeListening(),true);
 flow.beginTurn(7);assert.equal(flow.canResumeListening(),false);
 flow.noteServerEvent({type:'audio',turn:7});
 flow.noteServerEvent({type:'done',turn:7});
 assert.equal(flow.snapshot().expected,1);assert.equal(flow.canResumeListening(),false);
 const token=flow.beginAudioDecode();assert.equal(flow.snapshot().decoding,1);
 flow.finishAudioDecode(token,true);assert.equal(flow.snapshot().queued,1);assert.equal(flow.canResumeListening(),false);
 flow.playbackStarted(token);assert.equal(flow.snapshot().playing,1);assert.equal(flow.canResumeListening(),false);
 flow.playbackEnded(token);assert.equal(flow.snapshot().activeTurn,null);assert.equal(flow.canResumeListening(),true);
});

test('server done cannot reopen listening while an audio decode is pending',()=>{
 const flow=new TurnPlaybackCoordinator();flow.beginTurn(2);flow.noteServerEvent({type:'audio',turn:2});
 const token=flow.beginAudioDecode();flow.noteServerEvent({type:'done',turn:2});
 assert.equal(flow.canResumeListening(),false);assert.equal(flow.snapshot().decoding,1);
 flow.finishAudioDecode(token,false);assert.equal(flow.canResumeListening(),true);
});

test('interruption invalidates old audio tokens and late old-turn events',()=>{
 const flow=new TurnPlaybackCoordinator();flow.beginTurn(3);flow.noteServerEvent({type:'audio',turn:3});
 const old=flow.beginAudioDecode();flow.cancelTurn();flow.beginTurn(4);
 assert.equal(flow.finishAudioDecode(old,true),false);
 assert.equal(flow.noteServerEvent({type:'audio',turn:3}),false);
 assert.equal(flow.noteServerEvent({type:'done',turn:3}),false);
 assert.equal(flow.snapshot().activeTurn,4);assert.equal(flow.snapshot().queued,0);
});

test('new user turn replaces previous turn state cleanly',()=>{
 const flow=new TurnPlaybackCoordinator();flow.beginTurn(10);flow.noteServerEvent({type:'audio',turn:10});
 flow.beginTurn(11);
 assert.deepEqual(flow.snapshot(),{epoch:2,activeTurn:11,serverDone:false,expected:0,decoding:0,queued:0,playing:0,canResumeListening:false});
 flow.noteServerEvent({type:'done',turn:11});assert.equal(flow.canResumeListening(),true);
});

test('turn error immediately releases coordination state',()=>{
 const flow=new TurnPlaybackCoordinator();flow.beginTurn(12);flow.noteServerEvent({type:'audio',turn:12});
 assert.equal(flow.noteServerEvent({type:'error',turn:12}),true);
 assert.equal(flow.canResumeListening(),true);assert.equal(flow.snapshot().activeTurn,null);
});

test('multiple audio chunks settle only after the last playback ends',()=>{
 const flow=new TurnPlaybackCoordinator();flow.beginTurn(20);
 flow.noteServerEvent({type:'audio',turn:20});flow.noteServerEvent({type:'audio',turn:20});flow.noteServerEvent({type:'done',turn:20});
 const first=flow.beginAudioDecode(),second=flow.beginAudioDecode();
 flow.finishAudioDecode(first,true);flow.finishAudioDecode(second,true);
 flow.playbackStarted(first);flow.playbackEnded(first);
 assert.equal(flow.canResumeListening(),false);assert.equal(flow.snapshot().queued,1);
 flow.playbackStarted(second);flow.playbackEnded(second);assert.equal(flow.canResumeListening(),true);
});
