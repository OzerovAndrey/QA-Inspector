export function conflicts(result){return result.elements.flatMap(element=>element.rows.filter(row=>row.status==='Fail').map(row=>({element,row})));}
const clean=value=>String(value??'').replace(/\*\//g,'* /').replace(/[\r\n]/g,' ');
export function conflictCode(result,element,row){
 const property=row.property.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
 const selector=clean(element.selector),actual=clean(row.actual);
 const options=row.allowedValues?.length?row.allowedValues:[{token:row.token,value:row.expected}];
 const unique=[...new Set(options.map(x=>String(x.value)))];
 const expected=unique.length===1?`${selector} {\n  ${property}: ${clean(unique[0])};\n}`:
 `/* Еталон містить кілька допустимих значень. Оберіть відповідний токен; це не готовий патч. */\n`+options.map(x=>`/* ${clean(x.token||'Правило')}: ${property}: ${clean(x.value)}; */`).join('\n');
 return `# Конфлікт дизайну\n\nСторінка: ${result.url}\nЕлемент: ${clean(element.label||element.name)}\nВластивість: ${property}\nЕталон: ${result.systemName}\nДопуск: ±${row.tolerance??0}\n\n## Зараз на сайті\n\n\`\`\`css\n${selector} {\n  ${property}: ${actual};\n}\n\`\`\`\n\n## За еталоном\n\n\`\`\`css\n${expected}\n\`\`\`\n\nТокени: ${clean(row.token)}\nДжерело: computed styles; місце у вихідному CSS не визначалося.\n`;
}
export function conflictsReport(result){const entries=conflicts(result);return `# QA Inspector · ${entries.length} конфліктів\n\n`+entries.map(({element,row})=>conflictCode(result,element,row)).join('\n---\n\n');}
