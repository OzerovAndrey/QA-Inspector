// Self-contained hover inspector. Visual overlays never alter the site's component CSS.
export function startPicker(){
 globalThis.__qaPickerCleanup?.();
 const box=document.createElement('div');box.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #4355d9;background:#4355d915;display:none;box-sizing:border-box';
 const tip=document.createElement('div');tip.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;max-width:330px;background:#202c3b;color:white;border-radius:9px;padding:10px 12px;font:12px/1.6 system-ui;left:12px;top:12px;box-shadow:0 6px 24px #0003;white-space:pre-line';tip.textContent='Наведіть на компонент\nКлік — зафіксувати · ↑ — батьківський блок · Esc — вийти';document.documentElement.append(box,tip);
 let current=null,timer=null,lastSelector='',lastX=12,lastY=12;
 function path(el){const pieces=[];for(let n=el;n&&n.nodeType===1;n=n.parentElement){const siblings=n.parentElement?[...n.parentElement.children].filter(x=>x.localName===n.localName):[n];pieces.unshift(n.localName+':nth-of-type('+(siblings.indexOf(n)+1)+')');}return pieces.join(' > ');}
 function target(e){if(!(e.target instanceof Element))return null;return e.altKey?e.target.parentElement:e.target.closest('button,[role="button"],a.btn,input,select,textarea')||e.target;}
 function show(el,send=true){
  if(!(el instanceof Element)||el===box||el===tip)return;current=el;const r=el.getBoundingClientRect(),css=getComputedStyle(el);
  Object.assign(box.style,{display:'block',left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});
  tip.textContent=`${el.localName}${el.id?'#'+el.id:''} · ${Math.round(r.width*10)/10} × ${Math.round(r.height*10)/10}\nШрифт: ${css.fontSize} / ${css.fontWeight}\nPadding: ${css.paddingTop} ${css.paddingRight} ${css.paddingBottom} ${css.paddingLeft}\nGap: ${css.gap} · Radius: ${css.borderTopLeftRadius}\nФактичні CSS · порівняння з JSON у панелі\nКлік — зафіксувати · ↑ / ↓ — рівень · Esc — вийти`;
  Object.assign(tip.style,{left:Math.max(8,Math.min(lastX+16,innerWidth-tip.offsetWidth-8))+'px',top:Math.max(8,Math.min(lastY+16,innerHeight-tip.offsetHeight-8))+'px'});
  const selector=path(el);if(send&&selector!==lastSelector){lastSelector=selector;chrome.runtime.sendMessage({type:'QA_HOVER',selector,url:location.href}).catch(()=>{});}
 }
 function move(e){lastX=e.clientX;lastY=e.clientY;const el=target(e);if(el!==current){clearTimeout(timer);show(el,false);timer=setTimeout(()=>show(el),180);}else show(el,false);}
 function cleanup(){clearTimeout(timer);box.remove();tip.remove();window.removeEventListener('pointermove',move,true);window.removeEventListener('click',pick,true);window.removeEventListener('keydown',key,true);window.removeEventListener('scroll',scroll,true);delete globalThis.__qaPickerCleanup;}
 function scroll(){if(current)show(current,false);}
 function key(e){if(e.key==='Escape'){cleanup();chrome.runtime.sendMessage({type:'QA_PICK_CANCEL'}).catch(()=>{});}else if(current&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();clearTimeout(timer);show(e.key==='ArrowUp'?current.parentElement:current.firstElementChild||current);}}
 function pick(e){e.preventDefault();e.stopImmediatePropagation();const el=e.altKey?target(e):current||target(e);if(!el)return;const selector=path(el);cleanup();chrome.runtime.sendMessage({type:'QA_PICK',selector,url:location.href}).catch(()=>{});}
 window.addEventListener('pointermove',move,true);window.addEventListener('click',pick,true);window.addEventListener('keydown',key,true);window.addEventListener('scroll',scroll,true);globalThis.__qaPickerCleanup=cleanup;
}
export function stopPicker(){globalThis.__qaPickerCleanup?.();}
