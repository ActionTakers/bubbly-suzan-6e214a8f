'use strict';
/* ---------- Van idee tot asset: E-book (master) → Receptkaart → Workshop ---------- */
const STAGES=[['ebook','📖 E-book','De master: structuur, tips, bewaren, variaties en schrijfstijl.'],['kaart','🃏 Receptkaart','Afgeleid van het goedgekeurde e-book.'],['workshop','👩‍🍳 Workshop','Afgeleid van e-book en receptkaart.']];
const SECS={titel:'Titel & ondertitel',ingr:'Ingrediënten',ben:'Benodigdheden',f0:'Fase 1 + 3 stappen',f1:'Fase 2 + 3 stappen',f2:'Fase 3 + 3 stappen',bewaren:'Bewaren',variaties:'Variaties',bekentenis:'Bekentenis'};
const STAGESECS={ebook:Object.keys(SECS),kaart:['titel','ingr','ben','f0','f1','f2'],workshop:['titel','ben','f0','f1','f2']};
let PID=null,PST=null,PFILL=false;
const pipe=r=>{r.pipe=r.pipe||{dec:{},log:[],extra:{}};return r.pipe};
const dkey=(st,sec)=>st+':'+sec;
const ok=(r,st,sec)=>['Eens','Aanpassen'].includes(pipe(r).dec[dkey(st,sec)]?.k);
function stageDone(r,st){return STAGESECS[st].every(s=>ok(r,st,s))}
function curStage(r){for(const [st] of STAGES)if(!stageDone(r,st))return st;return null}
function pct(r){const tot=1+STAGES.reduce((a,[st])=>a+STAGESECS[st].length,0);let n=r.steps.some(s=>s.text)||r.ingr?1:0;STAGES.forEach(([st])=>STAGESECS[st].forEach(s=>ok(r,st,s)&&n++));return Math.round(n/tot*100)}
/* stijlcheck: zinnen > 15 woorden, stap zonder tip/alert */
function longSents(t){return (t||'').split(/(?<=[.!?])\s+|\n/).map(x=>x.trim()).filter(x=>x.split(/\s+/).filter(Boolean).length>15)}
function styleFlags(r,sec){const F=[];const chk=(t,w)=>longSents(t).forEach(s=>F.push(`✂️ ${w}: zin van ${s.split(/\s+/).length} woorden (max 15): “${s.slice(0,60)}…”`));
 if(sec=='titel'){chk(r.ondertitel,'Ondertitel');if(!r.title)F.push('⚠️ Titel ontbreekt')}
 else if(sec[0]=='f'&&sec.length==2){const fi=+sec[1];r.steps.slice(fi*3,fi*3+3).forEach((s,j)=>{const n=fi*3+j+1;if(!s.verb)F.push(`⚠️ Stap ${n}: werkwoord ontbreekt`);if(!s.text)F.push(`⚠️ Stap ${n}: beschrijving ontbreekt`);if(!(s.tip||'').trim())F.push(`💡 Stap ${n}: geen tip of alert`);chk(s.text,'Stap '+n);chk(s.tip,'Tip '+n)})}
 else if(['bewaren','bekentenis'].includes(sec)){chk(r[sec],SECS[sec]);if(!(r[sec]||'').trim())F.push(`⚠️ ${SECS[sec]} is nog leeg`)}
 else if(sec=='variaties'&&!(r.variaties||'').trim())F.push('⚠️ Nog geen variaties');
 else if(['ingr','ben'].includes(sec)&&!(r[sec]||'').trim())F.push(`⚠️ ${SECS[sec]} is nog leeg`);return F}
/* sectie-inhoud per stage (zelfde bron, ander formaat) */
function secView(r,st,sec){const L=x=>lines(x).map(l=>`<li>${esc(l)}</li>`).join('')||'<li><i>leeg</i></li>';
 if(sec=='titel')return `<h3 style="font-size:24px">${esc(r.title||'(zonder titel)')}</h3><div class="hand">${esc(r.ondertitel||(st=='kaart'?'Bak met liefde, niet met perfectie':''))}</div>`;
 if(sec=='ingr')return `<ul>${L(r.ingr)}</ul>${st=='workshop'?'<small>Per deelnemer, schaal zelf op.</small>':''}`;
 if(sec=='ben')return `<ul>${L(r.ben)}</ul>${st=='workshop'?'<small>Klaarzetten per deelnemer.</small>':''}`;
 if(sec[0]=='f'&&sec.length==2){const fi=+sec[1],fa=r.fases[fi]||{};return `<b style="color:var(--td)">FASE ${fi+1}: ${esc(fa.naam||'')}</b>${st=='ebook'&&fa.doel?`<br><small>Doel: ${esc(fa.doel)}</small>`:''}`+r.steps.slice(fi*3,fi*3+3).map((s,j)=>`<p style="margin:8px 0"><b>${fi*3+j+1}. ${esc(s.verb||'…')}</b>${st=='kaart'?'':' '+esc(s.text)}${st=='kaart'?`<br><small>${esc(s.text)}</small>`:''}${s.tip?`<br><small>${TI[s.type]||'💡'} ${esc(s.type)}: ${esc(s.tip)}</small>`:''}${st=='workshop'?'<br><small>🎥 Voordoen, dan doen de deelnemers het na.</small>':''}</p>`).join('')}
 if(sec=='variaties')return `<ul>${L(r.variaties)}</ul>`;return `<p>${esc(r[sec]||'')||'<i>leeg</i>'}</p>`}
function secEdit(r,sec){const i=(k,v,ph)=>`<input placeholder="${ph}" value="${esc(v||'')}" onchange="pSet('${k}',this.value)">`,t=(k,v,ph)=>`<textarea placeholder="${ph}" onchange="pSet('${k}',this.value)">${esc(v||'')}</textarea>`;
 if(sec=='titel')return i('title',r.title,'Titel')+i('ondertitel',r.ondertitel,'Ondertitel (max 15 woorden)');
 if(['ingr','ben','variaties'].includes(sec))return '<small>Eén per regel</small>'+t(sec,r[sec],'');
 if(['bewaren','bekentenis'].includes(sec))return t(sec,r[sec],SECS[sec]);
 const fi=+sec[1];return i(`fases.${fi}.naam`,r.fases[fi]?.naam,'Fasenaam')+r.steps.slice(fi*3,fi*3+3).map((s,j)=>{const n=fi*3+j;return `<div style="border-left:3px solid var(--line);padding-left:8px;margin-top:8px">${i(`steps.${n}.verb`,s.verb,'Werkwoord')}${t(`steps.${n}.text`,s.text,'Wat doe je?')}<select onchange="pSet('steps.${n}.type',this.value)">${TT.map(x=>`<option ${x==s.type?'selected':''}>${x}</option>`).join('')}</select>${i(`steps.${n}.tip`,s.tip,'Tip / alert / mantra')}</div>`}).join('')}
async function pSet(path,v){const l=await recipes();const r=l.find(x=>x.id==PID);const k=path.split('.');let o=r;for(let j=0;j<k.length-1;j++)o=o[k[j]];o[k.at(-1)]=v;delete r.voorbeeld;await put('recipes',l)}
let PEDIT=null;
async function pDec(sec,k){const l=await recipes();const r=l.find(x=>x.id==PID);const P=pipe(r);const st=PST;const c=($('#pc-'+sec)?.value||'').trim();
 if(k=='Aanpassen'&&PEDIT!=sec){PEDIT=sec;return render()}
 PEDIT=null;P.dec[dkey(st,sec)]={k,c,t:Date.now()};P.log.push({t:new Date().toISOString(),stage:st,sec,k,c});await put('recipes',l);navigator.vibrate?.(15);
 if(stageDone(r,st)){const n=curStage(r);PST=n||st}render()}
async function pExtra(sec,inp){const l=await recipes();const r=l.find(x=>x.id==PID);const P=pipe(r);P.extra[sec]=P.extra[sec]||[];
 if(inp){for(const f of inp.files){const id=await addFile({sid:'rec:'+r.id,slot:'extra:'+sec,kind:'foto',blob:f,type:f.type,t:Date.now()});P.extra[sec].push({type:'foto',id})}}
 else{const t=($('#px-'+sec)?.value||'').trim();if(!t)return;P.extra[sec].push({type:'note',text:t})}
 P.log.push({t:new Date().toISOString(),stage:PST,sec,k:'+ content',c:inp?'foto':'notitie'});await put('recipes',l);render()}
const AI=`<div class="card" style="border:2px dashed var(--pink)"><h3>🤖 Fien AI <span class="tag">binnenkort</span></h3><small>Hier komt later: recept onderzoeken (bron, varianten), invullen in de Bubbly-schrijfstijl, tips en bewaaradvies voorstellen. Nu nog niet actief: Fien gebruikt alleen jouw tekst en de vaste parser. Er wordt niets verzonnen.</small><p class="row"><button class="btn s" disabled>🔎 Onderzoek recept</button><button class="btn s" disabled>✍️ Vul in Bubbly-stijl</button></p></div>`;
async function pipeView(){const l=await recipes();const r=l.find(x=>x.id==PID);if(!r){PID=null;return VIEWS.rec()}const P=pipe(r);
 if(PFILL)return fillView(r);
 PST=PST||curStage(r)||'workshop';const st=PST;const p=pct(r);
 const ph=await filesOf('rec:'+r.id);const phU=id=>{const f=ph.find(x=>x.id==id);if(!f)return'';const u=URL.createObjectURL(f.blob);urls.push(u);return u};
 const head=`<div class="card"><div class="row"><button class="btn s xs" onclick="PID=null;PST=null;render()">◀</button><h2 class="grow">${esc(r.title||'Nieuw recept')}</h2></div>
 <small>Van idee → formulier → E-book → Receptkaart → Workshop = asset</small><div class="bar" style="margin:6px 0"><i style="width:${p}%"></i></div><small><b>${p}%</b> ${p==100?'🎉 Klaar als brand asset!':''}</small>
 <div class="row" style="margin-top:8px">${STAGES.map(([k,n])=>`<button class="btn stagepill ${k==st?'':'s'} xs" onclick="PST='${k}';render()">${stageDone(r,k)?'✅':''} ${n}</button>`).join('')}</div>
 <small>${STAGES.find(x=>x[0]==st)[2]} ${st!='ebook'&&!stageDone(r,'ebook')?'<b>Tip: keur eerst het e-book goed; wijzigingen stromen automatisch door.</b>':''}</small></div>`;
 const cards=STAGESECS[st].map(sec=>{const d=P.dec[dkey(st,sec)];const F=styleFlags(r,sec);const ex=P.extra[sec]||[];
  return `<div class="card swipe pcard ${d?'dk-'+d.k.replace(/ /g,''):''}" data-sec="${sec}"><div class="row"><b class="grow">${SECS[sec]}</b>${d?`<span class="chk ${d.k=='Niet eens'?'':'ok'}">${d.k}</span>`:''}</div>
  ${PEDIT==sec?secEdit(r,sec):secView(r,st,sec)}
  ${F.length?`<div class="note" style="background:#FFF3DC;border-color:#C76B00;font-size:13px">${F.map(esc).join('<br>')}</div>`:'<small>✅ Stijlcheck ok</small>'}
  ${ex.map(e=>e.type=='note'?`<div class="note" style="font-size:13px">➕ ${esc(e.text)}</div>`:`<img src="${phU(e.id)}" style="width:72px;height:90px;object-fit:cover;border-radius:10px;margin:4px 4px 0 0">`).join('')}
  <textarea id="pc-${sec}" placeholder="Opmerking (mag leeg)" style="min-height:44px;margin-top:6px">${esc(d?.c||'')}</textarea>
  <div class="decrow">${PEDIT==sec?`<button class="btn" style="grid-column:1/-1" onclick="pDec('${sec}','Aanpassen')">💾 Opslaan & goedkeuren</button>`:['Eens','Aanpassen','Niet eens'].map(o=>`<button class="btn ${d?.k==o?'':'s'}" onclick="pDec('${sec}','${o}')">${o}</button>`).join('')}</div>
  <details style="margin-top:6px"><summary style="min-height:40px;padding:8px 0">+ content</summary><div class="row"><input id="px-${sec}" class="grow" style="width:auto" placeholder="Notitie, bv. extra tip"><button class="btn s xs" onclick="pExtra('${sec}')">+</button><label class="btn s xs">📷<input type="file" accept="image/*" capture="environment" class="hidden" onchange="pExtra('${sec}',this)"></label></div></details></div>`}).join('');
 const nxt=curStage(r);
 return head+`<small style="display:block;margin:4px 6px">Veeg naar rechts = Eens, links = Niet eens.</small>`+cards+
 `<div class="card row"><button class="btn kook grow" onclick="kookOpen('rec','${r.id}')">👩‍🍳 Kookmodus</button><button class="btn s grow" onclick="PID=null;RID='${r.id}';render()">📄 Uitvoer & export</button></div>${AI}
 <div class="card"><h3>🗒️ Besluitenlog (${P.log.length})</h3>${P.log.slice(-8).reverse().map(x=>`<small style="display:block">${x.t.slice(5,16).replace('T',' ')} · ${x.stage} · ${SECS[x.sec]||x.sec}: <b>${esc(x.k)}</b>${x.c?' — '+esc(x.c):''}</small>`).join('')||'<small>Nog leeg.</small>'}<small>Gaat mee in de ZIP en de Notion-tekst.</small></div>`}
/* live invullen (zelfde UI waar straks Fien AI in schrijft) */
const FILLF=r=>[['Titel',r.title],['Ondertitel',r.ondertitel],['Ingrediënten',r.ingr],['Benodigdheden',r.ben],...r.fases.map((f,i)=>['Fase '+(i+1),f.naam]),...r.steps.map((s,i)=>[`Stap ${i+1}`,[s.verb,s.text,s.tip&&('('+s.type+': '+s.tip+')')].filter(Boolean).join(' — ')]),['Bewaren',r.bewaren],['Variaties',r.variaties],['Bekentenis',r.bekentenis]];
function fillView(r){return `<div class="card"><h2>✨ Fien vult het formulier…</h2><small>Bron: ${esc(r.bron||'idee')}. Nu met de vaste parser; straks schrijft Fien AI hier live mee.</small><div class="bar" style="margin:8px 0"><i id="fbar" style="width:0"></i></div>
 ${FILLF(r).map(([k],i)=>`<div class="fl" style="margin:6px 0"><small><b>${k}</b></small><div id="ff${i}" class="ffv" style="min-height:24px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:6px 8px;white-space:pre-wrap"></div></div>`).join('')}
 <button class="btn s" onclick="FILLSKIP=1">Sla animatie over ▶</button></div>`}
let FILLSKIP=0;
async function runFill(){const r=(await recipes()).find(x=>x.id==PID);const F=FILLF(r);FILLSKIP=0;const sl=ms=>new Promise(o=>setTimeout(o,ms));
 for(let i=0;i<F.length;i++){const el=$('#ff'+i);if(!el)return;const v=(F[i][1]||'').toString();el.scrollIntoView({block:'nearest'});el.style.borderColor='var(--t)';
  if(!v){el.innerHTML='<i style="color:#A08070">nog leeg — vul je straks zelf aan</i>';await sl(FILLSKIP?0:120)}
  else{const step=Math.max(2,Math.ceil(v.length/25));for(let c=0;c<=v.length;c+=step){if(FILLSKIP)break;el.textContent=v.slice(0,c)+'▍';await sl(16)}el.textContent=v}
  el.style.borderColor='';const b=$('#fbar');if(b)b.style.width=Math.round((i+1)/F.length*100)+'%'}
 await sl(FILLSKIP?0:500);PFILL=false;scrollTo(0,0);render()}
/* idee-invoer */
async function ideaStart(){const t=($('#idea')?.value||'').trim(),px=($('#ideatxt')?.value||'').trim();if(!t&&!px)return alert('Typ een idee, plak een link of tekst.');
 let r;const isUrl=/^https?:\/\//i.test(t);
 if(px){r=parseRecipe(px);r.bron=isUrl?t:'geplakte tekst';if(t&&!isUrl)r.title=t}
 else{r=emptyRecipe();if(isUrl){r.bron=t;r.title=decodeURIComponent(t.replace(/[?#].*$/,'').replace(/\/$/,'').split('/').pop()||'').replace(/[-_]+/g,' ').replace(/\.\w+$/,'').replace(/^\w/,c=>c.toUpperCase())}else{r.title=t;r.bron='idee'}}
 await saveRecipe(r);PID=r.id;PST=null;PFILL=true;render()}
async function ideaFoto(inp){const r=emptyRecipe();r.bron='foto';r.title=($('#idea')?.value||'').trim();await saveRecipe(r);for(const f of inp.files)await addFile({sid:'rec:'+r.id,slot:'foto',kind:'foto',blob:f,type:f.type,t:Date.now()});PID=r.id;PFILL=true;render()}
const IDEA=`<div class="card hero"><h2>✨ Zelf invullen</h2><small>Of plak tekst / foto — Fien vult het formulier, daarna keur jij goed (e-book → receptkaart → workshop).</small>
 <input id="idea" placeholder="Idee of link, bv. Chocolate chip cookies" style="margin-top:8px"><textarea id="ideatxt" placeholder="Optioneel: plak de recepttekst" style="min-height:60px"></textarea>
 <div class="row"><button class="btn" onclick="ideaStart()">✨ Start</button><label class="btn s">📷 Foto<input type="file" accept="image/*" capture="environment" class="hidden" onchange="ideaFoto(this)"></label></div></div>`;
const _rec=VIEWS.rec;
VIEWS.rec=async()=>{if(PID)return pipeView();let h=await _rec();if(!RID)return IDEA+h;
 if(RID!='__plak'){const r=(await recipes()).find(x=>x.id==RID);if(r)h=`<div class="card row"><div class="grow"><b>✨ Van idee tot asset</b><br><small>${pct(r)}% · E-book → Receptkaart → Workshop</small></div><button class="btn" onclick="PID='${r.id}';PST=null;render()">Goedkeuren ▶</button></div>`+h}return h};
VIEWS.rec.after=()=>{if(PFILL)return runFill();document.querySelectorAll('.pcard').forEach(el=>{let x0=null,y0=null;el.addEventListener('touchstart',e=>{if(e.target.closest('input,textarea,select,summary'))return;x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
 el.addEventListener('touchmove',e=>{if(x0!=null)el.style.transform=`translateX(${(e.touches[0].clientX-x0)/3}px)`},{passive:true});
 el.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0,dy=Math.abs(e.changedTouches[0].clientY-y0);el.style.transform='';x0=null;if(Math.abs(dx)>90&&dy<60)pDec(el.dataset.sec,dx>0?'Eens':'Niet eens')})})};
/* besluitenlog voor md en zip */
function logTxt(r){const P=r.pipe;if(!P||!P.log.length)return '';return P.log.map(x=>`- ${x.t.slice(0,16).replace('T',' ')} · ${x.stage} · ${SECS[x.sec]||x.sec}: ${x.k}${x.c?' — '+x.c:''}`).join('\n')}
