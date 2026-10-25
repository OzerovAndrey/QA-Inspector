import {scanDocument} from './scanner.js';
import {evaluateScan} from './scan-core.js';
import {createSitePlan,canonicalUrl,summarizeSite} from './site-core.js';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let activeJob=null;
export const recovery=chrome.storage.session.get('siteJob').then(async({siteJob})=>{if(siteJob&&['running','stopping'].includes(siteJob.status)){siteJob.status='interrupted';siteJob.error='Фоновий процес перезапустився. Частковий звіт збережено; запустіть перевірку знову.';siteJob.finishedAt=new Date().toISOString();await chrome.storage.session.set({siteJob});}}).catch(console.error);
function collectLinks(){return [...new Set([...document.querySelectorAll('a[href]')].filter(a=>!a.hasAttribute('download')&&a.getAttribute('rel')!=='external'&&!/logout|sign.?out|delete|remove|unsubscribe/i.test((a.getAttribute('aria-label')||'')+' '+a.textContent)).map(a=>a.href))].slice(0,3000);}
async function publish(job){await chrome.storage.session.set({siteJob:job});}
async function waitForPage(tabId,timeoutMs,job){const end=Date.now()+timeoutMs;while(Date.now()<end){if(job.cancelled)throw Error('Скасовано');const tab=await chrome.tabs.get(tabId);if(tab.status==='complete')return;await sleep(200);}throw Error('Сторінка не завантажилася за відведений час.');}
function ready(selector){return !selector||Boolean(document.querySelector(selector));}
export async function startSiteJob({system,seed,context,digest,windowId}){
 await recovery;if(activeJob)throw Error('Перевірка сайту вже триває.');const plan=createSitePlan(system,seed);
 if(context&&!system.contexts[context])throw Error('Невідома тема еталона.');
 const permission=await chrome.permissions.contains({origins:[new URL(plan.scope.origin).protocol+'//'+new URL(plan.scope.origin).hostname+'/*']});if(!permission)throw Error('Для автоматичного обходу потрібен доступ до '+plan.scope.origin+'. Натисніть «Надати доступ до сайтів».');
 const job={id:crypto.randomUUID(),digest,systemName:system.name,mode:system.mode||'components',status:'running',startedAt:new Date().toISOString(),seed,scope:plan.scope,maxPages:plan.maxPages,pages:[],remaining:plan.starts.length,currentUrl:'',cancelled:false};
 activeJob=job;try{await publish(job);}catch(error){activeJob=null;throw error;}
 crawl(job,system,context,plan,windowId).catch(console.error);return {id:job.id};
}
export async function stopSiteJob(){await recovery;if(activeJob){const job=activeJob;job.cancelled=true;job.status='stopping';await publish(job);if(job.tabId)try{await chrome.tabs.remove(job.tabId);}catch{}}return {ok:true};}
async function crawl(job,system,context,plan,windowId){
 const queue=[...plan.starts],seen=new Set(queue),visited=new Set();let bytes=0;
 try{
  while(queue.length&&job.pages.length<plan.maxPages&&!job.cancelled){
   const url=queue.shift();job.currentUrl=url;job.remaining=queue.length+1;await publish(job);
   let tab;
   try{
    tab=await chrome.tabs.create({url,active:false,...(Number.isInteger(windowId)?{windowId}:{})});job.tabId=tab.id;
    await waitForPage(tab.id,plan.timeoutMs,job);await sleep(plan.settleMs);if(job.cancelled)break;
    if(plan.readySelector){const end=Date.now()+plan.timeoutMs;let found=false;while(Date.now()<end&&!job.cancelled){const r=await chrome.scripting.executeScript({target:{tabId:tab.id},func:ready,args:[plan.readySelector]});if(r[0]?.result){found=true;break;}await sleep(200);}if(!found)throw Error('Не знайдено готовий вміст за crawl.readySelector.');}
    const responses=await chrome.scripting.executeScript({target:{tabId:tab.id},func:scanDocument,args:[{...system,scope:plan.scope},{context:context||undefined}]});
    const snapshot=responses[0]?.result;if(!snapshot)throw Error('Сторінка не повернула дані.');
    const actual=canonicalUrl(snapshot.url,url,plan.scope);if(!actual)throw Error('Сторінка перенаправила за межі конфігурації.');
    if(visited.has(actual))continue;visited.add(actual);seen.add(actual);
    const result=evaluateScan(snapshot,system),counts={...result.counts,elements:result.elements.length,uncovered:result.uncovered.length};
    const size=JSON.stringify(result).length*2,keep=bytes+size<4_500_000;if(keep)bytes+=size;
    job.pages.push({requestedUrl:url,url:snapshot.url,counts,result:keep?result:null,detailOmitted:!keep});
    if(plan.includeLinkedPages){const links=(await chrome.scripting.executeScript({target:{tabId:tab.id},func:collectLinks}))[0]?.result||[];for(const link of links){const normalized=canonicalUrl(link,snapshot.url,plan.scope);if(normalized&&!seen.has(normalized)&&seen.size<2000){seen.add(normalized);queue.push(normalized);}}}
   }catch(error){if(!job.cancelled)job.pages.push({url,error:error.message});}
   finally{if(tab?.id)try{await chrome.tabs.remove(tab.id);}catch{}delete job.tabId;}
   job.remaining=queue.length;job.totals=summarizeSite(job);await publish(job);
  }
  job.status=job.cancelled?'cancelled':queue.length?'limited':'completed';job.remaining=queue.length+(job.cancelled&&job.currentUrl&&!job.pages.some(p=>p.requestedUrl===job.currentUrl||p.url===job.currentUrl)?1:0);
 }catch(error){job.status=job.cancelled?'cancelled':'failed';job.error=error.message;}
 finally{job.finishedAt=new Date().toISOString();job.currentUrl='';job.totals=summarizeSite(job);await publish(job);activeJob=null;}
}
