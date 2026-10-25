import {validateSystem} from './scan-core.js';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const leaf=v=>v&&typeof v==='object'&&(own(v,'$value')||own(v,'value'));
const ref=s=>typeof s==='string'&&/^\{[^}]+\}$/.test(s);
function flatten(tree,prefix='',out=Object.create(null),inherited){inherited=tree.$type??inherited;for(const [key,v]of Object.entries(tree)){if(key.startsWith('$'))continue;const name=prefix?prefix+'.'+key:key;if(leaf(v))out[name]={value:v.$value??v.value,type:v.$type??v.type??inherited,dtcg:own(v,'$value'),modifier:v.$extensions?.['studio.tokens']?.modify};else if(v&&typeof v==='object')flatten(v,name,out,v.$type??inherited);}return out;}
function countLeaves(tree){return Object.keys(flatten(tree)).length;}
function color(v){if(typeof v==='string')return v;if(v?.colorSpace==='srgb'&&Array.isArray(v.components)&&v.components.length===3&&v.components.every(Number.isFinite))return `rgba(${v.components.map(x=>Math.round(x*255)).join(',')},${v.alpha??1})`;return null;}
function toCss(v,type){
 if(type==='color')return color(v);
 if(['fontFamilies','fontFamily'].includes(type))return Array.isArray(v)?v.join(', '):String(v);
 if(['fontWeight','fontWeights'].includes(type))return String(v);
 if(type==='letterSpacing'){if(typeof v==='string'&&v.endsWith('%'))return parseFloat(v)/100+'em';}
 if(v&&typeof v==='object'&&own(v,'value')&&own(v,'unit'))return String(v.value)+v.unit;
 if(typeof v==='string'||typeof v==='number'){
  if(['dimension','spacing','sizing','borderRadius','borderWidth','fontSizes','fontSize','lineHeights','lineHeight','letterSpacing','number'].includes(type)&&/^-?[\d.]+$/.test(String(v)))return v+'px';return String(v);
 }
 return null;
}
function modify(hex,m){
 if(!/^#[a-f0-9]{6}$/i.test(hex)||!['lighten','darken','alpha'].includes(m.type))throw Error('Непідтримуваний модифікатор токена.');
 const n=Number(m.value);if(!Number.isFinite(n)||n<0||n>1)throw Error('Некоректний модифікатор кольору.');if(m.type==='alpha')return hex+Math.round(n*255).toString(16).padStart(2,'0');
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(...rgb),min=Math.min(...rgb),l=(max+min)/2,d=max-min;let h=0,s=0;
 if(d){s=d/(1-Math.abs(2*l-1));h=max===rgb[0]?((rgb[1]-rgb[2])/d+6)%6:max===rgb[1]?(rgb[2]-rgb[0])/d+2:(rgb[0]-rgb[1])/d+4;h/=6;}
 const light=m.type==='lighten'?l+(1-l)*n:l*(1-n);const a=s*Math.min(light,1-light),f=k=>{k=(k+h*12)%12;return light-a*Math.max(-1,Math.min(k-3,9-k,1));};return '#'+[0,8,4].map(k=>Math.round(f(k)*255).toString(16).padStart(2,'0')).join('');
}
const types={fontFamily:'fontFamily',fontFamilies:'fontFamily',fontWeight:'fontWeight',fontWeights:'fontWeight',fontSize:'fontSize',fontSizes:'fontSize',lineHeight:'lineHeight',lineHeights:'lineHeight',letterSpacing:'letterSpacing',color:'color',spacing:'spacing',sizing:'size',dimension:'dimension',borderRadius:'radius',borderWidth:'border'};
export function importTokens(input,name='Дизайн-система'){
 if(input?.schemaVersion===1)return validateSystem(input);
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Потрібен JSON з токенами або конфігурацією QA Inspector.');
 const entries=Object.entries(input).filter(([k])=>!k.startsWith('$'));
 const hasThemes=Array.isArray(input.$themes)&&input.$themes.length;
 // Tokens Studio bundles contain named sets (usually core, theme/light, brand/name).
 const bundle=hasThemes||Array.isArray(input.$metadata?.tokenSetOrder)||entries.some(([k])=>k.includes('/'))||entries.some(([k])=>['global','core','primitives','semantic'].includes(k));
 const sets=bundle?Object.fromEntries(entries):{tokens:input};
 const order=[...(input.$metadata?.tokenSetOrder||[]),...Object.keys(sets)].filter((x,i,a)=>a.indexOf(x)===i&&own(sets,x));
 if(!order.length||!order.some(k=>countLeaves(sets[k])))throw Error('Токенів не знайдено.');
 let configurations=[];
 if(hasThemes){
  const groups=Object.create(null);for(const theme of input.$themes){if(!theme||typeof theme.name!=='string'||!theme.selectedTokenSets)throw Error('Некоректний $themes.');(groups[theme.group||'Theme']??=[]).push(theme);}
  configurations=[{parts:[],selected:{}}];for(const list of Object.values(groups)){configurations=configurations.flatMap(c=>list.map(t=>({parts:[...c.parts,t.name],selected:{...c.selected,...t.selectedTokenSets}})));if(configurations.length>30)throw Error('Забагато комбінацій тем: максимум 30.');}
 }else configurations=[{parts:['Default'],selected:Object.fromEntries(order.map(k=>[k,'enabled']))}];
 const contexts={},contextLabels={},catalog={};let unsupported=0;
 for(const [index,c]of configurations.entries()){
  const tokens=Object.create(null),enabled=new Set();for(const [set,status]of Object.entries(c.selected))if(['enabled','source'].includes(status)&&!own(sets,set))throw Error('В архіві немає набору '+set);
  for(const setName of order)if(['enabled','source'].includes(c.selected[setName])){const flat=flatten(sets[setName]);Object.assign(tokens,flat);for(const key of Object.keys(flat)){if(c.selected[setName]==='enabled')enabled.add(key);else enabled.delete(key);}}
  if(Object.keys(tokens).length>20000)throw Error('Максимум 20000 токенів на тему.');
  const cache=Object.create(null),visiting=new Set();
  function resolve(name,depth=0){if(depth>40||visiting.has(name))throw Error('Циклічне посилання: '+name);if(own(cache,name))return cache[name];const tk=tokens[name];if(!tk)throw Error('Не знайдено токен '+name);visiting.add(name);const walk=v=>ref(v)?resolve(v.slice(1,-1),depth+1):Array.isArray(v)?v.map(walk):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x)])):v;let v=walk(tk.value);if(tk.modifier)v=modify(v,tk.modifier);visiting.delete(name);cache[name]=v;return v;}
  const context='tokens/'+index;contextLabels[context]=c.parts.join(' / ');contexts[context]={};catalog[context]={};
  function add(key,value,type){const kind=types[type],css=toCss(value,type);if(!kind||css===null||/\{|calc\(/.test(String(css))){unsupported++;return;}contexts[context][key]=css;catalog[context][key]=kind;}
  for(const [key,tk]of Object.entries(tokens)){
   if(!enabled.has(key))continue;
   const value=resolve(key);if(tk.type==='typography'&&value&&typeof value==='object'){for(const [prop,v]of Object.entries(value))add(key+'.'+prop,prop==='lineHeight'&&tk.dtcg&&typeof v==='number'?v+'em':v,({fontFamily:'fontFamily',fontWeight:'fontWeight',fontSize:'fontSize',lineHeight:'lineHeight',letterSpacing:'letterSpacing'})[prop]);}
   else add(key,value,tk.type);
  }
  if(!Object.keys(contexts[context]).length)throw Error('У темі '+contextLabels[context]+' немає підтримуваних токенів.');
 }
 return validateSystem({schemaVersion:1,mode:'tokens',name:name.replace(/\.(json|zip)$/i,''),scope:{origin:'*',pathPrefix:'/'},contexts,contextLabels,catalog,rules:[],importInfo:{unsupported},source:{note:'Tokens Studio / DTCG. Перевірка входження значень до токенів; без мапінгу ролей компонентів.'}});
}
export async function readSystemFile(file){
 if(file.size>8*1024*1024)throw Error('Максимальний розмір файлу — 8 МБ.');
 if(!/\.zip$/i.test(file.name))return importTokens(JSON.parse(await file.text()),file.name);
 if(!globalThis.JSZip)throw Error('ZIP бібліотека недоступна.');
 const zip=await globalThis.JSZip.loadAsync(await file.arrayBuffer());
 const entries=Object.values(zip.files).filter(e=>!e.dir&&/\.json$/i.test(e.name)&&!e.name.includes('__MACOSX')&&!e.name.split('/').some(p=>p.startsWith('.')));
 if(!entries.length||entries.length>100)throw Error('Архів має містити від 1 до 100 JSON файлів.');
 let total=0;const parsed=[];for(const entry of entries){const declared=entry._data?.uncompressedSize;if(!Number.isFinite(declared)||declared>8*1024*1024||total+declared>16*1024*1024)throw Error('Розпакований архів завеликий (ліміт 16 МБ).');total+=declared;const text=await entry.async('string');if(text.length>8*1024*1024)throw Error('JSON в архіві завеликий.');parsed.push({path:entry.name,value:JSON.parse(text)});}
 const configs=parsed.filter(e=>e.value?.schemaVersion===1);if(configs.length>1)throw Error('В архіві кілька конфігурацій QA. Залиште одну.');if(configs.length)return validateSystem(configs[0].value);
 if(parsed.length===1)return importTokens(parsed[0].value,file.name);
 const metadata=parsed.find(e=>e.path.endsWith('$metadata.json'))?.value;const themes=parsed.find(e=>e.path.endsWith('$themes.json'))?.value;
 const paths=parsed.filter(e=>!e.path.endsWith('$metadata.json')&&!e.path.endsWith('$themes.json'));
 const common=paths[0].path.split('/').slice(0,-1);while(common.length&&!paths.every(e=>e.path.startsWith(common.join('/')+'/')))common.pop();
 const prefix=common.length?common.join('/')+'/':'';const expectedNames=metadata?.tokenSetOrder||[...new Set((themes||[]).flatMap(t=>Object.keys(t.selectedTokenSets||{})))];const bundle=Object.fromEntries(paths.map(e=>{const matching=expectedNames.find(name=>e.path===name+'.json'||e.path.endsWith('/'+name+'.json'));return [matching||e.path.slice(prefix.length).replace(/\.json$/i,''),e.value];}));
 if(metadata)bundle.$metadata=metadata;if(themes)bundle.$themes=themes;bundle.$metadata??={tokenSetOrder:Object.keys(bundle)};
 return importTokens(bundle,file.name);
}
