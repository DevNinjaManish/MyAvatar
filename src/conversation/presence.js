import {STATES} from './state.js';

/** Map typed runtime events to the shared avatar presence state. */
export function presenceStateForEvent(event,current=STATES.IDLE){
  switch(event?.type){
    case 'recognizing': return STATES.THINKING;
    case 'config': return current===STATES.ERROR?STATES.RECOVERY:STATES.IDLE;
    case 'presence': return Object.values(STATES).includes(event.state)?event.state:current;
    case 'transcript': return STATES.THINKING;
    case 'token': return current===STATES.SPEAKING?current:STATES.THINKING;
    case 'audio': return STATES.SPEAKING;
    case 'job':
    case 'delegation': return ['started','queued','running','working'].includes(event.status)?STATES.WORKING:['failed'].includes(event.status)?STATES.ERROR:current;
    case 'speech_unavailable': return STATES.ERROR;
    case 'done':
      return current===STATES.WORKING?STATES.IDLE:STATES.IDLE;
    case 'error': return STATES.ERROR;
    default: return current;
  }
}
