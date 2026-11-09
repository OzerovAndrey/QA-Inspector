import {getFigmaToken} from './figma-credentials.js';
import {parseFigmaLink} from './figma-reference.js';

// UI adapter only: moves existing controls and delegates to their existing handlers.
export async function setupPanelShell({getState}){
 const $=id=>document.getElementById(id),main=document.querySelector('main');
 document.body.classList.add('compact-ui');document.querySelector('footer')?.remove();document.body.append($('figma-token-help'),$('reference-description'));
 const make=(tag,html,cls)=>{const el=document.createElement(tag);if(html)el.innerHTML=html;if(cls)el.className=cls;return el;};
 const pop=(id,label)=>{const el=make('div',`<h3>${label}</h3>`,'shell-popover');el.id=id;el.setAttribute('popover','auto');document.body.append(el);return el;};
 const header=make('header','<div class="shell-brand"><strong>Інспектор</strong></div><div class="shell-header-actions"><button id="figma-status-chip" popovertarget="figma-status-menu" aria-label="Підключення Figma"><span id="figma-status-dot" aria-hidden="true">○</span> Figma</button><button id="panel-menu-button" popovertarget="panel-menu" aria-label="Меню панелі">⋯</button></div>','shell-header');main.prepend(header);
 const menu=pop('panel-menu','Меню');const quickActions=make('div',null,'shell-quick-actions');quickActions.append($('reset-all'));header.after(quickActions);
 for(const [id,text]of [['menu-access','Доступ до сайту'],['menu-help','Допомога']]){const b=make('button',text);b.id=id;menu.append(b);b.onclick=()=>{menu.hidePopover();help.showPopover();if(id==='menu-access')$('grant').focus();};}
 menu.append(make('p','Працює локально, без сервера','hint'));
 const help=pop('panel-help','Доступ до сайту й допомога');const settings=document.querySelector('.settings');settings.open=true;settings.querySelector('summary').hidden=true;help.append(settings);
 const confirm=make('dialog','<h3>Скинути всі дані?</h3><p>Макети та результати буде видалено з цього пристрою. Токен Figma збережеться.</p><div class="dialog-actions"><button id="reset-cancel">Скасувати</button><button id="reset-confirm-action" class="primary">Скинути все</button></div>','shell-dialog');confirm.id='reset-confirm';document.body.append(confirm);
 const reset=$('reset-all').onclick;$('reset-all').onclick=()=>{if(menu.matches(':popover-open'))menu.hidePopover();confirm.showModal();$('reset-cancel').focus();};$('reset-cancel').onclick=()=>confirm.close();$('reset-confirm-action').onclick=async()=>{confirm.close();await reset();};
 const connection=pop('figma-status-menu','Підключення Figma');connection.dataset.editing='false';
 // Use an explicit handler: relying on popovertarget alone left the status chip inert
 // in some embedded side-panel builds. Opening while disconnected shows token setup.
 const chip=$('figma-status-chip');
 chip.lastChild.textContent=' Підключити Figma';
 chip.removeAttribute('popovertarget');
 chip.setAttribute('aria-controls',connection.id);
 chip.setAttribute('aria-expanded','false');
 const openConnection=()=>{
  if(connection.matches(':popover-open')){connection.hidePopover();return;}
  connection.dataset.editing=connected?'false':'true';
  connection.showPopover();
  chip.setAttribute('aria-expanded','true');
  if(!connected)requestAnimationFrame(()=>$('figma-token').focus());
 };
 chip.addEventListener('click',openConnection);
 connection.addEventListener('toggle',event=>{chip.setAttribute('aria-expanded',String(event.newState==='open'));});
 const entry=make('button','Підключити Figma');entry.id='connection-edit';connection.append(entry,$('figma-token-step'),$('figma-connected'));
 entry.onclick=()=>{connection.dataset.editing='true';$('figma-token').focus();};
 $('figma-token-step').querySelector('h3').textContent='Токен Figma';
 $('figma-token-step').querySelector('.figma-token-help-row .hint').textContent='Вставте персональний токен Figma для доступу до макетів.';
 $('figma-connect').textContent='Зберегти токен';
 const compare=make('section','<h2 id="comparison-title">Порівняти з Figma</h2>','comparison-section');compare.id='reference-section';compare.hidden=true;compare.setAttribute('aria-labelledby','comparison-title');compare.querySelector('h2').prepend($('figma-connected').querySelector('.figma-logo').cloneNode(true));
 const workspace=document.querySelector('.workspace'),reference=document.querySelector('.reference-card');compare.append(reference);workspace.remove();main.append(compare);
 const followup=make('div','<div class="comparison-stage" id="figma-stage-two"><strong>2. Оберіть елемент на сторінці</strong><p>Виберіть елемент через пікер або перевірте всю сторінку.</p></div><div class="comparison-stage" id="figma-stage-three"><strong>3. Перегляньте розбіжності</strong><p>Результати порівняння з макетом з’являться після сканування.</p></div>','comparison-stages');compare.append(followup);
 document.querySelector('.reference-sources').hidden=true;$('source-figma').parentElement.setAttribute('aria-hidden','true');$('figma-source').hidden=false;$('json-source').hidden=false;for(const id of ['figma-source','json-source']){$(id).removeAttribute('role');$(id).removeAttribute('aria-labelledby');}
 document.querySelector('.reference-heading').hidden=true;$('reference-hint').hidden=true;
 const advanced=make('details','<summary>Налаштування порівняння</summary>','comparison-advanced');advanced.id='reference-advanced';
 const toggle=make('label',null,'check');toggle.append($('compare-enabled'),document.createTextNode('Порівнювати з макетом'));advanced.append(toggle);
 const editor=$('figma-editor');editor.querySelector('summary').textContent='Шари макета';editor.open=false;
 const linkStep=$('figma-link-step');reference.prepend(linkStep);linkStep.hidden=false;linkStep.querySelector('h3').textContent='1. Підключіть макет';linkStep.querySelector('h3').hidden=false;linkStep.querySelector('p').textContent='Додайте посилання на фрейм Figma або імпортуйте JSON / ZIP. Доступ до Figma налаштовується окремо зверху.';linkStep.querySelector('p').hidden=false;
 const url=$('figma-url');url.type='text';url.placeholder='Вставте посилання на макет Figma';url.setAttribute('aria-label',url.placeholder);url.setAttribute('aria-describedby','layout-status');url.parentElement.firstChild.textContent='Макет для порівняння';
 const drop=make('div',null,'layout-drop');drop.id='layout-drop';url.parentElement.before(drop);drop.append(url.parentElement);drop.tabIndex=0;drop.setAttribute('aria-label','Додати макет: вставте посилання або перетягніть JSON чи ZIP');
 $('figma-load').hidden=true;editor.append($('figma-selection'));reference.append(editor);
 // No duplicate credentials prompt in the layout step: token settings live in the top chip.
 const status=make('p',null,'notice');status.id='layout-status';status.dataset.state='empty';status.setAttribute('role','status');status.setAttribute('aria-live','polite');reference.prepend(status);
 const importer=$('import');importer.textContent='Обрати JSON / ZIP';const alternative=make('div','<span>або</span>','import-alternative');reference.append(alternative,importer);const fileHint=make('p','Перетягніть файл сюди або оберіть його з диска.','file-import-hint');reference.append(fileHint); // JSON remains available without a Figma account.
 const loaded=$('loaded-system');advanced.append($('figma-readiness'),$('system-mode'),$('theme-label'));loaded.after(advanced);const info=document.querySelector('.info-button');info.id='reference-info';info.className='text-button';info.textContent='Про порівняння';advanced.append(info);$('figma-use').textContent='Застосувати вибраний шар';
 $('remove-system').textContent='✕ Прибрати';$('replace').textContent='Замінити';
 const validate=()=>{if(!url.value.trim()){url.removeAttribute('aria-invalid');status.textContent='';status.dataset.state='empty';return false;}try{parseFigmaLink(url.value.trim());url.removeAttribute('aria-invalid');return true;}catch(error){status.textContent=error.message;status.dataset.state='error';url.setAttribute('aria-invalid','true');return false;}};
 let applying=false,lastApplied='';
 const apply=async()=>{if(applying||getState().busy||!validate())return;if(lastApplied===url.value.trim()&&getState().system)return;if(!await getFigmaToken()){status.textContent='Для макета Figma спочатку додайте токен через верхню кнопку «Підключити Figma MCP». JSON / ZIP можна завантажити без токена.';status.dataset.state='error';openConnection();return;}applying=true;status.textContent='Перевіряємо та застосовуємо макет…';status.dataset.state='validating';url.setAttribute('aria-busy','true');url.disabled=true;
  try{const success=await $('figma-load').onclick({autoApply:true});if(success){lastApplied=url.value.trim();status.textContent='Макет застосовано';status.dataset.state='applied';}else{status.textContent=$('figma-message').textContent+(getState().system?' Попередній макет збережено.':'');status.dataset.state=$('figma-message').classList.contains('error')?'error':'empty';url.setAttribute('aria-invalid',String(status.dataset.state==='error'));}}
  finally{applying=false;url.disabled=false;url.removeAttribute('aria-busy');sync();}
 };
 url.addEventListener('paste',event=>{const text=event.clipboardData?.getData('text/plain')?.trim();if(!text)return;event.preventDefault();if(text.startsWith('{')){importFiles([new File([text],'pasted-tokens.json',{type:'application/json'})]);return;}url.value=text;apply();});
 url.addEventListener('change',apply);url.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();apply();}});url.addEventListener('input',()=>{if(!applying)validate();});
 async function importFiles(files){if(applying||getState().busy)return;if(files.length!==1){status.textContent='Оберіть один JSON або ZIP з JSON-файлами.';status.dataset.state='error';return;}const dt=new DataTransfer();dt.items.add(files[0]);$('system-file').files=dt.files;await $('system-file').onchange();sync();}
 const fileChange=$('system-file').onchange;$('system-file').onchange=async()=>{status.textContent='Перевіряємо файл…';status.dataset.state='validating';await fileChange();const error=$('import-message').classList.contains('error');status.textContent=error?$('import-message').textContent:'Макет застосовано';status.dataset.state=error?'error':'applied';sync();};
 // Accept files anywhere in the collapsed comparison section as well as the input drop zone.
 for(const surface of [compare,drop]){surface.addEventListener('dragover',event=>{event.preventDefault();surface.classList.add('drag-over');});surface.addEventListener('dragleave',()=>surface.classList.remove('drag-over'));surface.addEventListener('drop',event=>{event.preventDefault();event.stopPropagation();surface.classList.remove('drag-over');importFiles([...event.dataTransfer.files]);});}
 drop.addEventListener('keydown',event=>{if(event.target===drop&&['Enter',' '].includes(event.key)){event.preventDefault();$('system-file').click();}});
 for(const mode of ['component','page','site']){
  const intro=$('panel-'+mode).querySelector('.mode-intro');intro.hidden=true;$('panel-'+mode).querySelector('.result-header h3').textContent='Властивості';
  const actions=$('panel-'+mode).querySelector('.report-actions');actions.classList.add('split-export');const resultControls=make('div',null,'result-controls');resultControls.id=mode+'-result-controls';actions.before(resultControls);resultControls.append(actions);
  const options=pop(mode+'-export-options','Завантажити звіт');options.append($(mode+'-json'),$(mode+'-md'));$(mode+'-json').textContent='JSON';$(mode+'-md').textContent='Markdown';
  const arrow=make('button','▾','split-toggle');arrow.id=mode+'-export-toggle';arrow.setAttribute('popovertarget',options.id);arrow.setAttribute('aria-label','Формати експорту');actions.append(arrow);
  for(const format of ['json','md'])$(mode+'-'+format).addEventListener('click',()=>options.hidePopover());
 }
 // Escape in the side panel must delegate to the same cancellation handler as the button.
 document.addEventListener('keydown',event=>{if(event.key!=='Escape'||!getState().pickerActive)return;event.preventDefault();event.stopImmediatePropagation();$('component-stop').click();},true);
 $('component-result-controls').prepend($('reset-all'));quickActions.remove();
 $('component-stop').textContent='Скасувати';$('component-stop').append(make('kbd','Esc'));
 const banner=make('div','<span id="site-access-description">Спочатку надайте доступ до сайту.</span><button id="site-access-grant" class="secondary">Надати доступ</button>','access-banner');banner.id='site-access-banner';banner.hidden=true;document.querySelector('.mode-tabs-shell').before(banner);
 $('site-access-grant').onclick=async()=>{await $('grant').onclick();await access();};
 async function access(){try{let [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(tab?.url?.startsWith('chrome-extension://')){const saved=await chrome.storage.local.get('inspectorPage');tab=saved.inspectorPage?{id:saved.inspectorPage.tabId,url:saved.inspectorPage.url}:tab;}if(!tab?.url)return;const u=new URL(tab.url);let allowed=false;if(['http:','https:'].includes(u.protocol))allowed=await chrome.permissions.contains({origins:[u.protocol+'//'+u.hostname+'/*']});if(!allowed&&['http:','https:','file:'].includes(u.protocol)){try{const response=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>true});allowed=response[0]?.result===true;}catch{}}banner.hidden=allowed;const protectedPage=!['http:','https:','file:'].includes(u.protocol);$('site-access-description').textContent=protectedPage?'На цій службовій сторінці Chrome інспекція недоступна.':'Потрібен доступ до цього сайту.';$('site-access-grant').hidden=protectedPage;}catch{banner.hidden=false;}}
 $('grant').addEventListener('click',()=>setTimeout(access,100));
 let connected=false;
 function connectionState(value,error=false){connected=value;compare.hidden=!value;compare.setAttribute('aria-hidden',String(!value));document.body.dataset.figmaConnected=String(value);$('figma-status-dot').textContent=error?'!':value?'●':'○';$('figma-status-chip').dataset.state=error?'error':value?'connected':'disconnected';$('figma-status-chip').setAttribute('aria-label',error?'Помилка підключення Figma':value?'Figma підключено':'Figma не підключено');entry.hidden=value;chip.lastChild.textContent=value?' Figma підключено':' Підключити Figma';if(value)connection.dataset.editing='false';}
 document.addEventListener('qa:figma-connection',event=>{const newlyConnected=event.detail.connected&&(!connected||connection.matches(':popover-open'));connectionState(event.detail.connected,event.detail.error);if(newlyConnected){if(connection.matches(':popover-open'))connection.hidePopover();url.focus();}});
 $('figma-token-help').addEventListener('toggle',event=>{if(event.newState==='closed'&&!connected){connection.dataset.editing='true';connection.showPopover();$('figma-token').focus();}});
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.figmaAccessToken)connectionState(Boolean(changes.figmaAccessToken.newValue));});connectionState(Boolean(await getFigmaToken()));
 let updating=false,knownPageURL;
 function statesReady(){return Boolean($('component-results').querySelector('.component-result')||$('page-results').querySelector('.component-result'));}
 function sync(){if(updating)return;updating=true;try{
  const state=getState();const layoutReady=Boolean(state.system&&state.comparing);$('figma-stage-two').classList.toggle('is-ready',layoutReady);$('figma-stage-three').classList.toggle('is-ready',layoutReady&&Boolean(statesReady()));if($('reset-all').hidden===state.hasResetData)$('reset-all').hidden=!state.hasResetData;const resetHost=$(state.mode+'-result-controls');if(resetHost&&$('reset-all').parentElement!==resetHost)resetHost.prepend($('reset-all'));if(state.pageURL&&state.pageURL!==knownPageURL){knownPageURL=state.pageURL;access();}if(editor.hidden!==$('figma-selection').hidden)editor.hidden=$('figma-selection').hidden;const pressed=String(state.pickerActive);if($('component-action').getAttribute('aria-pressed')!==pressed)$('component-action').setAttribute('aria-pressed',pressed);document.body.dataset.pickerState=state.pickerActive?'active':state.hasSelection?'selected':'inactive';if(state.pickerActive&&!$('component-message').classList.contains('error')){const hint='Клік — зафіксувати · Esc — скасувати';if($('component-message').textContent!==hint)$('component-message').textContent=hint;}for(const mode of ['component','page','site']){const hidden=$(mode+'-copy').disabled;const actions=$('panel-'+mode).querySelector('.report-actions');if(actions.hidden!==hidden)actions.hidden=hidden;if($(mode+'-export-toggle').disabled!==hidden)$(mode+'-export-toggle').disabled=hidden;}
  const siteEmpty=$('site-results').querySelector('.empty');if(siteEmpty&&state.system?.source?.type==='figma'&&state.comparing){const hint='Для обходу сайту додайте JSON із правилами. Макет Figma перевіряйте у вкладці «Сторінка».';if(siteEmpty.textContent!==hint)siteEmpty.textContent=hint;}
  const empty=$('component-results').querySelector('.empty');const message=$('component-message');const hideHint=Boolean(empty&&state.pickerActive&&!message.classList.contains('error'));if(message.hidden!==hideHint)message.hidden=hideHint;if(empty){const text=state.pickerActive?'Клік — зафіксувати · Esc — скасувати':'Натисніть «Обрати компонент» і клікніть по елементу на сторінці';if(empty.textContent!==text)empty.textContent=text;}
  if(advanced.hidden!==!state.system)advanced.hidden=!state.system;
  if(importer.hidden)importer.hidden=false;
  const fileError=$('import-message').classList.contains('error')&&!$('import-message').hidden;
  if(!applying&&fileError&&status.textContent!==$('import-message').textContent){status.textContent=$('import-message').textContent;status.dataset.state='error';}
  if(!state.system&&status.dataset.state==='applied'){status.textContent='';status.dataset.state='empty';lastApplied='';}
  // The top connection chip remains available independently of scan state.
 }finally{updating=false;}}
 const observer=new MutationObserver(()=>sync());observer.observe(main,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','hidden','class','aria-pressed']});
 document.addEventListener('qa:ui-state',sync);sync();await access();
}
