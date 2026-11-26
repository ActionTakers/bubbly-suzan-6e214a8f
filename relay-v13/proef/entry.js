/* PREVIEW-Worker 'fien-relay-chat-proef' (NIET productie). Wikkelt de relay (index.js) en serveert de app uit ../fien onder /fien/.
   Eigen R2-bucket (bubblyfien-chat-proef), geen cron, geen browser, geen webhook. De app-kopie wijst naar deze Worker, niet naar fien-relay-v13. */
import base from '../index.js';
import FILES from './static.gen.js';
const TYPES={html:'text/html;charset=utf-8',js:'text/javascript;charset=utf-8',json:'application/json',webmanifest:'application/manifest+json',png:'image/png',webp:'image/webp',jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml',woff2:'font/woff2',woff:'font/woff',css:'text/css',ico:'image/x-icon'};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export default{
 async fetch(req,env,ctx){const u=new URL(req.url);
  if(req.method==='GET'&&u.pathname==='/')return Response.redirect(u.origin+'/fien/',302);
  if(req.method==='GET'&&u.pathname.startsWith('/fien/')){let p=u.pathname.slice(6)||'index.html';const f=FILES[p];if(!f)return new Response('niet gevonden',{status:404});
   const ext=p.split('.').pop();let body=unb64(f);
   if(p==='index.html'){const origin=u.origin;body=new TextDecoder().decode(body).replace(/(<meta name="fien-relay" content=")[^"]*(")/,`$1${origin}$2`).replace('<meta name="robots"',`<meta name="fien-chat" content="${origin}"><meta name="robots"`);}
   return new Response(body,{headers:{'Content-Type':TYPES[ext]||'application/octet-stream','Cache-Control':'no-store','X-Robots-Tag':'noindex','X-Fien-Proef':'1'}})}
  return base.fetch(req,env,ctx)}};
