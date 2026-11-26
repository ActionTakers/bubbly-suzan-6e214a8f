'use strict';
/* ---------- Praat met Fien ----------
   Intake-chat: Suzan typt, Fien luistert, vraagt kort door en schrijft op wat Suzan wil (recept, vraag, taak, idee, beslissing).
   Fien geeft geen uitleg of adviezen; wat is opgeschreven wordt klaargezet voor de bestaande Fien-flow.
   - Zonder chat-koppeling (meta fien-chat leeg) of met ?demo=1: voorbeeldantwoorden op deze telefoon (geen netwerk).
   - Met koppeling: POST <relay>/chat met een apparaat-sleutel. Het model draait in de relay (Cloudflare Workers AI); er is geen API-sleutel nodig.
   - Geschiedenis staat op deze telefoon (IndexedDB 'chat'); de Worker bewaart een kopie zodat iets een verzoek/taak kan worden. */
const CHAT_KEY='chat',CHAT_TOKEN_KEY='fienChatToken',CHAT_MAX=200,CHAT_SEND=12;
const CHAT_URL=(localStorage.getItem('fienChat')||document.querySelector('meta[name="fien-chat"]')?.content||'').replace(/\/$/,'');
const CHAT_DEMO=!CHAT_URL||/[?&]demo=1\b/.test(location.search);
let chatBusy=false,chatDraft='';
const chatList=async()=>(await get(CHAT_KEY))||[];
const chatSave=l=>put(CHAT_KEY,l.slice(-CHAT_MAX));
const CHAT_TIPS=['Ik wil een recept voor kerst','Een klant vraagt of het notenvrij is','Ik heb een idee voor een workshop','Mijn deeg plakt steeds'];

/* Proef: voorbeeld-intake zonder netwerk. Doorvragen eerst, daarna samenvatten (zelfde vorm als het echte model). */
const SOORT_NAAM={recept:'Receptwens',vraag:'Vraag voor Fien',taak:'Taak',idee:'Idee',beslissing:'Voor jouw beslissing'};
function chatDemo(l){const txt=l[l.length-1].tekst,t=txt.toLowerCase(),eerder=l.filter(m=>m.wie==='suzan').length;
 if(/prij|kost|euro|€|duur|goedkoop/.test(t))return {tekst:'Over prijzen zeg ik niets, dat bepaal jij. Dit zet ik klaar voor jouw beslissing.',soort:'beslissing',klaar:'Vraag over een prijs: '+txt};
 if(/allerg|noten|gluten|lactose|vegan|zwanger|veilig/.test(t))return {tekst:'Daar doe ik geen belofte over. Kijk altijd zelf op de verpakking. Dit zet ik klaar voor jouw beslissing.',soort:'beslissing',klaar:'Vraag over allergie/dieet: '+txt};
 if(/bestel|levering|op voorraad|beschikbaar|reserveer|bezorg/.test(t))return {tekst:'Een bestelling of levering bevestig ik nooit. Dit zet ik klaar voor jouw beslissing.',soort:'beslissing',klaar:'Bestelling of levering: '+txt};
 if(/klacht|boos|verdrietig|moe\b|stress|ruzie|teleurgesteld|uitzondering/.test(t))return {tekst:'Wat vervelend. Neem even rustig adem. 💛 Dit zet ik klaar voor jouw beslissing, dan hoef jij het nu niet op te lossen.',soort:'beslissing',klaar:'Lastig moment: '+txt};
 if(/plak|zakt|mislukt|waarom|hoe kan|hoe moet/.test(t))return {tekst:'Dat kan ik niet goed uitleggen. Zal ik het als vraag voor Fien klaarzetten? Jij beslist.',soort:'vraag',klaar:'Bakvraag: '+txt};
 if(/recept|kerst|taart|koekjes|brood|bakken/.test(t)){if(eerder<2)return {tekst:'Leuk! Voor wanneer of voor hoeveel mensen is het?'};return {tekst:'Mooi. Zal ik dit voor je klaarzetten?',soort:'recept',klaar:'Receptwens: '+l.filter(m=>m.wie==='suzan').map(m=>m.tekst).join(' · ')}}
 if(/hoi|hallo|hey|goedemorgen|goedemiddag|goedenavond/.test(t))return {tekst:'Hoi Suzan! Vertel maar: wat wil je kwijt? 🧁'};
 if(eerder<2)return {tekst:'Dank je. Kun je er iets meer over vertellen?'};
 return {tekst:'Ik heb het opgeschreven. Zal ik dit klaarzetten?',soort:'idee',klaar:txt}}

async function chatToken(){let t=localStorage.getItem(CHAT_TOKEN_KEY);if(t)return t;
 const code=(prompt('Koppelcode voor de chat met Fien (één keer per telefoon):')||'').trim();if(!code)return '';
 const r=await fetch(CHAT_URL+'/chat/koppel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
 if(!r.ok){alert('Die code klopt niet.');return ''}const j=await r.json();if(j&&j.token){localStorage.setItem(CHAT_TOKEN_KEY,j.token);return j.token}return ''}

async function chatAsk(l){if(CHAT_DEMO){await new Promise(ok=>setTimeout(ok,900+Math.random()*700));return chatDemo(l)}
 const token=await chatToken();if(!token)throw Error('geen koppeling');
 const r=await fetch(CHAT_URL+'/chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
  body:JSON.stringify({id:l[l.length-1].id,berichten:l.slice(-CHAT_SEND).map(m=>({wie:m.wie,tekst:m.tekst}))})});
 if(r.status===401){localStorage.removeItem(CHAT_TOKEN_KEY);throw Error('opnieuw koppelen')}
 if(r.status===429)return {tekst:'Even rustig aan, ik kom zo bij je terug. Probeer het over een paar minuten nog eens.'};
 if(!r.ok)throw Error('http '+r.status);return await r.json()}

async function chatSend(txt){txt=String(txt??$('#chat-in')?.value??'').trim();if(!txt||chatBusy)return;
 const l=await chatList();const id='C'+Date.now().toString(36).toUpperCase();l.push({id,wie:'suzan',tekst:txt.slice(0,1500),t:new Date().toISOString()});
 chatDraft='';const inp=$('#chat-in');if(inp){inp.value='';inp.style.height='auto'}chatBusy=true;await chatSave(l);await chatPaint();
 let a;try{a=await chatAsk(l)}catch(e){a={tekst:'Oeps, ik kon je net niet bereiken. Je bericht staat veilig hier. Probeer het straks nog eens.',fout:true}}
 const m={id:id+'F',wie:'fien',tekst:String(a.tekst||'').slice(0,1500),t:new Date().toISOString()};if(a.klaar){m.klaar=String(a.klaar).slice(0,500);m.soort=SOORT_NAAM[a.soort]?a.soort:'idee'}if(a.fout)m.fout=true;
 const l2=await chatList();l2.push(m);chatBusy=false;await chatSave(l2);await chatPaint()}

async function chatKlaar(id){const l=await chatList();const m=l.find(x=>x.id===id);if(!m||m.klaargezet)return;
 if(!CHAT_DEMO){/* echt klaarzetten: de relay bewaart het voorstel pas nu in R2 (chat/klaar/<id>.json) */
  try{const token=await chatToken();if(!token)throw Error('geen koppeling');
   const r=await fetch(CHAT_URL+'/chat/klaar',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({id})});
   if(r.status===401)localStorage.removeItem(CHAT_TOKEN_KEY);if(!r.ok)throw Error('http '+r.status)}
  catch(e){l.push({id:id+'E',wie:'fien',tekst:'Oeps, het klaarzetten lukte nu niet. Probeer het straks nog eens.',t:new Date().toISOString(),systeem:true,fout:true});await chatSave(l);return chatPaint()}}
 m.klaargezet=true;await chatSave(l);chatKlaarLijst();
 l.push({id:id+'K',wie:'fien',tekst:m.soort==='beslissing'?'Staat klaar ✓ Jij beslist wat ermee gebeurt.':'Staat klaar ✓ Fien AI kan het later oppakken. Er wordt niets verstuurd.',t:new Date().toISOString(),systeem:true});await chatSave(l);
 /* lokaal ook onthouden; in R2 staat het sinds de klik in chat/klaar/<id>.json */
 const b=(await get('chatKlaar'))||[];b.unshift({id,soort:m.soort,tekst:m.klaar,t:new Date().toISOString()});await put('chatKlaar',b.slice(0,50));chatPaint()}

function chatRecept(id){chatList().then(l=>{const m=l.find(x=>x.id===id);const w=(m&&m.klaar||'').replace(/^Receptwens:\s*/,'');if(typeof aiDraft!=='undefined')aiDraft.idee=w;go('rec');
 setTimeout(()=>{const t=$('#ai-idee');if(t){t.value=w;t.focus()}},60)})}

function chatTime(t){const d=new Date(t);return Number.isNaN(+d)?'':d.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}
function chatBubble(m){if(m.wie==='suzan')return `<div class="cb me"><div class="cbt">${esc(m.tekst)}</div><small>${chatTime(m.t)}</small></div>`;
 let kaart='';if(m.klaar){const n=SOORT_NAAM[m.soort]||'Opgeschreven';const acts=[];
  if(!m.klaargezet)acts.push(`<button class="btn s xs" onclick="chatKlaar('${m.id}')">📌 Zet klaar</button>`);else acts.push('<span class="cb-ok">📌 Klaargezet</span>');
  if(m.soort==='recept'&&!m.klaargezet)acts.push(`<button class="btn s xs" onclick="chatRecept('${m.id}')">✨ Maak er een recept van</button>`);
  kaart=`<div class="cb-kaart s-${esc(m.soort||'idee')}"><b>${esc(n)}</b><span>${esc(m.klaar)}</span><div class="cb-acts">${acts.join('')}</div></div>`}
 return `<div class="cb fien ${m.fout?'fout':''} ${m.systeem?'sys':''}"><img src="img/fien-blij-160w.webp" alt=""><div><div class="cbt">${esc(m.tekst)}</div>${kaart}<small>${chatTime(m.t)}</small></div></div>`}

const CHAT_WELKOM='Hoi! Typ hier gewoon wat je bezighoudt, net als een appje. Bijvoorbeeld: "Ik heb geen gemalen anijs, wat nu?" of "Een klant vraagt naar een taart voor 20 mensen". Ik stel soms één vraag terug. Daarna maak ik een kort overzichtje en vraag ik: "Zal ik dit klaarzetten?" Wil je dat? Tik dan op 📌 Zet klaar. Bij prijzen, allergieën, bestellingen en klachten beslis jij; dat zet ik voor je klaar. Ik stuur nooit zelf iets naar klanten. Probeer gerust wat uit!';
function chatWelkom(open){const body=`<div class="cbt">${esc(CHAT_WELKOM)}</div>`;
 if(open)return `<div class="cb fien welkom"><img src="img/fien-blij-160w.webp" alt=""><div>${body}</div></div>`;
 return `<div class="cb fien welkom compact"><img src="img/fien-blij-160w.webp" alt=""><details class="chat-hint"><summary>Hoe werkt dit?</summary>${body}</details></div>`}

async function chatPaint(){const box=$('#chat-log');if(!box)return render();const l=await chatList();
 box.innerHTML=chatWelkom(!l.length)+l.map(chatBubble).join('')+(chatBusy?`<div class="cb fien typing"><img src="img/fien-denken-160w.webp" alt=""><div><div class="cbt"><i></i><i></i><i></i></div><small>Fien typt…</small></div></div>`:'');
 const tips=$('#chat-tips');if(tips)tips.classList.toggle('hidden',l.length>0);const sb=$('#chat-send');if(sb)sb.disabled=chatBusy;
 requestAnimationFrame(()=>window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'}))}

/* ---------- Wat ik heb klaargezet: haar lijst uit de relay (GET /chat/klaar) ---------- */
const KLAAR_STATUS={klaargezet:'Ontvangen',bezig:'Fien is ermee bezig',uitgewerkt:'Klaar, staat in je app'};
let chatKlaarItems=[];
function chatKlaarTijd(t){const d=new Date(t);return Number.isNaN(+d)?'':d.toLocaleString('nl-NL',{timeZone:'Europe/Amsterdam',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
function chatKlaarPaint(){const box=$('#chat-klaar');if(!box)return;
 if(!chatKlaarItems.length){box.classList.add('hidden');box.innerHTML='';return}
 box.classList.remove('hidden');
 box.innerHTML=`<details open><summary>📌 Wat ik heb klaargezet <span class="ck-n">${chatKlaarItems.length}</span></summary>`+chatKlaarItems.map((x,i)=>`<div class="ck-item s-${esc(x.status)}"><div class="ck-t">${esc(x.klaar)}</div><div class="ck-m"><span class="ck-pill">${esc(KLAAR_STATUS[x.status]||KLAAR_STATUS.klaargezet)}</span><small>${esc(chatKlaarTijd(x.t))}</small>${x.link?`<button class="btn s xs" onclick="chatKlaarOpen(${i})">Bekijk</button>`:''}</div></div>`).join('')+`</details>`}
async function chatKlaarLijst(){if(CHAT_DEMO)return;const token=localStorage.getItem(CHAT_TOKEN_KEY);if(!token)return;
 try{const r=await fetch(CHAT_URL+'/chat/klaar',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(r.status===401){localStorage.removeItem(CHAT_TOKEN_KEY);return}if(!r.ok)return;
  const j=await r.json();if(j&&Array.isArray(j.items)){chatKlaarItems=j.items.filter(x=>x&&x.klaar);chatKlaarPaint()}}catch(e){}}
function chatKlaarOpen(i){const l=(chatKlaarItems[i]||{}).link||'';let m;
 if((m=/^app:(home|rec|bak|site|meer|plan|chat)$/.exec(l)))return go(m[1]);
 if((m=/^fa:(FA-[A-Z0-9]{2,24})$/.exec(l)))return typeof aiOpenBericht==='function'?aiOpenBericht(m[1]):go('rec');
 if(/^https:\/\/(www\.)?bubblybakery\.nl\//.test(l)||/^https:\/\/actiontakers\.github\.io\/bubbly-suzan-6e214a8f\//.test(l))window.open(l,'_blank','noopener')}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('#chat-klaar'))chatKlaarLijst()});

VIEWS.chat=async()=>`<div class="card chat-head"><img src="img/fien-blij-160w.webp" alt=""><div class="grow"><h2 style="margin:0;font-size:22px">Praat met Fien</h2><small>${CHAT_DEMO?'Proefversie · voorbeeldzinnen':'Fien schrijft voor je op'}</small></div></div>
<div id="chat-klaar" class="card chat-klaarlijst hidden"></div>
<div id="chat-log" class="chat-log" aria-live="polite"></div>
<div id="chat-tips" class="chat-tips">${CHAT_TIPS.map(t=>`<button class="chip" onclick="chatSend(${esc(JSON.stringify(t))})">${esc(t)}</button>`).join('')}</div>
<div class="chat-bar"><textarea id="chat-in" rows="1" placeholder="Schrijf iets aan Fien…" aria-label="Bericht aan Fien" oninput="chatDraft=this.value;this.style.height='auto';this.style.height=Math.min(this.scrollHeight,140)+'px'" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();chatSend()}">${esc(chatDraft)}</textarea><button id="chat-send" class="btn" onclick="chatSend()" aria-label="Verstuur">➤</button></div>
<p class="chat-note">Fien schrijft op wat je wilt en zet het klaar. Er wordt niets verstuurd. Prijzen en allergieën check je altijd zelf.</p>`;
VIEWS.chat.after=()=>{chatKlaarPaint();chatPaint();chatKlaarLijst()};
/* tab in de navigatie, direct na Start */
if(!TABS.some(t=>t[0]==='chat'))TABS.splice(1,0,['chat','💬','Fien']);
if(typeof navR==='function')navR();
