/* Fase 2 — "Zet op de site": Fien-recept → concept (draft) in Firestore recipes/fien_<FA-id>.
   - Schrijft ALLEEN recipes/fien_<id>, alleen als nieuw doc (bestaat het al: niets overschrijven).
   - status is altijd 'draft'. 'published' komt nooit uit de Worker (dat is fase 4, Owner).
   - Geen prijs-, allergie-, calorie- of voedingsvelden; tekst met zulke claims wordt geweigerd.
   - Bron van de inhoud = het gepubliceerde ai-results/<id>.json (niet de app-body).
   De sleutel (secret FIEN_FIREBASE_SA) wordt nooit gelogd of teruggegeven. */
export const AIR_BASE='https://actiontakers.github.io/bubbly-suzan-6e214a8f/fien/ai-results/';
export const SITEMAP='https://bubblybakery.nl/sitemap.xml';
const ID_RE=/^FA-[A-Z0-9]{2,24}$/, SLUG_RE=/^[a-z0-9]+(?:-[a-z0-9]+)*$/, DOC_RE=/^fien_FA-[A-Z0-9]{2,24}$/;
const VERBODEN_SLEUTEL=/prijs|price|euro|allerg|calor|kcal|voeding|nutri/i;
const VERBODEN_TEKST=[/€/,/\beuro\b/i,/\ballerg/i,/\b(gluten|lactose|noten|melk|ei|soja|suiker)vrij\b/i,/\bveilig voor\b/i,/\bkcal\b/i,/\bcalorie/i];

export const slugify=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' en ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80).replace(/-+$/,'');
const str=(v,max=2000)=>typeof v==='string'?v.trim().slice(0,max):'';
const arr=(v,n=60)=>Array.isArray(v)?v.filter(x=>typeof x==='string'&&x.trim()).slice(0,n).map(x=>x.trim().slice(0,500)):[];

/* "300 g tarwebloem, gezeefd" → {hoeveelheid:'300 g', naam:'tarwebloem', specificatie:'gezeefd'} */
const EENHEID='(?:g|gr|gram|kg|ml|cl|dl|l|liter|el|tl|eetlepels?|theelepels?|snufje|snuf|mespunt|zakje|zakjes|blik|stuks?|plakjes?|teentjes?)';
const HOEV=new RegExp(`^((?:ca\\.?\\s*)?(?:\\d+(?:[.,]\\d+)?|[½¼¾⅓⅔])(?:\\s*[–-]\\s*(?:\\d+(?:[.,]\\d+)?|[½¼¾]))?\\s*(?:${EENHEID}\\b\\.?)?)\\s+(.*)$`,'i');
export function parseIngredient(s){s=str(s,300);const m=s.match(HOEV);let h='',rest=s;if(m){h=m[1].trim();rest=m[2]}
 const i=rest.indexOf(',');return {hoeveelheid:h,naam:(i>0?rest.slice(0,i):rest).trim(),specificatie:i>0?rest.slice(i+1).trim():null}}

const CAT=[[/muffin/,'muffins'],[/traybake/,'traybake'],[/koekje|cookie/,'Koekjes'],[/brood|focaccia|ciabatta/,'brood'],[/cake|taart|boterkoek|koek/,'cake & koek']];
function categorie(tags,titel){const t=(tags.join(' ')+' '+titel).toLowerCase();for(const[re,c]of CAT)if(re.test(t))return c;return ''}

/* Controleer op verboden velden/claims. Geeft lijst met problemen terug (leeg = ok). */
export function controleer(j){const p=[];
 (function walk(o,pad){if(Array.isArray(o))return o.forEach((x,i)=>walk(x,pad+'['+i+']'));
  if(o&&typeof o==='object')return Object.entries(o).forEach(([k,v])=>{if(k!=='_uitleg'&&k!=='bron'&&k!=='hasNutrition'&&VERBODEN_SLEUTEL.test(k))p.push('veld '+pad+k);walk(v,pad+k+'.')});
  if(typeof o==='string'&&!/^(_uitleg|bron)/.test(pad))for(const re of VERBODEN_TEKST)if(re.test(o)){p.push('tekst '+pad.replace(/\.$/,'')+' ('+re.source+')');break}})(j,'');
 return p}

/* Mapping ai-results JSON → Firestore-docvelden (gewone JS-waarden; toFields maakt er Firestore-REST van). */
export function mapRecept(j,{slug,nu=new Date(),appVersie=''}={}){
 const titel=str(j.titel,120),ondertitel=str(j.ondertitel,300),tags=arr(j.tags,15).map(t=>t.toLowerCase());
 let n=0;const fasen=(Array.isArray(j.fases)?j.fases:[]).slice(0,6).map((f,i)=>({nummer:i+1,naam:str(f.naam,80),doel:str(f.doel,400),
  stappen:(Array.isArray(f.stappen)?f.stappen:[]).slice(0,12).map(s=>({nummer:++n,woord:str(s.werkwoord,40).toUpperCase(),zin:str(s.beschrijving,1200),
   tipType:str(s.type,40),tip:str(s.tip,600),fotoUrl:'',fotoAlt:str(s.werkwoord,40)}))}));
 const tipStap=fasen.flatMap(f=>f.stappen).find(s=>s.tip&&/bubbly tip/i.test(s.tipType))||fasen.flatMap(f=>f.stappen).find(s=>s.tip);
 const ingr=arr(j.ingredienten,60).map(parseIngredient);
 const dod={hasTitle:!!titel,hasDescription:!!ondertitel,hasIngredients:ingr.length>0,hasSteps:n>0,hasTips:!!tipStap,
  hasImages:false,hasNutrition:false,testedInKitchen:false,reviewedByEditor:false};
 const progress=Math.round(100*Object.values(dod).filter(Boolean).length/Object.keys(dod).length);
 const category=categorie(tags,titel);
 return {
  naam:titel, beschrijving:ondertitel, category, status:'draft',
  progress, dod, hasReceptenkaart:true, isCompleteReceptkaart:false,
  createdAt:nu, updatedAt:nu,
  bron:'fien',
  fien:{verzoek:j.verzoek,resultUrl:AIR_BASE+j.verzoek+'.json',appVersie:str(appVersie,20),aangevraagdOp:nu,
   aangevraagdDoor:'suzan',wens:'zet op de site',stap:'klaar voor Gabriël',
   bronnen:arr(j.bron,20), open:['foto’s','prepTime/cookTime/restTime','servings','difficulty', ...(category?[]:['category']),'Owner-review (fase 4)']},
  receptenkaart:{
   naam:titel, subtitel:ondertitel, beschrijving:ondertitel, metaDescription:ondertitel.slice(0,155),
   slug, category, tags, status:'draft',
   servings:'', prepTime:'', cookTime:'', restTime:'', difficulty:'',
   heroFotoUrl:'',
   ingredienten:{'Ingrediënten':ingr},
   benodigdheden:arr(j.benodigdheden,40),
   fasen,
   tip:tipStap?{probleem:'Tip',oplossing:tipStap.tip}:{probleem:'',oplossing:''},
   bewaren:str(j.bewaren,800), variaties:arr(j.variaties,12), bekentenis:str(j.bekentenis,1500), mantra:str(j.mantra,300),
   progress, dod
  }}}

/* JS → Firestore REST Value */
export function toValue(v){if(v===null||v===undefined)return {nullValue:null};if(v instanceof Date)return {timestampValue:v.toISOString()};
 if(typeof v==='boolean')return {booleanValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};
 if(typeof v==='string')return {stringValue:v};if(Array.isArray(v))return {arrayValue:{values:v.map(toValue)}};
 return {mapValue:{fields:toFields(v)}}}
export const toFields=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,toValue(v)]));

/* ---------- Google-auth (service account JWT → access token), gecachet ---------- */
let TOK=null;
const b64u=b=>{let s='';const u=b instanceof Uint8Array?b:new TextEncoder().encode(b);for(const x of u)s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
async function token(sa){if(TOK&&TOK.exp>Date.now()+60000)return TOK.t;
 const now=Math.floor(Date.now()/1000),h=b64u(JSON.stringify({alg:'RS256',typ:'JWT'})),c=b64u(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));
 const der=Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----|\s/g,'')),ch=>ch.charCodeAt(0));
 const k=await crypto.subtle.importKey('pkcs8',der,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const s=b64u(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',k,new TextEncoder().encode(h+'.'+c))));
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:h+'.'+c+'.'+s})});
 const j=await r.json().catch(()=>({}));if(!r.ok||!j.access_token)throw Error('auth '+r.status);TOK={t:j.access_token,exp:Date.now()+(j.expires_in||3600)*1000};return TOK.t}

function fsConf(env){let sa;try{sa=JSON.parse(env.FIEN_FIREBASE_SA||'')}catch{throw Error('FIEN_FIREBASE_SA ontbreekt')}
 if(!sa.project_id)throw Error('FIEN_FIREBASE_SA ongeldig');
 const emu=String(env.FIRESTORE_EMULATOR_HOST||'');/* alleen voor lokaal testen */
 const host=emu?`http://${emu}`:'https://firestore.googleapis.com';
 return {sa,emu:!!emu,base:`${host}/v1/projects/${sa.project_id}/databases/(default)/documents`}}
async function auth(c){return 'Bearer '+(c.emu?'owner':await token(c.sa))}

/* Enige schrijfactie: maak recipes/<docId> aan, nooit overschrijven. */
async function maakConcept(c,docId,data){if(!DOC_RE.test(docId))throw Error('pad');
 const url=`${c.base}/recipes?documentId=${encodeURIComponent(docId)}`;
 const r=await fetch(url,{method:'POST',headers:{Authorization:await auth(c),'Content-Type':'application/json'},body:JSON.stringify({fields:toFields(data)})});
 if(r.status===409)return 'bestaat';if(!r.ok)throw Error('firestore '+r.status);return 'nieuw'}
async function leesDoc(c,docId){if(!DOC_RE.test(docId))throw Error('pad');
 const r=await fetch(`${c.base}/recipes/${encodeURIComponent(docId)}`,{headers:{Authorization:await auth(c)}});
 if(r.status===404)return null;if(!r.ok)throw Error('firestore '+r.status);return r.json()}
async function slugBezetInFirestore(c,slug,eigenDoc){
 const body={structuredQuery:{from:[{collectionId:'recipes'}],where:{fieldFilter:{field:{fieldPath:'receptenkaart.slug'},op:'EQUAL',value:{stringValue:slug}}},limit:3}};
 const r=await fetch(`${c.base}:runQuery`,{method:'POST',headers:{Authorization:await auth(c),'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!r.ok)throw Error('firestore query '+r.status);const l=await r.json();
 return l.some(x=>x.document&&!x.document.name.endsWith('/recipes/'+eigenDoc))}
async function siteSlugs(){const r=await fetch(SITEMAP,{headers:{Accept:'application/xml'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('sitemap '+r.status);
 const t=await r.text();return new Set([...t.matchAll(/\/recepten\/([a-z0-9-]+)\/?</g)].map(m=>m[1]))}

/* Statusregel die de app kan tonen (siteStatus/siteSlug zoals sitestatus.js ze verwacht). */
const statusVan=(doc)=>{const f=doc&&doc.fields||{};const st=f.status?.stringValue||'';const slug=f.receptenkaart?.mapValue?.fields?.slug?.stringValue||'';
 return {siteStatus:'klaar',siteSlug:SLUG_RE.test(slug)?slug:undefined,firestore:st,stap:f.fien?.mapValue?.fields?.stap?.stringValue||''}};

/* POST /site/zet  {id,pin,dry?,appVersie?} */
export async function zetOpSite(b,env,{haalJson=fetch}={}){
 if(!ID_RE.test(b.id||''))return [400,{ok:false,e:'id'}];
 const r=await haalJson(AIR_BASE+b.id+'.json',{headers:{Accept:'application/json'},cf:{cacheTtl:0}});
 if(r.status===404)return [404,{ok:false,e:'recept nog niet klaar in Fien'}];if(!r.ok)return [502,{ok:false,e:'ai-results '+r.status}];
 let j;try{j=await r.json()}catch{return [502,{ok:false,e:'ai-results json'}]}
 if(j.type==='blog'||j.fienrecept!==1)return [422,{ok:false,e:'alleen recepten kunnen op de site'}];
 if(j.verzoek!==b.id)return [422,{ok:false,e:'id klopt niet'}];
 const prob=controleer(j);if(prob.length)return [422,{ok:false,e:'bevat prijs/allergie/voeding — eerst naar Gabriël',details:prob.slice(0,5)}];
 const docId='fien_'+b.id;
 let slug=slugify(j.titel);if(!SLUG_RE.test(slug))return [422,{ok:false,e:'titel'}];
 const c=fsConf(env);
 const bestaand=await leesDoc(c,docId);if(bestaand)return [200,{ok:true,id:b.id,al:true,doc:'recipes/'+docId,...statusVan(bestaand)}];
 /* slug mag niet botsen met een recept dat al op de site staat of al in Firestore zit, anders ziet Suzan ten onrechte 'Staat online' */
 const site=await siteSlugs().catch(()=>null);if(!site)return [503,{ok:false,e:'sitelijst niet bereikbaar, probeer later'}];
 let s=slug,i=1;while(site.has(s)||await slugBezetInFirestore(c,s,docId)){i++;s=`${slug}-${i}`;if(i>9)return [409,{ok:false,e:'slug'}]}
 const data=mapRecept(j,{slug:s,appVersie:typeof b.appVersie==='string'?b.appVersie:''});
 if(s!==slug)data.fien.open.push(`slug aangepast (${slug} bestond al)`);
 if(controleer(data).length)return [422,{ok:false,e:'mapping bevat verboden veld'}];
 if(b.dry===true)return [200,{ok:true,id:b.id,dry:true,doc:'recipes/'+docId,siteStatus:'klaar',siteSlug:s,velden:data}];
 const w=await maakConcept(c,docId,data);
 const doc=w==='bestaat'?await leesDoc(c,docId):null;
 return [200,{ok:true,id:b.id,doc:'recipes/'+docId,nieuw:w==='nieuw',...(doc?statusVan(doc):{siteStatus:'klaar',siteSlug:s,firestore:'draft',stap:'klaar voor Gabriël'})}]}

/* GET-achtige status: POST /site/status {pin, ids:[...]} → {FA-..:{siteStatus,siteSlug,firestore,stap}} */
export async function siteStatus(b,env){const ids=Array.isArray(b.ids)?b.ids.filter(x=>ID_RE.test(x)).slice(0,60):[];
 const c=fsConf(env);const out={};
 await Promise.all(ids.map(async id=>{const d=await leesDoc(c,'fien_'+id).catch(()=>null);if(d)out[id]=statusVan(d)}));
 return [200,{ok:true,status:out}]}
