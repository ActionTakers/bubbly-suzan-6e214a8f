'use strict';
/* Mijn taken — eigen tab. Berichten blijven vindbaar na «Gelezen». Geen codes in beeld.
   Akkoord gaat als gewoon Fien-verzoek naar de relay (POST /verzoek), het publiceert niets. */

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

async function takenLoad(){
  try{const v=typeof get==='function'?await get(TAKEN_AKKOORD_KEY):null;return (v&&typeof v==='object'&&!Array.isArray(v))?v:{}}catch(e){return{}}
}
async function takenSave(id,row){
  const all=await takenLoad();all[id]=row;if(typeof put==='function')await put(TAKEN_AKKOORD_KEY,all);return row;
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
  const seen=typeof berichtenGelezen==='function'?berichtenGelezen():[];
  const ant=window._takenAnt||{};
  return TAKEN_VAST.some(t=>{const s=takenToon(t,ant[t.id]);return s.open&&(t.status==='wacht'||s.opnieuw)})||false;
}

if(typeof VIEWS==='object'){
  VIEWS.taken=async()=>{
    await takenRetryOpen({stil:true});
    const list=await takenBerichten();window._takenBerichten=list;
    const ant=window._takenAnt=await takenLoad();
    if(typeof navR==='function')navR();
    const seen=typeof berichtenGelezen==='function'?berichtenGelezen():[];
    const open=TAKEN_VAST.filter(t=>takenToon(t,ant[t.id]).open);
    const klaar=TAKEN_VAST.filter(t=>takenToon(t,ant[t.id]).klaarLijst);
    const openBer=list.filter(b=>b.status!=='beantwoord');
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
    function kaart(t){
      const s=takenToon(t,ant[t.id]);
      const pill=s.st==='klaar'?'klaar':s.st==='bezig'?'bezig':'vraag';
      const kijk=t.go?`<button type="button" class="btn s xs" onclick="(${t.go.name})()">${esc(t.knop||'Bekijk')}</button>`:'';
      return `<article class="ai-card ${pill}"><div class="ai-top"><div class="grow"><h3 class="ai-title">${esc(t.titel)}</h3></div><span class="ai-pill ${pill}">${esc(s.label)}</span></div><p class="ai-msg">${esc(t.tekst||'')}</p><div class="ai-acts">${kijk}</div>${akkoordBlok(t,s)}</article>`;
    }
    function berKaart(b){
      const gelezen=seen.includes(b.id);
      const kijk=b&&typeof b.kijk==='string'&&/^FA-[A-Z0-9]{4,24}$/.test(b.kijk);
      const knop=esc(b.knop||(kijk?'Bekijk':'Open'));
      const act=(kijk||b.antwoord!=null)?`<button type="button" class="btn s xs" onclick="takenOpenById('${b.id}')">${knop}</button>`:'';
      const lees=gelezen?'':`<button type="button" class="btn ghost xs" onclick="berichtGelezen('${b.id}');go('taken')">Gelezen ✓</button>`;
      return `<article class="ai-card ${gelezen?'':'vraag'}"><div class="ai-top"><div class="grow"><h3 class="ai-title">${esc(b.t)}</h3></div><span class="ai-pill ${gelezen?'klaar':'vraag'}">${gelezen?'Gelezen':'Nieuw'}</span></div><div class="ai-acts">${act}${lees}</div></article>`;
    }
    return `<div class="card hero"><h2>Mijn taken</h2><p class="hand" style="margin:4px 0 0">Wat er nog van je wordt gevraagd, op één plek.</p></div>
  <p class="st-uitleg">Open taken eerst. Een bericht blijft hier staan, ook als je het op Start als gelezen hebt gemarkeerd.</p>
  ${open.length?`<h3 class="ai-list-h">Open</h3><div class="ai-list">${open.map(kaart).join('')}</div>`:''}
  ${klaar.length?`<h3 class="ai-list-h">Klaar</h3><div class="ai-list">${klaar.map(kaart).join('')}</div>`:''}
  <h3 class="ai-list-h">Berichten van Fien</h3>
  <div class="ai-list">${openBer.length?openBer.map(berKaart).join(''):'<div class="card soft"><small>Nog geen berichten.</small></div>'}</div>
  <div class="card soft"><small>Fien zet zelf niets op je website. Jouw antwoord komt bij Fien terecht. Er gaat nog niets live.</small></div>`;
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
  module.exports={takenAkkoordIdee,takenAkkoordVraag,takenToon,takenNieuweId,TAKEN_VAST};
}
