'use strict';
/* ---------- Fien AI (tussenversie zonder server): verzoek → Gabriël → Fien → Fien-recept import ---------- */
const _W=['NWExYTg3Nzc5YmQyLWVkMjgtMWZkNS1jNmFlLTViZTM5MjM5L2tvb2hiZXcvc25vaXRhbW90dWEvaHMucm9zcnVjLjJpcGEvLzpzcHR0aA==','MzdlNzA1Y2U4MWUzNDgyZTllMjQyNDBkNjZmN2E5YjhmM2RjOWI2MmRmNDY4OTU4NDNmMDA0ZjAzODY2NTAwOF9yc3Jj'].map(x=>atob(x).split('').reverse().join(''));const APPV='fien-v10';const PIN='0709';
const AIK='aiReq';const aiList=async()=>(await get(AIK))||[];const aiSave=l=>put(AIK,l);
const VERBODEN=/prij|price|kost|allerg|glutenvrij|notenvrij|lactosevrij|veilig voor/i;
async function aiPin(){if(localStorage.getItem('fienPin')==PIN)return true;const v=prompt('Pincode voor Fien AI (één keer per telefoon):');if((v||'').trim()==PIN){localStorage.setItem('fienPin',PIN);return true}if(v!=null)alert('Pincode klopt niet.');return false}
async function aiPost(q){try{const fl=/^https?:\/\//.test(q.fotoLink||'')?q.fotoLink:undefined;
 const body={id:q.id,pin:PIN,idee:q.idee,link:q.link,tijd:q.t,appVersie:APPV,...(fl?{fotoLink:fl}:{}),...(q.foto?{foto:'foto op telefoon'}:{}),...(q.test?{test:true}:{})};
 const r=await fetch(_W[0],{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+_W[1]},body:JSON.stringify(body)});return r.ok}catch(e){return false}}
async function aiAsk(){const idee=($('#ai-idee')?.value||'').trim(),link=($('#ai-link')?.value||'').trim(),fotoLink=($('#ai-flink')?.value||'').trim(),f=$('#ai-foto')?.files?.[0];
 if(!idee&&!link&&!f&&!fotoLink)return alert('Typ een idee, plak een link of kies een foto.');
 if(!await aiPin())return;
 const id=window.AITESTID||('FA-'+Date.now().toString(36).toUpperCase().slice(-6));const l=await aiList();
 let fid=null;if(f)fid=await addFile({sid:'ai:'+id,slot:'foto',kind:'foto',blob:f,type:f.type,t:Date.now()});
 const q={id,idee,link,fotoLink,foto:fid,status:'bezig',t:new Date().toISOString(),test:!!window.AITESTID};l.unshift(q);await aiSave(l);render();
 q.verzonden=await aiPost(q);const l2=await aiList();const x=l2.find(y=>y.id==id);if(x){x.verzonden=q.verzonden;await aiSave(l2)}render()}
async function aiRetry(id){const l=await aiList();const q=l.find(x=>x.id==id);if(!q)return;q.verzonden=await aiPost(q);await aiSave(l);render()}
function aiMsg(q){return `Hoi Gabriël! Nieuw Fien AI-verzoek van Suzan\nVerzoek: ${q.id}\nIdee: ${q.idee||'-'}\nLink: ${q.link||'-'}${q.foto?'\nFoto: zit erbij':''}\n\nWil je Fien vragen dit in Bubbly-stijl uit te werken (e-book → receptkaart → workshop)? Stuur me daarna de Fien-recept link terug. Dank je!`}
async function aiShare(id){const q=(await aiList()).find(x=>x.id==id);if(!q)return;const text=aiMsg(q);
 try{if(q.foto&&navigator.share){const fr=(await filesOf('ai:'+id)).find(x=>x.id==q.foto);if(fr){const file=new File([fr.blob],id+'.'+((fr.type||'image/jpeg').split('/')[1]||'jpg'),{type:fr.type||'image/jpeg'});
   if(navigator.canShare?.({files:[file]})){await navigator.share({text,files:[file]});return}}}
  if(navigator.share&&!q.foto){await navigator.share({text});return}}catch(e){if(e.name=='AbortError')return}
 window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank')}
async function aiDel(id){if(!confirm('Verzoek verwijderen?'))return;await aiSave((await aiList()).filter(x=>x.id!=id));render()}
/* import */
const b64dec=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return new TextDecoder().decode(Uint8Array.from(atob(s),c=>c.charCodeAt(0)))};
const arr=x=>Array.isArray(x)?x.map(v=>typeof v=='object'?[v.hoeveelheid,v.eenheid,v.naam||v.item].filter(Boolean).join(' '):String(v)).join('\n'):String(x||'');
const TYP=t=>/chaos|alert|let op/i.test(t||'')?'Chaos Alert':/mantra/i.test(t||'')?'Bubbly Mantra':'Bubbly Tip';
function fromFien(j){if(typeof j=='string')j=JSON.parse(j);if(!j||typeof j!='object')throw Error('Geen JSON-object');
 const fases=j.fases;if(!Array.isArray(fases)||fases.length!=3)throw Error('Er moeten precies 3 fases zijn');
 const r=emptyRecipe();r.id='r'+Date.now().toString(36);const E=[];
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
async function aiImport(src){let j;try{src=(src||'').trim();if(!src)return alert('Plak eerst de Fien-recept link of JSON.');
  const m=src.match(/fienrecept=([A-Za-z0-9_\-]+)/);j=m?JSON.parse(b64dec(m[1])):JSON.parse(src);const r=fromFien(j);
  await saveRecipe(r);const l=await aiList();const q=l.find(x=>x.id==j.verzoek)||l.find(x=>x.status=='bezig');if(q){q.status='klaar';q.recept=r.id;q.klaar=new Date().toISOString();await aiSave(l)}
  tab='rec';RID=null;PID=r.id;PST=null;PFILL=true;render();return r.id}
 catch(e){alert('Fien-recept klopt niet:\n'+e.message);return null}}
async function aiFile(inp){const f=inp.files[0];if(f)await aiImport(await f.text())}
/* kaart */
async function aiCard(){const l=await aiList();
 return `<div class="card hero" id="fienai" style="border-style:dashed;border-color:var(--pink)"><div class="row"><img src="img/fien-denken-160w.webp" width="48" height="48" style="border-radius:50%" alt=""><div class="grow"><h3 style="margin:0">🤖 Fien AI</h3><small>Idee in → Bubbly-recept uit. Geen prijzen, geen allergie-garanties.</small></div></div>
 <input id="ai-idee" placeholder="Idee, bv. Chocolate chip cookies" style="margin-top:10px" autocomplete="off"><input id="ai-link" placeholder="Link (optioneel)" inputmode="url"><input id="ai-flink" placeholder="Drive-link naar foto (optioneel)" inputmode="url">
 <div class="row"><label class="btn s grow">📷 Foto (optioneel)<input id="ai-foto" type="file" accept="image/*" class="hidden" onchange="this.parentNode.firstChild.textContent='📷 '+(this.files[0]?.name||'Foto')"></label></div>
 <p class="row"><button class="btn xl" onclick="aiAsk()">🤖 Vraag Fien</button></p>
 ${!l.length?'<div class="empty soft" style="padding:16px 8px"><img src="img/fien-blij-160w.webp" alt=""><p class="hand">Nog geen verzoek</p><small>Typ hierboven een idee. Ik ga aan de slag.</small></div>':''}${l.map(q=>`<div class="note" style="margin:6px 0;${q.status=='klaar'?'':'background:#FFF3DC;border-color:#C76B00'}"><div class="row"><b class="grow">${esc(q.idee||q.link||'Foto')}</b><span class="chk ${q.status=='klaar'?'ok':''}">${q.status=='klaar'?'✅ klaar':'⏳ bezig'}</span></div><small>${esc(q.id)}${q.link?' · '+esc(q.link):''}</small>
  ${q.status=='klaar'?`<br><button class="btn s xs" onclick="tab='rec';PID='${q.recept}';PST=null;render()">Goedkeuren ▶</button>`:`<div class="hand aibusy" style="margin:8px 0">Ik ben ermee bezig…${q.verzonden?' — Fien heeft je verzoek ontvangen':''}</div>${q.foto?'<small>📷 foto op telefoon</small>':''}${q.verzonden===false?'<div class="note" style="font-size:13px">⚠️ Automatisch versturen lukte niet. Stuur het via WhatsApp of probeer opnieuw.</div>':''}<div class="row">${q.verzonden?'':`<button class="btn xs" style="background:#25D366" onclick="aiShare('${q.id}')">📲 Stuur naar Gabriël</button>${q.verzonden===false?`<button class="btn s xs" onclick="aiRetry('${q.id}')">↻ Opnieuw</button>`:''}`}<button class="btn s xs" onclick="aiDel('${q.id}')">✕</button></div>${q.verzonden?`<small><a href="#" onclick="aiShare('${q.id}');return false">Ook via WhatsApp sturen</a></small>`:''}`}</div>`).join('')}
 <details style="margin-top:6px"><summary style="min-height:40px;padding:8px 0">📥 Fien-recept ontvangen? Importeer</summary><textarea id="ai-in" placeholder="Plak de Fien-recept link of JSON"></textarea><div class="row"><button class="btn xs" onclick="aiImport($('#ai-in').value)">📥 Importeer</button><label class="btn s xs">📄 .json bestand<input type="file" accept=".json,application/json" class="hidden" onchange="aiFile(this)"></label></div></details></div>`}
const _recAI=VIEWS.rec;VIEWS.rec=async()=>{let h=await _recAI();if(PID&&!PFILL)return h.replace(AI,'');if(PID||h.includes('id="fienai"'))return h;return (await aiCard())+h};VIEWS.rec.after=_recAI.after;
/* link openen: #fienrecept=... */
async function aiHash(){if(/fienrecept=/.test(location.hash)){const h=location.hash;history.replaceState(null,'',location.pathname+location.search);await aiImport(h)}}
aiHash();addEventListener('hashchange',aiHash);
