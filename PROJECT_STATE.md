# Radud Landing Page — Project State

**Last Updated:** 2026-07-14

**Purpose:** Onboarding source of truth for AI agents and developers.  
**Live strategy:** Pre-launch waitlist (root). Full physical-product funnel is archived under `future-funnel/`.  
**Stack:** Static site (HTML / CSS / JS) on GitHub Pages · domain `radud.com` via `CNAME`. No build step.

---

## 1. Directory Tree

```
radud-landing-page/                    # repo root (this workspace)
│
├── index.html                         # ACTIVE — pre-launch waitlist (entry point)
├── tehom-upsell.html                  # ACTIVE — digital product “מתחת לתהום”
├── PROJECT_STATE.md                   # this document
├── CNAME                              # radud.com → GitHub Pages
│
├── css/
│   └── styles.css                     # ACTIVE — pre-launch styles
├── js/
│   └── script.js                      # ACTIVE — pre-launch logic (Klaviyo, WA, UI)
│
├── assets/                            # ACTIVE — consolidated media for live pages
│   ├── brand/
│   │   └── logo.radud.png
│   ├── cards/                         # 1.png … 32.png (digital card faces)
│   └── ui/
│       ├── assetsdeck.png             # product pack hero
│       ├── backfeaturecard.png        # card back / cover
│       ├── landing-sector*.png        # flip-card fronts on waitlist
│       ├── landing-moment-*.png       # “מתי שולפים קלף” row images
│       │     alone / friends / date / gift
│       ├── sector-slide*.png          # journey slider frames
│       ├── payment-*.svg              # Bit / cards / Apple Pay / Google Pay icons
│       └── extra.png, extra2.png
│
├── hamisha/                           # ACTIVE — free “5 cards” experience
│   ├── index.html                     # self-contained (embedded CSS + JS + CONFIG)
│   ├── hamisha (1).html               # alternate / legacy draft
│   └── hamisha*.png                   # unused local previews (not referenced)
│
├── future-funnel/                     # ARCHIVED — old full product funnel (not live entry)
│   ├── index-full.html                # old sales landing (purchase packs)
│   ├── thankyou.html                  # post-purchase thank-you + digital upsell
│   ├── styles.css                     # styles for archived funnel only
│   ├── script.js                      # scripts for archived funnel only
│   └── archived-assets/               # media used only by the old funnel
│       ├── client-pic1.png … 5.png
│       ├── featurecard.jpg
│       ├── logo.radud.png
│       ├── takriv klaf darga 1–3.png
│       └── radud_full_funnel_map.png
│
└── admin/                             # ops tooling (local/manual; not public marketing)
    ├── index.html
    ├── app.js, store.js, styles.css
    ├── data/seed.json
    └── integrations/payme.js          # PayMe hooks prepared, not live
```

---

## 2. File Mapping

### Active pre-launch surface (root)

| Path | Role |
|------|------|
| `index.html` | **Primary live page.** Waitlist / “בקרוב”. Section order below. No purchase UI. |
| `css/styles.css` | Visual system for the waitlist (and shared design tokens). |
| `js/script.js` | Waitlist behavior: `CONFIG`, Klaviyo subscribe, WhatsApp hooks, flip cards, slider, lead popup, form success UI. **Edit CONFIG only at top of file.** |

#### `index.html` section structure (live, 2026-07-14)

| # | Section | Notes |
|---|---------|--------|
| 1 | Header / nav | Logo + “שריין מקום” |
| 2 | Hero + lead form | `#hero` / `#hero-form` |
| 3 | Cards + depth levels (merged) | `#cards` — title `שלוש דרגות עומק.` · 3 flip cards with level name, count badge, description · back-of-card teaser · link to form |
| 4 | Spec “מה בקופסה” | `#spec` — pure move, table unchanged |
| 5 | Journey carousel | `#journey` |
| 6 | “מתי שולפים קלף” | `#what` — 4 rows + `landing-moment-*.png` |
| 7 | Manifesto as “61st card” | `#manifest` — lede + 2:3 card (`עליך` / brass rule / `רדוד.`) |
| 8 | Closing lead form | `#waitlist` |
| 9 | FAQ | `#faq` |
| 10 | Footer | WhatsApp only (no dead `#` policy links) |

Also: sticky bar + lead popup (outside `<main>`).
| `tehom-upsell.html` | Digital product experience “מתחת לתהום” (20 deep cards). Self-contained HTML + embedded CSS/JS. Images from `assets/cards/`. |
| `assets/brand/` | Logo for waitlist chrome. |
| `assets/ui/` | Product photography, card backs, sector art, payment icons used by live pages. |
| `assets/cards/` | Numbered card PNGs (`1.png`–`32.png`) for `hamisha/` and `tehom-upsell.html`. |
| `hamisha/index.html` | Post-signup free experience: **5 flip cards** + **finale (6th screen)** upsell for the digital product. CONFIG block at bottom of file. |
| `CNAME` | Custom domain binding for GitHub Pages. |

### Archived full funnel (`future-funnel/`)

| Path | Role |
|------|------|
| `future-funnel/index-full.html` | **Old main landing** with physical packs (single/duo/trio), stock messaging, PayMe checkout modal shell. Not the live homepage. |
| `future-funnel/thankyou.html` | Physical-order thank-you + on-page digital upsell block. |
| `future-funnel/styles.css` / `script.js` | CSS/JS **only** for the archived funnel (do not confuse with root `css/` / `js/`). |
| `future-funnel/archived-assets/` | Client photos, feature card, close-ups, planning map — used by old funnel, not by pre-launch. |

### Admin (side tooling)

| Path | Role |
|------|------|
| `admin/` | Manual stock/orders UI. PayMe integration scaffolded in `integrations/payme.js` but **disabled**. LocalStorage-backed via `store.js`. |

### Mental model for agents

```
LIVE PATHS                          ARCHIVE PATHS
─────────                           ─────────────
/  → index.html (waitlist)          /future-funnel/index-full.html
/hamisha/ → free 5 cards            /future-funnel/thankyou.html
/tehom-upsell.html → digital SKU    /future-funnel/archived-assets/*
/css + /js + /assets                (own styles.css + script.js)
```

---

## 3. Data Flows & Integrations

### 3.1 Lead form → Klaviyo

**Where:** `index.html` forms with `[data-lead-form]` · handler in `js/script.js` (`initLeadForms` → `subscribeEmail`).

**Config (`js/script.js` → `CONFIG`):**

| Key | Status | Notes |
|-----|--------|--------|
| `klaviyoPublicKey` | Set (`Y3xwhu`) | Company public key for Client API |
| `klaviyoListId` | **Empty TODO** | Still empty — no list write until filled. Console warning remains: *“Klaviyo List ID missing — local success only…”* |

**Flow:**

1. User submits email on waitlist.
2. `subscribeEmail(email)` POSTs to  
   `https://a.klaviyo.com/client/subscriptions/?company_id={publicKey}`  
   (Klaviyo Client API, revision `2024-10-15`).
3. Profile properties: `source: "pre-launch"` or `source: "share"` when `?src=share` was seen.
4. If `klaviyoListId` is missing → **local success only** (UI still shows success; console warning). No list membership written.
5. On success: `showFormSuccess` → `localStorage` lead flag (`radud_prelaunch_lead`), optional Meta Pixel `Lead` / `CompleteRegistration`.

---

### 3.2 WhatsApp hook (daily card broadcast)

**Where:** Lead form **success state** in `index.html` · wired by `showFormSuccess` in `js/script.js`.

**Config:**

| Key | Status | Purpose |
|-----|--------|---------|
| `CONFIG.whatsapp` | **Set:** `972559400995` | International number, no `+` |
| `CONFIG.whatsappBroadcastText` | `"עמוק"` | Keyword for morning-card broadcast opt-in |
| `CONFIG.whatsappText` | Generic contact copy | Footer `[data-wa]` |

**Flow:**

1. On load, `wireContacts()` rewrites every `[data-wa-broadcast]` and `[data-wa]` from `CONFIG` (removes `YOUR_NUMBER_HERE` from the live DOM).
2. After successful signup, `showFormSuccess` again sets all three broadcast CTAs (hero, closing form, popup) to:  
   `https://wa.me/972559400995?text=%D7%A2%D7%9E%D7%95%D7%A7`  
   (`עמוק`, URL-encoded).
3. Secondary escape link `[data-hamisha]` → `CONFIG.hamishaUrl` (`hamisha/`) for the free 5-card experience.
4. Footer contact: WhatsApp only (תקנון / הצהרת נגישות / צור קשר removed — no live pages).

---

### 3.3 Upsell logic (`/hamisha` → digital product)

**Where:** `hamisha/index.html` (embedded CONFIG + slide engine).

**Structure:**

| Slide | Content |
|-------|---------|
| 1–5 | Free cards (`CARDS` array → images under `../assets/cards/`) |
| **6 (finale)** | Upsell screen for **מתחת לתהום** (digital product, ₪29 messaging) |

**Flow:**

1. User finishes the 5 free cards.
2. Finale slide offers CTA “פתח אותם עכשיו” for the digital product.
3. Intended destinations:
   - **Product experience page:** root `tehom-upsell.html` (card viewer for the paid digital set).
   - **Checkout:** `TEHOM.url` in hamisha CONFIG (see payment placeholder below).
4. Share links from cards append `SHARE_URL` = `https://radud.com/?src=share` (measures viral waitlist traffic).

**Related CONFIG in `hamisha/index.html`:**

- `IMG_BASE` → `../assets/cards/`
- `COVER_IMG` → `../assets/ui/backfeaturecard.png`
- `PAY_ICONS_BASE` → `../assets/ui/`
- `TEHOM` → `{ url, price }`
- `FINALE` → copy for the 6th screen

---

### 3.4 Payment placeholder (PayMe)

**Status: not connected.** Checkout is a deliberate placeholder.

| Location | Current value | Intent |
|----------|---------------|--------|
| `hamisha/index.html` → `TEHOM.url` | `'#'` | PayMe / Payment Link for ₪29 digital SKU |
| `future-funnel/index-full.html` + `script.js` | PayMe modal shell; `CONFIG.payme` pattern | Physical pack checkout when re-enabled |
| `admin/integrations/payme.js` | Prepared, **disabled** | Future webhooks → `AdminStore.addOrderFromPayMe` |

**Rules for agents:**

- Do **not** invent live payment URLs.
- When PayMe is ready: set `TEHOM.url` (and archived funnel payment links) to real Payment Links; never commit secret keys in frontend.
- Public client key / Payment Links only on the static site; secrets stay server-side or in PayMe dashboard.
- Until then, CTA may show payment icons for trust but click target remains `#` (or local-only success paths).

---

## 4. User Journey (live pre-launch)

```
Visitor → index.html (waitlist)
            │
            ├─ submit email → Klaviyo (if list ID set) + local lead flag
            │       │
            │       ├─ [primary] WhatsApp “עמוק” broadcast opt-in
            │       └─ [secondary] hamisha/  (5 free cards)
            │                           │
            │                           └─ finale (6th) → Tehom upsell / PayMe placeholder
            │                                    │
            │                                    └─ tehom-upsell.html (digital product UI)
            │
            └─ share cards → radud.com/?src=share → same waitlist (tracked source)
```

---

## 5. CONFIG cheat sheet (edit these first)

| File | Block | Critical empty / placeholder fields |
|------|--------|-------------------------------------|
| `js/script.js` | `CONFIG` | `email` (empty), **`klaviyoListId` still TODO/empty**; `whatsapp` is filled (`972559400995`) |
| `hamisha/index.html` | bottom CONFIG | `WHATSAPP`, `TEHOM.url` (`#` until PayMe) |
| `tehom-upsell.html` | bottom CONFIG | `IMG_BASE`, `CARDS` front/back mapping (`?map` debug mode) |

---

## 6. Path conventions (post-reorg)

- Live waitlist assets: `assets/brand/*`, `assets/ui/*`, `assets/cards/*`
- Styles/scripts for **live** site: `css/styles.css`, `js/script.js`
- Styles/scripts for **archive** only: `future-funnel/styles.css`, `future-funnel/script.js`
- Do not reintroduce `pre-launch/`, `digital-product/`, or `radud-assets/` folder names — those were consolidated.

### Optional production redirects (if old URLs still shared)

| Old | New |
|-----|-----|
| `/pre-launch/` | `/` |
| `/mitachat.html` | `/tehom-upsell.html` |
| `/digital-product/*` | `/assets/cards/*` |
| `/backfeaturecard.png` | `/assets/ui/backfeaturecard.png` |

---

## 7. Constraints for future work

1. **Zero accidental funnel flip:** Root must remain the pre-launch waitlist unless product strategy changes.
2. **No secret keys** in static frontend (PayMe client key / Payment Links only when ready).
3. Prefer editing **CONFIG blocks** over rewriting engines in `hamisha/` or `tehom-upsell.html`.
4. Hebrew RTL UI; design tokens live in CSS custom properties (`--brass`, `--ink`, etc.).
5. Keep active vs archived trees separate when changing assets or paths.

---

*End of project state document. Update this file whenever structure, integrations, or live entry points change.*
