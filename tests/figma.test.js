import test from 'node:test';import assert from 'node:assert/strict';import {figmaPageReady,refreshFigmaSystem,figmaSizing,validFigmaTokenFormat,parseFigmaLink,figmaProperties,makeFigmaSystem,listFigmaNodes,fetchFigmaReference} from '../extension/figma-reference.js';import {validateSystem,evaluateScan} from '../extension/scan-core.js';
const frame={id:'1:2',name:'Desktop',type:'FRAME',absoluteBoundingBox:{width:1440,height:900},layoutMode:'VERTICAL',paddingTop:24,paddingRight:16,paddingBottom:24,paddingLeft:16,itemSpacing:12,cornerRadius:8,fills:[{type:'SOLID',color:{r:1,g:1,b:1}}]};
const ref={url:'https://www.figma.com/design/ABC/Test?node-id=1-2',fileKey:'ABC',version:'v1',fetchedAt:'2026-10-27',name:'Test'};
test('parses exact Figma selection and rejects non-Figma or whole-file links',()=>{assert.equal(parseFigmaLink(ref.url).nodeId,'1:2');for(const url of ['https://figma.com.evil.test/design/ABC?node-id=1-2','http://figma.com/design/ABC?node-id=1-2','https://figma.com/design/ABC','https://figma.com/design/ABC?node-id=../../x'])assert.throws(()=>parseFigmaLink(url));});
test('frame conversion uses explicit design values and records unsupported paints',()=>{const system=makeFigmaSystem(ref,frame,true);assert.equal(validateSystem(system),system);assert.equal(system.rules[0].properties.paddingLeft.value,'16px');assert.equal(system.source.width,1440);assert.equal(system.source.checkViewport,true);assert.equal(figmaProperties({...frame,fills:[{type:'GRADIENT_LINEAR'}]}).properties.backgroundColor,undefined);assert.equal(figmaProperties({...frame,rotation:45}).properties.width,undefined);});
test('text typography and mixed-style exclusions do not invent font values',()=>{const node={type:'TEXT',style:{fontFamily:'Inter',fontWeight:600,fontSize:14,lineHeightPx:20,lineHeightUnit:'PIXELS',letterSpacing:0}};assert.equal(figmaProperties(node).properties.fontFamily,'Inter');assert.equal(figmaProperties({...node,characterStyleOverrides:[1]}).properties.fontFamily,undefined);});
test('node selection excludes hidden subtrees and groups',()=>{assert.deepEqual(listFigmaNodes({type:'CANVAS',children:[frame,{...frame,id:'hide',visible:false,children:[frame]}]}).map(x=>x.node.id),['1:2']);});
test('API request sends credentials only to fixed Figma endpoint and never to returned reference',async()=>{let request;const result=await fetchFigmaReference(ref.url,'test-secret',async(url,options)=>{request={url,options};return{ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({name:'Test',nodes:{'1:2':{document:frame}}})};});assert.match(request.url,/^https:\/\/api.figma.com\/v1\/files\/ABC\/nodes\?ids=1%3A2$/);assert.equal(request.options.headers['X-Figma-Token'],'test-secret');assert.equal(request.options.credentials,'omit');assert.ok(!JSON.stringify(result).includes('test-secret'));assert.ok(!JSON.stringify(makeFigmaSystem(result,frame)).includes('test-secret'));});
test('access errors and absent node produce actionable errors',async()=>{await assert.rejects(fetchFigmaReference(ref.url,'x',async()=>({ok:false,status:403})),/доступу/);await assert.rejects(fetchFigmaReference(ref.url,'x',async()=>({ok:true,headers:{get:()=>null},text:async()=>'{"nodes":{}}'})),/не знайдено/);});
test('Figma expected dimensions produce an actual conflict, not token membership',()=>{const system=makeFigmaSystem(ref,frame);const rules=system.rules[0].properties;const styles=Object.fromEntries(Object.entries(rules).map(([key,val])=>[key,val.value]));styles.paddingTop='44px';const result=evaluateScan({context:'figma/default',elements:[{styles,rules,unsupported:[]}],uncovered:[],url:'https://example.com',rootFontSize:'16px'},system);assert.equal(result.elements[0].rows.find(r=>r.property==='paddingTop').status,'Fail');assert.equal(result.elements[0].rows.find(r=>r.property==='paddingTop').expected,'24px');});

test('rejects links, passwords, empty and incomplete tokens before storage',()=>{for(const s of ['', 'wrong-token','https://figma.com/design/ABC','figd_short'])assert.equal(validFigmaTokenFormat(s),false);assert.equal(validFigmaTokenFormat('figd_fixture_session_only_1234567890'),true);});

test('Fill and Hug are omitted independently while fixed dimensions stay comparable',()=>{
 const a=figmaProperties({...frame,layoutSizingHorizontal:'FILL',layoutSizingVertical:'HUG'});assert.equal(a.properties.width,undefined);assert.equal(a.properties.height,undefined);assert.equal(a.properties.paddingTop,'24px');
 const b=figmaProperties({...frame,layoutSizingHorizontal:'FIXED',layoutSizingVertical:'HUG'});assert.equal(b.properties.width,'1440px');assert.equal(b.properties.height,undefined);
 const c=figmaProperties({...frame,layoutSizingHorizontal:'HUG',layoutSizingVertical:'FIXED'});assert.equal(c.properties.width,undefined);assert.equal(c.properties.height,'900px');
 assert.equal(makeFigmaSystem(ref,{...frame,layoutSizingHorizontal:'FILL'},true).source.checkViewport,false);
});
test('legacy Auto Layout axis modes and child fill respect parent direction',()=>{
 assert.deepEqual(figmaSizing({layoutMode:'HORIZONTAL',primaryAxisSizingMode:'AUTO',counterAxisSizingMode:'FIXED'}),{width:'HUG',height:'FIXED'});
 assert.deepEqual(figmaSizing({layoutMode:'VERTICAL',primaryAxisSizingMode:'AUTO',counterAxisSizingMode:'FIXED'}),{width:'FIXED',height:'HUG'});
 assert.deepEqual(figmaSizing({layoutGrow:1,layoutAlign:'STRETCH'},{layoutMode:'VERTICAL'}),{width:'FILL',height:'FILL'});
 assert.equal(figmaSizing({layoutSizingHorizontal:'FIXED',layoutGrow:1},{layoutMode:'HORIZONTAL'}).width,'FIXED');
});
test('dynamic frame dimensions never become failures against different production sizes',()=>{
 const system=makeFigmaSystem(ref,{...frame,layoutSizingHorizontal:'FILL',layoutSizingVertical:'HUG'});const rules=system.rules[0].properties;
 const styles=Object.fromEntries(Object.entries(rules).map(([key,val])=>[key,val.value]));styles.width='2081px';styles.height='1251px';
 const result=evaluateScan({context:'figma/default',elements:[{styles,rules,unsupported:[]}],uncovered:[],url:'https://example.com',rootFontSize:'16px'},system);
 assert.equal(result.counts.fail,0);assert.ok(!result.elements[0].rows.some(r=>['width','height'].includes(r.property)));
});

test('upgrades a legacy reference from its exact saved link without mutating it',async()=>{
 const old=makeFigmaSystem(ref,{...frame,layoutSizingVertical:'HUG'},true);delete old.source.layers;const before=JSON.stringify(old);
 assert.equal(figmaPageReady(old),false);
 const next=await refreshFigmaSystem(old,'fixture-token',async url=>{assert.match(url,/ids=1%3A2/);return{ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({name:'Updated',version:'v2',nodes:{'1:2':{document:{...frame,children:[{id:'1:3',type:'TEXT',name:'Title',characters:'Title',style:{fontSize:24}}]}}}})};});
 assert.equal(figmaPageReady(next),true);assert.equal(next.source.layers.length,2);assert.equal(next.source.fileVersion,'v2');assert.equal(next.source.sizing.height,'HUG');assert.equal(next.rules[0].properties.height,undefined);assert.equal(next.source.checkViewport,true);assert.equal(JSON.stringify(old),before);
});
test('failed reference upgrades retain the cached baseline and propagate access status',async()=>{
 const old=makeFigmaSystem(ref,frame);delete old.source.layers;const before=JSON.stringify(old);
 await assert.rejects(refreshFigmaSystem(old,'fixture',async()=>({ok:false,status:403})),error=>error.status===403);
 assert.equal(JSON.stringify(old),before);assert.equal(figmaPageReady(old),false);
});
