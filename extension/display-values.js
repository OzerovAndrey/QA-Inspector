// Presentation only: preserve original measurements and comparison results.
export function isZeroValue(value){
 if(typeof value==='number')return value===0;
 if(typeof value!=='string'||!value.trim())return false;
 return value.trim().split(/\s+/).every(part=>/^[+-]?(?:0+(?:\.0*)?|\.0+)(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|pt|pc|cm|mm|in|deg|s|ms)?$/i.test(part));
}
