// Render the vector at each native Chrome icon size, without downscaling a bitmap.
const {chromium}=require(process.env.QA_PLAYWRIGHT||'playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const directory=path.resolve(__dirname,'../extension/icons');
 const svg=fs.readFileSync(path.join(directory,'logo.svg'),'utf8');
 const browser=await chromium.launch({...require('../tests/browser-config.cjs'),headless:true});
 try{
  const page=await browser.newPage({deviceScaleFactor:1});
  for(const size of [16,32,48,128]){
   await page.setViewportSize({width:size,height:size});
   await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
   await page.screenshot({path:path.join(directory,`icon-${size}.png`),omitBackground:true});
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
