import test from 'node:test';import assert from 'node:assert/strict';import {isZeroValue} from '../extension/display-values.js';
test('zero display filter recognises numeric zero and CSS zero dimensions',()=>{for(const value of [0,'0','0px','-0px','0.00em','0px 0px','0%','.0rem'])assert.equal(isZeroValue(value),true,String(value));});
test('preserves nonzero, mixed shorthand, normal, transparent and meaningful color values',()=>{for(const value of ['-1px','0px 12px','normal','none','rgba(0, 0, 0, 0)','#000000','',null,'10px'])assert.equal(isZeroValue(value),false,String(value));});
