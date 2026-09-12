import {STATES} from './state.js';

/** Map typed runtime events to the shared avatar presence state. */
export function presenceStateForEvent(event,current=STATES.IDLE){
  switch(event?.type){
    case 'recognizing': return STATES.THINKING;
    case 'config': return STATES.IDLE;
    case 'transcript': return STATES.THINKING;
    case 'token': return current===STATES.SPEAKING?current:STATES.THINKING;
    case 'audio': return STATES.SPEAKING;
    case 'speech_unavailable':
    case 'done':
    case 'error': return STATES.IDLE;
    default: return current;
  }
}
