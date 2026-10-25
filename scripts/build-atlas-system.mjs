// Build independent expected values from the pinned Atlas token source snapshot.
import {fileURLToPath} from 'node:url';
import {writeFileSync,mkdirSync} from 'node:fs';
import {loadSets,config} from '../fixtures/atlas/scripts/lib/tokens.mjs';
import {validateSystem} from '../extension/scan-core.js';
const {BRANDS,sets}=loadSets(fileURLToPath(new URL('../fixtures/atlas/',import.meta.url)));
const rules=[];
const token=(name,tolerance=.5)=>({token:name,tolerance});
const fixed=(value,tolerance=.5)=>({value,tolerance});
const add=(selector,name,properties)=>rules.push({selector,name,properties});
const radius=t=>Object.fromEntries(['TopLeft','TopRight','BottomLeft','BottomRight'].map(c=>['border'+c+'Radius',token(t)]));
const padding=(h,v)=>({paddingLeft:token(h),paddingRight:token(h),paddingTop:v?token(v):fixed('0px'),paddingBottom:v?token(v):fixed('0px')});
const typography=t=>Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight'].map(p=>[p,token(t+'.'+p,p==='fontFamily'||p==='fontWeight'?0:.5)]));
const state=(selector,name,bg,fg)=>add(selector,name,{backgroundColor:token(bg,1),color:token(fg,1)});
add('.btn','Button',{height:token('button.size.md'),...padding('button.paddingH.md'),...radius('button.borderRadius'),...typography('button.label.md'),gap:token('button.gap.md')});
for(const [cls,t] of [['primary','primary'],['secondary','secondary'],['ghost','text']]){
 state('.btn--'+cls,'Button · '+cls,`button.${t}.bg.default`,`button.${t}.color.default`);
 add('.btn--'+cls+':hover','Button · hover',{backgroundColor:token(`button.${t}.bg.hover`,1)});
}
add('.btn--primary:active','Button · active',{backgroundColor:token('button.primary.bg.active',1)});
state('.btn--cta','Button · hero CTA','hero.cta.bg','hero.cta.color');
add('.btn--hero-ghost','Button · hero ghost',{backgroundColor:fixed('transparent',1),color:token('hero.color',1)});
state('.btn:disabled','Button · disabled','button.primary.bg.disabled','button.primary.color.disabled');
add('.icon-btn','Icon button',{width:token('roundButton.size.sm'),height:token('roundButton.size.sm'),...radius('roundButton.borderRadius'),backgroundColor:fixed('transparent',1),color:token('color.text.secondary',1)});
state('.icon-btn:hover','Icon button · hover','color.fill.secondary.default','color.text.primary');
add('.icon-btn--outline','Round button',{width:token('roundButton.size.md'),height:token('roundButton.size.md'),backgroundColor:token('roundButton.bg.default',1),color:token('roundButton.color.default',1)});
add('.icon-btn--outline:hover','Round button · hover',{backgroundColor:token('roundButton.bg.hover',1)});
add('.nav-item','Navigation',{...padding('navItem.paddingH','navItem.paddingV'),...radius('navItem.borderRadius'),...typography('navItem.text'),color:token('navItem.color.default',1),gap:token('navItem.gap')});
state('.nav-item:hover','Navigation · hover','navItem.bg.hover','navItem.color.hover');
state('.nav-item[aria-current="page"]','Navigation · selected','navItem.selected.bg','navItem.selected.color');
add('.tile','Tile',{...padding('tile.paddingH','tile.paddingV'),...radius('tile.borderRadius'),backgroundColor:token('tile.bg',1),borderTopColor:token('tile.br',1),gap:token('tile.gap')});
add('.tile__title','Tile title',{...typography('tile.titleText'),color:token('tile.title',1)});
add('.tile__subtitle','Tile subtitle',{fontSize:token('tile.subtitleText.fontSize'),lineHeight:token('tile.subtitleText.lineHeight'),color:token('tile.subtitle',1)});
add('.input,.select select','Input',{height:token('input.size.md'),...padding('input.paddingH.md'),...radius('input.borderRadius'),backgroundColor:token('input.bg.default',1),color:token('input.color.default',1)});
add('.input:hover,.select select:hover','Input · hover',{backgroundColor:token('input.bg.hover',1)});
add('.input:focus','Input · focus',{backgroundColor:token('input.bg.focus',1)});
state('.input[aria-invalid="true"]','Input · error','input.bg.error','input.color.error');
add('.input--amount','Amount input',{fontFamily:token('typography.numeric.amountLg.fontFamily',0),fontSize:token('typography.numeric.amountLg.fontSize'),fontWeight:token('typography.numeric.amountLg.fontWeight',0)});
add('.switch','Switch',{width:token('switch.width'),height:token('switch.height'),backgroundColor:token('switch.track.off',1)});
add('.switch[aria-checked="true"]','Switch · on',{backgroundColor:token('switch.track.on',1)});
add('.segmented button','Segmented button',{height:token('size.control.sm'),...padding('segmented.paddingH'),...radius('borderRadius.control'),fontSize:token('segmented.text.fontSize'),fontWeight:token('segmented.text.fontWeight',0),backgroundColor:fixed('transparent',1),color:token('segmented.item.color',1)});
add('.segmented button:hover','Segmented · hover',{backgroundColor:token('segmented.item.hover.bg',1)});
state('.segmented button[aria-pressed="true"]','Segmented · selected','segmented.item.selected.bg','segmented.item.selected.color');
const kebab=s=>s.replace(/([a-z0-9])([A-Z])/g,'$1-$2').toLowerCase();
for(const [name,tk]of sets.typography)if(tk.type==='typography')add('.ts-'+name.split('.').slice(1).map(kebab).join('-'),'Typography · '+name.split('.').slice(1).join(' '),{...typography(name),letterSpacing:token(name+'.letterSpacing',.1)});
const used=new Set(rules.flatMap(r=>Object.values(r.properties).map(v=>v.token).filter(Boolean)));
const contexts={};
const dimension=new Set(['sizing','spacing','borderRadius','borderWidth','fontSizes','lineHeights','dimension']);
function css(type,value){if(dimension.has(type))return value+'px';if(type==='fontFamilies')return value==='Inter'?'"Inter Variable", "Inter", system-ui, sans-serif':`"${value}", system-ui, sans-serif`;if(type==='letterSpacing')return parseFloat(value)/100+'em';return String(value);}
for(const brand of BRANDS)for(const mode of ['light','dark']){
 const {all,res}=config(sets,brand,mode),tokens={};
 for(const name of used){if(all.has(name)){const tk=all.get(name);tokens[name]=css(tk.type,res(name));}else{const prop=name.split('.').pop(),parent=name.slice(0,-prop.length-1),v=res(parent)[prop];tokens[name]=css(({fontFamily:'fontFamilies',fontSize:'fontSizes',fontWeight:'fontWeights',lineHeight:'lineHeights',letterSpacing:'letterSpacing'})[prop],v);}}
 contexts[brand+'/'+mode]=tokens;
}
const system=validateSystem({schemaVersion:1,name:'Atlas Finance',version:'1.0',crawl:{startUrls:['#/overview'],maxPages:12,includeLinkedPages:true,readySelector:'.shell',settleMs:600},scope:{origin:'https://ozerovandrey.github.io',pathPrefix:'/atlas-finance/'},source:{url:'https://github.com/OzerovAndrey/atlas-finance/tree/main/tokens',revision:'a967a2f3fd413ef04c8d3d61fb1bb5ca2ba41e7b',note:'Pinned repository snapshot; selectors mapped from src/styles/base.css. Expected values resolved from source tokens, never from the inspected page.'},contexts,rules,candidatesSelector:'button,[role="button"],input:not([type="hidden"]),select,textarea,a.btn,.nav-item,.tile'});
mkdirSync(new URL('../designer/',import.meta.url),{recursive:true});
writeFileSync(new URL('../designer/atlas-qa.json',import.meta.url),JSON.stringify(system,null,2)+'\n');
console.log(`Atlas: ${rules.length} rules, ${used.size} tokens, ${Object.keys(contexts).length} contexts.`);
