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
const FASES=['FASE 1 · VOORBEREIDING','FASE 2 · MIXEN & BAKKEN','FASE 3 · AFKOELEN & AFWERKEN'];
const STAPPEN=[
{t:'Verwarm',f:0,d:'Oven op 170 °C (boven-/onderwarmte). Vorm 20×20 invetten + bakpapier.',tip:'💡 Bubbly Tip: laat het bakpapier aan twee kanten uitsteken: handige handvatten!'},
{t:'Weeg',f:0,d:'Bloem, basterdsuiker, zout, vanille en citroenrasp afwegen in de kom.',tip:'💡 Bubbly Tip: citroenrasp haalt de boter- en vanillesmaak juist op.'},
{t:'Temper',f:0,d:'Roomboter écht op kamertemperatuur.',tip:'🚨 Chaos Alert: koude boter mixt voor geen meter. Zachte boter!'},
{t:'Meng',f:1,d:'Alles in de kom en mengen tot één zacht deeg.',tip:'🚨 Chaos Alert: géén extra bloem! Dat maakt hem droog en hard.'},
{t:'Druk',f:1,d:'Deeg in de vorm drukken, insmeren met ei, ruitjespatroon met een vork.',tip:'💡 Bubbly Tip: vork licht nat of ingevet als het deeg plakt.'},
{t:'Bak',f:1,d:'30–40 min midden in de oven op 170 °C, tot goudbruin.',tip:'🚨 Chaos Alert: wiebelt het midden nog? Goed zo. Niet doorbakken!',tm:[[30,'Bak 30 min · 170°'],[40,'Bak 40 min · 170°']]},
{t:'Strijk',f:2,d:'10 min laten staan, dan de randjes aandrukken met een lepel.',tip:'💡 Bubbly Tip: randjes aandrukken zolang hij nog warm is!',tm:[[10,'Strijk: 10 min wachten']]},
{t:'Koel',f:2,d:'Minimaal 6 uur (of een nacht) afkoelen in de vorm.',tip:'🚨 Chaos Alert: warm uit de vorm = ingestorte boterkoek. Rust is verplicht!',tm:[[360,'Koel 6 uur']]},
{t:'Snijd',f:2,d:'Aan het bakpapier uit de vorm tillen en met een scherp mes snijden.',tip:'🎉 Bubbly Mantra: Proud Disaster of Pinterest-perfect, elke punt telt mee.'}];
function slots(S){const ST=(S&&S.steps)||STAPPEN;const nm=(S&&S.rname)||'boterkoek';const L=[{k:'setup',t:'Klaarzetten',d:'Telefoon staand (9:16), daglicht van opzij, geen flits. Werkblad leeg, rustige ondergrond.',need:[],check:true},
{k:'ingr',t:'Alle ingrediënten',d:'Eén foto van alles bij elkaar, verpakkingen zichtbaar (voor de lijst; jij checkt de allergenen altijd zelf).',need:['foto']}];
ST.forEach((s,i)=>L.push({k:'stap'+(i+1),t:(i+1)+'. '+s.t,fase:s.f,d:s.d+' 📸 Foto van bovenaf, clip 3–5 sec, korte notitie.',tip:s.tip,tm:s.tm,need:['foto','clip','notitie']}));
L.push({k:'knoei',t:'Knoeimoment 🎉',d:'Eén leuk foutje of knoeimoment. Knoeien = winnen!',need:['clip']},
{k:'heel',t:'Heel resultaat ('+nm+')',d:'Foto van de hele koek.',need:['foto']},{k:'close',t:'Close-up gesneden stuk',d:'Dichtbij, mooi kruim.',need:['foto']},
{k:'bord',t:'Stuk op een bordje',d:'Eén stuk op een bordje.',need:['foto']},{k:'snij',t:'Snijden of eerste hap',d:'Korte video.',need:['clip']},
{k:'selfie',t:'Jij met je '+nm+' (mag)',d:'Alleen als je dat wilt.',need:[],opt:['foto']},{k:'notes',t:'Notities',d:'Hoeveel stuks, tips, wat beter kan.',need:['notitie']});return L}

/* ---------- navigatie ---------- */
const TABS=[['home','🏠','Start'],['rec','✨','Recepten'],['bak','📸','Bakken'],['meer','⋯','Meer']];const MEER=['plan','besl','content','meer'];
let tab='home',shownTab='';function go(t){tab=t;render();scrollTo(0,0)}
function navR(){$('#nav').innerHTML=TABS.map(([k,i,l])=>`<button class="${k==tab||(k=='meer'&&MEER.includes(tab)&&tab!='meer')?'on':''}" onclick="go('${k}')" aria-current="${k==tab?'page':'false'}"><b aria-hidden="true">${i}</b>${l}</button>`).join('')}
async function render(){navR();const v=$('#view');const switched=shownTab!==tab;shownTab=tab;v.innerHTML=await VIEWS[tab]();if(switched){v.classList.remove('is-in');void v.offsetWidth;v.classList.add('is-in')}VIEWS[tab].after&&VIEWS[tab].after()}

const TIPS=['Rustig aan: één stap tegelijk, ik vink mee af.','Daglicht van opzij maakt boterkoek extra goudbruin op foto.','Knoeien = winnen. Bakken = feestje.','Een korte notitie na elke stap scheelt later veel zoeken.','Liever drie echte foto’s dan tien perfecte.','Even pauze? De timer houdt de oven voor je in de gaten.'];
const tipLine=()=>`<div class="card tip"><img src="img/fien-blij-160w.webp" alt=""><div class="grow"><b>Fien tipt</b><div>${TIPS[Math.floor(Date.now()/36e5)%TIPS.length]}</div></div></div>`;
const PRIV=`<div class="note">🔒 Alles blijft op deze telefoon. Er wordt <b>niets automatisch geüpload</b>. Jij kiest zelf wanneer je iets deelt (WhatsApp, Drive of downloaden).</div>`;
const ALLERG=`<small>Allergenen check jij altijd zelf; Fien geeft daar geen garanties over.</small>`;

/* ---------- Start ---------- */
const VIEWS={};
VIEWS.home=async()=>{const s=await cur();const p=s?await progress(s):null;const tasks=(await get('tasks')||[]).filter(t=>!t.done).sort((a,b)=>a.d>b.d?1:-1).slice(0,2);
 const reqs=(await get('aiReq'))||[];const open=reqs.filter(x=>x.status=='bezig');const failed=open.filter(x=>x.verzonden===false);const busy=open.filter(x=>x.verzonden!==false);const klaar=reqs.filter(x=>x.status=='klaar'&&x.recept).slice(0,4);const recs=typeof recipes=='function'?await recipes():[];const openPipe=recs.find(r=>!r.voorbeeld&&r.pipe&&pct&&pct(r)<100);
 return `${tipLine()}
<div class="card hero"><h2 style="font-size:26px;margin:0">Van idee tot asset</h2>
 <p class="hand" style="margin:4px 0 0">Eén pad. Knoeien mag.</p>
 <div class="path">
  <div class="p on"><b>1</b>Idee</div>
  <div class="p${open.length?' on':''}"><b>2</b>Fien AI</div>
  <div class="p${openPipe||klaar.length?' on':''}"><b>3</b>Keuren</div>
  <div class="p${s&&p&&p.pct?' on':''}"><b>4</b>Asset</div>
 </div>
 <p style="margin:10px 0 6px;font-size:15px">Typ een idee. Fien maakt er een Bubbly-recept van, jij keurt goed, daarna is het klaar voor content.</p>
 <button class="btn xl" onclick="go('rec')">Vraag Fien</button>
 ${failed.length?`<div class="ai-banner fout"><div class="ai-banner-t"><span class="ai-pill fout">Niet verzonden</span><b>${esc(failed[0].titel||failed[0].idee||failed[0].id)}</b></div><small>Versturen lukte even niet.</small>${failed.length>1?`<small>En nog ${failed.length-1}.</small>`:''}<button class="btn s xs" onclick="go('rec')">Bekijk verzoek</button></div>`:''}
 ${busy.length?`<div class="ai-banner bezig"><div class="ai-banner-t"><span class="ai-pill bezig">Bezig</span><b>${esc(busy[0].titel||busy[0].idee||busy[0].id)}</b></div>${busy.length>1?`<small>En nog ${busy.length-1} ${busy.length===2?'verzoek':'verzoeken'}.</small>`:''}<button class="btn s xs" onclick="go('rec')">Bekijk verzoek</button></div>`:''}
 ${klaar.length?`<div class="ai-banner klaar"><div class="ai-banner-t"><span class="ai-pill klaar">Klaar</span><b>Fien heeft een recept</b></div>${klaar.map(q=>`<div class="ai-banner-row"><span class="grow">${esc(q.titel||q.idee||q.id)}</span><button class="btn xs" onclick="PID='${q.recept}';PST=null;go('rec')">Goedkeuren</button></div>`).join('')}</div>`:''}
 ${openPipe?`<div class="note" style="margin-top:8px"><b>Nog te keuren:</b> ${esc(openPipe.title||'recept')}<br><button class="btn s xs" onclick="PID='${openPipe.id}';PST=null;go('rec')">Verder goedkeuren</button></div>`:''}
</div>
<div class="card soft"><div class="row"><h2 class="grow" style="font-size:20px">Bakken vandaag</h2></div>
 ${s?`<p><b>${esc(s.name)}</b></p><div class="bar"><i style="width:${p.pct}%"></i></div><small>${p.done} van ${p.tot} is klaar</small>
 <p class="row"><button class="btn" onclick="go('bak')">📸 Verder bakken</button><button class="btn p" onclick="kookOpen('sess')">👩‍🍳 Kookmodus</button></p>`
 :`<div class="empty" style="padding:12px"><img src="img/fien-denken-160w.webp" alt=""><p class="hand">Nog geen baksessie</p><small>Als je gaat bakken, leg ik foto’s en timers klaar.</small><p><button class="btn s" onclick="go('bak')">Start boterkoek</button></p></div>`}
</div>
<div class="card"><h3 style="margin:0 0 6px">Straks</h3>
 ${tasks.length?tasks.map(t=>`<div style="padding:4px 0">📌 <b>${esc(t.d)}</b> — ${esc(t.t)}</div>`).join(''):'<small>Geen open taken. Fijn rustig.</small>'}
 <p class="row"><button class="btn s xs" onclick="go('plan')">⏰ Planning</button><button class="btn s xs" onclick="go('content');setTimeout(()=>document.getElementById('jr')?.scrollIntoView(),50)">📓 Dagboek</button><button class="btn s xs" onclick="go('meer')">⋯ Meer</button></p>
</div>
<div class="card">${typeof storageCard=="function"?await storageCard():""}<p><button class="btn s xs" onclick="onbShow()">❓ Uitleg van Fien opnieuw</button></p></div>${PRIV}<p class="hand" style="text-align:center">Knoeien = winnen. Bakken = feestje.</p><p style="text-align:center">${ALLERG}</p>`};

/* ---------- Baksessie ---------- */
async function cur(){const id=await get('cur');return id?get('sess:'+id):null}
async function newSession(){const name=(document.getElementById('sn')?.value||'').trim()||'Boterkoek '+today();const id=Date.now().toString(36);await put('sess:'+id,{id,name,preset:'boterkoek',notes:{},checks:{},created:new Date().toISOString()});const l=await get('sessions')||[];l.push(id);await put('sessions',l);await put('cur',id);go('bak')}
async function progress(s){const fs=await filesOf(s.id);let done=0;const L=slots(s);L.forEach(x=>{if(slotDone(x,s,fs))done++});return{done,tot:L.length,pct:Math.round(done/L.length*100),fs}}
function have(x,s,fs,n){if(n=='notitie')return !!(s.notes[x.k]||'').trim()||fs.some(f=>f.slot==x.k&&f.kind=='spraak');return fs.some(f=>f.slot==x.k&&f.kind==n)}
function slotDone(x,s,fs){if(x.check)return !!s.checks[x.k];if(!x.need.length)return fs.some(f=>f.slot==x.k)||!!s.checks[x.k];return x.need.every(n=>have(x,s,fs,n))}
let urls=[];
VIEWS.bak=async()=>{const s=await cur();if(!s)return `<div class="card"><h2>Nieuwe baksessie</h2><div class="empty"><img src="img/fien-in-actie-320w.webp" alt=""><p class="hand">Klaar om te bakken?</p><small>Eerste recept: <b>Boterkoek</b>. Tien stappen voor foto’s en filmpjes.</small></div><label class="lbl" for="sn">Naam van deze sessie</label><input id="sn" value="Boterkoek ${today()}"><p class="row"><button class="btn xl" onclick="newSession()">Start boterkoek</button></p></div>${PRIV}`;
urls.forEach(URL.revokeObjectURL);urls=[];const p=await progress(s);
const list=(await get('sessions')||[]);const others=(await Promise.all(list.map(i=>get('sess:'+i)))).filter(Boolean);
return `<div class="card"><div class="row"><h2 class="grow">${esc(s.name)}</h2><select style="width:auto" onchange="switchS(this.value)">${others.map(o=>`<option value="${o.id}" ${o.id==s.id?'selected':''}>${esc(o.name)}</option>`).join('')}<option value="__new">+ Nieuwe sessie</option></select></div>
<div class="bar"><i style="width:${p.pct}%"></i></div><small>${p.done}/${p.tot} klaar</small></div>
<button class="btn kook" onclick="kookOpen('sess')">👩‍🍳 Kookmodus: stap voor stap, grote letters</button>
${slots(s).map((x,i,a)=>(x.fase!=null&&a[i-1].fase!==x.fase?`<h2 style="color:var(--td);font-size:18px;margin-top:18px">${(s.fasen||FASES)[x.fase]}</h2>`:'')+slotCard(x,s,p.fs)).join('')}
<div class="card"><h2>📦 Klaar? Deel alles in één keer</h2><p>Ik maak één ZIP <b>“${esc(s.name)}.zip”</b> met alle foto’s, filmpjes en notities.</p><label class="row" style="margin:6px 0"><input type="checkbox" id="zsmall" checked style="width:auto"> Foto’s kleiner maken (sneller delen; originelen blijven op je telefoon)</label><button class="btn" onclick="exportZip()">Exporteren & delen</button><p id="zipmsg"></p>${PRIV}</div>`};
function slotCard(x,s,fs){const mine=fs.filter(f=>f.slot==x.k);const ok=slotDone(x,s,fs);const kinds=[...x.need,...(x.opt||[])];
const th=mine.map(f=>{const u=URL.createObjectURL(f.blob);urls.push(u);const del=`ondblclick="if(confirm('Verwijderen?'))delFile(${f.id}).then(render)"`;return f.kind=='foto'?`<img src="${u}" ${del} title="dubbeltik = verwijderen">`:f.kind=='clip'?`<video src="${u}" muted playsinline ${del}></video>`:`<audio src="${u}" controls style="width:180px"></audio>`}).join('');
return `<div class="card step ${ok?'done':''}"><div class="row"><h3 class="grow" style="font-size:17px">${ok?'✅':'⬜️'} ${x.t}</h3></div><small>${x.d}</small>${x.tip?`<div class="note" style="margin-top:6px">${x.tip}</div>`:''}${x.tm?`<div class="row" style="margin-top:6px">${x.tm.map(([m,l])=>`<button class="btn p" onclick="startT(${m},'${l}');go('plan')">⏲️ ${m>=60?m/60+' uur':m+' min'}</button>`).join('')}</div>`:''}
<div>${kinds.map(n=>`<span class="chk ${have(x,s,fs,n)?'ok':''}">${n}</span>`).join('')}</div>
<div class="row" style="margin-top:8px">${x.check?`<button class="btn ${s.checks[x.k]?'s':''}" onclick="chk('${x.k}')">${s.checks[x.k]?'✓ Gedaan':'Gedaan'}</button>`:''}
${kinds.includes('foto')?`<label class="btn">📷 Foto<input type="file" accept="image/*" capture="environment" class="hidden" onchange="grab(this,'${x.k}','foto')"></label>`:''}
${kinds.includes('clip')?`<label class="btn">🎬 Clip<input type="file" accept="video/*" capture="environment" class="hidden" onchange="grab(this,'${x.k}','clip')"></label>`:''}
${kinds.includes('notitie')?`<button class="btn s" onclick="rec(this,'${x.k}')">🎙️ Spraak</button>`:''}</div>
${kinds.includes('notitie')?`<textarea placeholder="Notitie, bv. 25 min op 180 graden" onchange="note('${x.k}',this.value)">${esc(s.notes[x.k]||'')}</textarea>`:''}
<div class="thumbs">${th}</div>${mine.length?`<button class="btn s xs" onclick="if(confirm('Laatst toegevoegde bestand verwijderen?'))delFile(${mine.at(-1).id}).then(render)">🗑️ Laatste weg</button>`:''}</div>`}
async function switchS(v){if(v=='__new'){await put('cur',null);return render()}await put('cur',v);render()}
async function chk(k){const s=await cur();s.checks[k]=!s.checks[k];await put('sess:'+s.id,s);render()}
async function note(k,v){const s=await cur();s.notes[k]=v;await put('sess:'+s.id,s);navR()}
async function grab(inp,k,kind){const s=await cur();for(const f of inp.files)await addFile({sid:s.id,slot:k,kind,blob:f,name:f.name,type:f.type,t:Date.now()});render()}
let mr=null;async function rec(b,k){if(mr){mr.stop();return}
 try{const st=await navigator.mediaDevices.getUserMedia({audio:true});const ch=[];mr=new MediaRecorder(st);mr.ondataavailable=e=>ch.push(e.data);
 mr.onstop=async()=>{st.getTracks().forEach(t=>t.stop());const blob=new Blob(ch,{type:mr.mimeType||'audio/webm'});mr=null;const s=await cur();await addFile({sid:s.id,slot:k,kind:'spraak',blob,type:blob.type,t:Date.now()});render()};
 mr.start();b.textContent='⏹️ Stop opname';b.classList.add('p')}catch(e){alert('Microfoon lukt niet. Typ de notitie gewoon even.')}}

async function exportZip(){const s=await cur();if(!s)return;const m=$('#zipmsg');if(m)m.textContent='Even inpakken…';
 if(!window.JSZip){alert('ZIP-hulp niet geladen. Herlaad de app even.');return}const small=$('#zsmall')?$('#zsmall').checked:true;
 const z=new JSZip();const fs=await filesOf(s.id);const L=slots(s);const ext=t=>(t||'').split('/')[1]?.split(';')[0].replace('quicktime','mov').replace('jpeg','jpg')||'bin';
 const cnt={};let k=0;for(const f of fs){if(m)m.textContent=`Even inpakken… ${++k}/${fs.length}`;const i=L.findIndex(x=>x.k==f.slot);const dir=String(i).padStart(2,'0')+'-'+f.slot;cnt[dir+f.kind]=(cnt[dir+f.kind]||0)+1;const sm=small&&f.kind=='foto'?await shrink(f):null;z.file(`${dir}/${f.kind}-${cnt[dir+f.kind]}.${sm?'jpg':ext(f.type)}`,sm||f.blob,{compression:'STORE'})}
 let txt=`${s.name}\nGemaakt met Fien (alleen lokaal opgeslagen)\n\n`;L.forEach((x,i)=>{txt+=`${String(i).padStart(2,'0')} ${x.t}: ${slotDone(x,s,fs)?'klaar':'nog open'}\n`;if(s.notes[x.k])txt+=`   notitie: ${s.notes[x.k]}\n`});
 z.file('notities.txt',txt);await addRecipesToZip(z);const blob=await z.generateAsync({type:'blob',compression:'DEFLATE',streamFiles:true},md=>{if(m)m.textContent='ZIP maken… '+Math.round(md.percent)+'%'});await put('lastExport',Date.now());const name=s.name+'.zip';const file=new File([blob],name,{type:'application/zip'});
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
<div class="row" style="justify-content:center">${[['Boterkoek: 30 min op 170°',30],['Afkoelen 15 min',15],['Deeg rusten 30 min',30],['5 min',5]].map(([l,m])=>`<button class="btn s" onclick="startT(${m},'${l}')">${l}</button>`).join('')}</div>
<div class="row" style="margin-top:8px"><input id="tmin" type="number" min="1" placeholder="Minuten" class="grow" style="width:auto"><button class="btn" onclick="startT(+$('#tmin').value,'Eigen timer')">Start</button><button class="btn p" onclick="stopT()">Stop</button></div>
<small>Laat het scherm aan staan; op de achtergrond kan de telefoon het geluid pauzeren.</small></div>
<div class="card"><h2>📅 Wat wanneer</h2><div class="row"><input id="td" type="date" style="width:auto"><input id="tt" class="grow" style="width:auto" placeholder="Taak, bv. foto’s naar Gabriël"><button class="btn" onclick="addT()">+</button></div>
${ts.map((t,i)=>`<div class="row" style="margin-top:6px"><input type="checkbox" style="width:auto" ${t.done?'checked':''} onchange="togT(${t.id})"><span class="grow" style="${t.done?'text-decoration:line-through;opacity:.6':''}">${esc(t.d||'')} — ${esc(t.t)}</span><button class="btn s" onclick="delT(${t.id})">✕</button></div>`).join('')||'<small>Nog geen taken.</small>'}</div>`};
VIEWS.plan.after=()=>tick();
function startT(m,l){if(!m)return;T.end=Date.now()+m*6e4;T.label=l;clearInterval(T.iv);T.iv=setInterval(tick,500);tick();try{navigator.wakeLock?.request('screen')}catch(e){}if(Notification?.permission=='default')Notification.requestPermission()}
function stopT(){clearInterval(T.iv);T.end=0;T.label='';beepStop();if(tab=='plan')render()}
function tick(){const el=$('#tm');if(!T.end)return;const r=Math.max(0,T.end-Date.now());if(el){el.textContent=String(Math.floor(r/6e4)).padStart(2,'0')+':'+String(Math.floor(r/1e3)%60).padStart(2,'0');$('#tl').textContent=T.label}const kt=$('#ktm');if(kt)kt.textContent=r>0?'⏲️ '+String(Math.floor(r/6e4)).padStart(2,'0')+':'+String(Math.floor(r/1e3)%60).padStart(2,'0'):'⏰ Klaar!';
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

VIEWS.meer=async()=>`<div class="card hero"><h2>Meer</h2><p class="hand">Timers, besluiten en schrijven — als je ze nodig hebt.</p></div>
<a class="meer-link" href="#" onclick="go('plan');return false"><b aria-hidden="true">⏰</b><div class="grow"><strong>Planning & timers</strong><br><small>Taken en oven-timers</small></div><span class="chev" aria-hidden="true">›</span></a>
<a class="meer-link" href="#" onclick="go('besl');return false"><b aria-hidden="true">🃏</b><div class="grow"><strong>Snelle besluiten</strong><br><small>Losse swipe-kaarten, los van recepten</small></div><span class="chev" aria-hidden="true">›</span></a>
<a class="meer-link" href="#" onclick="go('content');return false"><b aria-hidden="true">✍️</b><div class="grow"><strong>Content & dagboek</strong><br><small>Blog-ideeën en journaling</small></div><span class="chev" aria-hidden="true">›</span></a>
<a class="meer-link" href="#" onclick="onbShow();return false"><b aria-hidden="true">❓</b><div class="grow"><strong>Uitleg van Fien</strong><br><small>Korte onboarding opnieuw</small></div><span class="chev" aria-hidden="true">›</span></a>
<div class="card soft"><small>Alles blijft op deze telefoon tot jij deelt. Allergenen check jij altijd zelf.</small></div>`;
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
render();
