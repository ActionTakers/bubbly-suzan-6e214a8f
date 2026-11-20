# Fien relay v13.1 — duurzaam doorsturen

**Waarom:** op 18-11-2026 (16:54 Amsterdam) kwam verzoek FA-MAXWFY binnen. De webhook nam het aan (2xx) maar de
Grok Bot-run faalde (tegoed op). De relay bewaarde alleen `seen/<id>` + foto, dus de tekst was weg.
(Suzan stuurde dezelfde foto op 20-11 opnieuw als FA-OVEY4V → Kaasfondue, afgehandeld.)

**Bron:** `ActionTakers/bubbly-suzan-6e214a8f` → `relay-v13/index.js` + `relay-v13/durable.js`. Worker `fien-relay-v13`, R2 `bubblyfien`.

## Ontwerp (outbox in R2 + cron, alles free tier)
1. `POST /verzoek` (pin 0709 + origin-check zoals altijd) → claim `seen/<id>` (dedupe) → **eerst** `req/<id>.json` schrijven
   (hele payload zonder pin, status, pogingen) → daarna pas doorsturen naar de webhook (`Idempotency-Key: <id>`).
2. Webhook faalt? Antwoord aan de app is tóch `ok:true, bewaard:true` — het verzoek ligt veilig in R2.
3. Cron `7,37 * * * *` (één trigger; :07 maakt ook de site-screenshot): voor elk open `req/` (status ontvangen/doorgestuurd/mislukt,
   `volgende` verstreken): bestaat `fien/ai-results/<id>.json` (raw GitHub, fallback Pages)? → `klaar`. Anders opnieuw doorsturen
   met `poging:n, herkansing:true` en een vers ondertekende fotolink.
   - Backoff na *mislukt* (geen 2xx): 30m, 1u, 2u, 4u, 8u, 12u… — na *doorgestuurd zonder resultaat* (bv. tegoed op): 2u, 4u, 8u, 12u…
   - Max 8 pogingen → `opgegeven` (zichtbaar in `/pending`). Max 12 verzoeken per cron-run (subrequest-limiet).
   - Status leeft ook in R2 customMetadata (`s`,`v`,`n`), dus de cron hoeft alleen te `list`-en.
4. Idempotent per id: één id = één resultaatbestand = één kaart. De routine moet bij `herkansing:true` eerst kijken of
   `ai-results/<id>.json` al bestaat en dan niets doen.

## Endpoints voor de inhaal-routine (geen Origin nodig)
- `GET  /pending` → `{ok,aantal,verzoeken:[{id,status,ontvangen,pogingen,laatste,volgende,payload}]}` (open + opgegeven; `?alle=1` = alles)
- `POST /pending/klaar` `{"id":"FA-…","status":"klaar"|"opgegeven"}` → stopt herkansingen
- Auth: `Authorization: Bearer $FIEN_PENDING_KEY` (Worker-secret). Op de box: `/home/box/.secrets/fien-pending.env`
  (chmod 600, bevat `FIEN_RELAY_URL` en `FIEN_PENDING_KEY`). Nooit printen: `set -a; . /home/box/.secrets/fien-pending.env; set +a`.

## Test
- `relay-v13/test/http-test.sh` (wrangler dev -c wrangler.test.toml + `test/mock.mjs`, nep-.dev.vars) — 16/16.
- `node relay-v13/test/cron-test.mjs` (tijdreizen, nep-R2) — 8/8.
- Live droog-test: `{"test":true,"droog":true}` + id met `TEST` → alleen bewaard, nooit doorgestuurd (daarna opgeruimd).

## Waarom geen Cloudflare Queues
Queues zit sinds 4-2-2026 in Workers Free (10k ops/dag, DLQ), maar berichten leven daar max **24 uur**. Een tegoed-storing kan
langer duren; R2 bewaart onbeperkt en is al gekoppeld. Kan later als versneller erbij, R2 blijft de bron van waarheid.
