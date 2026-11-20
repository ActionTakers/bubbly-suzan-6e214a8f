import http from 'node:http';import fs from 'node:fs';
const st={code:503,hits:[],results:new Set()};
http.createServer((q,s)=>{let b='';q.on('data',d=>b+=d);q.on('end',()=>{const u=new URL(q.url,'http://x');
 if(u.pathname==='/hook'){st.hits.push({auth:(q.headers.authorization||'').length>10,idem:q.headers['idempotency-key'],body:JSON.parse(b||'{}')});s.writeHead(st.code);return s.end('{}')}
 if(u.pathname==='/ctl'){const c=JSON.parse(b||'{}');if(c.code)st.code=c.code;if(c.result)st.results.add(c.result);if(c.reset)st.hits=[];s.writeHead(200,{'content-type':'application/json'});return s.end(JSON.stringify({code:st.code,hits:st.hits}))}
 const m=u.pathname.match(/^\/res\/(FA-[A-Z0-9]+)\.json$/);if(m&&st.results.has(m[1])){s.writeHead(200);return s.end('{}')}
 s.writeHead(404);s.end()})}).listen(8799);
