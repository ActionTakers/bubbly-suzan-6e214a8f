/* v13.2 PROEF: POST /chat/koppel en /chat (zie chat.js, Workers AI via env.AI). Pas live na GO. */
/* Fien relay v13 — nieuwe, losse Worker naast de bestaande. De webhook-sleutel staat alleen hier (secret), niet in de app.
   POST /foto?id=FA-…&pin=…   body = foto (image/*, max 8 MB) → R2 foto/<id>
   POST /verzoek              JSON {id,pin,idee,link,fotoLink,tijd,appVersie,test,foto:true} → één keer door naar de Fien-routine (dedupe op id)
   GET  /foto/<id>?exp=&sig=  ondertekende link (7 dagen) zodat Fien de foto kan zien
   POST /site/nu?pin=  screenshot nu maken (handmatig)
   GET  /site.jpg | /site.json  laatste screenshot van bubblybakery.nl (cron elk uur)
   POST /site/zet     JSON {id,pin,dry?,appVersie?} → fase 2: concept (draft) in Firestore recipes/fien_<id> (zie sitezet.js)
   POST /site/status  JSON {pin,ids:[…]} → siteStatus/siteSlug per Fien-recept voor de app
   v13.1 duurzaam: elk verzoek eerst volledig in R2 (req/<id>.json), daarna pas door. Cron (:07 en :37) stuurt opnieuw
   als er geen ai-results/<id>.json komt. GET /pending en POST /pending/klaar met Authorization: Bearer FIEN_PENDING_KEY. */
import {zetOpSite,siteStatus} from './sitezet.js';
import {bewaar,lees,doorsturen,herkansing,pending,sleutelOk} from './durable.js';
import {koppel,chat,klaarzet} from './chat.js';
const ORIGIN='https://actiontakers.github.io',SITE='https://bubblybakery.nl/';
const MAX={idee:500,link:500,fotoLink:500,tijd:40,appVersie:20,receptId:40,recept:2500};const FOTO_MAX=8*1024*1024,WEEK=7*864e5;
const hits=new Map();const DEF_ORIGIN='https://fien-relay-v13.bubblybakery.workers.dev';
async function fotoUrl(env,origin,id){const exp=Date.now()+WEEK;return `${origin}/foto/${id}?exp=${exp}&sig=${await sign(env,id,exp)}`}
const enc=new TextEncoder();
async function sign(env,id,exp){const k=await crypto.subtle.importKey('raw',enc.encode(env.FOTO_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const s=await crypto.subtle.sign('HMAC',k,enc.encode(id+'.'+exp));return [...new Uint8Array(s)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,40)}
async function shot(env){if(!env.BROWSER)return 'geen browser-binding';const puppeteer=(await import('@cloudflare/puppeteer')).default;
 const b=await puppeteer.launch(env.BROWSER);try{const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2});
  await p.goto(SITE,{waitUntil:'networkidle0',timeout:45000});const img=await p.screenshot({type:'jpeg',quality:70});
  await env.FIEN.put('site/latest.jpg',img,{httpMetadata:{contentType:'image/jpeg'},customMetadata:{t:new Date().toISOString()}});return 'ok'}finally{await b.close()}}
export default{
 async scheduled(ev,env,ctx){const min=new Date(ev.scheduledTime||Date.now()).getUTCMinutes();
  if(min<30)ctx.waitUntil(shot(env).catch(()=>{}));
  ctx.waitUntil(herkansing(env,id=>fotoUrl(env,env.RELAY_ORIGIN||DEF_ORIGIN,id)).then(l=>{if(l.length)console.log('herkansing',l.join(' '))}))},
 async fetch(req,env){const u=new URL(req.url),o=req.headers.get('Origin')||'';
  if(u.pathname==='/pending'||u.pathname==='/pending/klaar'){const H={'Content-Type':'application/json','Cache-Control':'no-store'};
   if(!await sleutelOk(req,env))return new Response('{"ok":false,"e":"sleutel"}',{status:401,headers:H});
   if(u.pathname==='/pending'&&req.method==='GET'){const l=await pending(env,id=>fotoUrl(env,u.origin,id),u.searchParams.get('alle')==='1');return new Response(JSON.stringify({ok:true,aantal:l.length,verzoeken:l}),{headers:H})}
   if(u.pathname==='/pending/klaar'&&req.method==='POST'){let b;try{b=await req.json()}catch{return new Response('{"ok":false,"e":"json"}',{status:400,headers:H})}
    if(!/^FA-[A-Z0-9]{2,24}$/.test(b.id||''))return new Response('{"ok":false,"e":"id"}',{status:400,headers:H});const r=await lees(env,b.id);if(!r)return new Response('{"ok":false,"e":"onbekend"}',{status:404,headers:H});
    r.status=b.status==='opgegeven'?'opgegeven':'klaar';r.volgende=0;r.klaar=new Date().toISOString();await bewaar(env,r);return new Response(JSON.stringify({ok:true,id:r.id,status:r.status}),{headers:H})}
   return new Response('{"ok":false,"e":"method"}',{status:405,headers:H})}
  const allowed=[ORIGIN,...String(env.EXTRA_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean)];const okO=allowed.includes(o);
  const cors={'Access-Control-Allow-Origin':okO?o:ORIGIN,'Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Max-Age':'86400','Vary':'Origin'};
  const J=(s,b)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
  if(req.method==='GET'){
   if(u.pathname==='/site.jpg'||u.pathname==='/site.json'){const ob=await env.FIEN.get('site/latest.jpg');if(!ob)return J(404,{ok:false,e:'nog geen screenshot'});
    const t=ob.customMetadata?.t||ob.uploaded.toISOString();if(u.pathname==='/site.json')return J(200,{ok:true,t,url:SITE});
    return new Response(ob.body,{headers:{...cors,'Content-Type':'image/jpeg','Cache-Control':'max-age=300','X-Shot-Time':t}})}
   const m=u.pathname.match(/^\/foto\/(FA-[A-Z0-9]{2,24})$/);
   if(m){const exp=+u.searchParams.get('exp')||0;if(exp<Date.now()||u.searchParams.get('sig')!==await sign(env,m[1],exp))return new Response('verlopen',{status:403});
    const ob=await env.FIEN.get('foto/'+m[1]);if(!ob)return new Response('weg',{status:404});
    return new Response(ob.body,{headers:{'Content-Type':ob.httpMetadata?.contentType||'image/jpeg','Cache-Control':'private, max-age=3600'}})}
   if(u.pathname==='/')return J(200,{ok:true,fien:'relay-v13'});return J(404,{ok:false})}
  if(!okO)return new Response('origin',{status:403});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});if(req.method!=='POST')return J(405,{ok:false,e:'method'});
  const ip=req.headers.get('CF-Connecting-IP')||'x',now=Date.now(),h=(hits.get(ip)||[]).filter(t=>now-t<600000);if(h.length>=30)return J(429,{ok:false,e:'rate'});h.push(now);hits.set(ip,h);
  if(u.pathname==='/chat/koppel')return koppel(req,env,J);
  if(u.pathname==='/chat')return chat(req,env,J);
  if(u.pathname==='/chat/klaar')return klaarzet(req,env,J);
  if(u.pathname==='/site/nu'){if(u.searchParams.get('pin')!==env.PIN)return J(401,{ok:false,e:'pin'});let r;try{r=await shot(env)}catch(e){r='fout: '+String(e&&e.message||e).slice(0,200)}return J(r==='ok'?200:500,{ok:r==='ok',r})}
  if(u.pathname==='/foto'){const id=u.searchParams.get('id')||'';if(u.searchParams.get('pin')!==env.PIN)return J(401,{ok:false,e:'pin'});if(!/^FA-[A-Z0-9]{2,24}$/.test(id))return J(400,{ok:false,e:'id'});
   const ct=(req.headers.get('Content-Type')||'').split(';')[0];if(!/^image\//.test(ct))return J(415,{ok:false,e:'type'});
   const buf=await req.arrayBuffer();if(!buf.byteLength||buf.byteLength>FOTO_MAX)return J(413,{ok:false,e:'size'});
   await env.FIEN.put('foto/'+id,buf,{httpMetadata:{contentType:ct}});return J(200,{ok:true,id,bytes:buf.byteLength})}
  if(u.pathname==='/site/zet'||u.pathname==='/site/status'){const raw=await req.text();if(raw.length>4096)return J(413,{ok:false,e:'size'});let b;try{b=JSON.parse(raw)}catch{return J(400,{ok:false,e:'json'})}
   if(!env.PIN||b.pin!==env.PIN)return J(401,{ok:false,e:'pin'});if(!env.FIEN_FIREBASE_SA)return J(503,{ok:false,e:'site-koppeling staat nog uit'});
   try{const[s,o]=await(u.pathname==='/site/zet'?zetOpSite(b,env):siteStatus(b,env));return J(s,o)}catch(e){return J(502,{ok:false,e:String(e&&e.message||e).slice(0,120)})}}
  if(u.pathname!=='/verzoek')return J(404,{ok:false});
  const raw=await req.text();if(raw.length>4096)return J(413,{ok:false,e:'size'});let b;try{b=JSON.parse(raw)}catch{return J(400,{ok:false,e:'json'})}
  if(b.pin!==env.PIN)return J(401,{ok:false,e:'pin'});if(!/^FA-[A-Z0-9]{2,24}$/.test(b.id||''))return J(400,{ok:false,e:'id'});
  const out={id:b.id,pin:b.pin};for(const[k,m]of Object.entries(MAX))if(b[k]!=null&&b[k]!==''){if(typeof b[k]!=='string'||b[k].length>m)return J(400,{ok:false,e:k});out[k]=b[k]}
  if(b.type!=null){if(b.type!=='blog')return J(400,{ok:false,e:'type'});out.type='blog'}
  if(b.test===true)out.test=true;const droog=b.test===true&&b.droog===true&&/TEST/.test(b.id);
  if(b.foto===true){const ob=await env.FIEN.head('foto/'+b.id);if(!ob)return J(409,{ok:false,e:'foto ontbreekt'});
   if(out.fotoLink&&!out.link)out.link=out.fotoLink;out.fotoLink='(wordt bij elke poging vers ondertekend)';out.foto='foto geüpload (zie fotoLink)'}
  if(!out.idee&&!out.link&&!out.fotoLink)return J(400,{ok:false,e:'leeg'});
  /* dedupe: claim het id; bestaat het al, dan niet nog eens doorsturen */
  const claim=await env.FIEN.put('seen/'+b.id,new Date().toISOString(),{onlyIf:{etagDoesNotMatch:'*'}});
  if(claim===null)return J(200,{ok:true,id:b.id,dubbel:true});
  /* outbox: eerst het hele verzoek bewaren (zonder pin), dan pas doorsturen */
  const{pin:_p,...payload}=out;const rec={id:b.id,payload,foto:b.foto===true,origin:u.origin,ontvangen:new Date().toISOString(),status:droog?'droog':'ontvangen',pogingen:[],volgende:0};
  try{await bewaar(env,rec)}catch(e){await env.FIEN.delete('seen/'+b.id);return J(500,{ok:false,id:b.id,e:'opslag'})}
  if(droog)return J(200,{ok:true,id:b.id,droog:true});
  const ok=await doorsturen(env,rec,id=>fotoUrl(env,u.origin,id));try{await bewaar(env,rec)}catch(e){}
  /* ook als de webhook nu faalt: het verzoek staat veilig in R2 en de cron probeert het opnieuw */
  return J(200,ok?{ok:true,id:b.id}:{ok:true,id:b.id,bewaard:true})}};
