import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
const ctx=createContext({
  globalThis:{},
  window:undefined,
  module:{exports:{}},
  exports:{},
  console
});
ctx.globalThis=ctx;
ctx.window=undefined;
runInContext(readFileSync(new URL('../taken.js',import.meta.url),'utf8'),ctx);
const {takenAkkoordIdee,takenAkkoordVraag,takenToon,TAKEN_VAST}=ctx.module.exports;
const T=[];let failed=0;
const ok=(n,c)=>{const r=!!c();T.push((r?'ok  ':'FOUT ')+n);if(!r)failed++};

const ja=takenAkkoordIdee('Nieuwe stijl voor je receptkaarten','ja','');
const anders=takenAkkoordIdee('Je blog over pepernoten','anders','Iets warmer van toon.');
ok('ja bevat antwoord',()=>/Antwoord: Ja, dit is goed\./.test(ja));
ok('anders bevat toelichting',()=>/Antwoord: Liever anders\./.test(anders)&&/Toelichting: Iets warmer van toon\./.test(anders));
ok('geen publiceren-opdracht',()=>/geen nieuw recept, niet publiceren/.test(ja)&&/niet publiceren/.test(anders));
ok('idee past in relay-limiet',()=>ja.length<=500&&anders.length<=500);
ok('geen FA-code in idee',()=>!/FA-[A-Z0-9]{4,}/.test(ja+anders));
ok('geen Owner/GO/Gabriël',()=>!/Owner|Gabriël|GO:|Prepared/.test(ja+anders));

const kaart=TAKEN_VAST.find(t=>t.id==='kaartstijl');
const blog=TAKEN_VAST.find(t=>t.id==='pepernoten-blog');
ok('kaarttekst zonder berichtje-route',()=>kaart&&!/Stuur Fien een berichtje/i.test(kaart.tekst));
ok('twee open akkoordtaken',()=>TAKEN_VAST.filter(t=>t.status==='wacht').length===2);

const q=takenAkkoordVraag(kaart,{id:'FA-TESTAK1',antwoord:'ja',notitie:'',t:'2026-11-27T22:00:00.000Z',test:true,droog:true});
ok('verzoek-id en receptId',()=>q.id==='FA-TESTAK1'&&q.receptId==='kaartstijl');
ok('test+droog voor proef',()=>q.test===true&&q.droog===true);
ok('geen pin in vraag-object',()=>!('pin' in q));

const open=takenToon(kaart,null);
ok('open wacht op akkoord',()=>open.open&&open.label==='Wacht op jouw akkoord'&&!open.klaarLijst);
const naJa=takenToon(kaart,{antwoord:'ja',verzonden:true});
ok('na ja: doorgegeven + klaar',()=>!naJa.open&&naJa.klaarLijst&&naJa.label==='Doorgegeven aan Fien'&&naJa.st==='klaar');
const naNee=takenToon(blog,{antwoord:'anders',verzonden:true});
ok('na anders: Fien past het aan + klaar',()=>!naNee.open&&naNee.klaarLijst&&naNee.label==='Fien past het aan');
const wacht=takenToon(kaart,{antwoord:'ja',verzonden:false});
ok('offline: blijft open, opnieuw',()=>wacht.open&&wacht.opnieuw&&wacht.label==='Fien krijgt het zo');
const live=takenToon(TAKEN_VAST[0],null);
ok('pepernoten blijft klaar',()=>live.klaarLijst&&!live.open);

console.log(T.join('\n'));
if(failed)process.exit(1);
console.log(T.filter(x=>x.startsWith('ok')).length+'/'+T.length);
