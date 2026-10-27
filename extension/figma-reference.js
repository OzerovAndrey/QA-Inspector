// Direct, read-only Figma REST integration. No credential is part of a reference.
export function parseFigmaLink(value){let url;try{url=new URL(value);}catch{throw Error('Вставте повне посилання Figma.');}if(url.protocol!=='https:'||!['figma.com','www.figma.com'].includes(url.hostname))throw Error('Потрібне посилання https://www.figma.com/design/…');const match=url.pathname.match(/^\/(?:design|file|proto)\/([a-zA-Z0-9]+)(?:\/|$)/);if(!match)throw Error('Не вдалося визначити файл Figma.');const id=url.searchParams.get('node-id');if(!id||!/^I?\d+[:-]\d+(?:;\d+[:-]\d+)*$/.test(id))throw Error('Скопіюйте посилання на конкретний фрейм або компонент: Copy link to selection.');return{fileKey:match[1],nodeId:id.replaceAll('-',':'),url:url.href};}
export function validFigmaTokenFormat(value){return /^figd_[A-Za-z0-9_-]{20,}$/.test(String(value||'').trim());}
export async function fetchFigmaReference(link,token,fetcher=fetch){const target=parseFigmaLink(link);if(!token?.trim())throw Error('Спочатку додайте токен Figma з дозволом file_content:read.');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{const response=await fetcher(`https://api.figma.com/v1/files/${target.fileKey}/nodes?ids=${encodeURIComponent(target.nodeId)}`,{headers:{'X-Figma-Token':token.trim()},credentials:'omit',redirect:'error',signal:controller.signal});if(!response.ok){const messages={401:'Токен Figma недійсний або прострочений.',403:'Немає доступу до файлу або дозволу file_content:read.',404:'Файл або шар не знайдено.',429:'Ліміт Figma API. Спробуйте пізніше.'};const error=Error(messages[response.status]||'Figma API: '+response.status);error.status=response.status;throw error;}if(Number(response.headers?.get('content-length'))>12*1024*1024)throw Error('Фрейм завеликий. Виберіть меншу секцію.');const text=await response.text();if(text.length>12*1024*1024)throw Error('Фрейм завеликий. Виберіть меншу секцію.');const data=JSON.parse(text),root=data.nodes?.[target.nodeId]?.document;if(!root)throw Error('Шар не знайдено. Перевірте посилання.');return{...target,name:data.name||'Figma',version:data.version||null,root,fetchedAt:new Date().toISOString()};}finally{clearTimeout(timer);}}
export function listFigmaNodes(root){const nodes=[];function visit(n,depth,parent){if(n.visible===false)return;if(nodes.length>=2000)throw Error('Забагато шарів. Виберіть менший фрейм.');if(!['DOCUMENT','CANVAS','SECTION','GROUP','VECTOR','BOOLEAN_OPERATION','SLICE'].includes(n.type))nodes.push({node:n,depth,parent});for(const child of n.children||[])visit(child,depth+1,n);}visit(root,0);return nodes;}
export function figmaSizing(node,parent){
 const modes={width:node.layoutSizingHorizontal,height:node.layoutSizingVertical};
 const primary=node.layoutMode==='HORIZONTAL'?'width':node.layoutMode==='VERTICAL'?'height':null;
 const parentPrimary=parent?.layoutMode==='HORIZONTAL'?'width':parent?.layoutMode==='VERTICAL'?'height':null;
 for(const axis of ['width','height']){
  if(['FIXED','HUG','FILL'].includes(modes[axis]))continue;
  if(parentPrimary&&((axis===parentPrimary&&node.layoutGrow>0)||(axis!==parentPrimary&&node.layoutAlign==='STRETCH')))modes[axis]='FILL';
  else if(!parentPrimary&&(node.layoutGrow>0||node.layoutAlign==='STRETCH'))modes[axis]='DYNAMIC';
  else if(primary&&(axis===primary?node.primaryAxisSizingMode:node.counterAxisSizingMode)==='AUTO')modes[axis]='HUG';
  else modes[axis]='FIXED';
 }
 return modes;
}
export function figmaProperties(node,parent){const p={},skipped=[];const add=(name,value)=>{if(Number.isFinite(value))p[name]=value+'px';};const color=paint=>{const c=paint.color;return `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${((c.a??1)*(paint.opacity??1)).toFixed(4)})`;};
 const bounds=node.absoluteBoundingBox,sizing=figmaSizing(node,parent);for(const axis of ['width','height']){if(sizing[axis]!=='FIXED')skipped.push((axis==='width'?'Ширина':'Висота')+' — '+sizing[axis]);else if(axis!=='height'||node.type!=='TEXT')add(axis,bounds?.[axis]);}
 if(node.rotation&&Math.abs(node.rotation)>.01){delete p.width;delete p.height;skipped.push('Розміри повернутого шару');}
 const fills=(node.fills||[]).filter(f=>f.visible!==false);if(fills.length===1&&fills[0].type==='SOLID'&&(node.opacity??1)===1)p[node.type==='TEXT'?'color':'backgroundColor']=color(fills[0]);else if(fills.length)skipped.push('Градієнт, зображення, кілька заливок або прозорість шару');
 const radii=node.rectangleCornerRadii|| (Number.isFinite(node.cornerRadius)?Array(4).fill(node.cornerRadius):[]);['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].forEach((prop,i)=>add(prop,radii[i]));
 if(['HORIZONTAL','VERTICAL'].includes(node.layoutMode)){for(const side of ['Top','Right','Bottom','Left'])add('padding'+side,node['padding'+side]);if(!node.layoutWrap||node.layoutWrap==='NO_WRAP')add('gap',node.itemSpacing);else skipped.push('Проміжки при перенесенні Auto Layout');}
 const strokes=(node.strokes||[]).filter(f=>f.visible!==false);if(strokes.length===1&&strokes[0].type==='SOLID'&&node.strokeAlign==='INSIDE'){add('borderTopWidth',node.strokeWeight);p.borderTopColor=color(strokes[0]);}else if(strokes.length)skipped.push('Рамка з нееквівалентним CSS вирівнюванням');
 if(node.type==='TEXT'){const s=node.style||{};if(node.characterStyleOverrides?.some(Boolean))skipped.push('Змішана типографіка');else{if(s.fontFamily)p.fontFamily=s.fontFamily;if(Number.isFinite(s.fontWeight))p.fontWeight=String(s.fontWeight);add('fontSize',s.fontSize);add('letterSpacing',s.letterSpacing);if(s.lineHeightUnit!=='INTRINSIC_%')add('lineHeight',s.lineHeightPx);else skipped.push('Автоматична висота рядка');}}
 return{properties:p,skipped,sizing};}
export function makeFigmaSystem(reference,node,checkViewport=false,parent){const {properties,skipped,sizing}=figmaProperties(node,parent);if(sizing.width!=='FIXED')checkViewport=false;if(checkViewport&&!Number.isFinite(node.absoluteBoundingBox?.width))throw Error('Цей шар не має ширини для перевірки брейкпоінта.');if(!Object.keys(properties).length)throw Error('У цьому шарі немає підтримуваних властивостей. Оберіть фрейм або текст.');const nodeLink=new URL(reference.url);nodeLink.searchParams.set('node-id',node.id.replaceAll(':','-'));return{schemaVersion:1,name:`Figma · ${reference.name} / ${node.name}`,scope:{origin:'*',pathPrefix:'/'},defaultBrand:'figma',defaultTheme:'default',contexts:{'figma/default':{}},rules:[{name:node.name||node.type,selector:'*',properties:Object.fromEntries(Object.entries(properties).map(([name,value])=>[name,{value,tolerance:['color','backgroundColor','borderTopColor','fontFamily','fontWeight'].includes(name)?0:.5}]))}],source:{type:'figma',url:nodeLink.href,fileKey:reference.fileKey,nodeId:node.id,fileVersion:reference.version,fetchedAt:reference.fetchedAt,width:node.absoluteBoundingBox?.width,checkViewport,skipped,sizing,layers:listFigmaNodes(node).map(entry=>{const data=figmaProperties(entry.node,entry.parent||parent);return{id:entry.node.id,parentId:entry.parent?.id,name:entry.node.name,type:entry.node.type,text:entry.node.characters||'',properties:data.properties,skipped:data.skipped};}),note:'Сторінка — автоматичне зіставлення шарів макета. Компонент — ручна перевірка вибраної пари.'}};}
// Serialized into the inspected page. No Figma token or API call enters the page.
export function scanFigmaTarget(system,options={}){try{if(!options.selector)throw Error('Виберіть відповідний блок на сайті пікером.');if(options.expectedUrl&&location.href!==options.expectedUrl)throw Error('Сторінка змінилась. Виберіть блок заново.');const el=document.querySelector(options.selector);if(!el)throw Error('Елемент не знайдено.');if(system.source.checkViewport&&Math.abs(innerWidth-system.source.width)>1)throw Error(`Ширина браузера ${innerWidth}px, макета ${system.source.width}px. Встановіть потрібну ширину (з урахуванням бічної панелі) або вимкніть перевірку ширини.`);const css=getComputedStyle(el),rules=system.rules[0].properties,styles={},unsupported=[];for(const prop of Object.keys(rules)){styles[prop]=css[prop];if(prop==='fontFamily')styles[prop]=css.fontFamily.split(',')[0].trim();if(prop==='backgroundColor'&&css.backgroundImage!=='none')unsupported.push(prop);if(prop==='gap'&&(css.display!=='flex'&&css.display!=='inline-flex'&&css.display!=='grid'&&css.display!=='inline-grid'))unsupported.push(prop);}if(css.transform!=='none')unsupported.push('width','height');return{url:location.href,rootFontSize:getComputedStyle(document.documentElement).fontSize,context:'figma/default',timestamp:new Date().toISOString(),uncovered:[],elements:[{name:system.rules[0].name,label:el.localName+(el.id?'#'+el.id:'')+' · '+(el.textContent||'').trim().slice(0,80),selector:options.selector,styles,rules,unsupported}],figmaSource:system.source,viewportWidth:innerWidth};}catch(error){return{error:error.message};}}

// Page matching uses identity/text/structure, never similarity of the values being tested.
export function scanFigmaPage(system){try{
 const source=system.source,layers=source.layers;
 if(!layers?.length)throw Error('Оновіть еталон із Figma, щоб завантажити дочірні шари макета.');
 if(source.checkViewport&&Math.abs(innerWidth-source.width)>1)throw Error(`Ширина браузера ${innerWidth}px, макета ${source.width}px. Встановіть ширину макета або вимкніть перевірку ширини.`);
 const normalize=text=>String(text||'').replace(/\s+/g,' ').trim();
 const all=[...document.querySelectorAll('body,body *')].filter(el=>!['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
 if(all.length>15000)throw Error('Сторінка завелика для автоматичного зіставлення. Перевірте окремий компонент.');
 const matches=new Map(),reasons=new Map(),used=new Set();
 for(const layer of layers){
  const explicit=all.filter(el=>el.getAttribute('data-figma-node-id')===layer.id);
  let candidates=explicit;
  if(!explicit.length&&layer.type==='TEXT'&&normalize(layer.text)){
   const text=normalize(layer.text);
   candidates=all.filter(el=>normalize(el.textContent)===text&&!Array.from(el.children).some(child=>normalize(child.textContent)===text));
  }
  if(candidates.length===1&&!used.has(candidates[0])){matches.set(layer.id,candidates[0]);used.add(candidates[0]);}
  else reasons.set(layer.id,candidates.length?'Кілька можливих відповідностей':'Не знайдено однозначної відповідності');
 }
 const byId=new Map(layers.map(layer=>[layer.id,layer]));
 const descends=(layer,id)=>{let parent=layer.parentId;const seen=new Set();while(parent&&!seen.has(parent)){if(parent===id)return true;seen.add(parent);parent=byId.get(parent)?.parentId;}return false;};
 // A wrapper is inferred only from at least two distinct matched descendant branches.
 for(const layer of [...layers].reverse()){
  if(matches.has(layer.id)||layer.type==='TEXT')continue;
  const anchors=layers.filter(child=>matches.has(child.id)&&descends(child,layer.id));
  if(anchors.length<2)continue;
  const elements=anchors.map(child=>matches.get(child.id));let common=elements[0].parentElement;
  while(common&&!elements.every(el=>common.contains(el)))common=common.parentElement;
  if(!common||common===document.documentElement||used.has(common))continue;
  // Nested wrappers with the same anchors cannot be distinguished without identifiers.
  const equivalent=layers.some(other=>other.id!==layer.id&&other.type!=='TEXT'&&!matches.has(other.id)&&anchors.every(child=>descends(child,other.id))&&layers.filter(child=>matches.has(child.id)&&descends(child,other.id)).length===anchors.length);
  if(equivalent){reasons.set(layer.id,'Вкладені обгортки неможливо однозначно розрізнити');continue;}
  matches.set(layer.id,common);used.add(common);
 }
 const selectorFor=el=>{if(el.id&&document.querySelectorAll('#'+CSS.escape(el.id)).length===1)return '#'+CSS.escape(el.id);const parts=[];while(el&&el!==document.documentElement){const siblings=el.parentElement?[...el.parentElement.children].filter(sibling=>sibling.localName===el.localName):[el];parts.unshift(el.localName+':nth-of-type('+(siblings.indexOf(el)+1)+')');el=el.parentElement;}return 'html > '+parts.join(' > ');};
 const elements=[],unmatched=[];
 for(const layer of layers){const el=matches.get(layer.id);if(!Object.keys(layer.properties).length){unmatched.push({id:layer.id,name:layer.name,reason:'Немає підтримуваних властивостей для порівняння'});continue;}if(!el){unmatched.push({id:layer.id,name:layer.name,reason:reasons.get(layer.id)||'Не знайдено однозначної відповідності'});continue;}
  const css=getComputedStyle(el),styles={},unsupported=[],rules={};
  for(const [prop,value] of Object.entries(layer.properties)){
   rules[prop]={value,tolerance:['color','backgroundColor','borderTopColor','fontFamily','fontWeight'].includes(prop)?0:.5};
   styles[prop]=prop==='fontFamily'?css.fontFamily.split(',')[0].trim():css[prop];
   if(prop==='backgroundColor'&&css.backgroundImage!=='none')unsupported.push(prop);
   if(prop==='gap'&&!['flex','inline-flex','grid','inline-grid'].includes(css.display))unsupported.push(prop);
  }
  if(css.transform!=='none')unsupported.push('width','height');
  elements.push({name:layer.name,label:layer.name+' · '+normalize(el.textContent).slice(0,80),selector:selectorFor(el),styles,rules,unsupported,figmaNodeId:layer.id});
 }
 return{url:location.href,rootFontSize:getComputedStyle(document.documentElement).fontSize,context:'figma/default',timestamp:new Date().toISOString(),uncovered:[],elements,figmaSource:source,viewportWidth:innerWidth,figmaPage:{total:layers.length,matched:elements.length,unmatched}};
 }catch(error){return{error:error.message};}}

export function figmaPageReady(system){return system?.source?.type==='figma'&&Array.isArray(system.source.layers)&&system.source.layers.length>0;}
export async function refreshFigmaSystem(system,token,fetcher=fetch){
 if(system?.source?.type!=='figma')throw Error('Спочатку додайте еталон Figma.');
 const reference=await fetchFigmaReference(system.source.url,token,fetcher);
 if(reference.root.id!==system.source.nodeId)throw Error('Посилання не відповідає збереженому шару Figma. Додайте еталон заново.');
 // Subtree requests omit the original parent. Preserve known dynamic axis constraints.
 const root={...reference.root};
 for(const [axis,field] of [['width','layoutSizingHorizontal'],['height','layoutSizingVertical']])if(!root[field]&&['HUG','FILL'].includes(system.source.sizing?.[axis]))root[field]=system.source.sizing[axis];
 return makeFigmaSystem(reference,root,system.source.checkViewport);
}
