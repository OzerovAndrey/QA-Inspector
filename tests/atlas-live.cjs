const {chromium}=require(process.env.QA_PLAYWRIGHT||'playwright');const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{const {scanDocument}=await import('../extension/scanner.js');const {evaluateScan,scanReport}=await import('../extension/scan-core.js');const system=JSON.parse(fs.readFileSync('designer/atlas-qa.json'));const b=await chromium.launch({...require('./browser-config.cjs'),headless:true});try{
 const p=await b.newPage({viewport:{width:1440,height:1000}});await p.goto('https://ozerovandrey.github.io/atlas-finance/',{waitUntil:'networkidle'});
 const results=[];
 for(const brand of ['vanta','pulse','north','flow'])for(const theme of ['light','dark']){
  await p.evaluate(({brand,theme})=>{document.documentElement.dataset.brand=brand;document.documentElement.dataset.theme=theme;},{brand,theme});await p.waitForTimeout(250);
  const snapshot=await p.evaluate(scanDocument,system),result=evaluateScan(snapshot,system);assert.ok(result.elements.length>0);results.push(result);console.log(result.context,JSON.stringify(result.counts),'uncovered',result.uncovered.length);if(brand==='vanta'&&theme==='light')fs.writeFileSync('atlas-report.md',scanReport(result));
 }
 fs.writeFileSync('atlas-results.json',JSON.stringify(results,null,2));
 // Prove expected values do not read the page's potentially broken CSS variables.
 await p.evaluate(()=>{document.documentElement.dataset.brand='vanta';document.documentElement.dataset.theme='light';const el=document.querySelector('.btn');el.style.setProperty('height','91px','important');el.style.setProperty('border-radius','2px','important');});await p.waitForTimeout(250);
 const changed=evaluateScan(await p.evaluate(scanDocument,system),system);assert.ok(changed.elements.some(e=>e.rows.some(r=>r.property==='height'&&r.actual==='91px'&&r.status==='Fail')));assert.ok(changed.elements.some(e=>e.rows.some(r=>r.property==='borderTopLeftRadius'&&r.actual==='2px'&&r.status==='Fail')));console.log('Injected height/radius mismatches detected. Live app source unchanged.');
 console.log('Sample mismatches:',JSON.stringify(results[0].elements.filter(e=>e.status!=='Pass').slice(0,6).map(e=>({label:e.label,name:e.name,rows:e.rows.filter(r=>r.status!=='Pass')}))));
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
