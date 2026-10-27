'use strict';
/* ---------- Kookmodus, onboarding, opslag-check (Fien v5) ---------- */
const TIMRE=/(\d+)\s*(?:[–-]\s*(\d+)\s*)?(min(?:uten|uut)?|uur)\b/i;
function timersFrom(text,tm){if(tm)return tm;const m=(text||'').match(TIMRE);if(!m)return null;const f=/uur/i.test(m[3])?60:1;const a=+m[1]*f,b=m[2]?+m[2]*f:0;const L=x=>x>=60?(x/60)+' uur':x+' min';return b?[[a,L(a)],[b,L(b)]]:[[a,L(a)]]}
function stepsFromSession(s){return slots(s).filter(x=>x.fase!=null).map(x=>({verb:x.t.replace(/^\d+\.\s*/,''),text:x.d.replace(/\s*📸.*$/,''),tip:x.tip||'',fase:(s&&s.fasen?s.fasen:FASES)[x.fase],tm:timersFrom(x.d,x.tm)}))}
function stepsFromRecipe(r){return r.steps.map((s,i)=>({verb:s.verb,text:s.text,tip:s.tip?`${TI[s.type]||'💡'} ${s.type}: ${s.tip}`:'',fase:'FASE '+(Math.floor(i/3)+1)+' · '+(r.fases[Math.floor(i/3)]?.naam||'').toUpperCase(),tm:timersFrom(s.text)}))}
let K=null,KWL=null;
async function wake(){try{KWL=await navigator.wakeLock?.request('screen')}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(K&&document.visibilityState=='visible')wake()});
async function kookOpen(src,rid){let steps,title,key;
 if(src=='rec'){const r=(await recipes()).find(x=>x.id==rid);if(!r)return;steps=stepsFromRecipe(r);title=r.title||'Recept';key='rec:'+r.id}
 else{const s=await cur();steps=stepsFromSession(s);title=s?s.name:'Boterkoek';key='sess:'+(s?s.id:'x')}
 K={steps,title,key,i:(await get('kookpos:'+key))||0};if(K.i>=steps.length)K.i=0;wake();kookR()}
function kookClose(){K=null;try{KWL&&KWL.release()}catch(e){}KWL=null;$('#kook')?.remove();document.body.style.overflow=''}
function kookGo(d){if(!K)return;const n=K.i+d;if(n<0)return;if(n>K.steps.length){return}K.i=n;put('kookpos:'+K.key,Math.min(n,K.steps.length-1));navigator.vibrate?.(15);kookR()}
function kookR(){let el=$('#kook');if(!el){el=document.createElement('div');el.id='kook';el.setAttribute('role','dialog');el.setAttribute('aria-label','Kookmodus');document.body.appendChild(el);document.body.style.overflow='hidden';
  let x0=null;el.addEventListener('touchstart',e=>x0=e.touches[0].clientX,{passive:true});el.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>70)kookGo(dx<0?1:-1)})}
 const N=K.steps.length;
 if(K.i>=N){el.innerHTML=`<div class="kt"><button class="kx" onclick="kookClose()" aria-label="Sluiten">✕</button></div><div class="kb" style="text-align:center"><img src="img/fien-trots-160w.webp" width="120" height="120" alt="" style="border-radius:50%"><h1 style="font-size:40px">Klaar! 🎉</h1><p class="hand" style="font-size:30px">Proud Disaster™ of Pinterest-perfect: elke hap telt.</p><h2>Chaos Level 🥄</h2><div class="row" style="justify-content:center">${[1,2,3,4,5].map(n=>`<button class="btn s kc" onclick="chaosSet(${n})" aria-label="Chaos level ${n}">${'🥄'.repeat(n)}</button>`).join('')}</div><p id="kcm"></p></div><div class="kf"><button class="btn s kn" onclick="kookGo(-1)">◀ Terug</button><button class="btn kn" onclick="kookClose()">Sluiten</button></div>`;return}
 const s=K.steps[K.i];
 el.innerHTML=`<div class="kt"><div class="grow"><small style="color:#E6F4F2">${esc(K.title)} · ${esc(s.fase||'')}</small><div class="kp">${K.steps.map((_,j)=>`<i class="${j<=K.i?'on':''}"></i>`).join('')}</div></div><button class="kx" onclick="kookClose()" aria-label="Kookmodus sluiten">✕</button></div>
 <div class="kb"><div class="kn1">Stap ${K.i+1} van ${N}</div><h1 class="kv">${esc(s.verb||'…')}</h1><p class="ktx">${esc(s.text)}</p>${s.tip?`<div class="note" style="font-size:19px">${esc(s.tip)}</div>`:''}
 ${s.tm?`<div class="row" style="margin-top:14px">${s.tm.map(([m,l])=>`<button class="btn p kn" onclick="startT(${m},'${esc(K.title)}: ${esc(l)}')">⏲️ ${esc(l)}</button>`).join('')}</div>`:''}
 <div class="big" id="ktm" aria-live="polite">${T.end?'':''}</div></div>
 <div class="kf"><button class="btn s kn" onclick="kookGo(-1)" ${K.i?'':'disabled'}>◀ Terug</button><button class="btn kn" onclick="kookGo(1)">${K.i==N-1?'Klaar 🎉':'Volgende ▶'}</button></div>`;tick()}
async function chaosSet(n){const l=await get('chaos')||[];l.push({t:K.title,n,d:new Date().toISOString()});await put('chaos',l);$('#kcm').textContent='Opgeslagen: Chaos Level '+'🥄'.repeat(n)+'. Knoeien = winnen!'}
/* onboarding in 3 kaarten */
const ONB=[['fien-hero-320w.webp','Hoi Suzan, ik ben Fien!','Jouw keukenhulp voor The Bubbly Bakery. Alles wat je maakt blijft op deze telefoon. Niets gaat vanzelf online.'],
['fien-in-actie-320w.webp','Bakken met meelhanden','Tik op 👩‍🍳 <b>Kookmodus</b>: één stap per scherm, grote letters, vegen of tikken voor de volgende stap. Het scherm blijft aan en de timer zit erin.'],
['fien-denken-160w.webp','Recepten & delen','Vraag Fien om een idee, of plak zelf een recept. Ik zet het in 3 fasen × 3 stappen. Klaar? Eén ZIP voor Gabriël. Allergenen check jij altijd zelf.']];
let OB=0;function onbR(){let el=$('#onb');if(!el){el=document.createElement('div');el.id='onb';el.setAttribute('role','dialog');document.body.appendChild(el)}const [img,h,p]=ONB[OB];
 el.innerHTML=`<div class="card" style="max-width:420px;margin:auto;text-align:center"><img src="img/${img}" alt="" width="120" height="120" style="border-radius:50%;object-fit:cover;background:#fff"><h2 style="font-size:26px">${h}</h2><p style="font-size:18px">${p}</p><div class="kp" style="justify-content:center;margin:10px 0">${ONB.map((_,j)=>`<i class="${j<=OB?'on':''}"></i>`).join('')}</div>
 <div class="row" style="justify-content:center"><button class="btn s" onclick="onbDone()">Overslaan</button><button class="btn" onclick="OB<2?(OB++,onbR()):onbDone()">${OB<2?'Volgende ▶':'Aan de slag! 🎉'}</button></div></div>`}
async function onbDone(){await put('onb',1);$('#onb')?.remove()}
function onbShow(){OB=0;onbR()}
(async()=>{if(!(await get('onb')))onbR()})();
/* opslag + backup-herinnering */
async function storageCard(){let est={};try{est=await navigator.storage?.estimate()||{}}catch(e){}const mb=x=>Math.round((x||0)/1048576);const u=mb(est.usage),q=mb(est.quota);
 const n=await tx('files','readonly',s=>s.count());const last=await get('lastExport');const days=last?Math.floor((Date.now()-last)/864e5):null;
 const warn=q&&(est.usage/est.quota>.7||u>800);const remind=n>0&&(days==null||days>=2);
 if(!warn&&!remind)return `<small>💾 ${u} MB in gebruik${q?' van ~'+q+' MB':''} · ${n} bestanden</small>`;
 return `<div class="note" style="${warn?'background:#FFE9C7;border-color:#C76B00':''}">${warn?`⚠️ Je telefoonopslag voor Fien raakt vol (${u} van ~${q} MB). Maak een ZIP en verwijder daarna oude sessies.<br>`:''}${remind?`💾 ${days==null?'Je hebt nog geen back-up gemaakt':'Laatste back-up: '+days+' dagen geleden'} (${n} bestanden staan alleen op deze telefoon). <button class="btn s" style="margin-top:6px" onclick="exportZip()">📦 Nu exporteren</button>`:''}</div>`}
/* foto's kleiner maken voor de ZIP (origineel blijft op de telefoon) */
async function shrink(f){if(!/^image\/(jpeg|png|webp|heic)/.test(f.type||'')||f.blob.size<500e3||!window.createImageBitmap)return null;
 try{const b=await createImageBitmap(f.blob);const s=Math.min(1,1600/Math.max(b.width,b.height));const c=document.createElement('canvas');c.width=Math.round(b.width*s);c.height=Math.round(b.height*s);c.getContext('2d').drawImage(b,0,0,c.width,c.height);b.close?.();
 const o=await new Promise(ok=>c.toBlob(ok,'image/jpeg',.82));return o&&o.size<f.blob.size?o:null}catch(e){return null}}
