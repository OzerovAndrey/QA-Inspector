import {startSiteJob,stopSiteJob} from './site-runner.js';
chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(console.error);
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(['QA_PICK','QA_PICK_CANCEL','QA_HOVER'].includes(message.type)&&sender.tab){
  chrome.storage.session.set({pickedElement:{type:message.type,selector:message.selector,url:message.url,tabId:sender.tab.id,timestamp:Date.now()}}).then(()=>respond({ok:true}),()=>respond({ok:false}));return true;
 }
 if(sender.id!==chrome.runtime.id||!sender.url?.startsWith(chrome.runtime.getURL('panel.html')))return;
 if(message.type==='QA_SITE_START'){startSiteJob(message).then(respond,error=>respond({error:error.message}));return true;}
 if(message.type==='QA_SITE_STOP'){stopSiteJob().then(respond,error=>respond({error:error.message}));return true;}
});
