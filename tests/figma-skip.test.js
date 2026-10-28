import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateScan} from '../extension/scan-core.js';
const system={schemaVersion:1,name:'Frame',scope:{origin:'*',pathPrefix:'/'},contexts:{'figma/default':{}},rules:[{name:'Frame',selector:'*',properties:{backgroundColor:{value:'#f7f7f8',tolerance:0},width:{value:'1440px',tolerance:.5}}}],source:{type:'figma',sizing:{width:'FIXED',height:'HUG'}}};
const snapshot=(styles,extra={})=>({url:'https://example.test',context:'figma/default',uncovered:[],elements:[{name:'Frame',styles,rules:system.rules[0].properties,unsupported:[],...extra}]});
test('transparent fills and stretching wrapper widths are skipped, not passed',()=>{
 const result=evaluateScan(snapshot({backgroundColor:'rgba(0, 0, 0, 0)',width:'2081px'},{dynamicWidth:true}),system);
 assert.equal(result.counts.fail,0);assert.equal(result.counts.pass,0);assert.equal(result.counts.checks,0);assert.equal(result.counts.nc,1);assert.equal(result.elements[0].skippedChecks.length,2);
});
test('opaque and partially transparent incorrect fills still fail alongside fixed widths',()=>{
 for(const color of ['rgb(255, 0, 0)','rgba(0, 0, 0, .2)']){const result=evaluateScan(snapshot({backgroundColor:color,width:'2081px'}),system);assert.equal(result.elements[0].rows.filter(row=>row.status==='Fail').length,2);}
});
test('transparent paint with a background image remains unsupported, not silently skipped',()=>{
 const result=evaluateScan(snapshot({backgroundColor:'rgba(0, 0, 0, 0)',backgroundImage:'linear-gradient(red, blue)',width:'1440px'},{unsupported:['backgroundColor']}),system);
 assert.equal(result.elements[0].rows.find(row=>row.property==='backgroundColor').status,'Not comparable');
});
test('Fill metadata filters stale pixel rules, while JSON comparison is preserved',()=>{
 const fill=evaluateScan(snapshot({backgroundColor:'#f7f7f8',width:'2081px'},{sizing:{width:'FILL'}}),system);
 assert.ok(!fill.elements[0].rows.some(row=>row.property==='width'));
 const json=evaluateScan(snapshot({backgroundColor:'transparent',width:'2081px'},{dynamicWidth:true}),{...system,source:undefined});
 assert.equal(json.elements[0].rows.filter(row=>row.status==='Fail').length,2);
});
