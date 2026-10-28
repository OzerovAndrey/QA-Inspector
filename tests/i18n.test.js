import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {languages,translateText} from '../extension/i18n.js';
const read=language=>JSON.parse(fs.readFileSync(new URL('../extension/locales/'+language+'.json',import.meta.url),'utf8'));
test('all eight selectable languages have matching catalog coverage',()=>{
 assert.equal(languages.length,8);const keys=Object.keys(read('en')).sort();
 for(const [language]of languages.filter(([id])=>id!=='uk')){const catalog=read(language);assert.deepEqual(Object.keys(catalog).sort(),keys);for(const [source,value]of Object.entries(catalog)){assert.ok(value.trim());assert.deepEqual([...source.matchAll(/\{\d+\}/g)].map(x=>x[0]).sort(),[...value.matchAll(/\{\d+\}/g)].map(x=>x[0]).sort());}}
});
test('UI templates preserve counts and user supplied design names',()=>{
 const en=read('en');assert.equal(translateText('Обрати компонент',en),'Select component');
 assert.equal(translateText('Перевірено 10 елементів. З відхиленнями: 3.',en),'Checked 10 elements. With differences: 3.');
 assert.equal(translateText('Порівняння з Мій макет / xl',en),'Compared with Мій макет / xl');
 assert.equal(translateText('rgb(255, 0, 0)',en),'rgb(255, 0, 0)');
});
