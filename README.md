# SOLEIX — Premium Sneaker Storefront + Role-Based Dashboard

Next.js 16 (App Router, JavaScript) · Tailwind CSS 4 · SQLite (`node:sqlite`, no native install needed).

## Running

```bash
npm install
npm run setup:admin     # creates the first Super Admin from .env.local (see below)
npm run seed:catalog    # optional: sample shops, products and stock
npm run seed:demo       # optional: demo staff accounts + order records
npm run dev             # http://localhost:3000
```

Production: `npm run build && npm start`.

## First Super Admin setup

Copy `.env.example` to `.env.local` and set:

- `SOLEIX_SUPERADMIN_EMAIL` — your sign-in email
- `SOLEIX_SUPERADMIN_PASSWORD` — at least 10 characters
- `SOLEIX_SUPERADMIN_NAME`

Then run `npm run setup:admin`. It writes the account (scrypt-hashed password) directly into the database. All other accounts are created from inside the Super Admin panel — there is no public registration.

Demo seed accounts created by `npm run seed:demo` (local development only — change these passwords in the panel before deploying anywhere):

| Role | Email | Password |
| --- | --- | --- |
| Admin (shops 1–2) | `manager@soleix.local` | `SoleixManager!2026` |
| Shop (Soleix Downtown) | `store.downtown@soleix.local` | `SoleixStore!2026` |
| Shop (Soleix Harbour, read-only products) | `store.harbour@soleix.local` | `SoleixStore!2026` |

### Google sign-in (optional)

Email/password login works with no Google setup. To also allow "Continue with Google":

1. Create OAuth credentials at https://console.cloud.google.com/apis/credentials (type **Web application**) and add the redirect URI `http://localhost:3000/api/auth/google/callback` (plus your production URL's `/api/auth/google/callback`).
2. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local` and restart. The Google button appears on `/login`; without these vars it stays hidden.

Google uses the standard authorization-code + PKCE flow, verified fully server-side (state + HMAC, PKCE verifier, RS256 ID-token signature/iss/aud/exp, verified email). A Google identity never grants a role by itself: sign-in succeeds only when the verified email already exists as an active staff user created by the Super Admin — otherwise `/login` shows "not linked to a SOLEIX staff account".

## Routes

- Storefront: `/` · `/shop` (catalog + filters) · `/product/[id]` · `/cart` · `/checkout` (demo, no payments) · `/wishlist` · `/account` · `/info/[slug]`
- Sign in: `/login` (email + password, plus optional "Continue with Google" when configured). After login the server redirects by verified DB role: Super Admin → `/superadmin`, Admin → `/admin`, Shop → `/panel`.
- Dashboards: `/superadmin` (admins, shops, products, categories, orders, inventory, reports, settings), `/admin` (assigned shops, products, inventory, orders, reports, settings), `/panel` (shop profile, products, inventory, orders, sales, settings).

## How security works

- Passwords are hashed with scrypt (`lib/password.mjs`); plain text is never stored.
- Sessions are random 256-bit tokens stored **hashed** in the `sessions` table; the browser only receives an `httpOnly` cookie (`lib/session.mjs`).
- Every dashboard page and server action re-checks the session and role server-side (`requireUser` / `actionUser`). Roles and permissions come from the database — never from the browser.
- `middleware.js` adds a fast cookie-presence gate so logged-out visitors get an immediate redirect before any dashboard HTML streams.
- Shop scoping: queries filter by `shopIdsFor(user)` — admins only see assigned shops (`shop_admins`), shop accounts only their own shop. Admins cannot create Super Admins or edit other admins.
- Uploaded product images are served through `app/uploads/[...key]/route.js` with filename validation.

## Testing

```bash
npx playwright install chromium
npm run build && npm start   # port 3111 for the suite
node --env-file-if-exists=.env.local tests/auth.spec.mjs
```

The suite verifies: role-based login and redirects, invalid credential rejection, cross-role blocking, per-shop data isolation, admin CRUD through the UI, logout, and storefront health (20 checks).

## Notes

- Data lives in `data/soleix.db` (set `SOLEIX_DATA_DIR` to move it). Delete the file to start fresh.
- Checkout is intentionally a frontend demo: no payment integration, no orders are placed from the storefront. Dashboard order records come from the seeded/recorded order data.
