# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

**TravelNow** — a full-stack tourism platform focused exclusively on **Egyptian** destinations (Pyramids, Luxor, Red Sea, Sinai, etc.). It serves two user types — **tourists** (browse, book, plan trips, pay) and **tourism companies** (apply, get verified, post offers) — plus a built-in **admin** role. The frontend is a static multi-page HTML/CSS/JS site; the backend is an Express + Mongoose API. The frontend is designed to work **without the backend** in "demo mode" using `localStorage` and hard-coded data in `assets/js/data.js`.

## Commands

### Frontend
```bash
# Open index.html directly in a browser — no build step.
# Site auto-detects backend availability and falls back to demo mode.
```

### Backend (`backend/`)
```bash
cd backend
npm install              # one-time
cp .env.example .env     # then edit secrets
npm start                # production: node server.js
npm run dev              # development: nodemon auto-reload
npm test                 # placeholder — no tests configured
```

Backend listens on `http://localhost:5000` (override with `PORT`). Health: `GET /api/health`. Root: `GET /` returns service metadata.

### Optional services for full stack
- **MongoDB** running locally on `mongodb://localhost:27017/travelnow` (or set `MONGODB_URI`).
  - If Mongo is down, the app **keeps running in demo mode** (see "Demo Mode" below).
- **Stripe** keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) for real payments; otherwise payment endpoints return a fake `pi_demo_*` intent.

### Default Admin Account (seeded in `config/index.js`)
- Email: `admin@travelnow.com`
- Password: `Admin123@`

## High-Level Architecture

```
TravelNow/
├── index.html              # Landing + cinematic splash (video, countdown, skip)
├── pages/                  # 17 inner pages: login, register, dashboard, attractions,
│                           #   map, trip-planner, payment, bookings, companies, etc.
├── admin/admin.html        # Single-file admin panel (sidebar + Chart.js analytics)
├── assets/
│   ├── css/                # style.css (global + theme), auth, dashboard, landing,
│   │                       #   splash, pages, dark-mode
│   ├── js/
│   │   ├── auth.js         # Login/register/Storage helpers, escaping-button UX,
│   │   │                   #   toast notifier, requireAuth/requireAdmin guards
│   │   ├── data.js         # ATTRACTIONS, COMPANIES, OFFERS (window globals)
│   │   ├── splash.js, landing.js, theme.js
│   └── images/, videos/    # (CDN URLs used in current build)
└── backend/
    ├── server.js           # Express bootstrap, helmet, CORS, morgan, rate-limit,
    │                       #   static /uploads, mounts /api/* routers
    ├── config/index.js     # Env → config object (JWT, Mongo, Stripe, Firebase, admin)
    ├── database/connection.js  # Mongoose connect; non-fatal on failure
    ├── middleware/
    │   ├── auth.js         # authMiddleware (JWT verify) + requireRole(...roles)
    │   ├── validation.js   # express-validator chains for register/login
    │   └── upload.js       # Multer disk storage → backend/uploads/, 5MB, jpg/png/pdf
    ├── models/             # Mongoose schemas: User, Company, Attraction, Booking,
    │                       #   Payment, Review, Feedback, Offer, TripPlan, Post,
    │                       #   Notification, Hotel
    ├── controllers/        # One file per resource (auth, attraction, company,
    │                       #   booking, payment, review, feedback, notification,
    │                       #   tripPlanner, admin)
    └── routes/             # Thin Express routers — one per resource, mounted in
                            #   server.js. /api/auth uses a stricter 5/15min limiter.
```

## Key Architectural Patterns

### Demo Mode Fallback (important — pervasive)
Every controller and the frontend are written so the **app keeps working with no DB and no backend**:
- `backend/database/connection.js` swallows Mongo errors and logs "Running in demo mode".
- Controllers wrap `Model.find*` / `Model.create` in `.catch(() => null)` or `.catch(() => seedData)` and return seed arrays on failure (see `attractionController.js` and `tripPlannerController.js`).
- The frontend in `assets/js/auth.js` catches `fetch` failures and writes a fake `travelnow-user` to `localStorage` so the rest of the app behaves normally.
- This means **most controllers have two code paths** (real DB + seed/demo). When changing a controller, preserve both paths.

### Frontend Auth (localStorage-based)
- `Storage` helper in `assets/js/auth.js` reads/writes `localStorage` keys `travelnow-user` and `travelnow-token`.
- `requireAuth()` and `requireAdmin()` are page-load guards; `pages/dashboard.html` etc. call them inline.
- Admin login is short-circuited both client-side (`auth.js`) and server-side (`authController.js`) via hard-coded `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `config/index.js`.

### Three Roles
`User.role` enum: `tourist` (default), `company`, `admin`. Role gates:
- Backend: `requireRole('admin')` on `/api/admin/*` and admin actions in `/api/companies/*`.
- Frontend: `requireAdmin()` for `admin/admin.html`.

### PCI-DSS Payment Flow
`backend/controllers/paymentController.js` and `models/Payment.js` are explicit about never storing full card numbers:
- Frontend collects card in `pages/payment.html`, but real production tokenization happens via Stripe.js on the client.
- Backend exposes `POST /api/payments/create-intent` (returns `clientSecret`) and `POST /api/payments/confirm` (stores only `cardBrand` + `cardLast4`).
- `POST /api/payments/webhook` is registered with `express.raw()` BEFORE the JSON parser to preserve the Stripe signature.
- The `Payment` schema's `toJSON` defensively deletes `cardNumber` and `cvv` from output.
- Without a real Stripe key, `createPaymentIntent` returns a fake `pi_demo_*` so the flow still demos.

### Egyptian-Only Data
Both `backend/controllers/attractionController.js` (server-side seed) and `assets/js/data.js` (client-side seed) carry a hard-coded list of ~12 Egyptian attractions plus companies and offers. Coordinates are real lat/lng used by the Leaflet map in `pages/map.html`. Categories: `historical`, `religious`, `museums`, `beach`, `adventure`, `natural`, `cultural`.

### AI Trip Planner
`backend/controllers/tripPlannerController.js` `generateItineraryLogic` is a rule-based itinerary builder (no LLM call) — picks attractions from a style-keyed lookup, builds `days` slots, picks hotel tier from `dailyBudget > 3000`.

## Conventions Specific to This Repo

- **No bundler.** HTML pages each `<script src=…>` their own dependencies (Bootstrap, Swiper, AOS, Leaflet, Chart.js from CDNs). When adding a page, follow the same pattern.
- **Auth helpers are global.** `window.selectUserType`, `handleLogin`, `handleRegister`, `requireAuth`, `requireAdmin`, `logout`, `showToast`, `Storage`, `API_BASE` are all attached in `assets/js/auth.js`. Reuse them instead of reimplementing.
- **Toast notifications.** Use `showToast(msg, 'success'|'error'|'warning')` — never `alert()`.
- **Theme tokens.** Color/spacing vars are in `:root` in `assets/css/style.css` (`--primary: #d4af37` gold, `--dark: #0a1d2e` navy). Dark mode is toggled via `body.dark-mode` and persists in `localStorage['travelnow-theme']`.
- **Egyptian governorates** used as filter values: Cairo, Giza, Alexandria, Luxor, Aswan, Red Sea, South Sinai, Matruh.
- **JWT** tokens are signed with `config.JWT_SECRET` (default fallback in `config/index.js` is intentionally weak — override in `.env`). `User` passwords are bcrypt-hashed at 12 rounds via a Mongoose pre-save hook (`models/User.js`).
- **Uploads** go to `backend/uploads/` (gitignored in spirit; not in repo) and are served at `/uploads/*`. The directory must exist for multer to write.

## Common Pitfalls

- The frontend uses **relative paths** (`../assets/...`) from `pages/` and `admin/`. New pages must respect the depth from `index.html`.
- `pages/payment.html` currently POSTs directly — when wiring real Stripe, replace with Stripe.js Elements on the client; the server endpoint `createPaymentIntent` already returns a `clientSecret`.
- The escaping-login-button UX in `assets/js/auth.js` (`initEscapingButton`) intentionally runs away on hover when fields are empty — don't treat the `mouseover` listener as a bug.
- The landing page hides `landing-page` until the splash countdown/video ends; any analytics that fires on `DOMContentLoaded` will miss the actual landing.
- `admin.html` and `dashboard.html` are static pages with hard-coded numbers in the stat cards — they're meant to be wired to `/api/admin/analytics` and `/api/users` but currently render seeded UI.
