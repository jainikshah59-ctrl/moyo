# Moyo — your 3D clay mind-companion

Tiny rituals, big softness. Build daily rituals, check in your mood, chat with
Moyo, breathe together, and watch your clay companion grow from Sproutling to
Golden Moyo.

## Run locally

```bash
cd moyo
python3 -m http.server 8080
# open http://localhost:8080
```

No build step. No dependencies. All data stays in the browser (localStorage).

## Payments (no KYC)

Moyo Pro is sold through a self-custody Bitcoin rail:

1. Owner sets their BTC receiving address in `config.js` (`BTC_ADDRESS`).
2. At checkout the app shows the address + QR + the exact BTC amount (live price via CoinGecko).
3. The buyer sends from any wallet and pastes the transaction ID.
4. The app verifies the tx on the public blockchain via blockchain.info:
   it must pay our address the quoted amount and have ≥ 1 confirmation.
5. Pro activates on that device instantly.

No payment processor, no merchant account, no KYC — the owner just holds their
own wallet. (Converting BTC to fiat later happens in the owner's own wallet /
exchange, which is their own concern.)

## Deploy

- GitHub Pages: `python3 deploy_gh.py` (uses the connected GitHub credential)
- Any static host works: Vercel, Netlify, Cloudflare Pages — just upload the folder.

## Files

- `index.html` — app shell
- `styles.css` — 3D claymorphism design system
- `config.js` — BTC address, plans, limits (EDIT BEFORE LAUNCH)
- `app.js` — state, rituals, moods, chat UI, breathing, stats, Pro UI
- `moyo.js` — deterministic companion engine with memory (no AI API)
- `pay.js` — BTC quote + on-chain tx verification
- `assets/` — generated 3D clay mascot stages + icons
