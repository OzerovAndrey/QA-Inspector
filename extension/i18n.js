// Local UI translation only. Site text, design names, values, report data and storage schemas stay untouched.
export const languages=[['uk','Українська'],['en','English'],['pl','Polski'],['de','Deutsch'],['fr','Français'],['es','Español'],['it','Italiano'],['pt','Português']];
let language='uk',catalog={};
const templateCache=new WeakMap();
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function translateText(value,dictionary=catalog){
 const text=String(value??'');if(dictionary[text])return dictionary[text];
 let templates=templateCache.get(dictionary);if(!templates){templates=[];for(const [source,target]of Object.entries(dictionary)){if(!source.includes('{0}'))continue;const slots=[];const pattern=source.split(/(\{\d+\})/).map(part=>/^\{\d+\}$/.test(part)?(slots.push(part),'([\\s\\S]*?)'):escape(part)).join('');templates.push({pattern:new RegExp('^'+pattern+'$'),slots,target});}templateCache.set(dictionary,templates);}
 for(const {pattern,slots,target}of templates){const match=text.match(pattern);if(match)return target.replace(/\{\d+\}/g,slot=>match[slots.indexOf(slot)+1]??slot);}

 return text;
}
export async function setupLanguageUI(){
 const menu=document.getElementById('panel-menu'),label=document.createElement('label'),select=document.createElement('select');
 label.className='language-setting';const title=document.createElement('span');title.textContent='Мова';label.append(title,select);select.id='language-select';select.setAttribute('aria-label','Мова');
 for(const [code,name]of languages){const option=document.createElement('option');option.value=code;option.textContent=name;select.append(option);}menu.insertBefore(label,menu.querySelector('p'));
 const textRecords=new WeakMap(),attributeRecords=new WeakMap();
 const dataSelector='#system-name,.element-identity,.element-label,.conflict-element,code,.conflict-comparison td,.values b,.chip,textarea,select,script,style,[data-no-translate]';
 function translateNode(node){
  const parent=node.parentElement;if(!parent||parent.closest(dataSelector))return;
  const previous=textRecords.get(node),raw=previous&&previous.translated===node.data?previous.source:node.data;
  const trimmed=raw.trim();if(!trimmed)return;
  const translated=raw.replace(trimmed,translateText(trimmed));textRecords.set(node,{source:raw,translated});
  if(translated!==node.data){const button=parent.closest('button');if(button&&!button.querySelector('svg'))button.dataset.i18nSource=trimmed;node.data=translated;}
 }
 function apply(){
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))translateNode(node);
  for(const element of document.querySelectorAll('[placeholder],[aria-label],[title]')){
   if(element.closest('#system-name,.element-identity,.element-label,.conflict-element,code,.conflict-comparison td,.values b,.chip,[data-no-translate]'))continue;
   let records=attributeRecords.get(element);if(!records){records={};attributeRecords.set(element,records);}
   for(const name of ['placeholder','aria-label','title']){if(!element.hasAttribute(name))continue;const value=element.getAttribute(name),previous=records[name],source=previous&&previous.translated===value?previous.source:value,translated=translateText(source);records[name]={source,translated};if(value!==translated)element.setAttribute(name,translated);}
  }
 }
 let scheduled=false;const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;apply();});});
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title']});
 let generation=0;
 async function choose(code,persist=true){
  const current=++generation;select.disabled=true;
  try{if(!languages.some(([id])=>id===code))code='uk';const next=code==='uk'?{}:await fetch(new URL('./locales/'+code+'.json',import.meta.url)).then(response=>{if(!response.ok)throw Error('Locale unavailable');return response.json();});if(current!==generation)return;catalog=next;language=code;document.documentElement.lang=code;select.value=code;apply();if(persist)await chrome.storage.local.set({uiLanguage:code});document.dispatchEvent(new CustomEvent('qa:language-changed',{detail:{language:code}}));}
  catch{select.value=language;}
  finally{if(current===generation)select.disabled=false;}
 }
 select.addEventListener('change',()=>choose(select.value));
 const saved=await chrome.storage.local.get('uiLanguage');await choose(saved.uiLanguage||'uk',false);
}
