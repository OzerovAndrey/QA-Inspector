import {normalize} from './core.js';
// Presentation only: preserve original measurements and comparison results.
export function isZeroValue(value){
 if(typeof value==='number')return value===0;
 if(typeof value!=='string'||!value.trim())return false;
 return value.trim().split(/\s+/).every(part=>/^[+-]?(?:0+(?:\.0*)?|\.0+)(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|pt|pc|cm|mm|in|deg|s|ms)?$/i.test(part));
}

// HSL is a display format; retain measured values for comparison and exports.
export function formatColor(value){
 const original=String(value??'');
 const parts=original.split(' · ');if(parts.length>1)return parts.map(formatColor).join(' · ');
 const input=original.trim();
 if(/^hsla?\([^()]+\)$/i.test(input))return input;
 let rgba=normalize('color',input);
 const srgb=input.match(/^color\(srgb\s+([^()]+)\)$/i);if(!rgba&&srgb){const parts=srgb[1].replace('/',' ').trim().split(/\s+/);if(parts.length===3||parts.length===4){const values=parts.map(part=>part.endsWith('%')?parseFloat(part)/100:Number(part));if(values.every(Number.isFinite))rgba=[...values.slice(0,3).map(channel=>channel*255),values[3]??1];}}
 if(!rgba&&typeof document!=='undefined'&&CSS.supports('color',input)&&!['inherit','initial','unset','revert','currentcolor'].includes(input.toLowerCase())&&!/var\(/i.test(input)){
  const context=document.createElement('canvas').getContext('2d');context.fillStyle=input;rgba=normalize('color',context.fillStyle);if(!rgba){context.fillRect(0,0,1,1);const pixel=context.getImageData(0,0,1,1).data;rgba=[pixel[0],pixel[1],pixel[2],pixel[3]/255];}
 }
 if(!rgba)return original;
 let [r,g,b,a]=rgba;r=Math.max(0,Math.min(255,r))/255;g=Math.max(0,Math.min(255,g))/255;b=Math.max(0,Math.min(255,b))/255;
 const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,l=(max+min)/2;
 let h=0,s=0;
 if(delta){s=delta/(1-Math.abs(2*l-1));h=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;h=(h*60+360)%360;}
 const round=(n,d=2)=>String(Number(n.toFixed(d)));
 const alpha=Math.max(0,Math.min(1,a));
 return `hsl(${round(Number(h.toFixed(2))%360)} ${round(s*100)}% ${round(l*100)}%${alpha<1?' / '+round(alpha,4):''})`;
}
export function displayValue(property,value){return /color/i.test(property)?formatColor(value):String(value??'');}
