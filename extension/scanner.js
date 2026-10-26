// Serialized by chrome.scripting.executeScript. Keep this function self-contained.
export async function scanDocument(system,options={}){
  const extracting=system.mode==='extract';
  if(options.expectedUrl&&location.href!==options.expectedUrl)throw Error('Сторінка змінилася. Виберіть елемент знову.');
  if(options.selector&&!document.querySelector(options.selector))throw Error('Елемент зник. Виберіть його знову.');
  if((system.scope.origin!=='*'&&location.origin!==system.scope.origin)||!location.pathname.startsWith(system.scope.pathPrefix))throw Error('Ця дизайн-система призначена для '+system.scope.origin+system.scope.pathPrefix+'. Відкрийте відповідну сторінку.');
  const brand=document.documentElement.getAttribute('data-brand')||system.defaultBrand||'default';
  const theme=document.documentElement.getAttribute('data-theme')||system.defaultTheme||'light';
  const context=extracting?'raw/default':options.context||brand+'/'+theme;
  if(!system.contexts[context])throw Error('Невідомий бренд або тема: '+context+'. Додайте цей контекст у пакет дизайн-системи.');
  for(const rule of system.rules)document.querySelector(rule.selector);
  const candidatesSelector=system.candidatesSelector||'button,[role="button"],input,select,textarea,a.btn';
  document.querySelector(candidatesSelector);
  if(document.fonts)await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,2000))]);
  const all=options.selector?new Set([document.querySelector(options.selector)].filter(Boolean)):(extracting||system.mode==='tokens')?new Set(document.querySelectorAll('body,body *:not(script):not(style):not(svg):not(svg *)')):new Set(document.querySelectorAll(candidatesSelector));
  if(!options.selector)for(const rule of system.rules)for(const el of document.querySelectorAll(rule.selector))all.add(el);
  const elements=[],uncovered=[];let hidden=0,truncated=false,processed=0;
  const path=el=>{const pieces=[];for(let n=el;n&&n.nodeType===1;n=n.parentElement){const tag=n.localName;const siblings=n.parentElement?[...n.parentElement.children].filter(x=>x.localName===tag):[n];pieces.unshift(tag+':nth-of-type('+(siblings.indexOf(n)+1)+')');if(n===document.documentElement)break;}return pieces.join(' > ');};
  for(const el of all){
    const css=getComputedStyle(el),rect=el.getBoundingClientRect();
    if(!rect.width||!rect.height||css.display==='none'||css.visibility!=='visible'||el.closest('[hidden],[inert]')){hidden++;continue;}
    if(++processed>1500){truncated=true;break;}
    const selector=path(el),label=(el.getAttribute('aria-label')||el.getAttribute('placeholder')||el.innerText||el.getAttribute('title')||el.localName).trim().replace(/\s+/g,' ').slice(0,120);
    let rules={},names=[];
    for(const rule of system.rules)if(el.matches(rule.selector)){Object.assign(rules,rule.properties);names.push(rule.name);}
    if(extracting){
      names=[el.localName+(el.id?'#'+el.id:'')];
      for(const prop of ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color','backgroundColor','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginRight','marginBottom','marginLeft','gap','rowGap','columnGap','width','height','borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius','borderTopWidth','borderTopColor','display','alignItems','justifyContent','boxShadow','backgroundImage'])rules[prop]={};
    }
    if(system.mode==='tokens'){
      const catalog=system.catalog[context];
      const hasText=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||el.matches('input,select,textarea');
      const candidates={color:'color',backgroundColor:'color',paddingTop:'spacing',paddingRight:'spacing',paddingBottom:'spacing',paddingLeft:'spacing',gap:'spacing',borderTopLeftRadius:'radius',borderTopRightRadius:'radius',borderBottomLeftRadius:'radius',borderBottomRightRadius:'radius',borderTopWidth:'border'};
      if(hasText)Object.assign(candidates,{fontFamily:'fontFamily',fontSize:'fontSize',fontWeight:'fontWeight',lineHeight:'lineHeight',letterSpacing:'letterSpacing'});
      for(const [prop,type]of Object.entries(candidates)){
        const value=css[prop];if((type==='spacing'||type==='radius'||type==='border')&&(!parseFloat(value)||value==='normal'))continue;
        if(prop==='backgroundColor'&&['rgba(0, 0, 0, 0)','transparent'].includes(value))continue;
        if(prop==='color'&&!hasText)continue;
        const tokens=Object.entries(catalog).filter(([,kind])=>kind===type||(type==='spacing'&&kind==='dimension')||(type==='radius'&&kind==='dimension')).map(([key])=>key);
        if(tokens.length)rules[prop]={tokens,tolerance:type==='color'?1:['fontFamily','fontWeight'].includes(type)?0:.5};
      }
      if(Object.keys(rules).length)names=['Токени · '+el.localName];
    }
    const unmapped=!names.length&&Boolean(options.selector);
    if(unmapped){names=['Елемент без правила'];for(const prop of ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color','backgroundColor','paddingTop','paddingRight','paddingBottom','paddingLeft','gap','width','height','borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius'])rules[prop]={value:'Не задано у конфігурації',tolerance:0};}
    if(!names.length){uncovered.push({selector,label});continue;}
    const styles={fontSize:css.fontSize};for(const prop of Object.keys(rules))styles[prop]=css[prop];
    if('width'in rules)styles.width=rect.width+'px';if('height'in rules)styles.height=rect.height+'px';
    const unsupported=unmapped?Object.keys(rules):[];
    if(css.backgroundImage!=='none')unsupported.push('backgroundColor');
    for(let n=el;n;n=n.parentElement){const c=getComputedStyle(n);if(c.transform!=='none'||!['1','normal'].includes(c.zoom)){unsupported.push('width','height');break;}}
    elements.push({selector,label,name:names[0],rules,styles,unsupported,unmapped});
  }
  return {url:location.href,rootFontSize:getComputedStyle(document.documentElement).fontSize,selection:options.selector||null,context,timestamp:new Date().toISOString(),elements,uncovered,hidden,truncated};
}
export function revealElement(selector,description='Елемент із результатів перевірки',property=null,hover=false){
  globalThis.__qaRevealCleanup?.();
  const el=document.querySelector(selector);if(!el)return false;
  el.scrollIntoView({behavior:'instant',block:'center',inline:'center'});
  const overlay=document.createElement('div'),tip=document.createElement('div');
  overlay.dataset.qaConflict='true';
  overlay.style.cssText='position:fixed;pointer-events:none;z-index:2147483646;border:3px solid #e45145;border-radius:5px;background:#e4514519;box-sizing:border-box';
  tip.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;background:#952e2a;color:white;border-radius:7px;padding:9px 12px;font:12px/1.5 system-ui;max-width:min(360px,calc(100vw - 16px));overflow-wrap:anywhere;box-shadow:0 4px 18px #0003';tip.style.whiteSpace='pre-line';tip.textContent=description;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const pulse=reduced||hover?null:overlay.animate([{opacity:1},{opacity:.3},{opacity:1}],{duration:1200,iterations:5});
  document.documentElement.append(overlay,tip);
  const update=()=>{const rect=el.getBoundingClientRect(),r={left:rect.left,top:rect.top,width:rect.width,height:rect.height,bottom:rect.bottom};if(property&&/^(padding|margin)/.test(property)){const amount=parseFloat(getComputedStyle(el)[property])||0,margin=property.startsWith('margin');if(property.endsWith('Top')){r.height=Math.abs(amount);if(margin)r.top-=amount;}else if(property.endsWith('Bottom')){r.top=margin?rect.bottom:rect.bottom-amount;r.height=Math.abs(amount);}else if(property.endsWith('Left')){r.width=Math.abs(amount);if(margin)r.left-=amount;}else if(property.endsWith('Right')){r.left=margin?rect.right:rect.right-amount;r.width=Math.abs(amount);}r.bottom=r.top+r.height;}Object.assign(overlay.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});Object.assign(tip.style,{left:Math.max(8,Math.min(r.left,innerWidth-tip.offsetWidth-8))+'px',top:Math.max(8,Math.min(r.bottom+8,innerHeight-tip.offsetHeight-8))+'px'});};
  const cleanup=()=>{clearTimeout(timer);pulse?.cancel();overlay.remove();tip.remove();window.removeEventListener('scroll',update,true);window.removeEventListener('resize',update);window.removeEventListener('keydown',key,true);delete globalThis.__qaRevealCleanup;};
  const key=e=>{if(e.key==='Escape')cleanup();};const timer=setTimeout(cleanup,6000);
  window.addEventListener('scroll',update,true);window.addEventListener('resize',update);window.addEventListener('keydown',key,true);globalThis.__qaRevealCleanup=cleanup;update();return true;
}

export function clearReveal(){globalThis.__qaRevealCleanup?.();}
