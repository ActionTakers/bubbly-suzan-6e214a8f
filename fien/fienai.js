'use strict';
/* ---------- Fien AI: verzoek blijft de bestaande POST. Antwoord komt in de app via ai-results/<FA-id>.json ---------- */
/* v13: alles gaat via de Fien-relay (Cloudflare Worker). De webhook-sleutel staat alleen in de Worker, niet hier. */
const RELAY=(localStorage.getItem('fienRelay')||document.querySelector('meta[name="fien-relay"]')?.content||'').replace(/\/$/,'');
const RESULTS=(localStorage.getItem('fienResults')||'').replace(/\/$/,'');const SITE='https://bubblybakery.nl/';
const APPV='fien-v15';const PIN='0709';
const AIK='aiReq';const aiList=async()=>(await get(AIK))||[];const aiSave=l=>put(AIK,l);
let aiQ=Promise.resolve();const aiTurn=fn=>{const n=aiQ.then(fn,fn);aiQ=n.then(()=>{},()=>{});return n};
const VERBODEN=/prij|price|kost|allerg|glutenvrij|notenvrij|lactosevrij|veilig voor/i;
const AI_ID=/^FA-[A-Z0-9]{4,24}$/;
/* 404 = nog bezig. Poll start meteen, daarna 15s → max 2 min. Na 7 dagen stopt de lus; openen of "nog eens kijken" checkt alsnog één keer. */
const POLL_MAX=7*24*60*60*1000,POLL_BASE=15000,POLL_CAP=120000;
let pollTimer=null,pollDelay=POLL_BASE,pollGen=0,pollForce=false,aiHandsOff=false,aiDirty=false;
async function aiPin(){if(localStorage.getItem('fienPin')==PIN)return true;const v=prompt('Pincode voor Fien AI (één keer per telefoon):');if((v||'').trim()==PIN){localStorage.setItem('fienPin',PIN);return true}if(v!=null)alert('Pincode klopt niet.');return false}
const aiPatch=(id,patch)=>aiTurn(async()=>{const l=await aiList();const x=l.find(y=>y.id==id);if(x){Object.assign(x,patch);await aiSave(l)}return x});
async function aiShrink(blob){try{const bm=await createImageBitmap(blob);const sc=Math.min(1,1600/Math.max(bm.width,bm.height));const c=document.createElement('canvas');c.width=Math.round(bm.width*sc);c.height=Math.round(bm.height*sc);
 c.getContext('2d').drawImage(bm,0,0,c.width,c.height);const out=await new Promise(ok=>c.toBlob(ok,'image/jpeg',.82));return out||blob}catch(e){return blob}}
async function aiPostOnce(q){if(!RELAY)return false;
 if(q.foto&&!q.fotoUp){const f=(await filesOf('ai:'+q.id))[0];if(!f)return false;const img=await aiShrink(f.blob);
  const r=await fetch(RELAY+'/foto?id='+encodeURIComponent(q.id)+'&pin='+PIN,{method:'POST',headers:{'Content-Type':img.type||'image/jpeg'},body:img});
  if(!r.ok)return false;await aiPatch(q.id,{fotoUp:true});q.fotoUp=true}
 const fl=/^https?:\/\//.test(q.fotoLink||'')?q.fotoLink:undefined;
 const body={id:q.id,pin:PIN,idee:q.idee,...(q.type?{type:q.type,receptId:q.receptId,recept:q.receptTekst}:{}),link:q.link,tijd:q.t,appVersie:APPV,...(fl?{fotoLink:fl}:{}),...(q.foto?{foto:true}:{}),...(q.test?{test:true}:{})};
 const r=await fetch(RELAY+'/verzoek',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const j=await r.json().catch(()=>({}));return r.ok&&j.ok===true}
async function aiHasResult(id){try{return !!(await aiFetchResult(id))}catch(e){return false}}
/* Drie pogingen met hetzelfde id (de relay stuurt een id maar één keer door). Pas daarna een foutmelding. */
async function aiPost(q){for(const w of (window.AIWAIT||[0,3000,10000])){if(w)await new Promise(ok=>setTimeout(ok,w));
 try{if(await aiPostOnce(q))return true}catch(e){}if(await aiHasResult(q.id))return true}return false}
/* Eén invoer. Een losse https-link in het ideevak of in "Foto of link" wordt receptlink, behalve Drive/foto-urls. */
function aiFotoUrl(u){let x;try{x=new URL(u)}catch(e){return false}const h=x.hostname.replace(/^www\./,'');
 if(h==='drive.google.com'||h==='photos.google.com'||h==='photos.app.goo.gl')return true;
 if(/(^|\.)googleusercontent\.com$/.test(h))return true;return /\.(jpe?g|png|webp|gif|heic)$/i.test(x.pathname)}
function aiTakeUrl(raw,link,fotoLink){const u=String(raw||'').trim();if(!/^https?:\/\//i.test(u)||u===link||u===fotoLink)return {link,fotoLink};
 if(aiFotoUrl(u)){if(!fotoLink)fotoLink=u;else if(!link)link=u}else if(!link)link=u;else if(!fotoLink)fotoLink=u;return {link,fotoLink}}
async function aiAsk(){let idee=($('#ai-idee')?.value||'').trim(),link=($('#ai-link')?.value||'').trim(),fotoLink=($('#ai-flink')?.value||'').trim();const f=$('#ai-foto')?.files?.[0];
 const extra=aiTakeUrl($('#ai-bron-in')?.value||'',link,fotoLink);link=extra.link;fotoLink=extra.fotoLink;
 if(!link&&!fotoLink&&/^https?:\/\/\S+$/i.test(idee)){const moved=aiTakeUrl(idee,'','');link=moved.link;fotoLink=moved.fotoLink;idee=''}
 if(!idee&&!link&&!f&&!fotoLink)return aiHint('Schrijf er één zinnetje bij, of kies een foto. Dan weet Fien wat je wilt.');aiHint('');
 const dub=(await aiList()).find(x=>x.status=='bezig'&&!f&&x.idee&&x.idee===idee&&(x.link||'')===link&&Date.now()-Date.parse(x.t)<600000);if(dub){aiResetCompose();render();return}
 if(!await aiPin())return;
 const id=window.AITESTID||('FA-'+Date.now().toString(36).toUpperCase().slice(-6));const t=new Date().toISOString();
 const q=await aiTurn(async()=>{const l=await aiList();let fid=null;if(f)fid=await addFile({sid:'ai:'+id,slot:'foto',kind:'foto',blob:f,type:f.type,t:Date.now()});
  const row={id,idee,link,fotoLink,foto:fid,status:'bezig',t,test:!!window.AITESTID||localStorage.getItem('fienTest')==='1'};l.unshift(row);await aiSave(l);return row});
 aiResetCompose();render();aiWatch();
 const ok=await aiPost(q);await aiPatch(id,{verzonden:ok});render()}
async function aiRetry(id){const q=await aiPatch(id,{verzonden:undefined});if(!q)return;render();const ok=await aiPost(q);await aiPatch(id,{verzonden:ok});render();aiWatch()}
function aiHint(t){const h=$('#ai-hint');if(h){h.textContent=t;h.classList.toggle('hidden',!t)}if(t)$('#ai-idee')?.focus()}
async function aiDel(id){if(!confirm('Verzoek verwijderen?'))return;await aiTurn(async()=>{await aiSave((await aiList()).filter(x=>x.id!=id))});render()}
/* import */
const b64dec=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return new TextDecoder().decode(Uint8Array.from(atob(s),c=>c.charCodeAt(0)))};
const arr=x=>Array.isArray(x)?x.map(v=>typeof v=='object'?[v.hoeveelheid,v.eenheid,v.naam||v.item].filter(Boolean).join(' '):String(v)).join('\n'):String(x||'');
const TYP=t=>/chaos|alert|let op/i.test(t||'')?'Chaos Alert':/mantra/i.test(t||'')?'Bubbly Mantra':'Bubbly Tip';
function fromFien(j){if(typeof j=='string')j=JSON.parse(j);if(!j||typeof j!='object')throw Error('Geen JSON-object');
 const fases=j.fases;if(!Array.isArray(fases)||fases.length!=3)throw Error('Er moeten precies 3 fases zijn');
 const r=emptyRecipe();r.id='r'+Date.now().toString(36)+(aiN++).toString(36);const E=[];
 r.title=String(j.titel||j.title||'').trim();if(!r.title)E.push('titel ontbreekt');
 r.ondertitel=String(j.ondertitel||'');r.tags=arr(j.tags).replace(/\n/g,', ');r.status='concept';
 r.ingr=arr(j.ingredienten||j['ingrediënten']||j.ingr);r.ben=arr(j.benodigdheden||j.ben);
 r.bewaren=String(j.bewaren||'');r.variaties=arr(j.variaties);r.bekentenis=String(j.bekentenis||'');r.mantra=String(j.mantra||'');
 /* v15: site-label komt alleen uit het ai-results JSON (siteStatus/siteSlug); 'Staat online' checkt daarna de echte site-lijst */
 {const p=sitePick(j);if(p.siteStatus)r.siteStatus=p.siteStatus;if(p.siteSlug)r.siteSlug=p.siteSlug}
 r.bron='Fien AI'+(j.bron?' · '+arr(j.bron).replace(/\n/g,' · '):'');r.fienai={verzoek:j.verzoek||'',bronnen:j.bron||'',t:new Date().toISOString()};
 fases.forEach((f,fi)=>{r.fases[fi]={naam:String(f.naam||FN[fi]),doel:String(f.doel||DOELEN[fi])};const st=f.stappen||[];if(st.length!=3)E.push(`fase ${fi+1} heeft ${st.length} stappen (moet 3)`);
  st.slice(0,3).forEach((s,j2)=>{const n=fi*3+j2;r.steps[n]={verb:String(s.werkwoord||s.verb||''),text:String(s.beschrijving||s.text||''),type:TYP(s.type||(s.alert?'alert':'')),tip:String(s.tip||s.alert||'')};if(!r.steps[n].verb)E.push(`stap ${n+1}: werkwoord ontbreekt`);if(!r.steps[n].text)E.push(`stap ${n+1}: beschrijving ontbreekt`)})});
 if(!r.ingr)E.push('ingrediënten ontbreken');
 const banned=Object.keys(j).filter(k=>VERBODEN.test(k));if(banned.length)E.push('niet toegestaan veld: '+banned.join(', ')+' (geen prijzen of allergie-claims)');
 if(E.length)throw Error(E.join('\n'));return r}
let aiN=0;
async function aiTake(j,opt){return aiTurn(async()=>{opt=opt||{};
 if(opt.onlyId&&String(j.verzoek||'')!==opt.onlyId)throw Error('Dit antwoord hoort bij een ander verzoek.');
 const l=await aiList();
 const q=opt.onlyId?l.find(x=>x.id==opt.onlyId):(l.find(x=>j.verzoek&&x.id==j.verzoek)||l.find(x=>x.status=='bezig'));
 if(q&&q.status=='klaar'&&q.recept)return q.recept;
 const r=fromFien(j);await saveRecipe(r);
 if(q){q.status='klaar';q.recept=r.id;q.titel=r.title;q.klaar=new Date().toISOString();delete q.pollFout;await aiSave(l)}
 return r.id})}
async function aiImport(src){let j;try{src=(src||'').trim();if(!src)return alert('Plak eerst de Fien-recept link of JSON.');
  const m=src.match(/fienrecept=([A-Za-z0-9_\-]+)/);j=m?JSON.parse(b64dec(m[1])):JSON.parse(src);const id=await aiTake(j);
  tab='rec';RID=null;PID=id;PST=null;PFILL=true;render();return id}
 catch(e){alert('Fien-recept klopt niet:\n'+e.message);return null}}
async function aiFile(inp){const f=inp.files[0];if(f)await aiImport(await f.text())}
/* same-origin resultaten: fien/ai-results/FA-XXXXXX.json */
function aiResultUrl(id){return RESULTS?RESULTS+'/'+id+'.json':new URL('ai-results/'+id+'.json',document.baseURI).href}
function aiLate(q){const t=Date.parse(q.t||'');return Number.isFinite(t)&&(Date.now()-t>POLL_MAX)}
function aiFocused(){const a=document.activeElement;return !!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))}
function aiRefresh(){if(aiFocused()){aiDirty=true;return}aiDirty=false;render()}
function aiZacht(e){const m=String(e&&e.message||'');
 if(/fases|stappen|titel|ingredi|werkwoord|beschrijving|niet toegestaan|JSON|ander verzoek/.test(m))return 'Ik vond een antwoord, maar het recept was nog niet compleet. Ik kijk later opnieuw.';
 return ''}
async function aiFetchResult(id){const res=await fetch(aiResultUrl(id),{cache:'no-store',headers:{Accept:'application/json'}});
 if(res.status===404)return null;if(!res.ok)throw Error('http '+res.status);
 const text=await res.text();const ct=(res.headers.get('content-type')||'').toLowerCase();
 if(!ct.includes('json')&&!text.trim().startsWith('{'))throw Error('geen JSON');
 return JSON.parse(text)}
async function aiPollTick(forceAll){const waiting=(await aiList()).filter(q=>q.status=='bezig'&&AI_ID.test(q.id));
 let keep=0,changed=0,netErr=false;
 for(const q of waiting){const late=aiLate(q);if(late&&!forceAll)continue;
  try{const j=await aiFetchResult(q.id);
   if(!j){if(!late)keep++;continue}
   if(q.type==='blog'||j.type==='blog'){await aiPatch(q.id,{type:'blog',status:'klaar',klaar:new Date().toISOString(),blog:blogFrom(j)});changed++;continue}
   if(j.vraag&&!Array.isArray(j.fases)){await aiPatch(q.id,{status:'vraag',vraag:String(j.vraag).slice(0,400)});changed++;continue}
   await aiTake(j,{onlyId:q.id});changed++}
  catch(e){const zacht=aiZacht(e);
   if(!zacht){netErr=true;if(!late)keep++;continue}
   const wrote=await aiTurn(async()=>{const fresh=await aiList();const row=fresh.find(x=>x.id==q.id);
    if(!row||row.status!=='bezig')return false;if(row.pollFout===zacht)return false;row.pollFout=zacht;await aiSave(fresh);return true});
   if(wrote)changed++;if(!late)keep++}}
 if(changed){if(!aiHandsOff&&tab==='home')tab='rec';aiRefresh()}
 return {keep,netErr}}
function aiWatch(){const gen=++pollGen;clearTimeout(pollTimer);pollDelay=POLL_BASE;pollForce=true;
 const run=async()=>{if(gen!==pollGen)return;const force=pollForce;pollForce=false;let keep=0,netErr=false;
  try{const r=await aiPollTick(force);if(gen!==pollGen)return;keep=r.keep;netErr=r.netErr}catch(e){netErr=true;keep=1}
  if(gen!==pollGen)return;if(!keep){pollTimer=null;return}
  pollDelay=Math.min(POLL_CAP,netErr?Math.max(POLL_BASE,pollDelay*2):Math.round(Math.max(pollDelay,POLL_BASE)*1.45));
  pollTimer=setTimeout(run,pollDelay)};
 pollTimer=setTimeout(run,0)}
async function aiPeek(id){const l=await aiList();const q=l.find(x=>x.id==id);if(!q||q.status!=='bezig'||!AI_ID.test(q.id))return;
 try{const j=await aiFetchResult(q.id);if(j){if(q.type==='blog'||j.type==='blog')await aiPatch(q.id,{type:'blog',status:'klaar',klaar:new Date().toISOString(),blog:blogFrom(j)});else await aiTake(j,{onlyId:q.id});aiRefresh();return}}catch(e){}
 aiRefresh();aiWatch()}
/* kaart — één pad: idee, optioneel foto of link, daarna rustige status */
let aiDraft={idee:'',link:'',flink:'',bron:'',open:false,file:null};
function aiReadDraft(){const idee=$('#ai-idee');if(!idee)return;
 aiDraft={idee:idee.value,link:$('#ai-link')?.value||'',flink:$('#ai-flink')?.value||'',bron:$('#ai-bron-in')?.value||'',open:!!$('#ai-bron')&&!$('#ai-bron').classList.contains('hidden'),file:$('#ai-foto')?.files?.[0]||null}}
function aiApplyDraft(){const idee=$('#ai-idee');if(!idee)return;idee.value=aiDraft.idee||'';
 if($('#ai-link'))$('#ai-link').value=aiDraft.link||'';if($('#ai-flink'))$('#ai-flink').value=aiDraft.flink||'';if($('#ai-bron-in'))$('#ai-bron-in').value=aiDraft.bron||'';
 const inp=$('#ai-foto');if(aiDraft.file&&inp){try{const dt=new DataTransfer();dt.items.add(aiDraft.file);inp.files=dt.files}catch(e){}}
 aiSetBronOpen(!!aiDraft.open);aiBronChips()}
function aiResetCompose(){aiHint('');aiDraft={idee:'',link:'',flink:'',bron:'',open:false,file:null};
 ['ai-idee','ai-link','ai-flink','ai-bron-in','ai-foto'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''})}
function aiSetBronOpen(open){const p=$('#ai-bron');if(!p)return;p.classList.toggle('hidden',!open);$('#ai-bron-btn')?.setAttribute('aria-expanded',open?'true':'false')}
function aiToggleBron(){aiSetBronOpen(!!$('#ai-bron')?.classList.contains('hidden'));if(!$('#ai-bron')?.classList.contains('hidden'))$('#ai-bron-in')?.focus()}
function aiAddBron(){const raw=($('#ai-bron-in')?.value||'').trim();if(!raw)return;if(!/^https?:\/\//i.test(raw))return alert('Plak een link die met http begint.');
 const link=$('#ai-link'),fl=$('#ai-flink');const next=aiTakeUrl(raw,link.value.trim(),fl.value.trim());link.value=next.link;fl.value=next.fotoLink;$('#ai-bron-in').value='';aiSetBronOpen(false);aiBronChips()}
function aiClear(id){const el=document.getElementById(id);if(el)el.value='';if(id==='ai-foto')aiDraft.file=null;aiBronChips()}
function aiSwapBron(){const a=$('#ai-link'),b=$('#ai-flink');if(!a||!b)return;const t=a.value;a.value=b.value;b.value=t;aiBronChips()}
function aiOnFoto(){aiDraft.file=$('#ai-foto')?.files?.[0]||null;if(aiDraft.file)aiSetBronOpen(false);aiBronChips()}
function aiHost(u){try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return 'link'}}
function aiChip(label,sub,clearId,swap){const flip=swap?`<button type="button" class="ai-mini" onclick="aiSwapBron()">${swap}</button>`:'';
 return `<span class="ai-chip"><span class="ai-chip-t"><b>${esc(label)}</b> · ${esc(sub)}</span>${flip}<button type="button" class="ai-mini" onclick="aiClear('${clearId}')" aria-label="Verwijderen">×</button></span>`}
function aiBronChips(){const box=$('#ai-chips');if(!box)return;const link=($('#ai-link')?.value||'').trim(),fl=($('#ai-flink')?.value||'').trim(),f=$('#ai-foto')?.files?.[0];
 const canFlip=!!link!==!!fl;const html=[];
 if(link)html.push(aiChip('Receptlink',aiHost(link),'ai-link',canFlip?'Toch foto':''));
 if(fl)html.push(aiChip('Fotolink',aiHost(fl),'ai-flink',canFlip?'Toch recept':''));
 if(f)html.push(aiChip('Foto',f.name||'van je telefoon','ai-foto',''));
 box.innerHTML=html.join('');box.classList.toggle('hidden',!html.length);
 const lbl=$('#ai-bron-btn .ai-bron-lbl');if(lbl)lbl.textContent=f?'Andere foto kiezen':'Foto toevoegen';if(f)aiHint('')}
function aiWhen(t){const d=new Date(t);if(Number.isNaN(+d))return '';return d.toLocaleString('nl-NL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
function aiKind(q){if(q.status==='klaar')return 'klaar';if(q.status==='vraag'||q.verzonden===false)return 'vraag';return 'bezig'}
function aiGoed(q){return q.recept&&/^r[a-z0-9]+$/.test(q.recept)?`<button type="button" class="btn xs" onclick="PID='${q.recept}';PST=null;tab='rec';render()">Bekijk recept</button>`:''}
function aiBusy(q){if(q.status==='klaar')return 'Je recept staat klaar. Kijk of het klopt en maak het jouw recept.';
 if(q.status==='vraag')return q.vraag||'Fien heeft iets meer nodig. Typ in een zinnetje wat je wilt bakken.';
 if(q.verzonden===false)return 'Het lukte niet om je vraag naar Fien te sturen, ook niet na drie keer proberen. Tik op Opnieuw versturen.';
 return 'Fien heeft je vraag. Het recept staat hier meestal binnen 5 minuten. Je mag de app gerust dichtdoen.'}
function aiAgain(id){aiList().then(l=>{const q=l.find(x=>x.id==id);aiDraft.idee=q&&q.idee||'';go('rec');setTimeout(()=>{const t=$('#ai-idee');if(t){t.value=aiDraft.idee;t.focus()}},50)})}
function aiActs(q){const idOk=/^[A-Za-z0-9_-]+$/.test(q.id);const btns=[];
 if(q.status==='klaar'){const g=aiGoed(q);if(g)btns.push(g)}
 else if(q.status==='vraag'){btns.push(`<button type="button" class="btn xs" onclick="aiAgain('${q.id}')">Typ je idee</button>`)}
 else{if(q.verzonden===false&&idOk)btns.push(`<button type="button" class="btn xs" onclick="aiRetry('${q.id}')">Opnieuw versturen</button>`);
  if(aiLate(q)&&AI_ID.test(q.id))btns.push(`<button type="button" class="btn s xs" onclick="aiPeek('${q.id}')">Nog eens kijken</button>`)}
 if(idOk&&(q.status!=='bezig'||q.verzonden===false||aiLate(q)))btns.push(`<button type="button" class="btn ghost xs" onclick="aiDel('${q.id}')">Verwijderen</button>`);
 return btns.length?`<div class="ai-acts">${btns.join('')}</div>`:''}
const AI_PILL={klaar:'Klaar ✓',vraag:'Fien vraagt iets',bezig:'Fien schrijft…'};
function aiCardItem(q){if(q.type==='blog')return blogCard(q);const k=aiKind(q);const when=aiWhen(q.t);
 const notes=[];if(q.pollFout)notes.push(q.pollFout);
 if(k==='bezig'&&q.verzonden!==false&&Date.now()-Date.parse(q.t)>15*60000&&!aiLate(q))notes.push('Het duurt wat langer dan normaal. Fien is er nog mee bezig.');
 if(k==='bezig'&&aiLate(q))notes.push('Dit duurt veel te lang. Tik op Nog eens kijken.');
 return `<article class="ai-card ${k}" data-ai="${esc(q.id)}" ${k==='bezig'?'aria-busy="true"':''}><div class="ai-top"><div class="grow"><h3 class="ai-title">${esc(q.titel||q.idee||(q.foto?'Je foto':q.link?aiHost(q.link):'Je vraag'))}</h3><small class="ai-meta">${q.foto?'📷 met foto · ':''}${esc(when)}</small></div><span class="ai-pill ${k}">${AI_PILL[k]}</span></div>
 <p class="ai-msg">${esc(aiBusy(q))}</p>${k==='bezig'?'<div class="ai-bar" aria-hidden="true"><i></i></div>':''}${notes.map(t=>`<p class="ai-note">${esc(t)}</p>`).join('')}${aiActs(q)}</article>`}
async function aiCard(){const l=await aiList();
 return `<section class="fien-sheet" id="fienai"><div class="fien-head"><img src="img/fien-denken-160w.webp" width="58" height="58" alt=""><div class="grow"><div class="kicker">Fien</div><h2>Wat wil je bakken?</h2><p class="fien-lead">Schrijf het gewoon op. Fien maakt er een recept van.</p></div></div>
 <textarea id="ai-idee" rows="3" oninput="aiHint('')" aria-label="Wat wil je bakken?" placeholder="Bv. bitterkoekjes, lekker zacht" autocomplete="off"></textarea>
 <div id="ai-chips" class="ai-chips hidden"></div>
 <label class="fien-add" id="ai-bron-btn"><span class="fien-plus" aria-hidden="true">📷</span><span class="ai-bron-lbl">Foto toevoegen</span><input id="ai-foto" type="file" accept="image/*" class="hidden" onchange="aiOnFoto()"></label>
 <input id="ai-link" type="hidden"><input id="ai-flink" type="hidden">
 <p id="ai-hint" class="ai-hint hidden" role="alert"></p>
 <button type="button" class="btn xl fien-go" id="ai-go" onclick="aiAsk()">Vraag Fien</button>
 ${l.length?`<h3 class="ai-list-h">Je vragen aan Fien</h3><div class="ai-list" aria-live="polite">${l.map(aiCardItem).join('')}</div>`:'<p class="fien-empty"><img src="img/fien-blij-160w.webp" alt="">Nog niets gevraagd. Eén zinnetje is genoeg.</p>'}</section>`}
const _recAI=VIEWS.rec;VIEWS.rec=async()=>{let h=await _recAI();if(PID&&!PFILL)return h.replace(AI,'');if(PID||h.includes('id="fienai"'))return h;return (await aiCard())+h};VIEWS.rec.after=_recAI.after;
/* Meer › Zelf een recept maken (alles wat vroeger onder Recepten stond) */
VIEWS.zelf=async()=>`<div class="card hero"><h2>Zelf een recept maken</h2><p class="hand">Zonder Fien: foto, tekst of een leeg formulier.</p></div>
 <section class="card"><p class="row"><label class="btn s">Foto van recept<input type="file" accept="image/*" capture="environment" class="hidden" onchange="tab='rec';recFoto(this)"></label><button class="btn s" onclick="tab='rec';RID='__plak';render()">Tekst plakken</button><button class="btn s" onclick="tab='rec';recNew()">Leeg formulier</button></p></section>
 ${IDEA.replace('onclick="ideaStart()"',"onclick=\"tab='rec';ideaStart()\"").replace('onchange="ideaFoto(this)"',"onchange=\"tab='rec';ideaFoto(this)\"")}
 <details class="card quiet"><summary>Een Fien-recept plakken</summary><textarea id="ai-in" placeholder="Plak een Fien-recept link of JSON"></textarea><div class="row"><button type="button" class="btn xs" onclick="aiImport($('#ai-in').value)">Importeer</button><label class="btn s xs">.json bestand<input type="file" accept=".json,application/json" class="hidden" onchange="aiFile(this)"></label></div></details>
 <p class="row"><button class="btn s" onclick="go('meer')">‹ Terug naar Meer</button></p>`;
/* Site: zo zien bezoekers bubblybakery.nl. Fien zet zelf niets op de site. */
VIEWS.site=async()=>{const nieuw=(await aiList()).filter(q=>q.status==='klaar'&&q.recept&&Date.now()-Date.parse(q.klaar||q.t)<14*864e5);const shot=RELAY?RELAY+'/site.jpg?u='+Math.floor(Date.now()/36e5):'';
 return `<div class="card hero"><h2>Je website</h2><p class="hand" style="margin:4px 0 0">Zo zien bezoekers bubblybakery.nl.</p></div>
 <div class="card site-shot">${shot?`<img id="site-img" src="${shot}" alt="Voorbeeld van bubblybakery.nl" onerror="this.replaceWith(Object.assign(document.createElement('p'),{className:'fien-hint',textContent:'Nog geen foto van de site. Tik op Open de site.'}))">`:'<p class="fien-hint">Nog geen foto van de site. Tik op Open de site.</p>'}<small id="site-t" class="ai-meta"></small></div>
 <button class="btn xl" onclick="window.open(SITE,'_blank','noopener')">Open de site</button>
 ${nieuw.map(q=>`<div class="ai-card klaar"><div class="ai-top"><div class="grow"><h3 class="ai-title">${esc(q.titel||q.idee)}</h3></div><span class="ai-pill nieuw">Nieuw</span></div><p class="ai-msg">Staat nog niet op de site. Je recept staat wel in de app.</p><div class="ai-acts"><button class="btn s xs" onclick="PID='${q.recept}';PST=null;go('rec')">Bekijk recept in de app</button></div></div>`).join('')}
 <div class="card soft"><small>Fien zet zelf niets op je website.</small></div>`};
VIEWS.site.after=()=>{if(!RELAY)return;fetch(RELAY+'/site.json',{cache:'no-store'}).then(r=>r.json()).then(j=>{const el=$('#site-t');if(el&&j.t)el.textContent='Foto van '+aiWhen(j.t)}).catch(()=>{})};
/* link openen: #fienrecept=... (noodpad; normaal komt het recept via ai-results) */
async function aiHash(){if(/fienrecept=/.test(location.hash)){const h=location.hash;history.replaceState(null,'',location.pathname+location.search);await aiImport(h)}}
aiHash();addEventListener('hashchange',aiHash);
const _renderFien=render;render=async function(){if(document.getElementById('ai-idee'))aiReadDraft();await _renderFien();aiApplyDraft()};
addEventListener('focusout',()=>{if(aiDirty)setTimeout(aiRefresh,30)});
addEventListener('pointerdown',()=>{aiHandsOff=true},{capture:true,once:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)aiWatch()});
aiWatch();

/* v14: Maandagblog. Knop op elke receptkaart → verzoek type 'blog' via de relay → antwoord in ai-results/<FA-id>.json */
function recTekst(r){const L=x=>lines(x).join('; ');return [r.title,r.ondertitel,'Ingrediënten: '+L(r.ingr),...(r.fases||[]).map((f,i)=>'Fase '+(i+1)+': '+(f.naam||'')+' — '+r.steps.slice(i*3,i*3+3).map(s=>[s.verb,s.text].filter(Boolean).join(' ')).join(' | ')),'Bewaren: '+(r.bewaren||'')].join('\n').slice(0,2400)}
async function aiBlog(rid){const r=(await recipes()).find(x=>x.id==rid);if(!r)return;if(!await aiPin())return;
 const id='FA-'+Date.now().toString(36).toUpperCase().slice(-6);
 const q=await aiTurn(async()=>{const l=await aiList();const row={id,type:'blog',receptId:(r.fienai&&r.fienai.verzoek)||r.id,receptTekst:recTekst(r),idee:('Maandagblog: '+(r.title||'recept')).slice(0,500),titel:'Blog: '+(r.title||'recept'),status:'bezig',t:new Date().toISOString()};l.unshift(row);await aiSave(l);return row});
 PID=null;PST=null;tab='rec';render();aiWatch();const ok=await aiPost(q);await aiPatch(id,{verzonden:ok});render()}
function blogFrom(j){if(typeof j=='string')j=JSON.parse(j);const b=j.blog&&typeof j.blog=='object'?j.blog:j;
 const tekst=typeof j.blog=='string'?j.blog:String(b.tekst||b.markdown||b.text||b.body||(Array.isArray(b.secties)?b.secties.map(x=>(x.kop?x.kop+'\n':'')+(x.tekst||'')).join('\n\n'):''));
 return {titel:String(b.titel||b.title||''),tekst}}
async function blogDec(id,k){if(k==='Aanpassen'){BEDIT=id;return render()}const t=$('#bt-'+id);const patch={blogDec:k};if(t&&BEDIT===id){patch.blog={...(await aiList()).find(x=>x.id==id).blog,tekst:t.value};patch.blogDec='Aangepast'}BEDIT=null;await aiPatch(id,patch);render()}
let BEDIT=null;
function blogCard(q){const k=aiKind(q);const b=q.blog||{};const d=q.blogDec;
 if(k!=='klaar'){const x={...q,titel:q.titel};return `<article class="ai-card ${k}"><div class="ai-top"><div class="grow"><h3 class="ai-title">✍️ ${esc(q.titel)}</h3><small class="ai-meta">${esc(aiWhen(q.t))}</small></div><span class="ai-pill ${k}">${k==='bezig'?'Fien schrijft…':AI_PILL[k]}</span></div><p class="ai-msg">${q.verzonden===false?esc(aiBusy(q)):'Fien schrijft je maandagblog. Meestal binnen 5 minuten.'}</p>${k==='bezig'?'<div class="ai-bar" aria-hidden="true"><i></i></div>':''}${aiActs(x)}</article>`}
 const body=BEDIT===q.id?`<textarea id="bt-${q.id}" rows="12">${esc(b.tekst||'')}</textarea><button class="btn" style="width:100%" onclick="blogDec('${q.id}','Opslaan')">💾 Opslaan & goedkeuren</button>`:`<div class="blog-tekst">${esc(b.tekst||'(leeg)')}</div>`;
 return `<article class="ai-card klaar blog ${d?'dk-'+d.replace(/ /g,''):''}"><div class="ai-top"><div class="grow"><h3 class="ai-title">✍️ ${esc(b.titel||q.titel)}</h3><small class="ai-meta">Maandagblog · ${esc(aiWhen(q.t))}</small></div><span class="ai-pill ${d=='Niet eens'?'vraag':'klaar'}">${esc(d||'Klaar ✓')}</span></div>${body}
 ${BEDIT===q.id?'':`<div class="decrow">${['Eens','Aanpassen','Niet eens'].map(o=>`<button class="btn ${d==o?'':'s'}" onclick="blogDec('${q.id}','${o}')">${o}</button>`).join('')}</div>`}<div class="ai-acts"><button class="btn s xs" onclick="navigator.clipboard?.writeText(${esc(JSON.stringify(b.tekst||''))}).then(()=>alert('Gekopieerd'))">Kopieer</button><button class="btn ghost xs" onclick="aiDel('${q.id}')">Verwijderen</button></div></article>`}
