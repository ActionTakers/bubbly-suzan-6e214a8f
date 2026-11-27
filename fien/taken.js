'use strict';
/* Mijn taken — eigen tab. Berichten blijven vindbaar na «Gelezen». Geen codes in beeld. */

function takenOpenRecept(){if(typeof aiOpenBericht==='function')aiOpenBericht('FA-8NPNPK')}
function takenOpenKaart(){if(typeof aiOpenBericht==='function')aiOpenBericht('FA-KAARTCC')}
function takenOpenBlog(){if(typeof aiOpenBericht==='function')aiOpenBericht('FA-Z8OHVQ')}

const TAKEN_VAST=[
  {id:'pepernoten-online',titel:'Pepernoten op de site',tekst:'Het recept is klaar in de app. Kijk of het klopt. Daarna maakt Fien de pagina klaar. Het staat nog niet op de site.',status:'wacht',knop:'Bekijk het recept',go:takenOpenRecept},
  {id:'kaartstijl',titel:'Nieuwe stijl voor je receptkaarten',tekst:'Hier is een voorbeeld: je Chocolate Chip Cookies, in een nieuwe stijl. Vind je deze mooi? Stuur Fien een berichtje.',status:'wacht',knop:'Bekijk de kaart',go:takenOpenKaart},
  {id:'pepernoten-blog',titel:'Je blog over pepernoten',tekst:'Fien heeft een blog klaargezet over pepernoten die ongelijk bakken. Kijk of de toon klopt. Hij staat nog niet op de site.',status:'wacht',knop:'Bekijk het blog',go:takenOpenBlog}
];

const ST_LABEL={wacht:'Wacht op jouw akkoord',bezig:'Fien is bezig',klaar:'Klaar'};

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
  return TAKEN_VAST.some(t=>t.status==='wacht')||false;
}

VIEWS.taken=async()=>{
  const list=await takenBerichten();window._takenBerichten=list;
  const seen=typeof berichtenGelezen==='function'?berichtenGelezen():[];
  const open=TAKEN_VAST.filter(t=>t.status!=='klaar');
  const klaar=TAKEN_VAST.filter(t=>t.status==='klaar');
  const openBer=list.filter(b=>b.status!=='beantwoord');
  function kaart(t){
    const st=t.status||'wacht';
    return `<article class="ai-card ${st==='klaar'?'klaar':st==='bezig'?'bezig':'vraag'}"><div class="ai-top"><div class="grow"><h3 class="ai-title">${esc(t.titel)}</h3></div><span class="ai-pill ${st==='klaar'?'klaar':st==='bezig'?'bezig':'vraag'}">${esc(ST_LABEL[st]||st)}</span></div><p class="ai-msg">${esc(t.tekst||'')}</p><div class="ai-acts">${t.go?`<button type="button" class="btn xs" onclick="(${t.go.name})()">${esc(t.knop||'Bekijk')}</button>`:''}</div></article>`;
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
  <div class="card soft"><small>Fien zet zelf niets op je website. Als je akkoord geeft, maakt Fien een voorbeeld klaar.</small></div>`;
};

/* Stipje op de tab Taken als er iets wacht */
(function(){
  const prev=typeof navBadge==='function'?navBadge:()=>false;
  navBadge=function(k){if(k==='taken'&&takenBadgeOn())return true;return prev(k)};
})();
