/* Fien chat, INTAKE-model (PROEF, branch fien-chat-proef). NIET gedeployd, NIET in productie.
   Draait op Cloudflare Workers AI via de binding env.AI in de bestaande relay: geen API-sleutel, geen nieuw account.
   POST /chat/koppel {code}                     → eenmalige koppelcode (secret CHAT_KOPPELCODE) wordt een apparaat-sleutel
   POST /chat  Authorization: Bearer <sleutel>  {id, berichten:[{wie,tekst}]} → {tekst, soort?, klaar?}
   Opslag in R2 (binding FIEN): chat/tokens/<sha256>, chat/teller/<datum>, chat/log/<datum>/<id>.json, chat/voorstel/<id>.json (alleen bij een samenvatting),
   chat/klaar/<id>.json (pas als Suzan op 'Zet klaar' drukt: POST /chat/klaar {id})
   Vars/secrets: CHAT_KOPPELCODE (secret), CHAT_PROMPT (var = chat-systeemprompt.md), CHAT_MODEL, CHAT_DAG_MAX (optioneel) */
import PROMPT from './chat-prompt.js';
const enc=new TextEncoder();
export const MODEL='@cf/google/gemma-4-26b-a4b-it',MODEL_TERUG='@cf/mistralai/mistral-small-3.1-24b-instruct';
export const SOORTEN=['recept','vraag','taak','idee','beslissing'];
const VERBODEN=[/€\s?\d|\d+([.,]\d+)?\s?(euro|eur)\b/i,/\b(gabri[eë]l|g@briel|owner|prepared|goodvibez)\b/i,/\b(is|zijn)\s+(notenvrij|glutenvrij|lactosevrij|allergeenvrij|veilig)\b/i,/\b(bestelling|levering)\s+(is\s+)?(bevestigd|geregeld)\b/i];
const VEILIG={tekst:'Daar kan ik je niet goed mee helpen. Dit zet ik klaar voor jouw beslissing.',soort:'beslissing',klaar:'Fien kon dit niet veilig beantwoorden'};
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
function gelijk(a,b){a=String(a||'');b=String(b||'');let d=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return d===0&&a.length>0}
const dag=()=>new Date().toISOString().slice(0,10);
/* Workers AI geeft soms {response:"…"}, soms OpenAI-vorm {choices:[{message:{content}}]}; denk-blokken en ```json eraf */
export function uitModel(r){let t=r&&r.choices&&r.choices[0]&&(r.choices[0].message&&r.choices[0].message.content||r.choices[0].text);if(t==null&&r)t=r.response;
 if(t&&typeof t==='object')return t;if(typeof t!=='string')return null;t=t.replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/```(?:json)?/gi,'');
 const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a<0||b<a)return {tekst:t.trim()};try{return JSON.parse(t.slice(a,b+1))}catch{return {tekst:t.replace(/[{}"]/g,'').trim()}}}
export function schoon(a){if(!a||typeof a.tekst!=='string'||!a.tekst.trim())return {...VEILIG};
 const out={tekst:a.tekst.trim().slice(0,800)};const s=String(a.soort||'').toLowerCase();
 if(SOORTEN.includes(s)&&a.klaar&&String(a.klaar).trim()){out.soort=s;out.klaar=String(a.klaar).trim().slice(0,400)}
 const alles=[out.tekst,out.klaar||''].join(' ');if(VERBODEN.some(r=>r.test(alles)))return {...VEILIG};return out}
export async function koppel(req,env,J){let b;try{b=await req.json()}catch{return J(400,{ok:false})}
 if(!env.CHAT_KOPPELCODE||!gelijk(b.code,env.CHAT_KOPPELCODE))return J(401,{ok:false});
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));await env.FIEN.put('chat/tokens/'+await sha(token),JSON.stringify({t:new Date().toISOString()}));
 return J(200,{ok:true,token})}
async function teller(env){const k='chat/teller/'+dag();const ob=await env.FIEN.get(k);const n=ob?Number(await ob.text())||0:0;await env.FIEN.put(k,String(n+1));return n+1}
async function vraagModel(env,model,messages){return env.AI.run(model,{messages,max_tokens:350,temperature:0.5,chat_template_kwargs:{enable_thinking:false},response_format:{type:'json_object'}})}
export async function chat(req,env,J){const auth=req.headers.get('Authorization')||'';const tok=auth.startsWith('Bearer ')?auth.slice(7):'';
 if(!/^[a-f0-9]{64}$/.test(tok)||!(await env.FIEN.head('chat/tokens/'+await sha(tok))))return J(401,{ok:false});
 const raw=await req.text();if(raw.length>20000)return J(413,{ok:false});let b;try{b=JSON.parse(raw)}catch{return J(400,{ok:false})}
 const id=String(b.id||'');if(!/^C[A-Z0-9]{4,20}$/.test(id))return J(400,{ok:false,e:'id'});
 const msgs=(Array.isArray(b.berichten)?b.berichten:[]).slice(-12).map(m=>({wie:m&&m.wie==='fien'?'fien':'suzan',tekst:String(m&&m.tekst||'').slice(0,1500)})).filter(m=>m.tekst);
 if(!msgs.length||msgs[msgs.length-1].wie!=='suzan')return J(400,{ok:false});
 if(!env.AI)return J(503,{ok:false,e:'chat staat nog uit'});
 if(await teller(env)>Number(env.CHAT_DAG_MAX||150))return J(429,{ok:false,e:'dag'});
 const messages=[{role:'system',content:env.CHAT_PROMPT||PROMPT},...msgs.map(m=>({role:m.wie==='fien'?'assistant':'user',content:m.tekst}))];
 let a=null,dbg=null;for(const model of [env.CHAT_MODEL||MODEL,MODEL_TERUG]){try{const raw=await vraagModel(env,model,messages);a=uitModel(raw);if(env.CHAT_DEBUG)dbg={model,usage:raw&&raw.usage,raw:JSON.stringify(raw).slice(0,1500)};if(a)break}catch(e){a=null;if(env.CHAT_DEBUG)dbg={model,fout:String(e&&e.message||e).slice(0,300)}}}
 if(!a)return J(502,{ok:false,e:'model'});
 const out=schoon(a);const log={id,t:new Date().toISOString(),vraag:msgs[msgs.length-1].tekst,antwoord:out};
 await env.FIEN.put(`chat/log/${dag()}/${id}.json`,JSON.stringify(log));
 if(out.klaar)await env.FIEN.put(`chat/voorstel/${id}.json`,JSON.stringify({...log,status:'voorstel'}));
 return J(200,{ok:true,...out,...(env.CHAT_DEBUG?{dbg}:{})})}

/* POST /chat/klaar {id} (Bearer): Suzan drukte op 📌 Zet klaar → voorstel wordt chat/klaar/<id>.json (status 'klaargezet'). Zonder die klik komt er niets in chat/klaar. */
export async function klaarzet(req,env,J){const auth=req.headers.get('Authorization')||'';const tok=auth.startsWith('Bearer ')?auth.slice(7):'';
 if(!/^[a-f0-9]{64}$/.test(tok)||!(await env.FIEN.head('chat/tokens/'+await sha(tok))))return J(401,{ok:false});
 let b;try{b=await req.json()}catch{return J(400,{ok:false})}let id=String(b&&b.id||'');if(!/^C[A-Z0-9]{4,21}$/.test(id))return J(400,{ok:false,e:'id'});
 let ob=await env.FIEN.get('chat/voorstel/'+id+'.json');if(!ob&&id.endsWith('F')){id=id.slice(0,-1);ob=await env.FIEN.get('chat/voorstel/'+id+'.json')} /* de app geeft het Fien-bericht-id mee (vraag-id + F) */
 if(!ob)return J(404,{ok:false,e:'onbekend'});
 const v=JSON.parse(await ob.text());await env.FIEN.put('chat/klaar/'+id+'.json',JSON.stringify({...v,status:'klaargezet',klaargezet:new Date().toISOString()}));
 return J(200,{ok:true,id})}
