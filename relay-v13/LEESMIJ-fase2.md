# Fase 2 — "Zet op de site" (NIET gedeployd)
Branch `fase2-zet-op-site` (lokaal, niet gepusht). Bestanden: `sitezet.js` (mapping + Firestore), 2 routes in `index.js`,
`wrangler.test.toml` (alleen lokaal testen), `FA-CBHPYV-firestore-concept.json` (voorbeeld-uitkomst).

## Routes (POST, origin actiontakers.github.io, PIN verplicht)
- `/site/zet` `{id:"FA-…", pin, dry?:true, appVersie?}` → maakt `recipes/fien_<id>` met `status:"draft"`. Inhoud komt uit
  het gepubliceerde `fien/ai-results/<id>.json`, niet uit de app. Bestaat het doc al: niets overschrijven, alleen status terug.
  `dry:true` = alleen lezen, laat de velden zien. Antwoord: `{siteStatus:"klaar", siteSlug, firestore:"draft", stap:"klaar voor Gabriël"}`.
- `/site/status` `{pin, ids:[…]}` → per id `{siteStatus, siteSlug, firestore, stap}` voor de app (v16).
- Zonder secret `FIEN_FIREBASE_SA` antwoorden beide met 503 "site-koppeling staat nog uit" (veilig om eerst alleen code te deployen).

## Veiligheid
- Schrijft alleen `recipes/fien_FA-…` (regex-guard), alleen create (Firestore 409 = bestaat → niet overschrijven). Nooit `published`.
- Weigert blogs, id-mismatch, en elk veld/tekst met prijs/€/allergie/…vrij/kcal/calorie (422, "eerst naar Gabriël").
- Slug botst met site-sitemap of bestaand Firestore-recept → `-2`, `-3` … (anders zou de app ten onrechte "Staat online" tonen).

## Lokale test
Firestore-emulator (`/workspace/fien-fase2/emu`, project demo-bubbly-bakery, kopie van de 4 docs) + `wrangler dev -c wrangler.test.toml`.
Script: `/workspace/fien-fase2/test-fase2.sh`, uitkomst `/workspace/fien-fase2/test-resultaat.txt`.
