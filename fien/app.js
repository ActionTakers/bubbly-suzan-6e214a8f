'use strict';
/* ---------- opslag (alleen op dit toestel) ---------- */
let db;const DB=()=>db?Promise.resolve(db):new Promise((ok,no)=>{const r=indexedDB.open('fien',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('kv');const f=d.createObjectStore('files',{keyPath:'id',autoIncrement:true});f.createIndex('s','sid')};r.onsuccess=()=>ok(db=r.result);r.onerror=()=>no(r.error)});
const tx=(s,m,fn)=>DB().then(d=>new Promise((ok,no)=>{const t=d.transaction(s,m);const r=fn(t.objectStore(s));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error)}));
const get=k=>tx('kv','readonly',s=>s.get(k));const put=(k,v)=>tx('kv','readwrite',s=>s.put(v,k));
const addFile=f=>tx('files','readwrite',s=>s.add(f));const delFile=id=>tx('files','readwrite',s=>s.delete(id));
const filesOf=sid=>tx('files','readonly',s=>s.index('s').getAll(sid));
const $=s=>document.querySelector(s);const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const today=()=>{const d=new Date();return d.getDate()+'-'+(d.getMonth()+1)};
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();

/* ---------- preset Boterkoek ---------- */
const STAPPEN=['Wegen','Boter + suiker mengen','Ei erbij','Bloem erdoor','In de vorm','Patroon erin trekken','Insmeren met ei','Oven in','Oven uit'];
function slots(){const L=[{k:'setup',t:'Klaarzetten',d:'Telefoon staand (9:16), daglicht van opzij, geen flits. Werkblad leeg, rustige ondergrond.',need:[],check:true},
{k:'ingr',t:'Alle ingrediënten',d:'Eén foto van alles bij elkaar, verpakkingen zichtbaar (voor de lijst; jij checkt de allergenen altijd zelf).',need:['foto']}];
STAPPEN.forEach((s,i)=>L.push({k:'stap'+(i+1),t:'Stap '+(i+1)+': '+s,d:'Eén foto van bovenaf, een clip van 3–5 sec en een korte notitie (wat, hoe lang, hoe warm).',need:['foto','clip','notitie']}));
L.push({k:'knoei',t:'Knoeimoment 🎉',d:'Eén leuk foutje of knoeimoment. Knoeien = winnen!',need:['clip']},
{k:'heel',t:'Hele boterkoek',d:'Foto van de hele koek.',need:['foto']},{k:'close',t:'Close-up gesneden stuk',d:'Dichtbij, mooi kruim.',need:['foto']},
{k:'bord',t:'Stuk op een bordje',d:'Eén stuk op een bordje.',need:['foto']},{k:'snij',t:'Snijden of eerste hap',d:'Korte video.',need:['clip']},
{k:'selfie',t:'Jij met de boterkoek (mag)',d:'Alleen als je dat wilt.',need:[],opt:['foto']},{k:'notes',t:'Notities',d:'Hoeveel stuks, tips, wat beter kan.',need:['notitie']});return L}

/* ---------- navigatie ---------- */
const TABS=[['home','🏠','Start'],['bak','📸','Bakken'],['besl','🃏','Besluiten'],['plan','⏰','Planning'],['content','✍️','Content']];
let tab='home';function go(t){tab=t;render();scrollTo(0,0)}
function navR(){$('#nav').innerHTML=TABS.map(([k,i,l])=>`<button class="${k==tab?'on':''}" onclick="go('${k}')"><b>${i}</b>${l}</button>`).join('')}
async function render(){navR();const v=$('#view');v.innerHTML=await VIEWS[tab]();VIEWS[tab].after&&VIEWS[tab].after()}

const TIPS=['Rustig aan: één stap tegelijk, ik vink mee af.','Daglicht van opzij maakt boterkoek extra goudbruin op foto.','Knoeien = winnen. Bakken = feestje.','Een korte notitie na elke stap scheelt later veel zoeken.','Liever drie echte foto’s dan tien perfecte.','Even pauze? De timer houdt de oven voor je in de gaten.'];
const tipLine=()=>`<div class="card row"><img src="img/fien-blij-160w.webp" width="48" height="48" style="border-radius:50%"><div class="grow"><b>Fien tipt:</b> ${TIPS[Math.floor(Date.now()/36e5)%TIPS.length]}</div></div>`;
const PRIV=`<div class="note">🔒 Alles blijft op deze telefoon. Er wordt <b>niets automatisch geüpload</b>. Jij kiest zelf wanneer je iets deelt (WhatsApp, Drive of downloaden).</div>`;
const ALLERG=`<small>Allergenen check jij altijd zelf; Fien geeft daar geen garanties over.</small>`;

/* ---------- Start ---------- */
const VIEWS={};
VIEWS.home=async()=>{const s=await cur();const p=s?await progress(s):null;const tasks=(await get('tasks')||[]).filter(t=>!t.done).sort((a,b)=>a.d>b.d?1:-1).slice(0,3);
return `${tipLine()}<div class="card"><h2>Bakken</h2>${s?`<p><b>${esc(s.name)}</b></p><div class="bar"><i style="width:${p.pct}%"></i></div><small>${p.done} van ${p.tot} onderdelen klaar</small><p class="row"><button class="btn" onclick="go('bak')">Verder bakken</button><button class="btn s" onclick="exportZip()">📦 Exporteren</button></p>`:`<p>Nog geen baksessie.</p><input id="sn" value="Boterkoek ${today()}"><p></p><button class="btn" onclick="newSession()">Start Boterkoek</button>`}</div>
<div class="card"><h2>Wat wanneer</h2>${tasks.length?tasks.map(t=>`<div>📌 ${esc(t.d)} — ${esc(t.t)}</div>`).join(''):'<small>Geen open taken.</small>'}<p><button class="btn s" onclick="go('plan')">Naar planning & timer</button></p></div>
<div class="card"><h2>Hoe voel je je vandaag?</h2><button class="btn p" onclick="go('content');setTimeout(()=>document.getElementById('jr')?.scrollIntoView(),50)">📓 Dagboek</button></div>
${PRIV}<p class="hand" style="text-align:center">Knoeien = winnen. Bakken = feestje.</p><p style="text-align:center">${ALLERG}</p>`};

/* ---------- Baksessie ---------- */
async function cur(){const id=await get('cur');return id?get('sess:'+id):null}
async function newSession(){const name=(document.getElementById('sn')?.value||'').trim()||'Boterkoek '+today();const id=Date.now().toString(36);await put('sess:'+id,{id,name,preset:'boterkoek',notes:{},checks:{},created:new Date().toISOString()});const l=await get('sessions')||[];l.push(id);await put('sessions',l);await put('cur',id);go('bak')}
async function progress(s){const fs=await filesOf(s.id);let done=0;const L=slots();L.forEach(x=>{if(slotDone(x,s,fs))done++});return{done,tot:L.length,pct:Math.round(done/L.length*100),fs}}
function have(x,s,fs,n){if(n=='notitie')return !!(s.notes[x.k]||'').trim()||fs.some(f=>f.slot==x.k&&f.kind=='spraak');return fs.some(f=>f.slot==x.k&&f.kind==n)}
function slotDone(x,s,fs){if(x.check)return !!s.checks[x.k];if(!x.need.length)return fs.some(f=>f.slot==x.k)||!!s.checks[x.k];return x.need.every(n=>have(x,s,fs,n))}
let urls=[];
VIEWS.bak=async()=>{const s=await cur();if(!s)return `<div class="card"><h2>Nieuwe baksessie</h2><p>Eerste recept: <b>Boterkoek</b>, 10 stappen voor alle foto’s en filmpjes.</p><input id="sn" value="Boterkoek ${today()}"><p></p><button class="btn" onclick="newSession()">Start Boterkoek</button></div>${PRIV}`;
urls.forEach(URL.revokeObjectURL);urls=[];const p=await progress(s);
const list=(await get('sessions')||[]);const others=(await Promise.all(list.map(i=>get('sess:'+i)))).filter(Boolean);
return `<div class="card"><div class="row"><h2 class="grow">${esc(s.name)}</h2><select style="width:auto" onchange="switchS(this.value)">${others.map(o=>`<option value="${o.id}" ${o.id==s.id?'selected':''}>${esc(o.name)}</option>`).join('')}<option value="__new">+ Nieuwe sessie</option></select></div>
<div class="bar"><i style="width:${p.pct}%"></i></div><small>${p.done}/${p.tot} klaar</small></div>
${slots().map(x=>slotCard(x,s,p.fs)).join('')}
<div class="card"><h2>📦 Klaar? Deel alles in één keer</h2><p>Ik maak één ZIP <b>“${esc(s.name)}.zip”</b> met alle foto’s, filmpjes en notities.</p><button class="btn" onclick="exportZip()">Exporteren & delen</button><p id="zipmsg"></p>${PRIV}</div>`};
function slotCard(x,s,fs){const mine=fs.filter(f=>f.slot==x.k);const ok=slotDone(x,s,fs);const kinds=[...x.need,...(x.opt||[])];
const th=mine.map(f=>{const u=URL.createObjectURL(f.blob);urls.push(u);const del=`ondblclick="if(confirm('Verwijderen?'))delFile(${f.id}).then(render)"`;return f.kind=='foto'?`<img src="${u}" ${del} title="dubbeltik = verwijderen">`:f.kind=='clip'?`<video src="${u}" muted playsinline ${del}></video>`:`<audio src="${u}" controls style="width:180px"></audio>`}).join('');
return `<div class="card step ${ok?'done':''}"><div class="row"><h3 class="grow" style="font-size:17px">${ok?'✅':'⬜️'} ${x.t}</h3></div><small>${x.d}</small>
<div>${kinds.map(n=>`<span class="chk ${have(x,s,fs,n)?'ok':''}">${n}</span>`).join('')}</div>
<div class="row" style="margin-top:8px">${x.check?`<button class="btn ${s.checks[x.k]?'s':''}" onclick="chk('${x.k}')">${s.checks[x.k]?'✓ Gedaan':'Gedaan'}</button>`:''}
${kinds.includes('foto')?`<label class="btn">📷 Foto<input type="file" accept="image/*" capture="environment" class="hidden" onchange="grab(this,'${x.k}','foto')"></label>`:''}
${kinds.includes('clip')?`<label class="btn">🎬 Clip<input type="file" accept="video/*" capture="environment" class="hidden" onchange="grab(this,'${x.k}','clip')"></label>`:''}
${kinds.includes('notitie')?`<button class="btn s" onclick="rec(this,'${x.k}')">🎙️ Spraak</button>`:''}</div>
${kinds.includes('notitie')?`<textarea placeholder="Notitie, bv. 25 min op 180 graden" onchange="note('${x.k}',this.value)">${esc(s.notes[x.k]||'')}</textarea>`:''}
<div class="thumbs">${th}</div></div>`}
async function switchS(v){if(v=='__new'){await put('cur',null);return render()}await put('cur',v);render()}
async function chk(k){const s=await cur();s.checks[k]=!s.checks[k];await put('sess:'+s.id,s);render()}
async function note(k,v){const s=await cur();s.notes[k]=v;await put('sess:'+s.id,s);navR()}
async function grab(inp,k,kind){const s=await cur();for(const f of inp.files)await addFile({sid:s.id,slot:k,kind,blob:f,name:f.name,type:f.type,t:Date.now()});render()}
let mr=null;async function rec(b,k){if(mr){mr.stop();return}
 try{const st=await navigator.mediaDevices.getUserMedia({audio:true});const ch=[];mr=new MediaRecorder(st);mr.ondataavailable=e=>ch.push(e.data);
 mr.onstop=async()=>{st.getTracks().forEach(t=>t.stop());const blob=new Blob(ch,{type:mr.mimeType||'audio/webm'});mr=null;const s=await cur();await addFile({sid:s.id,slot:k,kind:'spraak',blob,type:blob.type,t:Date.now()});render()};
 mr.start();b.textContent='⏹️ Stop opname';b.classList.add('p')}catch(e){alert('Microfoon lukt niet. Typ de notitie gewoon even.')}}

async function exportZip(){const s=await cur();if(!s)return;const m=$('#zipmsg');if(m)m.textContent='Even inpakken…';
 if(!window.JSZip){alert('ZIP-hulp nog niet geladen; controleer internet en probeer opnieuw.');return}
 const z=new JSZip();const fs=await filesOf(s.id);const L=slots();const ext=t=>(t||'').split('/')[1]?.split(';')[0].replace('quicktime','mov').replace('jpeg','jpg')||'bin';
 const cnt={};fs.forEach(f=>{const i=L.findIndex(x=>x.k==f.slot);const dir=String(i).padStart(2,'0')+'-'+f.slot;cnt[dir+f.kind]=(cnt[dir+f.kind]||0)+1;z.file(`${dir}/${f.kind}-${cnt[dir+f.kind]}.${ext(f.type)}`,f.blob)});
 let txt=`${s.name}\nGemaakt met Fien (alleen lokaal opgeslagen)\n\n`;L.forEach((x,i)=>{txt+=`${String(i).padStart(2,'0')} ${x.t}: ${slotDone(x,s,fs)?'klaar':'nog open'}\n`;if(s.notes[x.k])txt+=`   notitie: ${s.notes[x.k]}\n`});
 z.file('notities.txt',txt);const blob=await z.generateAsync({type:'blob'});const name=s.name+'.zip';const file=new File([blob],name,{type:'application/zip'});
 if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:s.name,text:'Bubbly assets: '+s.name});if(m)m.textContent='Gedeeld ✅';return}catch(e){if(e.name=='AbortError'){if(m)m.textContent='';return}}}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();if(m)m.textContent='Gedownload ✅ ('+Math.round(blob.size/1024)+' kB)'}

/* ---------- Besluiten ---------- */
const VOORBEELD=[{id:'v1',q:'Voorbeeld: boterkoek-post op zaterdag om 10:00?',ex:1},{id:'v2',q:'Voorbeeld: het knoeimoment als story gebruiken?',ex:1},{id:'v3',q:'Voorbeeld: receptkaart met 9 stapfoto’s in plaats van 4?',ex:1}];
VIEWS.besl=async()=>{const c=await get('cards')||VOORBEELD;const a=await get('ans')||{};
return `<div class="card"><h2>Besluiten</h2><small>Veeg naar rechts = Eens, links = Niet eens. Of tik op een knop.</small></div>
${c.map(x=>`<div class="card swipe" data-id="${x.id}">${x.ex?'<span class="tag">VOORBEELD</span>':''}<h3 style="font-size:17px">${esc(x.q)}</h3>
<div class="row">${['Eens','Aanpassen','Niet eens'].map(o=>`<button class="btn ${a[x.id]?.k==o?'':'s'}" onclick="ans('${x.id}','${o}')">${o}</button>`).join('')}</div>
<textarea placeholder="Opmerking (mag leeg)" onchange="ansC('${x.id}',this.value)">${esc(a[x.id]?.c||'')}</textarea></div>`).join('')}
<div class="card"><input id="nq" placeholder="Eigen vraag toevoegen"><p class="row"><button class="btn s" onclick="addQ()">+ Toevoegen</button><button class="btn" onclick="copyA()">📋 Kopieer antwoorden</button></p><small id="cpm"></small></div>`};
VIEWS.besl.after=()=>document.querySelectorAll('.swipe').forEach(el=>{let x0=null;el.addEventListener('touchstart',e=>x0=e.touches[0].clientX,{passive:true});
 el.addEventListener('touchmove',e=>{if(x0!=null)el.style.transform=`translateX(${(e.touches[0].clientX-x0)/3}px)`},{passive:true});
 el.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-x0;el.style.transform='';x0=null;if(Math.abs(dx)>90)ans(el.dataset.id,dx>0?'Eens':'Niet eens')})});
async function ans(id,k){const a=await get('ans')||{};a[id]={...(a[id]||{}),k};await put('ans',a);render()}
async function ansC(id,c){const a=await get('ans')||{};a[id]={...(a[id]||{}),c};await put('ans',a)}
async function addQ(){const q=$('#nq').value.trim();if(!q)return;const c=await get('cards')||VOORBEELD;c.push({id:'q'+Date.now(),q});await put('cards',c);render()}
async function copyA(){const c=await get('cards')||VOORBEELD,a=await get('ans')||{};const t='Antwoorden Suzan ('+today()+')\n'+c.map(x=>`- ${x.q}: ${a[x.id]?.k||'—'}${a[x.id]?.c?' ('+a[x.id].c+')':''}`).join('\n');
 try{await navigator.clipboard.writeText(t);$('#cpm').textContent='Gekopieerd ✅ Plak het in WhatsApp.'}catch(e){prompt('Kopieer dit:',t)}}

/* ---------- Planning + timer ---------- */
let T={end:0,iv:null,label:''};
VIEWS.plan=async()=>{const ts=(await get('tasks')||[]).sort((a,b)=>a.d>b.d?1:-1);
return `<div class="card"><h2>⏲️ Keukentimer</h2><div class="big" id="tm">${T.end?'':'00:00'}</div><div style="text-align:center" id="tl">${esc(T.label)}</div>
<div class="row" style="justify-content:center">${[['Boterkoek: 25 min op 180°',25],['Afkoelen 15 min',15],['Deeg rusten 30 min',30],['5 min',5]].map(([l,m])=>`<button class="btn s" onclick="startT(${m},'${l}')">${l}</button>`).join('')}</div>
<div class="row" style="margin-top:8px"><input id="tmin" type="number" min="1" placeholder="Minuten" class="grow" style="width:auto"><button class="btn" onclick="startT(+$('#tmin').value,'Eigen timer')">Start</button><button class="btn p" onclick="stopT()">Stop</button></div>
<small>Laat het scherm aan staan; op de achtergrond kan de telefoon het geluid pauzeren.</small></div>
<div class="card"><h2>📅 Wat wanneer</h2><div class="row"><input id="td" type="date" style="width:auto"><input id="tt" class="grow" style="width:auto" placeholder="Taak, bv. foto’s naar Gabriël"><button class="btn" onclick="addT()">+</button></div>
${ts.map((t,i)=>`<div class="row" style="margin-top:6px"><input type="checkbox" style="width:auto" ${t.done?'checked':''} onchange="togT(${t.id})"><span class="grow" style="${t.done?'text-decoration:line-through;opacity:.6':''}">${esc(t.d||'')} — ${esc(t.t)}</span><button class="btn s" onclick="delT(${t.id})">✕</button></div>`).join('')||'<small>Nog geen taken.</small>'}</div>`};
VIEWS.plan.after=()=>tick();
function startT(m,l){if(!m)return;T.end=Date.now()+m*6e4;T.label=l;clearInterval(T.iv);T.iv=setInterval(tick,500);tick();try{navigator.wakeLock?.request('screen')}catch(e){}if(Notification?.permission=='default')Notification.requestPermission()}
function stopT(){clearInterval(T.iv);T.end=0;T.label='';beepStop();if(tab=='plan')render()}
function tick(){const el=$('#tm');if(!T.end)return;const r=Math.max(0,T.end-Date.now());if(el){el.textContent=String(Math.floor(r/6e4)).padStart(2,'0')+':'+String(Math.floor(r/1e3)%60).padStart(2,'0');$('#tl').textContent=T.label}
 if(r<=0){clearInterval(T.iv);T.iv=null;alarm()}}
let ac,bi;function alarm(){ac=ac||new (window.AudioContext||window.webkitAudioContext)();let n=0;bi=setInterval(()=>{const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=n%2?880:660;o.connect(g);g.connect(ac.destination);g.gain.setValueAtTime(.3,ac.currentTime);o.start();o.stop(ac.currentTime+.35);if(++n>40)beepStop()},500);
 navigator.vibrate?.([400,200,400,200,400]);try{new Notification('Fien: timer klaar!',{body:T.label})}catch(e){}setTimeout(()=>alert('⏰ '+T.label+' — klaar! Fien zegt: even kijken in de oven.'),50)}
function beepStop(){clearInterval(bi)}
async function addT(){const t=$('#tt').value.trim();if(!t)return;const l=await get('tasks')||[];l.push({id:Date.now(),d:$('#td').value,t});await put('tasks',l);render()}
async function togT(id){const l=await get('tasks')||[];l.forEach(t=>t.id==id&&(t.done=!t.done));await put('tasks',l);render()}
async function delT(id){await put('tasks',(await get('tasks')||[]).filter(t=>t.id!=id));render()}

/* ---------- Content ---------- */
const CAP=[n=>`Vers uit de oven: ${n}! Goudbruin, boterig en met liefde gebakken. 🧈✨ #bubblybakery`,n=>`Achter de schermen bij ${n}. Knoeien = winnen. Bakken = feestje. 🎉`,n=>`Stap voor stap ${n}: van wegen tot dat ruitjespatroon. Welke stap vind jij het leukst?`,n=>`Bak met liefde, niet met perfectie. Vandaag: ${n}. 💛`];
const STORY=['Story 1: ingrediënten-foto + poll “Raad wat ik ga bakken?”','Story 2: clip patroon erin trekken (slow-mo)','Story 3: knoeimoment met tekst “Knoeien = winnen!”','Story 4: snij-video + vraag “Wie wil een stukje?”','Story 5: selfie met de koek + “Recept komt eraan”'];
const MOODS=['😊','😌','😴','😤','🥳','😔'];
VIEWS.content=async()=>{const s=await cur();const n=s?s.name.replace(/\s*\d+-\d+$/,'').toLowerCase():'boterkoek';const blog=await get('blog')||[];const jr=await get('journal')||[];
return `<div class="card"><h2>📝 Caption-ideeën</h2><small>Sjablonen voor ${esc(s?s.name:'je volgende bak')}. Tik om te kopiëren, pas gerust aan.</small>${CAP.map(f=>`<p class="note" onclick="navigator.clipboard?.writeText(this.textContent);this.style.background='#CDEDE8'">${esc(f(n))}</p>`).join('')}</div>
<div class="card"><h2>📱 Story-idee</h2>${STORY.map(x=>`<div>• ${x}</div>`).join('')}</div>
<div class="card"><h2>💡 Blog-brainstorm</h2><div class="row"><input id="bi" class="grow" style="width:auto" placeholder="Idee, bv. ‘Waarom boterkoek altijd lukt’"><button class="btn" onclick="addB()">+</button></div>
${blog.map(b=>`<div class="row" style="margin-top:6px"><span class="grow">💡 ${esc(b.t)}</span><button class="btn s" onclick="delB(${b.id})">✕</button></div>`).join('')||'<small>Nog leeg. Tip: “Mijn grootste knoeimoment”, “Boterkoek van oma”.</small>'}</div>
<div class="card" id="jr"><h2>📓 Dagboek</h2><div class="row">${MOODS.map(m=>`<button class="btn s md" style="font-size:22px;padding:6px 10px" onclick="window._m='${m}';document.querySelectorAll('.md').forEach(b=>b.style.background='');this.style.background='#CDEDE8'">${m}</button>`).join('')}</div>
<textarea id="jt" placeholder="Hoe ging het vandaag? Alleen voor jou."></textarea><button class="btn" onclick="addJ()">Opslaan</button>
${jr.slice().reverse().map(j=>`<p><b>${j.m||''} ${esc(j.d)}</b><br>${esc(j.t)}</p>`).join('')}</div>${tipLine()}<p style="text-align:center">${ALLERG}</p>`};
async function addB(){const t=$('#bi').value.trim();if(!t)return;const l=await get('blog')||[];l.push({id:Date.now(),t});await put('blog',l);render()}
async function delB(id){await put('blog',(await get('blog')||[]).filter(b=>b.id!=id));render()}
async function addJ(){const t=$('#jt').value.trim();if(!t&&!window._m)return;const l=await get('journal')||[];l.push({d:new Date().toLocaleString('nl-NL',{dateStyle:'short',timeStyle:'short'}),m:window._m,t});window._m=null;await put('journal',l);render()}

if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
render();
