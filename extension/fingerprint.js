// Chrome storage may reorder object keys. Configuration identity must ignore key order.
export function canonicalJSON(value){
 const ordered=item=>Array.isArray(item)?item.map(ordered):item&&typeof item==='object'?Object.fromEntries(Object.keys(item).sort().map(key=>[key,ordered(item[key])])):item;
 return JSON.stringify(ordered(value));
}
export async function systemFingerprint(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalJSON(value))))].map(x=>x.toString(16).padStart(2,'0')).join('');}
