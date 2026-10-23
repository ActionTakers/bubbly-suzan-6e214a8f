'use strict';
/* ---------- Recepten: intake → Bubbly-format → uitvoer ---------- */
const TT=['Bubbly Tip','Chaos Alert','Bubbly Mantra'];const TI={'Bubbly Tip':'💡','Chaos Alert':'🚨','Bubbly Mantra':'🎉'};
const DOELEN=['alles klaarzetten zodat het bakken zelf rustig en foutarm verloopt.','het maken van het beslag/deeg en de garing in de oven.','zorgen dat het resultaat mooi blijft, goed smaakt en handig te serveren is.'];
const FN=['VOORBEREIDING','MIXEN & BAKKEN','AFKOELEN & AFWERKEN'];
const BOTERKOEK={id:'boterkoek',voorbeeld:1,title:'Boterkoek',
ingr:'375 g bloem\n340 g roomboter (op kamertemperatuur)\n270 g witte basterdsuiker\n¼ tl zout\n1 tl vanille-extract\nRasp van ½ citroen\nExtra: boter (om in te vetten) en 1 ei (losgeklopt)',
ben:'Vierkante bakvorm van 20 × 20 cm\nBakpapier\nMengkom\nHandmixer met deeghaken, standmixer of je handen\nSpatel of lepel\nVork\nKeukenweegschaal',
fases:FN.map((n,i)=>({naam:n,doel:DOELEN[i]})),steps:[
['Verwarm','Verwarm de oven voor op 170 °C (boven-/onderwarmte), vet de vorm van 20 × 20 cm royaal in met boter en bekleed bodem en zijkanten met bakpapier.','Bubbly Tip','Laat het bakpapier aan twee zijkanten iets uitsteken; dat zijn straks je handvatten om de koek uit de vorm te tillen!'],
['Weeg','Weeg de bloem, basterdsuiker, het zout, vanille-extract en de citroenrasp nauwkeurig af in de kom.','Bubbly Tip','Citroenrasp maakt de koek niet citroenachtig, maar haalt de boter- en vanillesmaak juist fantastisch op.'],
['Temper','Zorg dat je roomboter écht goed op kamertemperatuur is voordat je het deeg gaat maken.','Chaos Alert','Koude boter mixt voor geen meter en vergt te veel spierkracht. Gebruik zachte boter!'],
['Meng','Doe bloem, zachte roomboter, basterdsuiker, zout, vanille-extract en citroenrasp in de kom en meng tot één samenhangend, zacht deeg.','Chaos Alert','Voeg geen extra bloem toe omdat het deeg plakkerig voelt! Extra bloem maakt je boterkoek droog en hard.'],
['Druk','Schep het deeg in de vorm, druk het gelijkmatig uit, bestrijk met losgeklopt ei en trek met een vork een ruitjespatroon.','Bubbly Tip','Maak de vork tussendoor licht nat of vet hem in als het deeg eraan plakt.'],
['Bak','Bak de boterkoek 30 tot 40 minuten in het midden van de oven op 170 °C tot de bovenkant goudbruin is.','Chaos Alert','Wiebelt het midden nog? Niet doorbakken: dan wordt hij na afkoelen gortdroog.'],
['Strijk','Laat 10 minuten staan en druk de opstaande randjes voorzichtig naar beneden met de bolle kant van een lepel.','Bubbly Tip','Druk de randjes meteen aan zolang de koek nog warm en vormbaar is!'],
['Koel','Laat de boterkoek minimaal 6 uur (of een nacht) volledig afkoelen in de vorm.','Chaos Alert','Warm uit de vorm halen is vragen om een ingestorte boterkoek-catastrofe. Rust is verplicht!'],
['Snijd','Til de koek aan het bakpapier uit de vorm en snijd met een scherp mes in blokjes of punten.','Bubbly Mantra','Proud Disaster of Pinterest-perfect: elke boterkoekpunt telt mee.']
].map(([verb,text,type,tip])=>({verb,text,type,tip}))};
const emptyRecipe=()=>({id:'r'+Date.now().toString(36),title:'',ingr:'',ben:'',fases:FN.map((n,i)=>({naam:n,doel:DOELEN[i]})),steps:Array.from({length:9},(_,i)=>({verb:'',text:'',type:i==8?'Bubbly Mantra':'Bubbly Tip',tip:''}))});
async function recipes(){let r=await get('recipes');if(!r){r=[BOTERKOEK];await put('recipes',r)}return r}
async function saveRecipe(rc){const l=await recipes();const i=l.findIndex(x=>x.id==rc.id);i<0?l.push(rc):l[i]=rc;await put('recipes',l)}
let RID=null,ROUT='kaart';

/* best-effort parser van geplakte tekst */
function parseRecipe(txt){const rc=emptyRecipe();const lines=txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);let sec='',ingr=[],ben=[],steps=[],tipFor=null;
 const qty=/^([-•*·–]\s*)?(\d|½|¼|¾|een |snufje|rasp|scheutje|extra)/i;
 for(const raw of lines){const l=raw.replace(/^[#*_ ]+|[*_]+$/g,'').trim();const lo=l.toLowerCase();
  if(!rc.title&&!sec&&l.length<60&&!qty.test(l)){rc.title=l;continue}
  if(/^ingredi/.test(lo)){sec='i';continue}if(/^(benodigd|materiaal|nodig)/.test(lo)){sec='b';continue}
  if(/^(bereiding|werkwijze|recept|zo maak|instructie|fase)/.test(lo)){sec='s';continue}
  const tm=l.match(/^\(?\s*\S*\s*(bubbly tip|tip|chaos alert|let op|mantra|bubbly mantra)\s*:\s*(.*?)\)?$/i);
  if(tm&&steps.length){const s=steps[steps.length-1];s.tip=tm[2];s.type=/chaos|let op/i.test(tm[1])?'Chaos Alert':/mantra/i.test(tm[1])?'Bubbly Mantra':'Bubbly Tip';continue}
  const num=l.match(/^(\d{1,2})[.)]\s*(.*)$/);
  if(sec=='i'||(!sec&&qty.test(l)&&!num)){ingr.push(l.replace(/^[-•*·–]\s*/,''));continue}
  if(sec=='b'){ben.push(l.replace(/^[-•*·–]\s*/,''));continue}
  if(num){steps.push({text:num[2]});continue}
  if(sec=='s'||l.length>40){if(steps.length&&/^[a-zà-ü]/.test(l)&&!steps[steps.length-1].text.endsWith('.'))steps[steps.length-1].text+=' '+l;else if(steps.length&&steps[steps.length-1].text.split(' ').length<=2)steps[steps.length-1].text+=' '+l;else steps.push({text:l})}}
 // stap die alleen uit een werkwoord bestaat ("Verwarm") + volgende regel samenvoegen is hierboven gedaan
 rc.ingr=ingr.join('\n');rc.ben=ben.join('\n');
 // te veel stappen → samenvoegen tot 9, te weinig → leeg aanvullen
 while(steps.length>9){let k=0,m=1e9;for(let i=0;i<steps.length-1;i++){const n=steps[i].text.length+steps[i+1].text.length;if(n<m){m=n;k=i}}steps[k].text+=' '+steps[k+1].text;steps[k].tip=steps[k].tip||steps[k+1].tip;steps.splice(k+1,1)}
 steps.forEach((s,i)=>{const v=verbOf(s.text);let verb=v.verb,text=v.text;
  rc.steps[i]={verb:verb?verb[0].toUpperCase()+verb.slice(1).toLowerCase():'',text,type:s.type||rc.steps[i].type,tip:s.tip||''}});
 return rc}

/* werkwoord uit een zin halen: slaat 'Dan/Nu/Daarna' over en vangt scheidbare werkwoorden ('Voeg … toe' → 'Voeg toe') */
const SKIP=/^(dan|nu|daarna|vervolgens|eerst|tot slot|ten slotte|als laatste|en)$/i;const PART=/^(toe|aan|af|op|uit|in|mee|door|over|bij|om|weg|terug|neer|onder|vast|los|samen|klaar|na|voor)$/i;
function verbOf(t){t=(t||'').trim();const w=t.split(/\s+/);let k=0;while(k<w.length-1&&SKIP.test(w[k].replace(/[,:]/g,'')))k++;if(/^tot$/i.test(w[k])&&/^slot/i.test(w[k+1]||''))k+=2;
 const clause=w.slice(k).join(' ').split(/[.;!,]|\s(?:en|tot|totdat)\s/i)[0].trim().split(/\s+/);const clean=x=>(x||'').replace(/[^A-Za-zÀ-ÿ]/g,'');
 let verb=clean(clause[0]);if(/^(de|het|een|alle|je|\d.*)$/i.test(verb)||!verb){const inf=clause.slice(1).reverse().map(clean).find(x=>/en$/i.test(x)&&x.length>3);verb=inf||verb}
 if(!verb)return{verb:'',text:t};verb=verb[0].toUpperCase()+verb.slice(1).toLowerCase();
 const last=clean(clause.at(-1));if(clause.length>2&&PART.test(last)&&clean(clause[0]).toLowerCase()==verb.toLowerCase())verb+=' '+last.toLowerCase();
 let text=t;if(w.length<=2&&k==0)text=w.slice(1).join(' ')||t;return{verb,text}}
/* uitvoer */
const stepLine=(s,i)=>`${i+1}. ${s.verb}`;
function outKaart(r){let t=`${r.title.toUpperCase()}\nBak met liefde, niet met perfectie\n\nINGREDIËNTEN\n${r.ingr}\n\nBENODIGDHEDEN\n${r.ben}\n`;
 r.fases.forEach((f,fi)=>{t+=`\nFASE ${fi+1}: ${f.naam}\n`;r.steps.slice(fi*3,fi*3+3).forEach((s,j)=>{t+=`${fi*3+j+1}. ${s.verb.toUpperCase()}: ${s.text}\n   ${TI[s.type]} ${s.tip}\n`})});
 return t+'\nKnoeien = winnen. Bakken = feestje.\nAllergenen check jij altijd zelf.'}
function outBoek(r){let t=`# ${r.title}\n\nEr zijn recepten die je met je hoofd bakt, en recepten die je met je hart bakt. ${r.title} hoort bij de tweede soort. Geen stress over perfectie: dit hoofdstuk neemt je in drie rustige fases mee, van lege keuken tot trotse eerste hap.\n\n## Wat heb je nodig?\n\n### Ingrediënten\n${md(r.ingr)}\n\n### Benodigdheden\n${md(r.ben)}\n`;
 r.fases.forEach((f,fi)=>{t+=`\n## Fase ${fi+1}: ${cap(f.naam)}\n\n*Doel: ${f.doel}*\n`;r.steps.slice(fi*3,fi*3+3).forEach((s,j)=>{t+=`\n### ${fi*3+j+1}. ${s.verb}\n\n${s.text}\n\n> ${TI[s.type]} **${s.type}:** ${s.tip}\n`})});
 return t+`\n---\n\n*Bak met liefde, niet met perfectie. Knoeien = winnen.*\n\n*Allergenen check jij altijd zelf.*`}
function outWorkshop(r){let t=`WORKSHOP: ${r.title}\nThe Bubbly Bakery · Bak met liefde, niet met perfectie\n\nOPBOUW\n0. Welkom & uitleg (Fien-intro, Knoeien = winnen)\n`;
 r.fases.forEach((f,fi)=>{t+=`\nBLOK ${fi+1} — ${f.naam}\nDoel: ${f.doel}\n`;r.steps.slice(fi*3,fi*3+3).forEach((s,j)=>{t+=`  • ${s.verb}: ${s.text}\n    Laat zien: ${s.tip} (${s.type})\n`})});
 t+=`\nAFSLUITING\n  • Proeven & foto-moment met ieders resultaat\n  • Vragenrondje + receptkaart mee naar huis\n\nKLAARZETTEN PER DEELNEMER\n${r.ben.split('\n').filter(Boolean).map(x=>'  • '+x).join('\n')}\n\nINGREDIËNTEN (per deelnemer, schaal zelf op)\n${r.ingr.split('\n').filter(Boolean).map(x=>'  • '+x).join('\n')}\n\nAllergenen: check jij altijd zelf vooraf met de deelnemers.`;return t}
const slugify=x=>(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const lines=x=>(x||'').split('\n').map(l=>l.trim()).filter(Boolean);
function outMd(r){const sl=r.slug||slugify(r.title);let t=`# ${r.title}\n\n| Veld | Waarde |\n| --- | --- |\n| titel | ${r.title} |\n| ondertitel | ${r.ondertitel||''} |\n| slug | ${sl} |\n| status | ${r.status||'concept'} |\n| tags | ${(r.tags||'')} |\n| bron | ${r.bron||'eigen recept'} |\n\n## Ingrediënten\n${md(r.ingr)}\n\n## Benodigdheden\n${md(r.ben)}\n\n---\n\n## Fasen\n`;
 r.fases.forEach((f,fi)=>{t+=`\n### FASE ${fi+1}: ${f.naam}\n\n*Doel: ${f.doel}*\n`;r.steps.slice(fi*3,fi*3+3).forEach((s,j)=>{const n=fi*3+j+1;t+=`\n**${n}. ${s.verb}**\n${s.text}\n*(${TI[s.type]} ${s.type}: ${s.tip})*\nFoto: \`${String(n).padStart(2,'0')}-${slugify(s.verb)}.jpg\`\n`})});
 t+=`\n## Bewaren\n${r.bewaren||''}\n\n## Variaties\n${md(r.variaties||'')}\n\n## Bekentenis\n${r.bekentenis||''}\n`;
 if(typeof logTxt=='function'&&logTxt(r))t+=`\n## Besluitenlog\n${logTxt(r)}\n`;return t+'\n---\n*Allergenen check jij altijd zelf.*\n'}
function outJson(r){const tip=s=>s.type=='Chaos Alert'?{tip:'',alert:s.tip}:{tip:s.tip,alert:''};
 return JSON.stringify({titel:r.title,ondertitel:r.ondertitel||'',slug:r.slug||slugify(r.title),status:r.status||'concept',tags:lines((r.tags||'').replace(/,/g,'\n')),
 ingrediënten:lines(r.ingr).map(x=>({ingrediënt:x})),benodigdheden:lines(r.ben),
 fasen:r.fases.map((f,fi)=>({naam:f.naam,stappen:r.steps.slice(fi*3,fi*3+3).map((s,j)=>({werkwoord:s.verb,beschrijving:s.text,...tip(s),foto:`${String(fi*3+j+1).padStart(2,'0')}-${slugify(s.verb)}.jpg`}))})),
 bewaren:r.bewaren||'',variaties:lines(r.variaties),bekentenis:r.bekentenis||'',bron:r.bron||'eigen recept',_let_op:'CONCEPT uit Fien; ingrediënt-structuur (hoeveelheid/eenheid) nog niet gesplitst; niet zelf in de site-repo zetten'},null,2)}
const md=x=>x.split('\n').filter(Boolean).map(l=>'- '+l).join('\n');const cap=x=>x[0]+x.slice(1).toLowerCase();
const OUTS={kaart:['🃏 Receptkaart',outKaart],boek:['📖 E-book',outBoek],workshop:['👩‍🍳 Workshop',outWorkshop],md:['🗒️ Notion',outMd],json:['🧩 JSON',outJson]};

VIEWS.rec=async()=>{const l=await recipes();
 if(!RID)return `<div class="card"><h2>📚 Recepten</h2><small>Nieuw recept gevonden? Foto of tekst erin, Fien zet het in de Bubbly-structuur (3 fases × 3 stappen) en maakt er receptkaart, e-book, workshop en Notion-tekst van.</small>
 <p class="row"><label class="btn">📷 Foto van recept<input type="file" accept="image/*" capture="environment" class="hidden" onchange="recFoto(this)"></label><button class="btn s" onclick="RID='__plak';render()">📋 Tekst plakken</button><button class="btn s" onclick="recNew()">✏️ Leeg</button></p></div>
 ${l.map(r=>`<div class="card row" onclick="RID='${r.id}';render()"><div class="grow"><b>${esc(r.title||'(zonder titel)')}</b> ${r.voorbeeld?'<span class="tag">VOORBEELD</span>':''}<br><small>${r.steps.map(s=>s.verb).filter(Boolean).join(' · ')}</small></div><b>›</b></div>`).join('')}
 <div class="note">🔒 Recepten blijven op deze telefoon en gaan mee in de ZIP-export. Fien zet nooit prijzen of allergie-beloftes in een recept.</div>`;
 if(RID=='__plak')return `<div class="card"><h2>📋 Tekst plakken</h2><small>Plak het hele recept (bv. uit een website, e-mail of NotebookLM). Fien herkent ingrediënten en stappen zo goed mogelijk; daarna pas je alles aan.</small><textarea id="plak" style="min-height:260px"></textarea><p class="row"><button class="btn" onclick="recParse()">✨ Structureer</button><button class="btn s" onclick="RID=null;render()">Terug</button></p></div>`;
 const r=l.find(x=>x.id==RID);if(!r){RID=null;return VIEWS.rec()}
 const ph=(await filesOf('rec:'+r.id));urls.forEach(URL.revokeObjectURL);urls=[];
 const f=(k,v,ph,big)=>`<${big?'textarea':'input'} placeholder="${ph}" onchange="recSet('${k}',this.value)" ${big?'':`value="${esc(v)}"`}>${big?esc(v)+'</textarea>':''}`;
 return `<div class="card"><p class="row"><button class="btn s" onclick="RID=null;render()">‹ Alle recepten</button><span class="grow"></span><button class="btn p" onclick="recDel()">Verwijderen</button></p>
 ${ph.length?`<div class="thumbs">${ph.map(p=>{const u=URL.createObjectURL(p.blob);urls.push(u);return `<a href="${u}" target="_blank"><img src="${u}" style="width:100%;height:auto;max-height:420px;object-fit:contain"></a>`}).join('')}</div><small>Tik op de foto om te vergroten en neem de tekst over in het formulier.</small>`:''}
 <label class="btn s" style="display:inline-block;margin-top:6px">📷 Foto toevoegen<input type="file" accept="image/*" capture="environment" class="hidden" onchange="recFotoAdd(this)"></label>
 <h3>Titel</h3>${f('title',r.title,'Bv. Boterkoek')}<h3>Ondertitel</h3>${f('ondertitel',r.ondertitel||'','Korte zin onder de titel')}<h3>Status</h3><select onchange="recSet('status',this.value)">${['concept','in test','klaar'].map(x=>`<option ${x==(r.status||'concept')?'selected':''}>${x}</option>`).join('')}</select><h3>Tags</h3>${f('tags',r.tags||'','koekjes, makkelijk')}<h3>Ingrediënten</h3><small>Eén per regel</small>${f('ingr',r.ingr,'375 g bloem',1)}<h3>Benodigdheden</h3>${f('ben',r.ben,'Bakvorm 20×20',1)}</div>
 ${r.fases.map((fa,fi)=>`<div class="card"><h2 style="color:var(--td);font-size:18px">FASE ${fi+1}: ${f('fases.'+fi+'.naam',fa.naam,'Naam')}</h2><small>Doel:</small>${f('fases.'+fi+'.doel',fa.doel,'Doel van deze fase')}
 ${r.steps.slice(fi*3,fi*3+3).map((s,j)=>{const i=fi*3+j;return `<div class="step" style="padding-left:10px;margin-top:12px"><div class="row"><b>${i+1}.</b><input style="width:auto" class="grow" placeholder="Werkwoord (1 woord)" value="${esc(s.verb)}" onchange="recSet('steps.${i}.verb',this.value.trim().split(/\\s+/).slice(0,2).join(' '))"></div>
 ${f('steps.'+i+'.text',s.text,'Wat doe je precies?',1)}<div class="row"><select style="width:auto" onchange="recSet('steps.${i}.type',this.value)">${TT.map(t=>`<option ${t==s.type?'selected':''}>${t}</option>`).join('')}</select><input class="grow" style="width:auto" placeholder="Tip / alert / mantra" value="${esc(s.tip)}" onchange="recSet('steps.${i}.tip',this.value)"></div></div>`}).join('')}</div>`).join('')}
 <div class="card"><h3>Bewaren</h3>${f('bewaren',r.bewaren||'','Hoe lang en waar?',1)}<h3>Variaties</h3><small>Eén per regel</small>${f('variaties',r.variaties||'','Met chocolade',1)}<h3>Bekentenis</h3>${f('bekentenis',r.bekentenis||'','Jouw eerlijke Proud Disaster™-moment',1)}</div>
 <div class="card row"><button class="btn kook grow" onclick="kookOpen('rec','${r.id}')">👩‍🍳 Kookmodus</button><button class="btn s grow" onclick="recSession('${r.id}')">📸 Baksessie met foto’s</button></div>
 <div class="card"><h2>✨ Uitvoer</h2><div class="row">${Object.entries(OUTS).map(([k,[n]])=>`<button class="btn ${k==ROUT?'':'s'}" onclick="ROUT='${k}';render()">${n}</button>`).join('')}</div>
 <pre id="out" style="white-space:pre-wrap;font:14px/1.45 Nunito;background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px;max-height:360px;overflow:auto">${esc(OUTS[ROUT][1](r))}</pre>
 <p class="row"><button class="btn" onclick="copyOut()">📋 Kopieer</button>${ROUT=='md'?`<button class="btn s" onclick="dlMd()">⬇️ Download .md</button>`:''}<small id="cpo"></small></p>
 <small>Allergenen check jij altijd zelf.</small></div>`};
async function curRec(){return (await recipes()).find(x=>x.id==RID)}
async function recSet(path,v){const r=await curRec();const k=path.split('.');let o=r;for(let i=0;i<k.length-1;i++)o=o[k[i]];o[k.at(-1)]=v;delete r.voorbeeld;await saveRecipe(r);const out=$('#out');if(out)out.textContent=OUTS[ROUT][1](r)}
async function recNew(){const r=emptyRecipe();await saveRecipe(r);RID=r.id;render()}
async function recParse(){const t=$('#plak').value;if(!t.trim())return;const r=parseRecipe(t);r.bron='geplakte tekst';await saveRecipe(r);RID=r.id;render();scrollTo(0,0)}
async function recFoto(inp){const r=emptyRecipe();r.bron='foto';await saveRecipe(r);RID=r.id;await recFotoAdd(inp)}
async function recFotoAdd(inp){for(const f of inp.files)await addFile({sid:'rec:'+RID,slot:'foto',kind:'foto',blob:f,type:f.type,t:Date.now()});render()}
async function recDel(){if(!confirm('Recept verwijderen?'))return;await put('recipes',(await recipes()).filter(x=>x.id!=RID));for(const f of await filesOf('rec:'+RID))await delFile(f.id);RID=null;render()}
async function copyOut(){const t=$('#out').textContent;try{await navigator.clipboard.writeText(t);$('#cpo').textContent='Gekopieerd ✅'}catch(e){prompt('Kopieer dit:',t)}}
async function dlMd(){const r=await curRec();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([outMd(r)],{type:'text/markdown'}));a.download=(r.title||'recept')+'.md';a.click()}
async function addRecipesToZip(z){const l=await recipes();for(const r of l){const n=(r.title||r.id).replace(/[\\/:*?"<>|]/g,'');const d=z.folder('recepten/'+n);
 d.file(n+' - notion.md',outMd(r));if(typeof logTxt=='function'&&logTxt(r))d.file(n+' - besluitenlog.txt',logTxt(r));d.file((r.slug||slugify(r.title)||r.id)+'.json',outJson(r));d.folder('VR Receptkaart').file(n+' - receptkaart.txt',outKaart(r));d.folder('VR Ebook').file(n+' - ebook.md',outBoek(r));d.folder('VR Workshop').file(n+' - workshop.txt',outWorkshop(r));
 (await filesOf('rec:'+r.id)).forEach((f,i)=>d.file(`foto-${i+1}.${(f.type||'image/jpeg').split('/')[1]}`,f.blob))}}

/* baksessie starten vanuit een recept: snapshot van de stappen, oude sessies blijven Boterkoek */
async function recSession(id){const r=(await recipes()).find(x=>x.id==id);if(!r)return;const sid=Date.now().toString(36);
 const steps=r.steps.map((x,i)=>({t:x.verb||('Stap '+(i+1)),f:Math.floor(i/3),d:x.text,tip:x.tip?`${TI[x.type]||'💡'} ${x.type}: ${x.tip}`:'',tm:timersFrom(x.text)}));
 const fasen=r.fases.map((f,i)=>`FASE ${i+1} · ${(f.naam||'').toUpperCase()}`);
 await put('sess:'+sid,{id:sid,name:(r.title||'Recept')+' '+today(),preset:'rec:'+r.id,rname:(r.title||'recept').toLowerCase(),steps,fasen,notes:{},checks:{},created:new Date().toISOString()});
 const l=await get('sessions')||[];l.push(sid);await put('sessions',l);await put('cur',sid);go('bak')}
