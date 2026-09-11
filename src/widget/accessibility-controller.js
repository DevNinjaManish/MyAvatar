const SURFACES=[
  {id:'bot-library',opener:'widget-picker-toggle',close:'library-close',focus:'library-close',trap:true},
  {id:'widget-menu',opener:'widget-more',close:'menu-close',focus:'menu-close',trap:true},
  {id:'widget-chat',opener:'widget-chat-toggle',close:'widget-chat-close',focus:'widget-text',className:'widget-chat-open'},
  {id:'widget-coding-panels',opener:'widget-specialist-toggle',close:'widget-panels-close',focus:'widget-panels-title'},
  {id:'widget-mini-calendar',opener:'widget-specialist-toggle',close:'widget-mini-calendar-close',focus:'widget-mini-calendar-title'},
  {id:'widget-creative-workspace',opener:'widget-specialist-toggle',close:'widget-creative-close',focus:'widget-creative-title'},
  {id:'widget-code-wing',opener:'widget-open-diff',close:'widget-wing-close',focus:'widget-wing-title',trap:true},
];

const SUBDISCLOSURES=[
  {button:'widget-quality',panel:'widget-quality-panel'},
  {button:'widget-system-hud-toggle',panel:'widget-system-hud'},
  {button:'widget-rivet-details-toggle',panel:'widget-rivet-details-body'},
];

const NAV_GROUPS=[
  {root:'widget-menu',selector:'button:not([hidden]):not(:disabled), input:not([hidden]):not(:disabled)'},
  {root:'bot-library',selector:'.bot-card:not([hidden]):not(:disabled), #library-close:not([hidden]):not(:disabled)'},
];

const FOCUSABLE_SELECTOR='button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';

export function linearFocusIndex(key,index,count){
  if(!Number.isInteger(count)||count<1||!Number.isInteger(index)||index<0||index>=count)return null;
  if(key==='Home')return 0;
  if(key==='End')return count-1;
  if(key==='ArrowDown'||key==='ArrowRight')return (index+1)%count;
  if(key==='ArrowUp'||key==='ArrowLeft')return (index-1+count)%count;
  return null;
}

const isVisible=(doc,surface)=>{
  const node=doc.getElementById(surface.id);
  if(!node)return false;
  if(surface.className)return doc.body.classList.contains(surface.className);
  return !node.hidden;
};
const focusable=node=>node&&!node.hidden&&!node.disabled&&!node.closest?.('[hidden],[aria-hidden="true"]')&&typeof node.focus==='function';
const focusableWithin=root=>[...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter(focusable);

export function mountWidgetAccessibility(win=window,doc=document){
  if(win.__myavatarWidgetAccessibility)return win.__myavatarWidgetAccessibility;
  const state=new Map();

  const syncSurface=surface=>{
    const panel=doc.getElementById(surface.id);
    if(!panel)return;
    const opener=doc.getElementById(surface.opener);
    const visible=isVisible(doc,surface);
    if(opener?.hasAttribute('aria-expanded'))opener.setAttribute('aria-expanded',String(visible));
    panel.setAttribute('aria-hidden',String(!visible));
    const previous=state.get(surface.id);
    if(previous===visible)return;
    state.set(surface.id,visible);
    if(visible){
      const target=doc.getElementById(surface.focus)||focusableWithin(panel)[0];
      queueMicrotask(()=>focusable(target)&&target.focus({preventScroll:true}));
    }else if(previous===true&&focusable(opener)){
      queueMicrotask(()=>opener.focus({preventScroll:true}));
    }
  };

  const syncDisclosure=item=>{
    const button=doc.getElementById(item.button),panel=doc.getElementById(item.panel);
    if(!button||!panel)return;
    button.setAttribute('aria-controls',item.panel);
    button.setAttribute('aria-expanded',String(!panel.hidden));
  };
  const syncAll=()=>{SURFACES.forEach(syncSurface);SUBDISCLOSURES.forEach(syncDisclosure);};

  const observer=new MutationObserver(records=>{
    if(records.some(record=>record.type==='attributes'&&(record.attributeName==='hidden'||record.attributeName==='class'||record.attributeName==='disabled'||record.attributeName==='aria-hidden')))syncAll();
  });
  SURFACES.forEach(surface=>{
    const node=doc.getElementById(surface.id);
    if(node&&!surface.className)observer.observe(node,{attributes:true,attributeFilter:['hidden','aria-hidden'],subtree:true});
  });
  SUBDISCLOSURES.forEach(item=>{
    const panel=doc.getElementById(item.panel);
    if(panel)observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
  });
  observer.observe(doc.body,{attributes:true,attributeFilter:['class']});

  const moveWithinGroup=event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return false;
    const group=NAV_GROUPS.find(item=>doc.getElementById(item.root)?.contains(event.target));
    if(!group)return false;
    const root=doc.getElementById(group.root);
    const items=[...root.querySelectorAll(group.selector)].filter(focusable);
    const index=items.indexOf(event.target);
    if(index<0)return false;
    const target=linearFocusIndex(event.key,index,items.length);
    if(target===null)return false;
    event.preventDefault();
    items[target]?.focus({preventScroll:true});
    return true;
  };

  const activeTrap=()=>[...SURFACES].reverse().find(surface=>surface.trap&&isVisible(doc,surface));
  const trapTab=event=>{
    if(event.key!=='Tab'||event.altKey||event.ctrlKey||event.metaKey)return false;
    const surface=activeTrap();
    if(!surface)return false;
    const panel=doc.getElementById(surface.id);
    const items=focusableWithin(panel);
    if(!items.length){
      event.preventDefault();
      return true;
    }
    const first=items[0],last=items[items.length-1];
    const current=doc.activeElement;
    if(!panel.contains(current)){
      event.preventDefault();
      (event.shiftKey?last:first).focus({preventScroll:true});
      return true;
    }
    if(event.shiftKey&&current===first){
      event.preventDefault();
      last.focus({preventScroll:true});
      return true;
    }
    if(!event.shiftKey&&current===last){
      event.preventDefault();
      first.focus({preventScroll:true});
      return true;
    }
    return false;
  };

  const onKeydown=event=>{
    if(trapTab(event))return;
    if(moveWithinGroup(event))return;
    if(event.key!=='Escape')return;
    const surface=[...SURFACES].reverse().find(item=>isVisible(doc,item));
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