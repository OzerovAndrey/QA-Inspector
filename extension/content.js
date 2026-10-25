(() => {
  globalThis.__qaInspectorCleanup?.();
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #f59e0b;background:rgba(245,158,11,.12);display:none;box-sizing:border-box';
  document.documentElement.append(overlay);
  const target=e=>e.composedPath().find(n=>n instanceof Element && n.matches('button,[role="button"],input[type="button"],input[type="submit"]')) || e.target;
  function move(e){const el=target(e); if(!(el instanceof Element))return;const r=el.getBoundingClientRect();Object.assign(overlay.style,{display:'block',left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});}
  function cleanup(){overlay.remove();window.removeEventListener('pointermove',move,true);window.removeEventListener('click',pick,true);window.removeEventListener('keydown',key,true);delete globalThis.__qaInspectorCleanup;}
  function key(e){if(e.key==='Escape')cleanup();}
  function pick(e){
    e.preventDefault();e.stopImmediatePropagation();
    const el=target(e); if(!(el instanceof Element))return;
    const css=getComputedStyle(el), styles={};
    for(const prop of ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color','backgroundColor','paddingTop','paddingRight','paddingBottom','paddingLeft','width','height','borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius']) styles[prop]=css[prop];
    // Use rendered border-box dimensions; transformed geometry cannot be compared reliably.
    const rect=el.getBoundingClientRect(); styles.width=rect.width+'px';styles.height=rect.height+'px';
    const unsupported=[];
    let transformed=false;for(let n=el;n;n=n.parentElement)if(getComputedStyle(n).transform!=='none'||!['1','normal'].includes(getComputedStyle(n).zoom))transformed=true;
    if(transformed)unsupported.push('width','height');
    if(css.backgroundImage!=='none')unsupported.push('backgroundColor');
    chrome.runtime.sendMessage({type:'QA_CAPTURE',capture:{styles,unsupported,isButton:el.matches('button,[role="button"],input[type="button"],input[type="submit"]'),element:el.tagName.toLowerCase()+(el.id?'#'+el.id:''),url:location.href,timestamp:new Date().toISOString()}}).catch(()=>{});
    cleanup();
  }
  window.addEventListener('pointermove',move,true);window.addEventListener('click',pick,true);window.addEventListener('keydown',key,true);globalThis.__qaInspectorCleanup=cleanup;
})();
