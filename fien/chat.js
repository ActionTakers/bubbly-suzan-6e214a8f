'use strict';
/* ---------- Praat met Fien (PROEF, branch fien-chat-proef) ----------
   Echte chat: Suzan typt, Fien antwoordt meteen.
   - Zonder chat-koppeling (meta fien-chat leeg) of met ?demo=1: voorbeeldantwoorden op deze telefoon (geen netwerk).
   - Met koppeling: POST <relay>/chat met een apparaat-sleutel (geen API-sleutel in de app; die staat alleen in de Worker).
   - Geschiedenis staat op deze telefoon (IndexedDB 'chat'); de Worker bewaart een kopie zodat iets een verzoek/taak kan worden. */
const CHAT_KEY='chat',CHAT_TOKEN_KEY='fienChatToken',CHAT_MAX=200,CHAT_SEND=12;
const CHAT_URL=(localStorage.getItem('fienChat')||document.querySelector('meta[name="fien-chat"]')?.content||'').replace(/\/$/,'');
const CHAT_DEMO=!CHAT_URL||/[?&]demo=1\b/.test(location.search);
let chatBusy=false,chatDraft='';
const chatList=async()=>(await get(CHAT_KEY))||[];
const chatSave=l=>put(CHAT_KEY,l.slice(-CHAT_MAX));
const CHAT_TIPS=['Wat bak ik dit weekend?','Mijn deeg plakt, help!','Een klant vraagt of het notenvrij is','Ik wil een nieuw recept'];

/* Proef: voorbeeldantwoorden met dezelfde vangrails als de echte Fien */
function chatDemo(txt){const t=txt.toLowerCase();
 if(/prij|kost|euro|€|duur|goedkoop/.test(t))return {tekst:'Over prijzen zeg ik niets. Dat bepaal jij. Wil je dat ik het klaarzet?',klaar:'Vraag over een prijs: '+txt};
 if(/allerg|noten|gluten|lactose|vegan|zwanger|veilig/.test(t))return {tekst:'Daar kan ik geen belofte over doen. Kijk altijd zelf op de verpakkingen. Dit zet ik klaar voor jouw beslissing.',klaar:'Vraag over allergie/dieet: '+txt};
 if(/bestel|levering|op voorraad|beschikbaar|reserveer|bezorg/.test(t))return {tekst:'Een bestelling of levering bevestig ik niet. Dit zet ik klaar voor jouw beslissing.',klaar:'Bestelling/levering: '+txt};
 if(/klacht|boos|verdrietig|moe|stress|ruzie|teleurgesteld|uitzondering/.test(t))return {tekst:'Wat vervelend. Neem even rustig adem. 💛 Dit zet ik klaar voor jouw beslissing, dan hoef jij het nu niet op te lossen.',klaar:'Lastig moment: '+txt};
 if(/plak/.test(t))return {tekst:'Plakkerig deeg? Zet het 20 minuten in de koelkast. Gebruik een beetje bloem op je handen, niet in het deeg. Lukt het daarna?'};
 if(/recept|maken|bakken|weekend/.test(t))return {tekst:'Leuk! Wat dacht je van boterkoek of taaitaai? Zal ik er een recept van laten maken?',recept:txt};
 if(/hoi|hallo|hey|goedemorgen|goedemiddag|goedenavond/.test(t))return {tekst:'Hoi Suzan! Fijn dat je er bent. Waar kan ik je mee helpen? 🧁'};
 return {tekst:'Dank je, ik heb het gelezen. Zal ik dit klaarzetten, zodat het niet vergeten wordt?',klaar:txt}}

async function chatToken(){let t=localStorage.getItem(CHAT_TOKEN_KEY);if(t)return t;
 const code=(prompt('Koppelcode voor de chat met Fien (één keer per telefoon):')||'').trim();if(!code)return '';
 const r=await fetch(CHAT_URL+'/chat/koppel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
 if(!r.ok){alert('Die code klopt niet.');return ''}const j=await r.json();if(j&&j.token){localStorage.setItem(CHAT_TOKEN_KEY,j.token);return j.token}return ''}

async function chatAsk(l){if(CHAT_DEMO){await new Promise(ok=>setTimeout(ok,900+Math.random()*700));return chatDemo(l[l.length-1].tekst)}
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
 const m={id:id+'F',wie:'fien',tekst:String(a.tekst||'').slice(0,1500),t:new Date().toISOString()};if(a.klaar)m.klaar=String(a.klaar).slice(0,500);if(a.recept)m.recept=String(a.recept).slice(0,500);if(a.fout)m.fout=true;
 const l2=await chatList();l2.push(m);chatBusy=false;await chatSave(l2);await chatPaint()}

async function chatKlaar(id){const l=await chatList();const m=l.find(x=>x.id===id);if(!m)return;m.klaargezet=true;await chatSave(l);
 l.push({id:id+'K',wie:'fien',tekst:'Staat klaar ✓ Ik heb het bewaard, dan kun je er later rustig naar kijken.',t:new Date().toISOString(),systeem:true});await chatSave(l);
 /* proef: alleen lokaal. Echt: de Worker zet het als taak/verzoek in R2 (chat/klaar/<id>.json) voor de bestaande Fien AI-flow. */
 const b=(await get('chatKlaar'))||[];b.unshift({id,tekst:m.klaar,t:new Date().toISOString()});await put('chatKlaar',b.slice(0,50));chatPaint()}

function chatRecept(id){chatList().then(l=>{const m=l.find(x=>x.id===id);if(typeof aiDraft!=='undefined')aiDraft.idee=m&&m.recept||'';go('rec');
 setTimeout(()=>{const t=$('#ai-idee');if(t){t.value=m&&m.recept||'';t.focus()}},60)})}

function chatTime(t){const d=new Date(t);return Number.isNaN(+d)?'':d.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}
function chatBubble(m){if(m.wie==='suzan')return `<div class="cb me"><div class="cbt">${esc(m.tekst)}</div><small>${chatTime(m.t)}</small></div>`;
 const acts=[];if(m.klaar&&!m.klaargezet)acts.push(`<button class="btn s xs" onclick="chatKlaar('${m.id}')">📌 Zet klaar</button>`);if(m.klaar&&m.klaargezet)acts.push('<span class="cb-ok">📌 Klaargezet</span>');
 if(m.recept)acts.push(`<button class="btn s xs" onclick="chatRecept('${m.id}')">✨ Maak er een recept van</button>`);
 return `<div class="cb fien ${m.fout?'fout':''} ${m.systeem?'sys':''}"><img src="img/fien-blij-160w.webp" alt=""><div><div class="cbt">${esc(m.tekst)}</div>${acts.length?`<div class="cb-acts">${acts.join('')}</div>`:''}<small>${chatTime(m.t)}</small></div></div>`}

async function chatPaint(){const box=$('#chat-log');if(!box)return render();const l=await chatList();
 box.innerHTML=(l.length?'':`<div class="cb fien"><img src="img/fien-blij-160w.webp" alt=""><div><div class="cbt">Hoi Suzan! Vertel me alles: een bakvraag, een idee, of iets wat je dwarszit. Ik antwoord meteen. 🧁</div></div></div>`)+l.map(chatBubble).join('')+(chatBusy?`<div class="cb fien typing"><img src="img/fien-denken-160w.webp" alt=""><div><div class="cbt"><i></i><i></i><i></i></div><small>Fien typt…</small></div></div>`:'');
 const tips=$('#chat-tips');if(tips)tips.classList.toggle('hidden',l.length>0);const sb=$('#chat-send');if(sb)sb.disabled=chatBusy;
 requestAnimationFrame(()=>window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'}))}

VIEWS.chat=async()=>`<div class="card chat-head"><img src="img/fien-blij-160w.webp" alt=""><div class="grow"><h2 style="margin:0;font-size:22px">Praat met Fien</h2><small>${CHAT_DEMO?'Proefversie · Fien antwoordt met voorbeeldzinnen':'Fien antwoordt meteen'}</small></div></div>
<div id="chat-log" class="chat-log" aria-live="polite"></div>
<div id="chat-tips" class="chat-tips">${CHAT_TIPS.map(t=>`<button class="chip" onclick="chatSend(${esc(JSON.stringify(t))})">${esc(t)}</button>`).join('')}</div>
<div class="chat-bar"><textarea id="chat-in" rows="1" placeholder="Schrijf iets aan Fien…" aria-label="Bericht aan Fien" oninput="chatDraft=this.value;this.style.height='auto';this.style.height=Math.min(this.scrollHeight,140)+'px'" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();chatSend()}">${esc(chatDraft)}</textarea><button id="chat-send" class="btn" onclick="chatSend()" aria-label="Verstuur">➤</button></div>
<p class="chat-note">Fien helpt met bakken en zet lastige dingen klaar voor jouw beslissing. Prijzen en allergieën check je altijd zelf.</p>`;
VIEWS.chat.after=()=>chatPaint();
/* tab in de navigatie, direct na Start */
if(!TABS.some(t=>t[0]==='chat'))TABS.splice(1,0,['chat','💬','Fien']);
if(typeof navR==='function')navR();
