// Unit-test van de herkansing met tijdreizen (nep-R2 in geheugen, nep-fetch). node cron-test.mjs
import {bewaar,herkansing,wacht,MAX_POGINGEN} from '../durable.js';
const store=new Map();
const FIEN={async put(k,v,o){store.set(k,{v,m:o?.customMetadata||{}})},async get(k){const x=store.get(k);return x?{json:async()=>JSON.parse(x.v)}:null},
 async list({prefix}){return{objects:[...store.keys()].filter(k=>k.startsWith(prefix)).map(k=>({key:k,customMetadata:store.get(k).m})),truncated:false}}};
let code=503,results=new Set(),hits=[];
globalThis.fetch=async(url,o)=>{if(String(url).startsWith('http://hook')){hits.push(JSON.parse(o.body));return{status:code,ok:code<300}}
 const id=String(url).match(/(FA-[A-Z0-9]+)\.json/)[1];return{ok:results.has(id),status:results.has(id)?200:404}};
const env={FIEN,FIEN_WEBHOOK_URL:'http://hook',FIEN_WEBHOOK_KEY:'k',PIN:'0709',RESULTS_BASES:'http://res'};
const sign=async id=>'https://relay/foto/'+id+'?sig=x';let ok=0,bad=0;const t=(n,c)=>{c?ok++:bad++;console.log((c?'PASS ':'FAIL ')+n)};
const T0=Date.parse('2026-11-18T15:54:00Z'),H=3600e3,get=id=>JSON.parse(store.get('req/'+id+'.json').v);
// Scenario 18-nov: webhook gaf 2xx maar er kwam geen resultaat (tegoed op)
await bewaar(env,{id:'FA-A',payload:{id:'FA-A',idee:'fondue'},foto:true,status:'doorgestuurd',ontvangen:new Date(T0).toISOString(),pogingen:[{t:'',code:200}],volgende:T0+wacht('doorgestuurd',1)});
// Scenario webhook stuk
await bewaar(env,{id:'FA-B',payload:{id:'FA-B',idee:'taart'},status:'mislukt',ontvangen:new Date(T0).toISOString(),pogingen:[{t:'',code:503}],volgende:T0+wacht('mislukt',1)});
await bewaar(env,{id:'FA-C',payload:{},status:'droog',pogingen:[],volgende:0});
let l=await herkansing(env,sign,T0+20*60e3);t('na 20 min: niets',l.length===0&&hits.length===0);
l=await herkansing(env,sign,T0+31*60e3);t('na 31 min: alleen B opnieuw',l.join()==='FA-B:mislukt#2'&&hits.length===1&&hits[0].herkansing&&hits[0].poging===2&&hits[0].pin==='0709');
l=await herkansing(env,sign,T0+2*H+60e3);t('na 2u: A opnieuw met verse fotolink, B (wacht 1u) ook',l.includes('FA-A:mislukt#2')&&l.includes('FA-B:mislukt#3')&&hits.find(h=>h.id==='FA-A').fotoLink.includes('/foto/FA-A'));
code=200;l=await herkansing(env,sign,T0+10*H);t('tegoed terug: beide doorgestuurd',get('FA-A').status==='doorgestuurd'&&get('FA-B').status==='doorgestuurd');
results.add('FA-A');results.add('FA-B');const n=hits.length;l=await herkansing(env,sign,T0+30*H);
t('resultaat staat er: klaar, geen nieuwe poging',get('FA-A').status==='klaar'&&get('FA-B').status==='klaar'&&hits.length===n);
l=await herkansing(env,sign,T0+300*H);t('klaar blijft klaar, droog nooit',l.length===0&&get('FA-C').status==='droog');
// max pogingen
code=500;await bewaar(env,{id:'FA-D',payload:{id:'FA-D'},status:'mislukt',ontvangen:'',pogingen:[],volgende:0});
for(let i=0;i<20;i++)await herkansing(env,sign,T0+i*24*H);t('max '+MAX_POGINGEN+' pogingen -> opgegeven',get('FA-D').status==='opgegeven'&&get('FA-D').pogingen.length===MAX_POGINGEN);
t('wachttijden', [1,2,3,4,5,6].map(n=>wacht('mislukt',n)/60e3).join()==='30,60,120,240,480,720'&&[1,2,3,4].map(n=>wacht('doorgestuurd',n)/H).join()==='2,4,8,12');
console.log(`== ${ok} pass, ${bad} fail`);process.exit(bad?1:0);
