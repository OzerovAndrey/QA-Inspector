const {chromium}=require(process.env.QA_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {revealElement,clearReveal}=await import('../extension/scanner.js');
 const browser=await chromium.launch({...require('./browser-config.cjs'),headless:true});
 try{
  const page=await browser.newPage({viewport:{width:700,height:700}});
  await page.setContent('<style>body{margin:40px;font:16px Arial}button{font:16px Arial;padding:24px 60px}#wrapped{width:130px;margin-top:24px}#nested{margin-top:24px;padding:20px}#nested strong{font-size:28px}</style><button id="plain">Show All</button><button id="span"><svg width="20" height="20"></svg><span>Nested label</span><span hidden>Hidden label</span></button><p id="wrapped">Text wrapped over several separate lines for testing</p><article id="nested"><strong>Heading</strong><p>Body text</p></article>');
  const reveal=(selector,property)=>page.evaluate(({source,selector,property})=>eval('('+source+')')(selector,'Property',property,true),{source:revealElement.toString(),selector,property});
  for(const id of ['plain','span']){
   await reveal('#'+id,'fontSize');const measured=await page.locator('[data-qa-conflict]').boundingBox(),button=await page.locator('#'+id).boundingBox();
   assert.ok(measured.width<button.width-60);assert.ok(measured.height<button.height-30);assert.equal(await page.locator('[data-qa-text-fragment]').count(),1);
  }
  await reveal('#wrapped','lineHeight');assert.ok(await page.locator('[data-qa-text-fragment]').count()>1);
  await reveal('#nested','fontSize');const text=await page.locator('[data-qa-conflict]').boundingBox(),body=await page.locator('#nested p').boundingBox(),heading=await page.locator('#nested strong').boundingBox();assert.ok(text.y>=body.y-1);assert.ok(text.y>heading.y);
  await reveal('#plain','backgroundColor');assert.equal(await page.locator('[data-qa-text-fragment]').count(),0);assert.deepEqual(await page.locator('[data-qa-conflict]').boundingBox(),await page.locator('#plain').boundingBox());
  await reveal('#plain','paddingLeft');assert.equal((await page.locator('[data-qa-conflict]').boundingBox()).width,60);
  await page.evaluate('('+clearReveal.toString()+')()');assert.equal(await page.locator('[data-qa-conflict]').count(),0);
  console.log('Text highlighting passed: direct/nested text, hidden nodes, wrapped lines, typography inheritance, full box and padding regression.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
