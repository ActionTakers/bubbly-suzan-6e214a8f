// node maak-prompt.mjs → schrijft chat-prompt.js uit chat-systeemprompt.md (Worker kan geen .md importeren). --check = alleen controleren.
import {readFileSync,writeFileSync} from 'fs';
const md=readFileSync(new URL('./chat-systeemprompt.md',import.meta.url),'utf8').trim();
const js=`// GEGENEREERD door maak-prompt.mjs uit chat-systeemprompt.md. Niet handmatig aanpassen.\nexport default ${JSON.stringify(md)};\n`;
if(process.argv.includes('--check')){const nu=readFileSync(new URL('./chat-prompt.js',import.meta.url),'utf8');if(nu!==js){console.error('chat-prompt.js loopt achter: draai node maak-prompt.mjs');process.exit(1)}console.log('prompt in sync');}
else writeFileSync(new URL('./chat-prompt.js',import.meta.url),js);
