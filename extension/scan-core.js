import {normalize,properties} from './core.js';
export const scanProperties=[...properties,'gap','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','borderTopColor'];
export const extractionSystem={schemaVersion:1,mode:'extract',name:'Дані сайту',scope:{origin:'*',pathPrefix:'/'},contexts:{'raw/default':{}},rules:[]};
export function validateSystem(system){
  if(system?.schemaVersion!==1||typeof system.name!=='string'||!system.name.trim()||!system.contexts||!Array.isArray(system.rules)||(!['tokens','extract'].includes(system.mode)&&!system.rules.length)||system.rules.length>500)throw Error('Потрібен пакет QA Inspector schemaVersion: 1 з name, contexts і rules.');
  if(!system.scope||typeof system.scope.origin!=='string'||typeof system.scope.pathPrefix!=='string')throw Error('Потрібна область перевірки scope.origin та scope.pathPrefix.');
  if(!Object.keys(system.contexts).length||Object.keys(system.contexts).length>30)throw Error('Пакет має містити від 1 до 30 контекстів.');
  for(const tokens of Object.values(system.contexts)){if(!tokens||typeof tokens!=='object')throw Error('Некоректні tokens контексту.');for(const value of Object.values(tokens))if(!['string','number'].includes(typeof value))throw Error('Значення токенів мають бути рядками або числами.');}
  if(system.mode==='tokens'){if(!system.catalog)throw Error('Відсутній каталог токенів.');for(const key of Object.keys(system.contexts))if(!system.catalog[key])throw Error('Відсутній каталог теми.');}
  for(const rule of system.rules){if(typeof rule.selector!=='string'||!rule.selector||rule.selector.length>500||typeof rule.name!=='string'||!rule.properties||!Object.keys(rule.properties).length)throw Error('Кожне правило має містити selector, name та properties.');for(const [prop,r] of Object.entries(rule.properties)){if(!scanProperties.includes(prop)||!r||!Number.isFinite(r.tolerance)||r.tolerance<0||(!Object.hasOwn(r,'value')&&typeof r.token!=='string'))throw Error('Некоректне правило '+prop);if(Object.hasOwn(r,'value')&&!['string','number'].includes(typeof r.value))throw Error('Некоректне value '+prop);if(r.token)for(const tokens of Object.values(system.contexts))if(!Object.hasOwn(tokens,r.token))throw Error('Не знайдено токен '+r.token);}}
  return system;
}
export function evaluateScan(snapshot,system){
  validateSystem(system);
  const tokens=system.contexts[snapshot.context];if(!tokens)throw Error('У дизайн-системі немає контексту '+snapshot.context+'. Перевірку не виконано.');
  if(system.mode==='extract'){
    const elements=snapshot.elements.map(element=>({...element,status:'Extracted',rows:Object.entries(element.styles).map(([property,actual])=>({property,actual,status:'Extracted'}))}));
    return {...snapshot,systemName:'Дані сайту',mode:'extract',elements,counts:{pass:0,fail:0,nc:0,checks:0,extracted:elements.length,readings:elements.reduce((n,e)=>n+e.rows.length,0)}};
  }
  const elements=snapshot.elements.map(element=>{
    const rows=Object.entries(element.rules).map(([property,rule])=>{
      const actual=element.styles[property],allowed=rule.tokens?rule.tokens.map(token=>({token,value:tokens[token]})):[{token:rule.token,value:Object.hasOwn(rule,'value')?rule.value:tokens[rule.token]}];
      const a=normalize(property,actual);
      const normalized=expected=>{
        if(typeof expected==='string'&&/^-?[\d.]+em$/.test(expected))return parseFloat(expected)*parseFloat(element.styles.fontSize);
        if(typeof expected==='string'&&/^-?[\d.]+rem$/.test(expected))return parseFloat(expected)*parseFloat(snapshot.rootFontSize||'16');
        return normalize(property,expected);
      };
      const comparable=allowed.filter(item=>normalized(item.value)!==null);
      const equal=b=>property==='fontFamily'&&rule.tokens&&typeof a==='string'&&typeof b==='string'&&!b.includes(',')?a.split(',').includes(b):Array.isArray(a)&&Array.isArray(b)?a.slice(0,3).every((v,i)=>Math.abs(v-b[i])<=rule.tolerance+1e-8)&&Math.abs(a[3]-b[3])<=.005:typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<=rule.tolerance+1e-8:a===b;
      const match=comparable.find(item=>equal(normalized(item.value)));
      const status=a===null||!comparable.length||element.unsupported.includes(property)?'Not comparable':match?'Pass':rule.tokens&&comparable.length<allowed.length?'Not comparable':'Fail';
      const values=[...new Set(allowed.map(x=>x.value))];
      return {property,actual,allowedValues:allowed,expected:match?match.value:values.slice(0,8).join(' · ')+(values.length>8?` … (+${values.length-8})`:''),token:match?.token||allowed.map(x=>x.token||'Фіксоване правило').slice(0,8).join(', '),tolerance:rule.tolerance,status,basis:system.mode==='tokens'?'token-set':'component-rule'};
    });
    return {...element,rows,status:rows.some(r=>r.status==='Fail')?'Fail':rows.some(r=>r.status==='Not comparable')?'Not comparable':'Pass'};
  });
  return {...snapshot,systemName:system.name,mode:system.mode||'components',source:system.source,elements,counts:{pass:elements.filter(e=>e.status==='Pass').length,fail:elements.filter(e=>e.status==='Fail').length,nc:elements.filter(e=>e.status==='Not comparable').length,checks:elements.reduce((n,e)=>n+e.rows.length,0)}};
}
export function scanReport(result){
  const safe=v=>String(v??'').replace(/\|/g,'\\|').replace(/[\r\n]/g,' ');
  if(result.mode==='extract'){
    let text=`# QA Inspector · CSS-дані\n\nURL: ${safe(result.url)}\nЧас: ${safe(result.timestamp)}\nРежим: збирання фактичних CSS, без оцінки відповідності.\nЕлементів: ${result.elements.length}; CSS-значень: ${result.counts.readings}. Прихованих пропущено: ${result.hidden}. Ліміт досягнуто: ${result.truncated?'так':'ні'}.\n\n`;
    for(const el of result.elements)text+=`## ${safe(el.name)} · ${safe(el.label)}\n\nСелектор: ${safe(el.selector)}\n\n| Властивість | Значення |\n|---|---|\n`+el.rows.map(row=>`| ${safe(row.property)} | ${safe(row.actual)} |`).join('\n')+'\n\n';
    return text;
  }
  let out=`# QA Inspector · ${safe(result.systemName)}\n\nURL: ${safe(result.url)}\nРежим: ${result.mode==='tokens'?'Значення з набору токенів (не перевірка ролі компонента)':'Правила компонентів'}\nКонтекст: ${safe(result.context)}\nЧас: ${safe(result.timestamp)}\nДжерело: ${safe(result.source?.url)}\nВерсія: ${safe(result.source?.revision)}\n\nПеревірено компонентів: ${result.elements.length}; правил: ${result.counts.checks}. Pass: ${result.counts.pass}; Fail: ${result.counts.fail}; Not comparable: ${result.counts.nc}. Без правил: ${result.uncovered.length}. Прихованих пропущено: ${result.hidden}. Ліміт досягнуто: ${result.truncated?'так':'ні'}.\n\n`;
  if(result.figmaPage)out+=`## Покриття Figma\n\nЗіставлено ${result.figmaPage.matched} із ${result.figmaPage.total} шарів.\n`+result.figmaPage.unmatched.map(layer=>`- ${safe(layer.name)}: ${safe(layer.reason)}`).join('\n')+'\n\n';
  for(const el of result.elements){out+=`## ${safe(el.name)} — ${safe(el.label)} (${el.status})\n\nСелектор: ${safe(el.selector)}\n\n| Властивість | На сторінці | За системою | Токен | Допуск | Результат |\n|---|---|---|---|---|---|\n`+el.rows.map(r=>'| '+[r.property,r.actual,r.expected,r.token,r.tolerance,r.status].map(safe).join(' | ')+' |').join('\n')+'\n\n';}
  if(result.uncovered.length)out+='## Без правил\n\n'+result.uncovered.map(e=>`- ${safe(e.label)} · ${safe(e.selector)}`).join('\n');
  return out;
}
