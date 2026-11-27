'use strict';
/* Mijn taken — eigen tab. Berichten blijven vindbaar na «Gelezen». Geen codes in beeld.
   Akkoord gaat als gewoon Fien-verzoek naar de relay (POST /verzoek), het publiceert niets.
   Klaar-lijst en verwijderen zijn alleen op deze telefoon; een akkoord blijft bewaard. */

function takenOpenRecept(){if(typeof aiOpenBericht==='function')aiOpenBericht('FA-8NPNPK')}
function takenOpenKaart(){if(typeof aiOpenBericht==='function')aiOpenBericht('FA-KAARTCC')}
function takenOpenBlog(){if(typeof aiOpenBericht==='function')aiOpenBericht('FA-Z8OHVQ')}
function takenOpenLivePepernoten(){window.open('https://bubblybakery.nl/recepten/pepernoten/','_blank','noopener')}

const TAKEN_VAST=[
  {id:'pepernoten-online',titel:'Pepernoten op de site',tekst:'Je pepernoten staan nu op de site. Kijk gerust of alles klopt.',status:'klaar',knop:'Open de pagina',go:takenOpenLivePepernoten},
  {id:'kaartstijl',titel:'Nieuwe stijl voor je receptkaarten',tekst:'Hier is een voorbeeld: je Chocolate Chip Cookies, in een nieuwe stijl. Vind je deze mooi?',status:'wacht',knop:'Bekijk de kaart',go:takenOpenKaart},
  {id:'pepernoten-blog',titel:'Je blog over pepernoten',tekst:'Fien heeft een blog klaargezet over pepernoten die ongelijk bakken. Kijk of de toon klopt. Hij staat nog niet op de site.',status:'wacht',knop:'Bekijk het blog',go:takenOpenBlog}
];

const ST_LABEL={wacht:'Wacht op jouw akkoord',bezig:'Fien is bezig',klaar:'Klaar'};
const TAKEN_AKKOORD_KEY='takenAkkoord';
const TAKEN_WEG_KEY='takenWeg';
const TAKEN_ID=/^FA-[A-Z0-9]{2,24}$/;

function takenAkkoordIdee(titel,antwoord,notitie){
  const ant=antwoord==='ja'?'Ja, dit is goed':'Liever anders';
  let s='Akkoord op taak (geen nieuw recept, niet publiceren). Taak: '+String(titel||'').trim()+'. Antwoord: '+ant+'.';
  const n=String(notitie||'').trim();
  if(n)s+=' Toelichting: '+n;
  return s.slice(0,500);
}
function takenNieuweId(){
  if(typeof window!=='undefined'&&window.AITESTID)return String(window.AITESTID);
  return 'FA-'+Date.now().toString(36).toUpperCase().slice(-6);
}
function takenIsTest(){
  if(typeof window!=='undefined'&&window.AITESTID)return true;
  try{return (typeof localStorage!=='undefined'&&localStorage.getItem('fienTest')==='1')}catch(e){return false}
}
function takenAkkoordVraag(taak,ant){
  return{
    id:ant.id,
    idee:takenAkkoordIdee(taak.titel,ant.antwoord,ant.notitie),
    receptId:String(taak.id||'').slice(0,40),
    t:ant.t,
    ...(ant.test?{test:true}:{}),
    ...(ant.droog?{droog:true}:{})
  };
}
function takenToon(t,ant){
  if(!ant)return{st:t.status||'wacht',label:ST_LABEL[t.status]||ST_LABEL.wacht,open:(t.status||'wacht')!=='klaar',klaarLijst:(t.status||'')==='klaar'};
  if(ant.verzonden===false)return{st:'wacht',label:'Fien krijgt het zo',open:true,klaarLijst:false,opnieuw:true};
  if(ant.antwoord==='ja')return{st:'klaar',label:'Doorgegeven aan Fien',open:false,klaarLijst:true};
  return{st:'klaar',label:'Fien past het aan',open:false,klaarLijst:true};
}

function takenWegLeeg(){return{taak:{},bericht:{}}}
function takenWegNorm(v){
  const o=takenWegLeeg();
  if(!v||typeof v!=='object'||Array.isArray(v))return o;
  if(v.taak&&typeof v.taak==='object')o.taak=Object.assign({},v.taak);
  if(v.bericht&&typeof v.bericht==='object')o.bericht=Object.assign({},v.bericht);
  return o;
}
function takenIsWeg(weg,soort,id){
  const w=takenWegNorm(weg);
  return !!(id&&w[soort]&&w[soort][id]);
}
function takenWegZet(weg,soort,id,aan){
  const w=takenWegNorm(weg);
  const bak=Object.assign({},w[soort]||{});
  if(aan)bak[id]=true;else delete bak[id];
  w[soort]=bak;return w;
}
function takenKlaarStukken(vast,ant,list,seen,weg){
  const open=[],klaarT=[],nieuw=[],gelezen=[];
  for(const t of vast){
    if(takenIsWeg(weg,'taak',t.id))continue;
    const s=takenToon(t,ant&&ant[t.id]);
    if(s.open)open.push(t);
    else if(s.klaarLijst)klaarT.push(t);
  }
  for(const b of (list||[])){
    if(!b||!b.id||b.status==='beantwoord')continue;
    if(takenIsWeg(weg,'bericht',b.id))continue;
    if((seen||[]).includes(b.id))gelezen.push(b);else nieuw.push(b);
  }
  return{open,klaarT,nieuw,gelezen,klaarN:klaarT.length+gelezen.length};
}

async function takenLoad(){
  try{const v=typeof get==='function'?await get(TAKEN_AKKOORD_KEY):null;return (v&&typeof v==='object'&&!Array.isArray(v))?v:{}}catch(e){return{}}
}
async function takenSave(id,row){
  const all=await takenLoad();all[id]=row;if(typeof put==='function')await put(TAKEN_AKKOORD_KEY,all);return row;
}
async function takenWegLoad(){
  try{const v=typeof get==='function'?await get(TAKEN_WEG_KEY):null;return takenWegNorm(v)}catch(e){return takenWegLeeg()}
}
async function takenWegSave(w){
  const n=takenWegNorm(w);if(typeof put==='function')await put(TAKEN_WEG_KEY,n);return n;
}

function takenAndersOpen(id){
  const box=document.getElementById('taken-anders-'+id);if(!box)return;
  const open=box.hasAttribute('hidden');
  box.toggleAttribute('hidden',!open);
  if(open){const ta=document.getElementById('taken-note-'+id);if(ta){ta.focus();try{ta.setSelectionRange(ta.value.length,ta.value.length)}catch(e){}}}
}

async function takenAkkoord(id,antwoord){
  const t=TAKEN_VAST.find(x=>x.id===id);if(!t)return;
  const all=await takenLoad();const prev=all[id];
  if(prev&&prev.verzonden!==false)return;
  let notitie='';
  if(antwoord==='anders'){notitie=(document.getElementById('taken-note-'+id)?.value||'').trim()}
  const test=takenIsTest();
  const row={
    antwoord,notitie,
    id:(prev&&TAKEN_ID.test(prev.id))?prev.id:takenNieuweId(),
    t:(prev&&prev.t)||new Date().toISOString(),
    test,droog:test
  };
  await takenSave(id,row);
  if(typeof render==='function')await render();
  let ok=false;
  if(typeof aiPost==='function'){
    try{ok=await aiPost(takenAkkoordVraag(t,row))}catch(e){ok=false}
  }
  await takenSave(id,Object.assign({},row,{verzonden:ok}));
  if(typeof render==='function')await render();
}

async function takenOpnieuw(id){
  const t=TAKEN_VAST.find(x=>x.id===id);if(!t)return;
  const all=await takenLoad();const row=all[id];if(!row||row.verzonden!==false)return;
  let ok=false;
  if(typeof aiPost==='function'){
    try{ok=await aiPost(takenAkkoordVraag(t,row))}catch(e){ok=false}
  }
  await takenSave(id,Object.assign({},row,{verzonden:ok}));
  if(typeof render==='function')await render();
}

async function takenRetryOpen(opts){
  const all=await takenLoad();
  let changed=false;
  for(const t of TAKEN_VAST){
    const row=all[t.id];if(!row||row.verzonden!==false)continue;
    let ok=false;
    if(typeof aiPost==='function'){try{ok=await aiPost(takenAkkoordVraag(t,row))}catch(e){ok=false}}
    await takenSave(t.id,Object.assign({},row,{verzonden:ok}));
    changed=true;
  }
  if(changed&&!(opts&&opts.stil)&&typeof tab!=='undefined'&&tab==='taken'&&typeof render==='function')await render();
}

function takenKlaarToggle(el){
  if(typeof window!=='undefined')window._takenKlaarOpen=!!(el&&el.open);
}

function takenToonToast(onUndo){
  if(typeof document==='undefined')return;
  let el=document.getElementById('fien-toast');
  if(!el){el=document.createElement('div');el.id='fien-toast';el.setAttribute('role','status');document.body.appendChild(el)}
  el.innerHTML='Verwijderd · <button type="button" class="taken-undo" id="taken-undo-btn">Ongedaan maken</button>';
  el.classList.add('on','act');
  const btn=document.getElementById('taken-undo-btn');
  if(btn)btn.onclick=async ev=>{ev.preventDefault();clearTimeout(takenToonToast._t);el.classList.remove('on','act');if(typeof onUndo==='function')await onUndo()};
  clearTimeout(takenToonToast._t);
  takenToonToast._t=setTimeout(()=>el.classList.remove('on','act'),7000);
}

async function takenVerwijder(soort,id){
  if(soort!=='taak'&&soort!=='bericht'||!id)return;
  const prev=await takenWegLoad();
  if(takenIsWeg(prev,soort,id))return;
  await takenWegSave(takenWegZet(prev,soort,id,true));
  if(typeof window!=='undefined')window._takenKlaarOpen=true;
  if(typeof window!=='undefined')window._takenWisVraag=false;
  if(typeof render==='function')await render();
  takenToonToast(async()=>{
    await takenWegSave(prev);
    if(typeof window!=='undefined')window._takenKlaarOpen=true;
    if(typeof render==='function')await render();
  });
}

function takenWisVraag(aan){
  if(typeof window!=='undefined'){window._takenWisVraag=!!aan;window._takenKlaarOpen=true}
  if(typeof render==='function')render();
}

async function takenWisAlles(){
  const list=await takenBerichten();
  const ant=await takenLoad();
  const seen=typeof berichtenGelezen==='function'?berichtenGelezen():[];
  const prev=await takenWegLoad();
  const st=takenKlaarStukken(TAKEN_VAST,ant,list,seen,prev);
  if(!st.klaarN){if(typeof window!=='undefined')window._takenWisVraag=false;if(typeof render==='function')await render();return}
  let next=takenWegNorm(prev);
  for(const t of st.klaarT)next=takenWegZet(next,'taak',t.id,true);
  for(const b of st.gelezen)next=takenWegZet(next,'bericht',b.id,true);
  await takenWegSave(next);
  if(typeof window!=='undefined'){window._takenWisVraag=false;window._takenKlaarOpen=false}
  if(typeof render==='function')await render();
  takenToonToast(async()=>{
    await takenWegSave(prev);
    if(typeof window!=='undefined')window._takenKlaarOpen=true;
    if(typeof render==='function')await render();
  });
}

async function takenBerichten(){
  try{
    const r=await fetch('berichten.json',{cache:'no-store'});
    if(!r.ok)return[];
    const j=await r.json();
    return Array.isArray(j)?j.filter(x=>x&&x.t):[];
  }catch(e){return[]}
}

function takenOpenBericht(b){
  if(b&&typeof b.kijk==='string'&&typeof aiOpenBericht==='function'&&/^FA-[A-Z0-9]{4,24}$/.test(b.kijk)){
    aiOpenBericht(b.kijk);return;
  }
  if(b&&b.antwoord!=null&&typeof berichtAntwoord==='function')berichtAntwoord(b.id);
}
function takenOpenById(id){
  const b=(window._takenBerichten||[]).find(x=>x.id===id);
  if(b)takenOpenBericht(b);
}

function takenBadgeOn(){
  const ant=window._takenAnt||{};
  const weg=window._takenWeg||takenWegLeeg();
  return TAKEN_VAST.some(t=>{
    if(takenIsWeg(weg,'taak',t.id))return false;
    const s=takenToon(t,ant[t.id]);
    return s.open&&(t.status==='wacht'||s.opnieuw);
  })||false;
}

if(typeof VIEWS==='object'){
  VIEWS.taken=async()=>{
    await takenRetryOpen({stil:true});
    const list=await takenBerichten();window._takenBerichten=list;
    const ant=window._takenAnt=await takenLoad();
    const weg=window._takenWeg=await takenWegLoad();
    if(typeof navR==='function')navR();
    const seen=typeof berichtenGelezen==='function'?berichtenGelezen():[];
    const st=takenKlaarStukken(TAKEN_VAST,ant,list,seen,weg);
    const klaarOpen=typeof window!=='undefined'&&!!window._takenKlaarOpen;
    const wisVraag=typeof window!=='undefined'&&!!window._takenWisVraag;
    function akkoordBlok(t,s){
      if(!s.open||t.status!=='wacht')return'';
      if(s.opnieuw)return `<div class="taken-akkoord"><p class="ai-note">Je antwoord is bewaard. Zodra er weer bereik is, stuur ik het naar Fien. Niets gaat live.</p><button type="button" class="btn xl" onclick="takenOpnieuw('${t.id}')">Opnieuw versturen</button></div>`;
      return `<div class="taken-akkoord">
        <button type="button" class="btn xl" onclick="takenAkkoord('${t.id}','ja')">Ja, dit is goed</button>
        <button type="button" class="btn s xl" onclick="takenAndersOpen('${t.id}')">Liever anders</button>
        <div id="taken-anders-${t.id}" class="taken-anders" hidden>
          <label for="taken-note-${t.id}">Wat wil je anders?</label>
          <textarea id="taken-note-${t.id}" rows="3" maxlength="400" placeholder="Kort is genoeg. Mag ook leeg blijven."></textarea>
          <button type="button" class="btn xl" onclick="takenAkkoord('${t.id}','anders')">Dit doorgeven aan Fien</button>
        </div>
      </div>`;
    }
    function wegKnop(soort,id){
      return `<button type="button" class="btn ghost xs taken-weg" onclick="takenVerwijder('${soort}','${id}')">Verwijder</button>`;
    }
    function kaart(t,inKlaar){
      const s=takenToon(t,ant[t.id]);
      const pill=s.st==='klaar'?'klaar':s.st==='bezig'?'bezig':'vraag';
      const kijk=t.go?`<button type="button" class="btn s xs" onclick="(${t.go.name})()">${esc(t.knop||'Bekijk')}</button>`:'';
      return `<article class="ai-card ${pill}"><div class="ai-top"><div class="grow"><h3 class="ai-title">${esc(t.titel)}</h3></div><span class="ai-pill ${pill}">${esc(s.label)}</span></div><p class="ai-msg">${esc(t.tekst||'')}</p><div class="ai-acts">${kijk}${inKlaar?wegKnop('taak',t.id):''}</div>${akkoordBlok(t,s)}</article>`;
    }
    function berKaart(b,inKlaar){
      const gelezen=seen.includes(b.id);
      const kijk=b&&typeof b.kijk==='string'&&/^FA-[A-Z0-9]{4,24}$/.test(b.kijk);
      const knop=esc(b.knop||(kijk?'Bekijk':'Open'));
      const act=(kijk||b.antwoord!=null)?`<button type="button" class="btn s xs" onclick="takenOpenById('${b.id}')">${knop}</button>`:'';
      const lees=gelezen?'':`<button type="button" class="btn ghost xs" onclick="berichtGelezen('${b.id}');go('taken')">Gelezen ✓</button>`;
      return `<article class="ai-card ${gelezen?'klaar':'vraag'}"><div class="ai-top"><div class="grow"><h3 class="ai-title">${esc(b.t)}</h3></div><span class="ai-pill ${gelezen?'klaar':'vraag'}">${gelezen?'Gelezen':'Nieuw'}</span></div><div class="ai-acts">${act}${lees}${inKlaar?wegKnop('bericht',b.id):''}</div></article>`;
    }
    const klaarBlok=st.klaarN?`<details class="taken-klaar"${klaarOpen?' open':''} ontoggle="takenKlaarToggle(this)">
      <summary><span>Klaar</span><b class="taken-klaar-n">${st.klaarN}</b></summary>
      <div class="ai-list">${st.klaarT.map(t=>kaart(t,true)).join('')}${st.gelezen.map(b=>berKaart(b,true)).join('')}</div>
      <div class="taken-klaar-act">
        ${wisVraag?`<div class="taken-wis-vraag"><p>Alles wat klaar is van je lijstje halen?</p><div class="row"><button type="button" class="btn xs" onclick="takenWisAlles()">Ja, haal weg</button><button type="button" class="btn ghost xs" onclick="takenWisVraag(false)">Liever niet</button></div></div>`:`<button type="button" class="btn s xs" onclick="takenWisVraag(true)">Wis alles wat klaar is</button>`}
      </div>
    </details>`:'';
    return `<div class="card hero"><h2>Mijn taken</h2><p class="hand" style="margin:4px 0 0">Wat er nog van je wordt gevraagd, op één plek.</p></div>
  <p class="st-uitleg">Open taken staan bovenaan. Wat klaar is, zit onderaan in Klaar. Daar kun je het ook weghalen.</p>
  ${st.open.length?`<h3 class="ai-list-h">Open</h3><div class="ai-list">${st.open.map(t=>kaart(t,false)).join('')}</div>`:(st.nieuw.length?'':`<p class="st-uitleg">Er staat niets meer open.</p>`)}
  ${st.nieuw.length?`<h3 class="ai-list-h">Berichten van Fien</h3><div class="ai-list">${st.nieuw.map(b=>berKaart(b,false)).join('')}</div>`:''}
  <div class="card soft"><small>Fien zet zelf niets op je website. Jouw antwoord komt bij Fien terecht. Er gaat nog niets live.</small></div>
  ${klaarBlok}`;
  };

  (function(){
    const prev=typeof navBadge==='function'?navBadge:()=>false;
    navBadge=function(k){if(k==='taken'&&takenBadgeOn())return true;return prev(k)};
    if(typeof window!=='undefined'){
      window.addEventListener('online',()=>{takenRetryOpen()});
    }
  })();
}

if(typeof module!=='undefined'&&module.exports){
  module.exports={takenAkkoordIdee,takenAkkoordVraag,takenToon,takenNieuweId,TAKEN_VAST,takenIsWeg,takenWegZet,takenWegNorm,takenWegLeeg,takenKlaarStukken};
}
