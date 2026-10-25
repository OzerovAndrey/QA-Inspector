import {validateSystem,scanReport} from './scan-core.js';
const forbidden=/(?:^|[\/#?&=_-])(logout|log-out|signout|sign-out|delete|remove|unsubscribe)(?:$|[\/#?&=_-])/i;
export function canonicalUrl(value,base,scope){
 try{const url=new URL(value,base);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathPrefix)||forbidden.test(url.pathname+url.search+url.hash))return null;
 if(/\.(?:pdf|zip|png|jpe?g|svg|gif|webp|mp4|mp3|json|csv|xlsx?|docx?)(?:$)/i.test(url.pathname))return null;
 if(url.hash&&!url.hash.startsWith('#/'))url.hash='';
 for(const key of [...url.searchParams.keys()])if(/^utm_|^(gclid|fbclid)$/i.test(key))url.searchParams.delete(key);
 url.searchParams.sort();return url.href;
 }catch{return null;}
}
export function createSitePlan(system,seed){
 validateSystem(system);const start=new URL(seed);if(!['http:','https:'].includes(start.protocol))throw Error('Перевірка сайту працює для HTTP/HTTPS сторінок.');
 const scope={origin:system.scope.origin==='*'?start.origin:system.scope.origin,pathPrefix:system.scope.pathPrefix};
 const seedUrl=canonicalUrl(seed,seed,scope);if(!seedUrl)throw Error('Поточна сторінка поза межами завантаженого JSON.');
 const config=system.crawl||{};
 if(config.startUrls!==undefined&&(!Array.isArray(config.startUrls)||!config.startUrls.length||config.startUrls.length>50||config.startUrls.some(u=>typeof u!=='string')))throw Error('crawl.startUrls має містити від 1 до 50 адрес.');
 const starts=[...new Set((config.startUrls||[seedUrl]).map(u=>canonicalUrl(u,seedUrl,scope)))];if(starts.some(u=>!u))throw Error('У crawl.startUrls є адреса поза межами сайту або непідтримувана адреса.');
 return {scope,starts,maxPages:Math.max(1,Math.min(50,Math.floor(Number(config.maxPages)||20))),includeLinkedPages:config.includeLinkedPages!==false,settleMs:Math.max(150,Math.min(3000,Number(config.settleMs)||600)),timeoutMs:Math.max(2000,Math.min(20000,Number(config.timeoutMs)||12000)),readySelector:typeof config.readySelector==='string'?config.readySelector:null};
}
export function summarizeSite(job){
 return job.pages.reduce((sum,page)=>{if(page.error){sum.errors++;return sum;}sum.pages++;sum.elements+=page.counts?.elements||0;sum.pass+=page.counts?.pass||0;sum.fail+=page.counts?.fail||0;sum.nc+=page.counts?.nc||0;sum.checks+=page.counts?.checks||0;sum.readings+=page.counts?.readings||0;sum.uncovered+=page.counts?.uncovered||0;return sum;},{pages:0,errors:0,elements:0,pass:0,fail:0,nc:0,checks:0,readings:0,uncovered:0});
}
export function siteReport(job){
 const safe=v=>String(v??'').replace(/[\r\n]/g,' ').replace(/\|/g,'\\|'),totals=summarizeSite(job);
 let out=`# QA Inspector · Перевірка сайту\n\nЕталон: ${job.mode==='extract'?'відсутній — фактичні CSS-дані':safe(job.systemName)}\nПочаток: ${safe(job.seed)}\nМежі: ${safe(job.scope.origin+job.scope.pathPrefix)}\nСтатус: ${safe(job.status)}\nПочато: ${safe(job.startedAt)}\n\nСторінок перевірено: ${totals.pages}; помилок завантаження/перевірки: ${totals.errors}. Елементів: ${totals.elements}; перевірок відповідності: ${totals.checks}; зібраних CSS-значень: ${totals.readings}. ${job.mode==='extract'?'Відповідність дизайну не оцінювалася.':`Pass: ${totals.pass}; Fail: ${totals.fail}; Not comparable: ${totals.nc}; без правил: ${totals.uncovered}.`}\n\nЗалишилося в черзі: ${job.remaining||0}. Обхід обмежений ${job.maxPages} сторінками; сторінки без посилань можуть бути не знайдені.\n\n`;
 for(const page of job.pages){out+=`## ${safe(page.url)}\n\n`;if(page.error)out+='Не перевірено: '+safe(page.error)+'\n\n';else if(page.result)out+=scanReport(page.result)+'\n\n';else out+='Збережено тільки підсумок: '+JSON.stringify(page.counts)+'. Деталі не збережено через обмеження розміру звіту.\n\n';}
 if(job.error)out+='\nПримітка: '+safe(job.error)+'\n';return out;
}
