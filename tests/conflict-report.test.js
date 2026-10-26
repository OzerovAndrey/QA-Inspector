import test from 'node:test';import assert from 'node:assert/strict';
import {conflicts,conflictCode,conflictsReport} from '../extension/conflict-report.js';
const row={property:'paddingLeft',actual:'44px',expected:'16px',allowedValues:[{token:'space.md',value:'16px'}],status:'Fail',token:'space.md',tolerance:.5};
const element={selector:'#save',label:'Save',rows:[row,{status:'Not comparable'},{status:'Pass'}]};
const result={url:'https://example.com/',systemName:'Design',elements:[element]};
test('handoff contains actual and reference CSS and excludes non-conflicts',()=>{assert.equal(conflicts(result).length,1);const report=conflictCode(result,element,row);assert.match(report,/padding-left: 44px;/);assert.match(report,/padding-left: 16px;/);assert.match(report,/#save/);assert.match(conflictsReport(result),/1 конфліктів/);});
test('multiple allowed tokens are documented without inventing a replacement',()=>{const text=conflictCode(result,element,{...row,allowedValues:[{token:'a',value:'16px'},{token:'b',value:'24px'}]});assert.match(text,/не готовий патч/);assert.match(text,/a: padding-left: 16px/);assert.match(text,/b: padding-left: 24px/);});
