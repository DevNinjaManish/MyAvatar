const SURFACES=[
  {id:'bot-library',opener:'widget-picker-toggle',close:'library-close',focus:'library-close'},
  {id:'widget-menu',opener:'widget-more',close:'menu-close',focus:'menu-close'},
  {id:'widget-chat',opener:'widget-chat-toggle',close:'widget-chat-close',focus:'widget-text'},
  {id:'widget-coding-panels',opener:'widget-specialist-toggle',close:'widget-panels-close',focus:'widget-panels-title'},
  {id:'widget-mini-calendar',opener:'widget-specialist-toggle',close:'widget-mini-calendar-close',focus:'widget-mini-calendar-title'},
  {id:'widget-creative-workspace',opener:'widget-specialist-toggle',close:'widget-creative-close',focus:'widget-creative-title'},
  {id:'widget-code-wing',opener:'widget-open-diff',close:'widget-wing-close',focus:'widget-wing-title'},
];

const isVisible=node=>!!node&&!node.hidden;
const focusable=node=>node&&!node.hidden&&!node.disabled&&typeof node.focus==='function';

export function mountWidgetAccessibility(win=window,doc=document){
  if(win.__myavatarWidgetAccessibility)return win.__myavatarWidgetAccessibility;
  const state=new Map();

  const syncSurface=surface=>{
    const panel=doc.getElementById(surface.id);
    if(!panel)return;
    const opener=doc.getElementById(surface.opener);
    const visible=isVisible(panel);
    if(opener?.hasAttribute('aria-expanded'))opener.setAttribute('aria-expanded',String(visible));
    panel.setAttribute('aria-hidden',String(!visible));
    const previous=state.get(surface.id);
    if(previous===visible)return;
    state.set(surface.id,visible);
    if(visible){
      const target=doc.getElementById(surface.focus)||panel.querySelector('button,input,textarea,select,[tabindex]:not([tabindex="-1"])');
      queueMicrotask(()=>focusable(target)&&target.focus());
    }else if(previous===true&&focusable(opener)){
      queueMicrotask(()=>opener.focus());
    }
  };

  const syncAll=()=>SURFACES.forEach(syncSurface);
  const observer=new MutationObserver(records=>{
    if(records.some(record=>record.type==='attributes'&&record.attributeName==='hidden'))syncAll();
  });
  SURFACES.forEach(surface=>{
    const node=doc.getElementById(surface.id);
    if(node)observer.observe(node,{attributes:true,attributeFilter:['hidden']});
  });

  const onKeydown=event=>{
    if(event.key!=='Escape')return;
    const surface=[...SURFACES].reverse().find(item=>isVisible(doc.getElementById(item.id)));
    if(!surface)return;
    const close=doc.getElementById(surface.close);
    if(close&&!close.hidden&&!close.disabled){
      event.preventDefault();
      event.stopPropagation();
      close.click();
    }
  };
  doc.addEventListener('keydown',onKeydown,true);
  syncAll();

  const api={sync:syncAll,dispose(){observer.disconnect();doc.removeEventListener('keydown',onKeydown,true);delete win.__myavatarWidgetAccessibility;}};
  win.__myavatarWidgetAccessibility=api;
  return api;
}
