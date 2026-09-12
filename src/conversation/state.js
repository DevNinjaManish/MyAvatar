export const STATES=Object.freeze({
  IDLE:'IDLE',LISTENING:'LISTENING',THINKING:'THINKING',SPEAKING:'SPEAKING',
  WORKING:'WORKING',PAUSED:'PAUSED',SLEEPING:'SLEEPING',ERROR:'ERROR',RECOVERY:'RECOVERY'
});
export class AppState extends EventTarget{
  value=STATES.IDLE;
  set(value){
    if(!Object.values(STATES).includes(value))throw Error('Invalid state');
    if(this.value===value)return false;
    this.value=value;this.dispatchEvent(new Event('change'));return true;
  }
}
