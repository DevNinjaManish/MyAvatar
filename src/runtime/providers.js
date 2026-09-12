export class ProviderRegistry{
  #providers=new Map();
  register(kind,name,provider){
    if(!kind||!name||!provider)throw new Error('Provider kind, name, and implementation are required.');
    if(this.#providers.has(`${kind}:${name}`))throw new Error(`Provider already registered: ${kind}:${name}`);
    this.#providers.set(`${kind}:${name}`,provider);return this;
  }
  get(kind,name){return this.#providers.get(`${kind}:${name}`);}
  resolve(kind,{preferred,fallbacks=[]}={}){
    const names=[preferred,...fallbacks].filter(Boolean);
    for(const name of names){const provider=this.get(kind,name);if(provider)return provider;}
    return undefined;
  }
  has(kind,name){return this.#providers.has(`${kind}:${name}`);}
  list(kind){return [...this.#providers.keys()].filter(key=>key.startsWith(`${kind}:`)).map(key=>key.slice(kind.length+1));}
}

export async function checkProviderHealth(provider,{timeoutMs=3000}={}){
  if(!provider)return {available:false,reason:'Provider is not registered.'};
  if(typeof provider.health!=='function')return {available:true,provider:provider.name};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(new Error('Provider health check timed out.')),timeoutMs);
  const healthPromise=Promise.resolve().then(()=>provider.health({signal:controller.signal}));
  try{
    const result=await Promise.race([healthPromise,new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(controller.signal.reason||new Error('Provider health check timed out.')),{once:true}))]);
    return {available:result!==false,provider:provider.name,...(result&&typeof result==='object'?result:{})};
  }catch(error){return {available:false,provider:provider.name,reason:error?.message||'Health check failed.'};}
  finally{clearTimeout(timer);}
}

export function createFakeProvider({name='fake',respond=async()=>({}),stream}={}){
  return Object.freeze({name,respond,async stream(args){if(stream)return stream(args);const result=await respond(args);if(result?.text)args.onToken?.(result.text);return result;}});
}
