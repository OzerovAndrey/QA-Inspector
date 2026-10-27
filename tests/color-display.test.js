import test from 'node:test';
import assert from 'node:assert/strict';
import {formatColor,displayValue} from '../extension/display-values.js';
test('displays CSS colors as HSL while retaining alpha',()=>{
 assert.equal(formatColor('rgba(0, 0, 0, 0)'),'hsl(0 0% 0% / 0)');
 assert.equal(formatColor('rgba(247, 247, 248, 1.0000)'),'hsl(240 6.67% 97.06%)');
 assert.equal(formatColor('#ff000080'),'hsl(0 100% 50% / 0.502)');
 assert.equal(formatColor('rgb(0 100% 0 / 25%)'),'hsl(120 100% 50% / 0.25)');
 assert.equal(formatColor('color(srgb 1 0 0 / 0.4)'),'hsl(0 100% 50% / 0.4)');
 assert.equal(formatColor('#fff'),'hsl(0 0% 100%)');
 assert.equal(formatColor('transparent'),'hsl(0 0% 0% / 0)');
});
test('formats multiple reference choices and leaves non-colors intact',()=>{
 assert.equal(displayValue('backgroundColor','#fff · #000'),'hsl(0 0% 100%) · hsl(0 0% 0%)');
 assert.equal(displayValue('width','32px'),'32px');
 assert.equal(formatColor('—'),'—');
 assert.equal(formatColor('hsl(120 100% 50%)'),'hsl(120 100% 50%)');
});
