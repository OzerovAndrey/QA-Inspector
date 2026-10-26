// One small monochrome icon vocabulary for static and dynamically rendered actions.
const paths={
 upload:'M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4',
 download:'M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4',
 copy:'M9 9h11v12H9zM5 15H3V3h12v2',
 reset:'M4 5v5h5M4 10a8 8 0 1 1 1 8',
 close:'m6 6 12 12M6 18 18 6',
 info:'M12 10v7m0-11v1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
 target:'M4 9V4h5m6 0h5v5m0 6v5h-5M9 20H4v-5M12 8v8m-4-4h8',
 page:'M5 3h14v18H5zM8 8h8m-8 4h8m-8 4h5',
 site:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18',
 lock:'M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3',
 replace:'M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4',
 open:'M14 3h7v7m0-7L10 14M10 4H3v17h17v-7',
 check:'m5 12 4 4L19 6',
 more:'M5 12h14m-7-7v14'
};
function decorate(){for(const button of document.querySelectorAll('button')){
 const text=button.textContent.trim(),id=button.id;let kind='more';
 if(button.querySelector('svg'))continue;
 if(button.classList.contains('conflict-select'))kind='target';else if(id==='reset-all')kind='reset';else if(id==='reference-info'||button.classList.contains('info-button'))kind='info';
 else if(id==='import'||/Завантажити/.test(text))kind='upload';else if(/копію|Копію/.test(text))kind=/Скопійовано/.test(text)?'check':'copy';
 else if(/Зрозуміло/.test(text))kind='check';else if(/Замінити/.test(text))kind='replace';else if(/Прибрати|Зупинити|Завершити/.test(text))kind='close';
 else if(/Надати доступ/.test(text))kind='lock';else if(/Файл|JSON|\.md/.test(text))kind='download';else if(/Відкрити/.test(text))kind='open';
 else if(/Показати|Обрати|Компонент/.test(text))kind='target';else if(/Сторінка|Дані сторінки/.test(text))kind='page';else if(/Сайт/.test(text))kind='site';
 if(button.dataset.icon===kind)continue;button.dataset.icon=kind;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[kind]}"/></svg>`;
 button.style.setProperty('--button-icon',`url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
}}
decorate();new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true,characterData:true});
