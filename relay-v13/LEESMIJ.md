# fien-relay-v13
Nieuwe Cloudflare Worker voor Fien v13. Bestaande `fien-relay` en de Fien-routine blijven ongewijzigd.

Deploy (eenmalig, door iemand met Workers + R2 + Browser Rendering-rechten op het account):
```
npm i
npx wrangler r2 bucket create fien-relay-v13
npx wrangler secret put FIEN_WEBHOOK_URL   # zelfde webhook als nu
npx wrangler secret put FIEN_WEBHOOK_KEY
npx wrangler secret put PIN
npx wrangler secret put FOTO_SECRET        # willekeurige lange tekst
npx wrangler deploy
```
Zet daarna de workers.dev-URL in `fien/index.html` (`<meta name="fien-relay">`).
Na deploy: draai daarna de oude webhook-key door (die stond leesbaar in fien-v12).
