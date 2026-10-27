const {chromium}=require(process.env.QA_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {makeFigmaSystem,scanFigmaPage}=await import('../extension/figma-reference.js');
 const {evaluateScan}=await import('../extension/scan-core.js');
 const browser=await chromium.launch({...require('./browser-config.cjs'),headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<main style="padding:44px"><h1 style="font-size:32px">Tournament</h1><p>Unique description</p><button>Join</button><button>Join</button></main>');
  const text=(id,characters)=>({id,type:'TEXT',name:characters,characters,layoutSizingHorizontal:'HUG',style:{fontSize:24}});
  const root={id:'1:1',name:'Layout',type:'FRAME',layoutSizingHorizontal:'FILL',layoutSizingVertical:'HUG',layoutMode:'VERTICAL',paddingTop:20,children:[text('1:2','Tournament'),text('1:3','Unique description'),text('1:4','Join'),text('1:5','Missing')]};
  const system=makeFigmaSystem({name:'Fixture',fileKey:'fixture',url:'https://www.figma.com/design/fixture?node-id=1-1'},root);
  const scan=()=>page.evaluate('('+scanFigmaPage.toString()+')('+JSON.stringify(system)+')');
  const snapshot=await scan();assert.ok(!snapshot.error,snapshot.error);
  assert.equal(snapshot.figmaPage.matched,3);assert.equal(snapshot.figmaPage.unmatched.length,2);
  assert.match(snapshot.figmaPage.unmatched.find(x=>x.id==='1:4').reason,/Кілька/);
  assert.equal(snapshot.elements.find(x=>x.figmaNodeId==='1:1').selector,'html > body:nth-of-type(1) > main:nth-of-type(1)');
  assert.ok(!('width' in snapshot.elements[0].rules));assert.ok(!('height' in snapshot.elements[0].rules));
  const result=evaluateScan(snapshot,system);
  assert.ok(result.elements.find(x=>x.figmaNodeId==='1:2').rows.some(row=>row.property==='fontSize'&&row.status==='Fail'));
  assert.ok(result.elements.find(x=>x.figmaNodeId==='1:1').rows.some(row=>row.property==='paddingTop'&&row.status==='Fail'));
  for(const element of snapshot.elements)assert.equal(await page.locator(element.selector).count(),1);
  await page.locator('button').first().evaluate(el=>el.setAttribute('data-figma-node-id','1:4'));
  assert.equal((await scan()).figmaPage.matched,4);
  delete system.source.layers;
  assert.match((await scan()).error,/Оновіть еталон/);
  console.log('Figma automatic page: nested matching, real conflicts, Fill/Hug skips, duplicate/missing coverage and selectors passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
