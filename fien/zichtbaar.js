/* Tekst die Suzan te zien krijgt: geen interne codes, versienummers of ISO-tijden. */
(function(g){
function gemaaktOp(t){
  const d=new Date(t);
  if(Number.isNaN(+d))return '';
  return d.toLocaleDateString('nl-NL',{timeZone:'Europe/Amsterdam',day:'numeric',month:'short'});
}
function gemaaktWanneer(t){
  const d=new Date(t);
  if(Number.isNaN(+d))return '';
  return d.toLocaleString('nl-NL',{timeZone:'Europe/Amsterdam',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
}
/* Alleen codes/versies/ISO weg; structuur en regeleinden blijven (voor uitvoer/export). */
function schoonCodes(s){
  if(s==null||s==='')return '';
  let t=Array.isArray(s)?s.filter(Boolean).join('\n'):String(s);
  t=t.replace(/\bFA-[A-Z0-9]{4,24}\b/g,'')
     .replace(/\bC(?=[A-Z0-9]*\d)[A-Z0-9]{7,21}\b/g,'')
     .replace(/\bfien-v\d[\w.-]*/gi,'')
     .replace(/\b\d{4}-\d{2}-\d{2}T[\d:.]+Z?\b/g,'')
     .replace(/\bFien AI\b/g,'Fien')
     .replace(/@cf\/[\w./-]+/g,'')
     .replace(/\b(gemma-[\w.-]+|mistral-[\w.-]+)\b/gi,'')
     .replace(/[ \t]*[—–-]{1,3}[ \t]*(?=\s*[)·,;.]|\s*$)/gm,'')
     .replace(/[ \t]{2,}/g,' ')
     .replace(/ · (?:· )+/g,' · ')
     .replace(/[ \t]+$/gm,'')
     .replace(/ \./g,'.');
  return t;
}
/* Korte UI-tekst: ook BRON-labels en namen achter de schermen weg. */
function schoonZichtbaar(s){
  if(s==null||s==='')return '';
  let t=Array.isArray(s)?s.filter(Boolean).join(' · '):String(s);
  t=t.replace(/\bBRON\s*(\([^)]*\))?\s*:\s*/gi,'');
  t=schoonCodes(t)
     .replace(/\b(gabri[eë]l|g@briel|prepared|goodvibez)\b/gi,'')
     .replace(/(?:^|\s)·(?:\s|·)*/g,' · ')
     .replace(/^[ \t·,;.\-—–]+|[ \t·,;.\-—–]+$/g,'')
     .replace(/\s{2,}/g,' ')
     .trim();
  return t;
}
g.gemaaktOp=gemaaktOp;
g.gemaaktWanneer=gemaaktWanneer;
g.schoonCodes=schoonCodes;
g.schoonZichtbaar=schoonZichtbaar;
})(typeof window!=='undefined'?window:globalThis);
