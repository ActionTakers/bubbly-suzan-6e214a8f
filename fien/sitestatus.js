'use strict';
/* ---------- v15: per recept één label voor Suzan ----------
   Alleen in Fien      = staat alleen in de app (standaard)
   Klaar voor de site  = siteStatus 'klaar' in ai-results/<FA-id>.json (of 'online' maar nog niet echt op de site)
   Staat online        = alleen als het recept een siteSlug heeft én die slug echt in de lijst van bubblybakery.nl staat.
   De lijst komt uit site-recepten.json (gemaakt uit https://bubblybakery.nl/sitemap.xml door tools/site-recepten.py). Nooit aannemen. */
const SITE_ST={online:'Staat online',klaar:'Klaar voor de site',alleen:'Alleen in Fien'};
const SLUG_OK=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
let SLIVE=null,SLIVE_T='',SLIVE_FOUT=false,SLIVE_BUSY=null,SFILT=null,SSYNC=false;
function siteLoad(){if(SLIVE_BUSY)return SLIVE_BUSY;
 SLIVE_BUSY=fetch(new URL('site-recepten.json',document.baseURI).href,{cache:'no-store',headers:{Accept:'application/json'}})
  .then(r=>{if(!r.ok)throw Error('http '+r.status);return r.json()})
  .then(j=>{const l=Array.isArray(j.recepten)?j.recepten.filter(s=>typeof s=='string'&&SLUG_OK.test(s)):[];if(!l.length)throw Error('leeg');SLIVE=new Set(l);SLIVE_T=String(j.gecheckt||'');SLIVE_FOUT=false})
  .catch(()=>{SLIVE=null;SLIVE_FOUT=true})
  .then(()=>{if(typeof tab!='undefined'&&tab==='rec'&&!RID&&!PID)aiRefresh()});
 return SLIVE_BUSY}
function siteSt(r){if(r.siteSlug&&SLIVE&&SLIVE.has(r.siteSlug))return 'online';if(r.siteStatus==='klaar'||r.siteStatus==='online')return 'klaar';return 'alleen'}
/* zelfde naam als een recept op de site, maar niet aan elkaar gekoppeld: alleen een rustige opmerking, geen 'online' */
function siteNaam(r){if(!SLIVE||siteSt(r)==='online')return false;const s=slugify(r.title);return !!s&&SLIVE.has(s)}
const sitePick=(j)=>({siteStatus:['klaar','online'].includes(j.siteStatus)?j.siteStatus:undefined,siteSlug:SLUG_OK.test(String(j.siteSlug||''))?j.siteSlug:undefined});
/* Eén keer per keer openen: siteStatus/siteSlug van Fien-recepten opnieuw lezen uit ai-results (alleen lezen). */
async function siteSync(){if(SSYNC)return;SSYNC=true;const patches={};
 for(const r of await recipes()){const id=r.fienai&&r.fienai.verzoek;if(!id||!AI_ID.test(id))continue;
  try{const j=await aiFetchResult(id);if(!j)continue;const p=sitePick(j);if(r.siteStatus!==p.siteStatus||r.siteSlug!==p.siteSlug)patches[r.id]=p}catch(e){}}
 if(!Object.keys(patches).length)return;
 const l=await recipes();l.forEach(r=>{const p=patches[r.id];if(!p)return;['siteStatus','siteSlug'].forEach(k=>{if(p[k]===undefined)delete r[k];else r[k]=p[k]})});await put('recipes',l);
 if(tab==='rec'&&!RID&&!PID)aiRefresh()}
function siteWhen(t){const d=new Date(t);return Number.isNaN(+d)?'':d.toLocaleDateString('nl-NL',{day:'numeric',month:'long'})}
function sitePill(r){const k=siteSt(r);return `<span class="st-pill ${k}">${SITE_ST[k]}</span>`}
/* kop boven de receptenlijst: uitleg, telling en (als het iets toevoegt) een filter */
function siteHead(l){siteLoad();siteSync();if(!l.length)return '';
 const n={online:0,klaar:0,alleen:0};l.forEach(r=>n[siteSt(r)]++);
 let tel;if(!SLIVE&&!SLIVE_FOUT)tel='Even kijken wat er online staat…';
 else{const p=[n.online?n.online+' online':'Nog niets online'];if(n.klaar)p.push(n.klaar+' klaar voor de site');if(n.alleen)p.push(n.alleen+' alleen in Fien');tel=p.join(' · ')}
 const oud=SLIVE&&SLIVE_T&&Date.now()-Date.parse(SLIVE_T)>10*864e5?` <small>(gecheckt op ${esc(siteWhen(SLIVE_T))})</small>`:'';
 const fout=SLIVE_FOUT?'<p class="st-fout">Ik kon de site nu niet bekijken. Probeer het straks nog eens.</p>':'';
 const soorten=Object.keys(n).filter(k=>n[k]);if(SFILT&&!n[SFILT])SFILT=null;
 const filt=soorten.length>1?`<div class="st-filt" role="group" aria-label="Laat zien">${[[null,'Alles',l.length],...soorten.map(k=>[k,SITE_ST[k],n[k]])].map(([k,t,c])=>`<button type="button" class="st-chip ${SFILT===k?'on':''}" aria-pressed="${SFILT===k}" onclick="SFILT=${k?`'${k}'`:'null'};render()">${t} <b>${c}</b></button>`).join('')}</div>`:'';
 return `<p class="st-uitleg">Zo zie je wat bezoekers wel en niet zien.</p><p class="st-tel">${tel}${oud}</p>${fout}${filt}`}
const siteFilter=l=>SFILT?l.filter(r=>siteSt(r)===SFILT):l;
