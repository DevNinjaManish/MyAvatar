import assert from 'node:assert/strict';
import test from 'node:test';
import {speechPlan} from '../../src/conversation/speech-plan.js';
test('speech plan splits natural clause boundaries and gives each bot a delivery',()=>{const nova=speechPlan('First thought, then the detail.',{bot:'nova',emotion:'happy'}),sterling=speechPlan('First thought, then the detail.',{bot:'sterling'});assert.equal(nova.length,2);assert.ok(nova[0].pauseMs>nova[1].pauseMs);assert.ok(nova[0].speed>sterling[0].speed);});
