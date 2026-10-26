import test from 'node:test';import assert from 'node:assert/strict';
import {importTokens,readSystemFile} from '../extension/import-system.js';import {evaluateScan} from '../extension/scan-core.js';
const raw={color:{brand:{value:'#336699',type:'color'},action:{value:'{color.brand}',type:'color'}},spacing:{md:{value:'16',type:'spacing'}},font:{size:{value:'14',type:'fontSizes'}}};
test('imports legacy token tree and resolves aliases',()=>{const s=importTokens(raw,'Brand.json');assert.equal(s.mode,'tokens');assert.equal(s.contexts['tokens/0']['color.action'],'#336699');assert.equal(s.contexts['tokens/0']['spacing.md'],'16px');assert.equal(s.catalog['tokens/0']['font.size'],'fontSize');});
test('imports DTCG dimensions, inherited types, typography and sRGB color',()=>{const s=importTokens({spacing:{$type:'dimension',md:{$value:{value:1,unit:'rem'}}},color:{$type:'color',brand:{$value:{colorSpace:'srgb',components:[1,0,.5],alpha:.5}}},text:{$type:'typography',$value:{fontFamily:['Inter','sans-serif'],fontSize:{value:14,unit:'px'},fontWeight:600,lineHeight:1.5,letterSpacing:{value:0,unit:'px'}}}});const t=s.contexts['tokens/0'];assert.equal(t['spacing.md'],'1rem');assert.equal(t['color.brand'],'rgba(255,0,128,0.5)');assert.equal(t['text.fontFamily'],'Inter, sans-serif');assert.equal(t['text.lineHeight'],'1.5em');});
test('Tokens Studio groups form isolated brand/theme combinations',()=>{const s=importTokens({$metadata:{tokenSetOrder:['core','brand/a','brand/b','light','dark']},$themes:[{name:'A',group:'Brand',selectedTokenSets:{core:'source','brand/a':'enabled','brand/b':'disabled'}},{name:'B',group:'Brand',selectedTokenSets:{core:'source','brand/a':'disabled','brand/b':'enabled'}},{name:'Light',group:'Theme',selectedTokenSets:{light:'enabled',dark:'disabled'}},{name:'Dark',group:'Theme',selectedTokenSets:{light:'disabled',dark:'enabled'}}],core:{space:{value:'8',type:'spacing'}},'brand/a':{brand:{value:'#ffffff',type:'color'}},'brand/b':{brand:{value:'#000000',type:'color'}},light:{bg:{value:'{brand}',type:'color'}},dark:{bg:{value:'#999999',type:'color'}}});assert.equal(Object.keys(s.contexts).length,4);assert.equal(s.contexts['tokens/0'].bg,'#ffffff');assert.equal(s.contexts['tokens/2'].bg,'#000000');assert.equal(s.contexts['tokens/1'].bg,'#999999');});
test('rejects unresolved and cyclic aliases',()=>{assert.throws(()=>importTokens({a:{value:'{missing}',type:'color'}}),/токен/);assert.throws(()=>importTokens({a:{value:'{b}',type:'color'},b:{value:'{a}',type:'color'}}),/Циклічне/);});
test('unsupported token types excluded, not treated as passes',()=>{const s=importTokens({...raw,shadow:{value:{x:0,blur:10},type:'boxShadow'}});assert.ok(s.importInfo.unsupported>0);assert.equal(s.contexts['tokens/0'].shadow,undefined);});
test('token membership reports exact matching token and preserves distinction',()=>{const s=importTokens(raw);const snapshot={context:'tokens/0',rootFontSize:'16px',url:'http://example.com',uncovered:[],elements:[{styles:{paddingLeft:'16px',fontSize:'14px'},rules:{paddingLeft:{tokens:['spacing.md'],tolerance:.5}},unsupported:[]}]};const result=evaluateScan(snapshot,s);assert.equal(result.counts.pass,1);assert.equal(result.elements[0].rows[0].token,'spacing.md');assert.equal(result.elements[0].rows[0].basis,'token-set');snapshot.elements[0].styles.paddingLeft='20px';assert.equal(evaluateScan(snapshot,s).counts.fail,1);});
test('oversize file rejected before parsing',async()=>{await assert.rejects(readSystemFile({size:9*1024*1024,name:'tokens.json'}),/8 МБ/);});

test('source sets resolve aliases but are not exported as allowed tokens',()=>{const s=importTokens({$themes:[{name:'Light',selectedTokenSets:{core:'source',semantic:'enabled'}}],core:{raw:{value:'#ffffff',type:'color'}},semantic:{surface:{value:'{raw}',type:'color'}}});assert.equal(s.contexts['tokens/0'].surface,'#ffffff');assert.equal(s.contexts['tokens/0'].raw,undefined);});
test('missing selected set is rejected rather than importing incomplete theme',()=>{assert.throws(()=>importTokens({$themes:[{name:'Light',selectedTokenSets:{core:'enabled',missing:'enabled'}}],core:{x:{value:'8',type:'spacing'}}}),/набору/);});

// Use the shipped ZIP library: exercise actual archive decoding and cross-file aliases.
test('Tokens Studio ZIP combines core and aliases and compares resolved values',async()=>{
 const {readFileSync}=await import('node:fs');const {createRequire}=await import('node:module');
 const mod={exports:{}};new Function('module','exports','require',readFileSync(new URL('../extension/vendor/jszip.min.js',import.meta.url),'utf8'))(mod,mod.exports,createRequire(import.meta.url));
 const previous=globalThis.JSZip;globalThis.JSZip=mod.exports;
 try{
  const zip=new globalThis.JSZip();
  zip.file('export/core.json',JSON.stringify({color:{blue:{value:'#336699',type:'color'}}}));
  zip.file('export/alias.json',JSON.stringify({color:{action:{value:'{color.blue}',type:'color'}}}));
  zip.file('export/components/button.json',JSON.stringify({button:{background:{value:'{color.action}',type:'color'}}}));
  zip.file('export/$metadata.json',JSON.stringify({tokenSetOrder:['core','alias','components/button']}));
  zip.file('export/$themes.json',JSON.stringify([{name:'Light',selectedTokenSets:{core:'source',alias:'source','components/button':'enabled'}}]));
  const bytes=await zip.generateAsync({type:'nodebuffer'});const system=await readSystemFile({name:'tokens.zip',size:bytes.length,arrayBuffer:async()=>bytes});
  assert.equal(system.contexts['tokens/0']['button.background'],'#336699');
  assert.equal(system.contexts['tokens/0']['color.blue'],undefined);
  const result=evaluateScan({context:'tokens/0',rootFontSize:'16px',url:'https://example.com',uncovered:[],elements:[{styles:{backgroundColor:'rgb(51, 102, 153)'},rules:{backgroundColor:{tokens:['button.background'],tolerance:0}},unsupported:[]}]},system);
  assert.equal(result.counts.pass,1);assert.equal(result.elements[0].rows[0].token,'button.background');
 }finally{if(previous===undefined)delete globalThis.JSZip;else globalThis.JSZip=previous;}
});
