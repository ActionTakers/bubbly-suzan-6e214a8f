# Preview-Worker voor de Fien-chat (niet productie)
`node proef/build.mjs` bouwt `dist/worker.js` (relay + app uit ../fien onder /fien/, met meta fien-relay/fien-chat naar de Worker zelf).
Deploy gebeurde via de Cloudflare API als Worker `fien-relay-chat-proef` met: R2 `bubblyfien-chat-proef` (eigen bucket), [ai] AI, var EXTRA_ORIGINS (= eigen origin), var CHAT_DEBUG=1 (extra veld `dbg` met model en neurons; NIET in productie zetten), secret CHAT_KOPPELCODE (een proefcode, niet de echte). Geen cron, geen browser, geen webhook.
