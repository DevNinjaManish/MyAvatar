export const STATES=Object.freeze({IDLE:'IDLE',LISTENING:'LISTENING',THINKING:'THINKING',SPEAKING:'SPEAKING'});
export class AppState extends EventTarget{
  value=STATES.IDLE;
  set(value){if(!Object.values(STATES).includes(value))throw Error('Invalid state');this.value=value;this.dispatchEvent(new Event('change'));}
}
