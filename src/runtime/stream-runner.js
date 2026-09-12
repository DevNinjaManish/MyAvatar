function abortError(reason){
  if(reason instanceof Error)return reason;
  const error=new Error(reason||'Provider stream aborted.');error.name='AbortError';return error;
}

/** Run one provider stream with hard cancellation and timeout boundaries. */
export async function runProviderStream(provider,{text,signal,onToken,timeoutMs=30000}={}){
  if(!provider||typeof provider.stream!=='function')throw Error('Conversation provider is unavailable.');
  if(signal?.aborted)throw abortError(signal.reason);
  const controller=new AbortController();let settled=false;let abortHandler;
  const abortPromise=new Promise((_,reject)=>{
    abortHandler=()=>{controller.abort(signal?.reason);reject(abortError(signal?.reason));};
    signal?.addEventListener('abort',abortHandler,{once:true});
  });
  let timeoutId;
  const timeoutPromise=new Promise((_,reject)=>{timeoutId=setTimeout(()=>{const error=new Error(`Provider stream timed out after ${timeoutMs}ms.`);error.name='TimeoutError';controller.abort(error);reject(error);},timeoutMs);});
  const providerPromise=Promise.resolve().then(()=>provider.stream({text,signal:controller.signal,onToken:token=>{if(!settled)onToken?.(token);}}));
  try{return await Promise.race([providerPromise,abortPromise,timeoutPromise]);}
  finally{settled=true;clearTimeout(timeoutId);if(signal&&abortHandler)signal.removeEventListener('abort',abortHandler);}
}
