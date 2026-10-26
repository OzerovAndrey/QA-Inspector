// Compact monochrome property glyphs, using familiar editor conventions.
const paths={
 fontFamily:'M4 5h16M12 5v15M8 20h8',
 fontSize:'M3 18 8 5l5 13M5 14h6M17 7h4m-2-2v14m-2-2h4',
 fontWeight:'M7 4h6a4 4 0 0 1 0 8H7m0-8v16h7a4 4 0 0 0 0-8H7',
 letterSpacing:'M3 9 6 3l3 6M4 7h4m5 2 3-6 3 6m-5-2h4M3 17h18m-15-3-3 3 3 3m12-6 3 3-3 3',
 lineHeight:'M10 5h11M10 12h8m-8 7h11M4 3v18m-3-3 3 3 3-3M1 6l3-3 3 3',
 width:'M3 5v14m18-14v14M3 12h18M7 8l-4 4 4 4m10-8 4 4-4 4',
 height:'M5 3h14M5 21h14M12 3v18M8 7l4-4 4 4m-8 10 4 4 4-4',
 color:'m5 15 7-12 7 12M8 11h8M4 21h16',
 backgroundColor:'m5 13 8-9 8 9-8 8zM3 3l10 10M3 20h5',
 borderTopColor:'M4 5h16v15H4zM4 5h16M8 9h8',
 gap:'M3 4h6v16H3zm12 0h6v16h-6M10 12h4',
 rowGap:'M4 3h16v6H4zm0 12h16v6H4M12 10v4',
 columnGap:'M3 4h6v16H3zm12 0h6v16h-6M10 12h4',
 boxShadow:'M4 4h12v12H4zM9 19h10V9',
 backgroundImage:'M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6M15 8h1',
 display:'M3 3h18v18H3zM3 9h18M9 9v12',
 alignItems:'M3 20h18M6 4h4v12H6zm8 5h4v7h-4',
 justifyContent:'M3 4v16m18-16v16M7 8h3v8H7zm7 0h3v8h-3'
};
export function propertyIcon(property){
 let d=paths[property];
 if(!d&&/Radius$/.test(property)){const right=property.includes('Right'),bottom=property.includes('Bottom');d=`M${right?4:20} ${bottom?20:4}h${right?8:-8}a8 8 0 0 ${right?(bottom?0:1):(bottom?1:0)} ${right?8:-8} ${bottom?-8:8}v${bottom?-8:8}`;}
 if(!d&&/^(padding|margin)/.test(property)){
  const side=property.replace(/^(padding|margin)/,'');const arrows={Top:'M12 3v12m-4-4 4 4 4-4',Bottom:'M12 21V9m-4 4 4-4 4 4',Left:'M3 12h12m-4-4 4 4-4 4',Right:'M21 12H9m4-4-4 4 4 4'};
  d='M5 5h14v14H5z'+(arrows[side]||'M8 12h8');
 }
 if(!d&&/border.*Width/.test(property))d='M4 4h16v16H4zM4 8h16M4 11h16';
 d||='M4 4h16v16H4zM8 12h8';
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.6');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');svg.classList.add('property-icon');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);svg.append(path);return svg;
}
