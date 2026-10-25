export const properties = ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color','backgroundColor','paddingTop','paddingRight','paddingBottom','paddingLeft','width','height','borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius'];
export function normalize(property, input) {
  const s = String(input ?? '').trim().toLowerCase();
  if (property === 'letterSpacing' && s === 'normal') return 0;
  if (property === 'fontFamily') return s.replace(/["']/g,'').split(',').map(x=>x.trim()).join(',');
  if (property === 'fontWeight') return ({normal:400,bold:700})[s] ?? (/^\d+$/.test(s) ? Number(s) : null);
  if (/color/i.test(property)) {
    if (s === 'transparent') return [0,0,0,0];
    if (/^#[\da-f]{3,8}$/.test(s) && [4,5,7,9].includes(s.length)) {
      let h=s.slice(1); if(h.length<5) h=[...h].map(x=>x+x).join('');
      return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)).concat(h.length===8?parseInt(h.slice(6),16)/255:1);
    }
    if (/^rgba?\(/.test(s)) {
      const parts=s.slice(s.indexOf('(')+1,-1).replace(/,/g,' ').replace(/\//g,' ').split(/\s+/).filter(Boolean);
      if(parts.length<3 || parts.length>4) return null;
      const a=parts.map((v,i)=>v.endsWith('%')?parseFloat(v)*(i===3?0.01:2.55):Number(v));
      if(a.length===3)a.push(1); return a.every(Number.isFinite)?a:null;
    }
    return null;
  }
  if (/^-?(?:\d+\.?\d*|\.\d+)px$/.test(s) || s==='0') return parseFloat(s);
  return null;
}
export function validateReference(ref) {
  if(ref?.component!=='Button' || !ref.themes) throw Error('Expected component: Button and themes Light/Dark.');
  for(const theme of ['Light','Dark']) {
    const rules=ref.themes[theme]; if(!rules || !Object.keys(rules).length) throw Error(`Missing ${theme} rules.`);
    for(const [key,r] of Object.entries(rules)) {
      if(!properties.includes(key) || !r || typeof r.token!=='string' || !r.token.trim() || !['string','number'].includes(typeof r.value) || !Number.isFinite(r.tolerance) || r.tolerance<0) throw Error(`Invalid ${theme}.${key}: value, token and nonnegative tolerance required.`);
    }
  }
  return ref;
}
export function compare(capture, ref, theme) {
  validateReference(ref);
  return Object.entries(ref.themes[theme]).map(([property,rule])=>{
    const actual=capture.styles[property], a=normalize(property,actual), b=normalize(property,rule.value);
    let status='Not comparable';
    if(a!==null && b!==null) {
      const pass=Array.isArray(a)&&Array.isArray(b)?a.slice(0,3).every((v,i)=>Math.abs(v-b[i])<=rule.tolerance+1e-8)&&Math.abs(a[3]-b[3])<=0.005:typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<=rule.tolerance+1e-8:a===b;
      status=pass?'Pass':'Fail';
    }
    if(capture.unsupported?.includes(property)) status='Not comparable';
    return {property,actual:actual??'—',expected:rule.value,token:rule.token,tolerance:rule.tolerance,status};
  });
}
export function report(capture, rows, theme) {
  const safe=x=>String(x).replace(/\|/g,'\\|').replace(/[\r\n]/g,' ');
  return `# QA Inspector report\n\nComponent: Button · Theme: ${theme}\nURL: ${safe(capture.url)}\nElement: ${safe(capture.element)}\nCaptured: ${safe(capture.timestamp)}\n\n` +
    '| Property | Actual | Expected | Token | Tolerance | Result |\n|---|---|---|---|---|---|\n'+rows.map(r=>[r.property,r.actual,r.expected,r.token,r.tolerance,r.status].map(safe).join(' | ')).map(r=>'| '+r+' |').join('\n');
}

// Capture only comparable properties; never turn an unsupported value into a passing rule.
export function referenceFromCapture(capture, reference, theme, name) {
  if(!capture?.isButton)throw Error('Спочатку виберіть кнопку через Inspect Element.');
  const rules={};
  for(const property of properties){
    const value=capture.styles[property];
    if(capture.unsupported?.includes(property)||normalize(property,value)===null)continue;
    rules[property]={value,token:`button.${theme.toLowerCase()}.${property}`,tolerance: /color/i.test(property)?1:property==='fontFamily'||property==='fontWeight'?0:0.5};
  }
  if(!Object.keys(rules).length)throw Error('Немає властивостей, які можна порівняти.');
  return validateReference({...structuredClone(reference),themes:{...structuredClone(reference.themes),[theme]:rules},sources:{...reference.sources,[theme]:{name:String(name||'Моя кнопка').slice(0,120),url:capture.url,element:capture.element,timestamp:capture.timestamp}}});
}
