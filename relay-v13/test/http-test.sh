#!/bin/bash
# Lokale integratietest tegen wrangler dev (8788) + mock (8799). Sleutels komen uit .dev.vars (nep-waarden), niet geprint.
R=http://localhost:8788;M=http://127.0.0.1:8799;O='Origin: https://actiontakers.github.io';CT='Content-Type: application/json'
K=$(grep ^FIEN_PENDING_KEY= "$(dirname "$0")/../.dev.vars"|cut -d= -f2-)
pass=0;fail=0;t(){ if eval "$2";then echo "PASS $1";pass=$((pass+1));else echo "FAIL $1";fail=$((fail+1));fi;}
ctl(){ curl -s -X POST $M/ctl -d "$1";}
ctl '{"code":503,"reset":1}'>/dev/null
a=$(curl -s -X POST $R/verzoek -H "$O" -H "$CT" -d '{"id":"FA-LOK1","pin":"0709","idee":"Kaasfondue in broodbol","tijd":"2026-11-20T11:00:00Z","appVersie":"fien-v15"}')
t "webhook 503 -> toch ok+bewaard" '[[ $a == *"\"ok\":true"*"bewaard"* ]]'
h=$(ctl '{}');t "1 poging, pin+idem+idee meegestuurd" 'echo "$h"|python3 -c "import json,sys;d=json.load(sys.stdin)[\"hits\"];assert len(d)==1 and d[0][\"idem\"]==\"FA-LOK1\" and d[0][\"body\"][\"pin\"]==\"0709\" and d[0][\"body\"][\"idee\"].startswith(\"Kaas\") and d[0][\"auth\"]"'
b=$(curl -s -X POST $R/verzoek -H "$O" -H "$CT" -d '{"id":"FA-LOK1","pin":"0709","idee":"x"}')
t "dubbel id -> dubbel, geen 2e poging" '[[ $b == *dubbel* ]] && [[ $(ctl "{}"|python3 -c "import json,sys;print(len(json.load(sys.stdin)[\"hits\"]))") == 1 ]]'
t "/pending zonder sleutel 401" '[[ $(curl -s -o /dev/null -w %{http_code} $R/pending) == 401 ]]'
t "/pending foute sleutel 401" '[[ $(curl -s -o /dev/null -w %{http_code} -H "Authorization: Bearer fout-fout-fout-fout-fout-fout" $R/pending) == 401 ]]'
p=$(curl -s -H "Authorization: Bearer $K" $R/pending)
t "/pending toont FA-LOK1 mislukt, idee, zonder pin" 'echo "$p"|python3 -c "import json,sys;d=json.load(sys.stdin);v=[x for x in d[\"verzoeken\"] if x[\"id\"]==\"FA-LOK1\"][0];assert v[\"status\"]==\"mislukt\" and v[\"payload\"][\"idee\"].startswith(\"Kaas\") and \"pin\" not in v[\"payload\"] and v[\"volgende\"]"'
ctl '{"code":200,"reset":1}'>/dev/null
c=$(curl -s -X POST $R/verzoek -H "$O" -H "$CT" -d '{"id":"FA-LOK2","pin":"0709","idee":"Appeltaart","type":"blog","receptId":"FA-X"}')
t "webhook 200 -> ok zonder bewaard" '[[ $c == "{\"ok\":true,\"id\":\"FA-LOK2\"}" ]]'
printf '\xff\xd8\xff\xe0testjpeg' > /tmp/t.jpg
f=$(curl -s -X POST "$R/foto?id=FA-LOK3&pin=0709" -H "$O" -H 'Content-Type: image/jpeg' --data-binary @/tmp/t.jpg)
d=$(curl -s -X POST $R/verzoek -H "$O" -H "$CT" -d '{"id":"FA-LOK3","pin":"0709","foto":true,"idee":"wat is dit"}')
fl=$(ctl '{}'|python3 -c "import json,sys;print([h for h in json.load(sys.stdin)['hits'] if h['idem']=='FA-LOK3'][0]['body']['fotoLink'])")
t "foto: ondertekende link werkt" '[[ $fl == http*"/foto/FA-LOK3?exp="* ]] && [[ $(curl -s -o /dev/null -w %{http_code} "$fl") == 200 ]]'
t "foute pin 401" '[[ $(curl -s -o /dev/null -w %{http_code} -X POST $R/verzoek -H "$O" -H "$CT" -d "{\"id\":\"FA-LOK4\",\"pin\":\"1111\",\"idee\":\"x\"}") == 401 ]]'
t "geen origin 403" '[[ $(curl -s -o /dev/null -w %{http_code} -X POST $R/verzoek -H "$CT" -d "{\"id\":\"FA-LOK4\",\"pin\":\"0709\",\"idee\":\"x\"}") == 403 ]]'
ctl '{"reset":1}'>/dev/null
e=$(curl -s -X POST $R/verzoek -H "$O" -H "$CT" -d '{"id":"FA-ZZTEST1","pin":"0709","idee":"test","test":true,"droog":true}')
t "droog test: bewaard, niet doorgestuurd" '[[ $e == *droog* ]] && [[ $(ctl "{}"|python3 -c "import json,sys;print(len(json.load(sys.stdin)[\"hits\"]))") == 0 ]]'
t "droog zonder TEST in id wordt gewoon doorgestuurd" '[[ $(curl -s -X POST $R/verzoek -H "$O" -H "$CT" -d "{\"id\":\"FA-LOK5\",\"pin\":\"0709\",\"idee\":\"x\",\"test\":true,\"droog\":true}") != *droog* ]]'
k=$(curl -s -X POST $R/pending/klaar -H "Authorization: Bearer $K" -H "$CT" -d '{"id":"FA-LOK2"}')
t "/pending/klaar zet klaar" '[[ $k == *"\"status\":\"klaar\""* ]] && ! curl -s -H "Authorization: Bearer $K" $R/pending | grep -q FA-LOK2'
t "/pending?alle=1 toont ook klaar" 'curl -s -H "Authorization: Bearer $K" "$R/pending?alle=1" | grep -q FA-LOK2'
ctl '{"reset":1}'>/dev/null
s=$(curl -s -o /dev/null -w %{http_code} "$R/__scheduled?cron=7,37+*+*+*+*")
sleep 2;t "cron draait (200), niets te vroeg opnieuw" '[[ $s == 200 ]] && [[ $(ctl "{}"|python3 -c "import json,sys;print(len(json.load(sys.stdin)[\"hits\"]))") == 0 ]]'
t "site.json ongewijzigd (404 zonder shot)" '[[ $(curl -s -o /dev/null -w %{http_code} $R/site.json) == 404 ]]'
echo "== $pass pass, $fail fail"
