/* Fien relay — duurzaam doorsturen (outbox in R2 + cron-herkansing). Zie /workspace/fien-relay/DURABLE.md
   req/<id>.json = volledig verzoek (zonder pin) + status. customMetadata {s,v,n} zodat de cron alleen hoeft te listen.
   Status: ontvangen → doorgestuurd | mislukt → klaar | opgegeven | droog (test, nooit doorsturen). */
export const MAX_POGINGEN=8;
const MIN=60e3,UUR=3600e3;
/* Wachttijd na poging n (1-based). Mislukt (webhook geen 2xx): 30m,1u,2u,4u,8u,12u…
   Doorgestuurd maar geen resultaat (bv. tegoed op): eerst 2u, daarna 4u,8u,12u… (cron draait elke 30 min, dus geen jitter nodig) */
export function wacht(status,n){const basis=status==='mislukt'?30*MIN:2*UUR;return Math.min(basis*2**Math.max(n-1,0),12*UUR)}
const meta=r=>({s:r.status,v:String(r.volgende||0),n:String(r.pogingen.length)});
export async function bewaar(env,r){r.bijgewerkt=new Date().toISOString();
 await env.FIEN.put('req/'+r.id+'.json',JSON.stringify(r),{httpMetadata:{contentType:'application/json'},customMetadata:meta(r)})}
export async function lees(env,id){const o=await env.FIEN.get('req/'+id+'.json');return o?await o.json():null}
/* Bestaat het resultaat al? Eerst raw GitHub (direct na commit), fallback Pages. 200 = klaar. */
export async function heeftResultaat(env,id){const bases=String(env.RESULTS_BASES||'https://raw.githubusercontent.com/ActionTakers/bubbly-suzan-6e214a8f/main/fien/ai-results,https://actiontakers.github.io/bubbly-suzan-6e214a8f/fien/ai-results').split(',');
 for(const b of bases){try{const r=await fetch(b.trim()+'/'+id+'.json?t='+Date.now(),{method:'GET',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(8000)});if(r.ok)return true}catch(e){}}return false}
/* Eén poging. signFoto(id) geeft een verse ondertekende fotolink (7 dagen) terug. */
export async function doorsturen(env,r,signFoto,nu){const n=r.pogingen.length+1,body={...r.payload,pin:env.PIN};
 if(r.foto)body.fotoLink=await signFoto(r.id);if(n>1){body.poging=n;body.herkansing=true}
 let code=0,fout='';try{const res=await fetch(env.FIEN_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.FIEN_WEBHOOK_KEY,'Idempotency-Key':r.id},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});code=res.status}catch(e){fout=String(e&&e.name||'fout').slice(0,40)}
 const ok=code>=200&&code<300,t=nu||Date.now();r.pogingen.push({t:new Date(t).toISOString(),code,...(fout?{fout}:{})});
 r.status=ok?'doorgestuurd':'mislukt';
 if(n>=MAX_POGINGEN&&!ok){r.status='opgegeven';r.volgende=0}else r.volgende=t+wacht(r.status,n);
 return ok}
/* Cron: loop alle open verzoeken langs. Max ~12 per run i.v.m. subrequest-limiet (free: 50). */
export async function herkansing(env,signFoto,nu=Date.now(),limiet=12){const log=[];let cursor,gedaan=0;
 do{const l=await env.FIEN.list({prefix:'req/',cursor,include:['customMetadata']});cursor=l.truncated?l.cursor:undefined;
  for(const o of l.objects){if(gedaan>=limiet)break;const m=o.customMetadata||{};
   if(!['ontvangen','doorgestuurd','mislukt'].includes(m.s))continue;if(+m.v>nu)continue;
   const r=await lees(env,o.key.slice(4,-5));if(!r)continue;gedaan++;
   if(await heeftResultaat(env,r.id)){r.status='klaar';r.volgende=0;r.klaar=new Date(nu).toISOString();await bewaar(env,r);log.push(r.id+':klaar');continue}
   if(r.pogingen.length>=MAX_POGINGEN){r.status='opgegeven';r.volgende=0;await bewaar(env,r);log.push(r.id+':opgegeven');continue}
   const ok=await doorsturen(env,r,signFoto,nu);await bewaar(env,r);log.push(r.id+':'+(ok?'opnieuw':'mislukt')+'#'+r.pogingen.length)}
 }while(cursor&&gedaan<limiet);return log}
/* GET /pending (Bearer FIEN_PENDING_KEY): open verzoeken voor de inhaal-routine. ?alle=1 = ook klaar/opgegeven. */
export async function pending(env,signFoto,alle){const uit=[];let cursor;
 do{const l=await env.FIEN.list({prefix:'req/',cursor,include:['customMetadata']});cursor=l.truncated?l.cursor:undefined;
  for(const o of l.objects){const s=(o.customMetadata||{}).s;if(!alle&&!['ontvangen','doorgestuurd','mislukt','opgegeven'].includes(s))continue;
   const r=await lees(env,o.key.slice(4,-5));if(!r)continue;const p={...r.payload};if(r.foto)p.fotoLink=await signFoto(r.id);
   uit.push({id:r.id,status:r.status,ontvangen:r.ontvangen,pogingen:r.pogingen.length,laatste:r.pogingen.at(-1)||null,volgende:r.volgende?new Date(r.volgende).toISOString():null,payload:p})}
 }while(cursor);uit.sort((a,b)=>String(a.ontvangen).localeCompare(String(b.ontvangen)));return uit}
export async function sleutelOk(req,env){const h=req.headers.get('Authorization')||'',want=env.FIEN_PENDING_KEY;if(!want||want.length<24||!h.startsWith('Bearer '))return false;
 const e=new TextEncoder(),[a,b]=await Promise.all([crypto.subtle.digest('SHA-256',e.encode(h.slice(7))),crypto.subtle.digest('SHA-256',e.encode(want))]);
 const x=new Uint8Array(a),y=new Uint8Array(b);let d=0;for(let i=0;i<x.length;i++)d|=x[i]^y[i];return d===0}
