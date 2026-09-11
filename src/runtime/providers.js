export class ProviderRegistry{
  #providers=new Map();
  register(kind,name,provider){
    if(!kind||!name||!provider)throw new Error('Provider kind, name, and implementation are required.');
    if(this.#providers.has(`${kind}:${name}`))throw new Error(`Provider already registered: ${kind}:${name}`);
    this.#providers.set(`${kind}:${name}`,provider);return this;
  }
  get(kind,name){return this.#providers.get(`${kind}:${name}`);}
  has(kind,name){return this.#providers.has(`${kind}:${name}`);}
  list(kind){return [...this.#providers.keys()].filter(key=>key.startsWith(`${kind}:`)).map(key=>key.slice(kind.length+1));}
}

export function createFakeProvider({name='fake',respond=async()=>({})}={}){
  return Object.freeze({name,respond});
}
