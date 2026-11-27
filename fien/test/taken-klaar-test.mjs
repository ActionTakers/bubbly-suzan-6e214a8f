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
runInContext(readFileSync(new URL('../taken.js',import.meta.url),'utf8'),ctx);
const {
  TAKEN_VAST,takenToon,takenIsWeg,takenWegZet,takenWegLeeg,takenKlaarStukken,takenAkkoordVraag
}=ctx.module.exports;
const T=[];let failed=0;
const ok=(n,c)=>{const r=!!c();T.push((r?'ok  ':'FOUT ')+n);if(!r)failed++};

const leeg=takenWegLeeg();
ok('leeg is niet weg',()=>!takenIsWeg(leeg,'taak','pepernoten-online'));
const weg=takenWegZet(leeg,'taak','pepernoten-online',true);
ok('verborgen taak is weg',()=>takenIsWeg(weg,'taak','pepernoten-online'));
ok('andere taak blijft',()=>!takenIsWeg(weg,'taak','kaartstijl'));
ok('zet aan raakt akkoord niet',()=>{
  const ant={kaartstijl:{id:'FA-TESTAK1',antwoord:'ja',verzonden:true,t:'2026-11-27T22:00:00.000Z'}};
  const w2=takenWegZet(leeg,'taak','pepernoten-online',true);
  const q=takenAkkoordVraag(TAKEN_VAST.find(t=>t.id==='kaartstijl'),ant.kaartstijl);
  return q.id==='FA-TESTAK1'&&ant.kaartstijl.verzonden===true&&takenIsWeg(w2,'taak','pepernoten-online');
});

const ant={};
const list=[
  {id:'msg-nieuw',t:'Een nieuw berichtje'},
  {id:'msg-gelezen',t:'Een gelezen bericht'},
  {id:'msg-klaar-beantwoord',t:'Oud',status:'beantwoord'}
];
const seen=['msg-gelezen'];
const a=takenKlaarStukken(TAKEN_VAST,ant,list,seen,leeg);
ok('open = twee wacht-taken',()=>a.open.map(t=>t.id).join(',')==='kaartstijl,pepernoten-blog');
ok('klaar taken bevat pepernoten',()=>a.klaarT.length===1&&a.klaarT[0].id==='pepernoten-online');
ok('nieuw bericht niet in klaar',()=>a.nieuw.length===1&&a.nieuw[0].id==='msg-nieuw'&&a.gelezen[0].id==='msg-gelezen');
ok('klaar-telling taken+gelezen',()=>a.klaarN===2);
ok('beantwoord bericht verdwijnt',()=>!a.nieuw.some(b=>b.id==='msg-klaar-beantwoord')&&!a.gelezen.some(b=>b.id==='msg-klaar-beantwoord'));

const weg2=takenWegZet(takenWegZet(leeg,'taak','pepernoten-online',true),'bericht','msg-gelezen',true);
const b=takenKlaarStukken(TAKEN_VAST,ant,list,seen,weg2);
ok('verborgen komt niet terug in klaar',()=>b.klaarN===0&&b.klaarT.length===0&&b.gelezen.length===0);
ok('open taken ongewijzigd na wissen klaar',()=>b.open.length===2);

const naJa=takenKlaarStukken(TAKEN_VAST,{kaartstijl:{antwoord:'ja',verzonden:true}},list,seen,leeg);
ok('akkoord schuift naar klaar',()=>naJa.open.every(t=>t.id!=='kaartstijl')&&naJa.klaarT.some(t=>t.id==='kaartstijl'));
ok('pending send blijft open, niet verwijderbaar in klaar',()=>{
  const p=takenKlaarStukken(TAKEN_VAST,{kaartstijl:{antwoord:'ja',verzonden:false}},[],[],leeg);
  const s=takenToon(TAKEN_VAST.find(t=>t.id==='kaartstijl'),{antwoord:'ja',verzonden:false});
  return p.open.some(t=>t.id==='kaartstijl')&&!p.klaarT.some(t=>t.id==='kaartstijl')&&s.opnieuw&&s.open;
});
ok('undo = weghalen van vlag',()=>{
  const w=takenWegZet(weg,'taak','pepernoten-online',false);
  return !takenIsWeg(w,'taak','pepernoten-online');
});
ok('geen jargon in klaar-labels',()=>{
  const s=takenToon(TAKEN_VAST[0],null);
  return s.label==='Klaar'&&!/FA-|relay|IndexedDB/.test(s.label);
});

console.log(T.join('\n'));
if(failed)process.exit(1);
console.log(T.filter(x=>x.startsWith('ok')).length+'/'+T.length);
