/* Fien chat (PROEF-ontwerp, NIET gekoppeld in index.js en NIET gedeployd).
   POST /chat/koppel {code}                 → eenmalige koppelcode (secret CHAT_KOPPELCODE) wordt een apparaat-sleutel
   POST /chat  Authorization: Bearer <sleutel>  {id, berichten:[{wie:'suzan'|'fien', tekst}]} → {tekst, klaar?, recept?}
   Secrets (alleen in de Worker): GEMINI_API_KEY, CHAT_KOPPELCODE. Vars: CHAT_MODEL, CHAT_DAG_MAX.
   Opslag in R2 (binding FIEN): chat/tokens/<sha256>, chat/teller/<datum>, chat/log/<datum>/<id>.json, chat/klaar/<id>.json */
const enc=new TextEncoder();
const VERBODEN=[/€\s?\d|\d+([.,]\d+)?\s?(euro|eur)\b/i,/\b(gabri[eë]l|g@briel|owner|prepared|goodvibez)\b/i,/\b(is|zijn)\s+(notenvrij|glutenvrij|lactosevrij|allergeenvrij|veilig)\b/i,/\b(bestelling|levering)\s+(is\s+)?(bevestigd|geregeld)\b/i];
const VEILIG={tekst:'Daar kan ik je niet goed mee helpen. Dit zet ik klaar voor jouw beslissing.',klaar:'Fien kon dit niet veilig beantwoorden'};
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
function gelijk(a,b){a=String(a||'');b=String(b||'');let d=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return d===0&&a.length>0}
const dag=()=>new Date().toISOString().slice(0,10);
export function schoon(a){if(!a||typeof a.tekst!=='string'||!a.tekst.trim())return {...VEILIG};
 const out={tekst:a.tekst.trim().slice(0,1200)};if(a.klaar)out.klaar=String(a.klaar).slice(0,500);if(a.recept)out.recept=String(a.recept).slice(0,500);
 const alles=[out.tekst,out.klaar||'',out.recept||''].join(' ');if(VERBODEN.some(r=>r.test(alles)))return {...VEILIG};return out}
export async function koppel(req,env,J){let b;try{b=await req.json()}catch{return J(400,{ok:false})}
 if(!env.CHAT_KOPPELCODE||!gelijk(b.code,env.CHAT_KOPPELCODE))return J(401,{ok:false});
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));await env.FIEN.put('chat/tokens/'+await sha(token),JSON.stringify({t:new Date().toISOString()}));
 return J(200,{ok:true,token})}
async function teller(env){const k='chat/teller/'+dag();const ob=await env.FIEN.get(k);const n=ob?Number(await ob.text())||0:0;await env.FIEN.put(k,String(n+1));return n+1}
export async function chat(req,env,J){const auth=req.headers.get('Authorization')||'';const tok=auth.startsWith('Bearer ')?auth.slice(7):'';
 if(!/^[a-f0-9]{64}$/.test(tok)||!(await env.FIEN.head('chat/tokens/'+await sha(tok))))return J(401,{ok:false});
 const raw=await req.text();if(raw.length>20000)return J(413,{ok:false});let b;try{b=JSON.parse(raw)}catch{return J(400,{ok:false})}
 const id=String(b.id||'');if(!/^C[A-Z0-9]{4,20}$/.test(id))return J(400,{ok:false,e:'id'});
 const msgs=(Array.isArray(b.berichten)?b.berichten:[]).slice(-12).map(m=>({wie:m&&m.wie==='fien'?'fien':'suzan',tekst:String(m&&m.tekst||'').slice(0,1500)})).filter(m=>m.tekst);
 if(!msgs.length||msgs[msgs.length-1].wie!=='suzan')return J(400,{ok:false});
 if(await teller(env)>Number(env.CHAT_DAG_MAX||150))return J(429,{ok:false,e:'dag'});
 const model=env.CHAT_MODEL||'gemini-3.5-flash-lite';
 const body={systemInstruction:{parts:[{text:env.CHAT_PROMPT||''}]},contents:msgs.map(m=>({role:m.wie==='fien'?'model':'user',parts:[{text:m.tekst}]})),
  generationConfig:{temperature:0.6,maxOutputTokens:400,responseMimeType:'application/json',responseSchema:{type:'OBJECT',properties:{tekst:{type:'STRING'},klaar:{type:'STRING'},recept:{type:'STRING'}},required:['tekst']}}};
 let a;try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},body:JSON.stringify(body)});
  if(!r.ok)return J(502,{ok:false,e:'llm '+r.status});const j=await r.json();a=JSON.parse(j?.candidates?.[0]?.content?.parts?.[0]?.text||'{}')}catch(e){a=null}
 const out=schoon(a);const log={id,t:new Date().toISOString(),vraag:msgs[msgs.length-1].tekst,antwoord:out};
 await env.FIEN.put(`chat/log/${dag()}/${id}.json`,JSON.stringify(log));if(out.klaar)await env.FIEN.put(`chat/klaar/${id}.json`,JSON.stringify({...log,status:'open'}));
 return J(200,{ok:true,...out})}
