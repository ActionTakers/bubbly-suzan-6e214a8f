'use strict';
/* ---------- Fien AI: verzoek blijft de bestaande POST. Antwoord komt in de app via ai-results/<FA-id>.json ---------- */
const _W=['NWExYTg3Nzc5YmQyLWVkMjgtMWZkNS1jNmFlLTViZTM5MjM5L2tvb2hiZXcvc25vaXRhbW90dWEvaHMucm9zcnVjLjJpcGEvLzpzcHR0aA==','MzdlNzA1Y2U4MWUzNDgyZTllMjQyNDBkNjZmN2E5YjhmM2RjOWI2MmRmNDY4OTU4NDNmMDA0ZjAzODY2NTAwOF9yc3Jj'].map(x=>atob(x).split('').reverse().join(''));const APPV='fien-v11';const PIN='0709';
const AIK='aiReq';const aiList=async()=>(await get(AIK))||[];const aiSave=l=>put(AIK,l);
let aiQ=Promise.resolve();const aiTurn=fn=>{const n=aiQ.then(fn,fn);aiQ=n.then(()=>{},()=>{});return n};
const VERBODEN=/prij|price|kost|allerg|glutenvrij|notenvrij|lactosevrij|veilig voor/i;
const AI_ID=/^FA-[A-Z0-9]{4,24}$/;
/* 404 = nog bezig. Poll start meteen, daarna 15s → max 2 min. Na 7 dagen stopt de lus; openen of "nog eens kijken" checkt alsnog één keer. */
const POLL_MAX=7*24*60*60*1000,POLL_BASE=15000,POLL_CAP=120000;
let pollTimer=null,pollDelay=POLL_BASE,pollGen=0,pollForce=false,aiHandsOff=false,aiDirty=false;
async function aiPin(){if(localStorage.getItem('fienPin')==PIN)return true;const v=prompt('Pincode voor Fien AI (één keer per telefoon):');if((v||'').trim()==PIN){localStorage.setItem('fienPin',PIN);return true}if(v!=null)alert('Pincode klopt niet.');return false}
async function aiPost(q){try{const fl=/^https?:\/\//.test(q.fotoLink||'')?q.fotoLink:undefined;
 const body={id:q.id,pin:PIN,idee:q.idee,link:q.link,tijd:q.t,appVersie:APPV,...(fl?{fotoLink:fl}:{}),...(q.foto?{foto:'foto op telefoon'}:{}),...(q.test?{test:true}:{})};
 const r=await fetch(_W[0],{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+_W[1]},body:JSON.stringify(body)});return r.ok}catch(e){return false}}
async function aiAsk(){const idee=($('#ai-idee')?.value||'').trim(),link=($('#ai-link')?.value||'').trim(),fotoLink=($('#ai-flink')?.value||'').trim(),f=$('#ai-foto')?.files?.[0];
 if(!idee&&!link&&!f&&!fotoLink)return alert('Typ een idee, plak een link of kies een foto.');
 if(!await aiPin())return;
 const id=window.AITESTID||('FA-'+Date.now().toString(36).toUpperCase().slice(-6));const t=new Date().toISOString();
 const q=await aiTurn(async()=>{const l=await aiList();let fid=null;if(f)fid=await addFile({sid:'ai:'+id,slot:'foto',kind:'foto',blob:f,type:f.type,t:Date.now()});
  const row={id,idee,link,fotoLink,foto:fid,status:'bezig',t,test:!!window.AITESTID};l.unshift(row);await aiSave(l);return row});
 render();aiWatch();
 const ok=await aiPost(q);await aiTurn(async()=>{const l2=await aiList();const x=l2.find(y=>y.id==id);if(x){x.verzonden=ok;await aiSave(l2)}});render()}
async function aiRetry(id){const l=await aiList();const q=l.find(x=>x.id==id);if(!q)return;const ok=await aiPost(q);await aiTurn(async()=>{const l2=await aiList();const x=l2.find(y=>y.id==id);if(x){x.verzonden=ok;await aiSave(l2)}});render();aiWatch()}
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
function aiResultUrl(id){return new URL('ai-results/'+id+'.json',document.baseURI).href}
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
 try{const j=await aiFetchResult(q.id);if(j){await aiTake(j,{onlyId:q.id});aiRefresh();return}}catch(e){}
 aiRefresh();aiWatch()}
/* kaart */
function aiGoed(q){return q.recept&&/^r[a-z0-9]+$/.test(q.recept)?`<br><button class="btn s xs" onclick="PID='${q.recept}';PST=null;tab='rec';render()">Goedkeuren ▶</button>`:''}
function aiBusy(q){if(q.verzonden)return 'Ik ben ermee bezig… je verzoek is aangekomen. Het recept zet ik hier neer zodra het klaar is.';
 if(q.verzonden===false)return 'Ik ben ermee bezig… versturen lukte nog niet.';return 'Ik ben ermee bezig…'}
async function aiCard(){const l=await aiList();
 return `<div class="card hero" id="fienai" style="border-style:dashed;border-color:var(--pink)"><div class="row"><img src="img/fien-denken-160w.webp" width="48" height="48" style="border-radius:50%" alt=""><div class="grow"><h3 style="margin:0">🤖 Fien AI</h3><small>Idee in → Bubbly-recept uit, hier in de app. Geen prijzen, geen allergie-garanties.</small></div></div>
 <input id="ai-idee" placeholder="Idee, bv. Chocolate chip cookies" style="margin-top:10px" autocomplete="off"><input id="ai-link" placeholder="Link (optioneel)" inputmode="url"><input id="ai-flink" placeholder="Drive-link naar foto (optioneel)" inputmode="url">
 <div class="row"><label class="btn s grow">📷 Foto (optioneel)<input id="ai-foto" type="file" accept="image/*" class="hidden" onchange="this.parentNode.firstChild.textContent='📷 '+(this.files[0]?.name||'Foto')"></label></div>
 <p class="row"><button class="btn xl" onclick="aiAsk()">🤖 Vraag Fien</button></p>
 ${!l.length?'<div class="empty soft" style="padding:16px 8px"><img src="img/fien-blij-160w.webp" alt=""><p class="hand">Nog geen verzoek</p><small>Typ hierboven een idee. Ik ga aan de slag.</small></div>':''}${l.map(q=>`<div class="note" data-ai="${esc(q.id)}" style="margin:6px 0;${q.status=='klaar'?'':'background:#FFF3DC;border-color:#C76B00'}"><div class="row"><b class="grow">${esc(q.titel||q.idee||q.link||'Foto')}</b><span class="chk ${q.status=='klaar'?'ok':''}">${q.status=='klaar'?'✅ klaar':'⏳ bezig'}</span></div><small>${esc(q.id)}${q.link?' · '+esc(q.link):''}</small>
  ${q.status=='klaar'?aiGoed(q):`<div class="hand aibusy" style="margin:8px 0">${aiBusy(q)}</div>${q.foto?'<small>📷 foto op telefoon</small>':''}${q.verzonden===false?'<div class="note" style="font-size:13px">Versturen lukte even niet. Tik op opnieuw, dan probeer ik het nog een keer.</div>':''}${q.pollFout?`<div class="note" style="font-size:13px">${esc(q.pollFout)}</div>`:''}${aiLate(q)?'<div class="note" style="font-size:13px">Dit duurt langer dan ik had verwacht. Ik kijk niet meer vanzelf. Tik om nog eens te kijken.</div>':''}<div class="row">${q.verzonden===false&&/^[A-Za-z0-9_-]+$/.test(q.id)?`<button class="btn xs" onclick="aiRetry('${q.id}')">↻ Opnieuw proberen</button>`:''}${aiLate(q)&&AI_ID.test(q.id)?`<button class="btn s xs" onclick="aiPeek('${q.id}')">Nog eens kijken</button>`:''}<button class="btn s xs" onclick="aiDel('${q.id}')">✕</button></div>`}</div>`).join('')}
 <details style="margin-top:6px"><summary style="min-height:40px;padding:8px 0">Lukt het niet vanzelf? Plak een Fien-recept</summary><textarea id="ai-in" placeholder="Plak een Fien-recept link of JSON"></textarea><div class="row"><button class="btn xs" onclick="aiImport($('#ai-in').value)">📥 Importeer</button><label class="btn s xs">📄 .json bestand<input type="file" accept=".json,application/json" class="hidden" onchange="aiFile(this)"></label></div></details></div>`}
const _recAI=VIEWS.rec;VIEWS.rec=async()=>{let h=await _recAI();if(PID&&!PFILL)return h.replace(AI,'');if(PID||h.includes('id="fienai"'))return h;return (await aiCard())+h};VIEWS.rec.after=_recAI.after;
/* link openen: #fienrecept=... (noodpad; normaal komt het recept via ai-results) */
async function aiHash(){if(/fienrecept=/.test(location.hash)){const h=location.hash;history.replaceState(null,'',location.pathname+location.search);await aiImport(h)}}
aiHash();addEventListener('hashchange',aiHash);
addEventListener('focusout',()=>{if(aiDirty)setTimeout(aiRefresh,30)});
addEventListener('pointerdown',()=>{aiHandsOff=true},{capture:true,once:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)aiWatch()});
aiWatch();
