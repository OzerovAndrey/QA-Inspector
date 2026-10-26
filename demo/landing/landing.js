let errors=true;
document.querySelector('form').addEventListener('submit',event=>event.preventDefault());
document.getElementById('theme').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';document.getElementById('theme').textContent='Тема: '+(dark?'Dark':'Light');};
document.getElementById('errors').onclick=()=>{errors=!errors;document.querySelectorAll('[id$="-bad"]').forEach(el=>el.classList.toggle('fault',errors));document.getElementById('errors').textContent=errors?'Прибрати помилки':'Показати помилки';document.getElementById('state').textContent=errors?'8 навмисних конфліктів · 1 непорівнюваний фон':'0 конфліктів · 1 непорівнюваний фон';};
