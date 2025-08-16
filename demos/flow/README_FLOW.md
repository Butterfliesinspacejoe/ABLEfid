# ABLEfid Flow Module (Drop‑in)
This is a **drop‑in module** to add Magic email login + Flow Testnet balance read to your existing app.
It does **not** replace your repo — add it as a subfolder (e.g. `web/flow/` or `demos/flow/`) and link to it.

## Files
- `login.html` — Magic email login (Flow testnet)
- `dashboard.html` — Shows session metadata and checks FLOW token balance via FCL
- `ablefid.css` — Minimal styles (namespaced for this demo)
- `auth_flow.js` — Magic (FlowExtension) + FCL config + login logic (ESM)
- `dashboard_flow.js` — Balance query logic (ESM)
- `README_FLOW.md` — This guide

## 1) Where to put these files
Create a folder in your repo, e.g.:
```
/demos/flow/
  login.html
  dashboard.html
  ablefid.css
  auth_flow.js
  dashboard_flow.js
  README_FLOW.md
```

## 2) Add a link from your existing site
Add this to your existing homepage/header where you list routes:
```html
<a class="btn" href="/demos/flow/login.html">Flow Testnet Login</a>
```

If you serve from a local static server at the repo root, the link will work.

## 3) Configure Magic (publishable key)
Open `auth_flow.js` and set your Magic **publishable** key:
```js
const MAGIC_PUBLISHABLE_KEY = "pk_live_..."; // or pk_test if you have one
```

## 4) Run locally
From the repo root:
```bash
python3 -m http.server 8080
# open http://localhost:8080/demos/flow/login.html
```

## 5) What this module does
- Passwordless login with Magic on **Flow Testnet**
- Stores a simple session in `localStorage`
- Dashboard to show session metadata & **FLOW** balance (via `/public/flowTokenBalance` capability)

## 6) Next steps (optional)
- Auto‑fill Flow address if exposed by Magic as `publicAddress`
- Add FUSD or a demo token contract and read balances
- Add a `mutate` example to send tokens between test addresses

---
**Note**: This is intentionally small and self‑contained to avoid breaking your current repo. Integrate incrementally.
