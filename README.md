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

Then run `npm run setup:admin`. It writes the account (scrypt-hashed password) directly into the database. All other **staff** accounts are created from inside the Super Admin panel — `/signup` only ever creates Firebase customer accounts and can never grant a dashboard role.

Demo seed accounts created by `npm run seed:demo` (local development only — change these passwords in the panel before deploying anywhere):

| Role | Email | Password |
| --- | --- | --- |
| Admin (shops 1–2) | `manager@soleix.local` | `SoleixManager!2026` |
| Shop (Soleix Downtown) | `store.downtown@soleix.local` | `SoleixStore!2026` |
| Shop (Soleix Harbour, read-only products) | `store.harbour@soleix.local` | `SoleixStore!2026` |

### Firebase accounts (Sign Up, Google, password reset)

The storefront works without Firebase: staff keep signing in with the SQLite accounts above. Add Firebase credentials to `.env.local` and restart, and the customer identity layer switches on. Check what the server currently sees with `npm run check:firebase` — it prints only variable names and OK/MISSING status, never values. Until the web config is present, `/signup` and the Google button stay switched off and say so instead of claiming the credentials are wrong.

1. **Web config** — Firebase console → Project settings → Your apps → copy the six `NEXT_PUBLIC_FIREBASE_*` values.
2. **Admin key** — Project settings → Service accounts → Generate new private key; put the JSON in `FIREBASE_SERVICE_ACCOUNT` (plain or base64), or set `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`.
3. **Providers** — enable Email/Password and Google under Authentication → Sign-in method, and add `localhost:3000` (plus your domain) to Authorized domains.
4. **Firestore** — create the database (any mode); profiles are written server-side to the `profiles` collection, one document per uid.

How it fits together:

- `/signup` registers with `createUserWithEmailAndPassword`, stores the display name, and writes the profile document through the Admin SDK. Duplicate emails are reported on the field, and a login link is offered.
- `/login` signs in with Firebase, with a **Continue with Google** button using `signInWithPopup` and an automatic `signInWithRedirect` fallback when the browser blocks popups. Cancelled popups, wrong-provider accounts and disabled users each get their own message.
- Every Firebase ID token is verified **server-side** with the Admin SDK (`verifyIdToken` with revocation check), then a Firebase **session cookie** (`soleix_firebase`, HttpOnly, SameSite=Lax, Secure in production, 5-day TTL) is issued — see `lib/firebase/admin.mjs` and `lib/session.mjs`. No client-only auth decisions.
- The service account key never reaches the browser: it is only read in `lib/firebase/admin.mjs`, and the client bundle gets just the public `NEXT_PUBLIC_*` config.
- If a Firebase email matches an active staff row in SQLite, the staff role session starts too, so `/superadmin`, `/admin` and `/panel` keep authorizing from the database. Google never grants a role by itself.
- Logout clears the Firebase session cookie, the staff session row, and the browser's Firebase persistence (`components/SignOutButton.js`).

## Routes

- Storefront: `/` · `/shop` (catalog + filters) · `/product/[id]` · `/cart` · `/checkout` (demo, no payments) · `/wishlist` · `/account` (sign-in required) · `/info/[slug]`
- Auth: `/login` (email + password, Google, show/hide password, Forgot password link) · `/signup` (full name, email, password, confirm) · `/forgot-password` (Firebase reset email). Header shows Log in / Sign up when signed out and an account menu with Logout once signed in.
- Dashboards: `/superadmin` (admins, shops, products, categories, orders, inventory, reports, settings), `/admin` (assigned shops, products, inventory, orders, reports, settings), `/panel` (shop profile, products, inventory, orders, sales, settings). After login the server redirects by verified DB role: Super Admin → `/superadmin`, Admin → `/admin`, Shop → `/panel`; customers go to `/account`, or back to the `?next=` page they came from.

## How security works

- Passwords for staff accounts are hashed with scrypt (`lib/password.mjs`); customer passwords stay inside Firebase Authentication and are never stored in this repo's database.
- Staff sessions are random 256-bit tokens stored **hashed** in the `sessions` table; the browser only receives an `httpOnly` cookie (`lib/session.mjs`).
- Customer sessions are Admin-SDK-signed Firebase session cookies in an `httpOnly` cookie; the token is verified on every server render, so a edited cookie cannot forge a login.
- Every dashboard page and server action re-checks the session and role server-side (`requireUser` / `actionUser`); `/account` is guarded by `requireAccountUser`. Roles and permissions come from the database — never from the browser.
- `middleware.js` adds a fast cookie-presence gate for `/superadmin`, `/admin`, `/panel` and `/account`, so logged-out visitors get an immediate redirect before any protected HTML streams.
- Login uses `?next=` for the post-login destination, and only same-site absolute paths are accepted (`safeNext`), so the parameter cannot be used for an open redirect.
- Shop scoping: queries filter by `shopIdsFor(user)` — admins only see assigned shops (`shop_admins`), shop accounts only their own shop. Admins cannot create Super Admins or edit other admins.
- Uploaded product images are served through `app/uploads/[...key]/route.js` with filename validation.
- `/account` renders as a Partial Prerender: the static shell streams instantly and the signed-in content resolves inside a `<Suspense>` boundary below the shared layout, which is what Next 16 requires to avoid the "uncached data during a navigation" error.

## Testing

```bash
npx playwright install chromium
npm run build && npm start   # port 3111 for the suite
npm run test:auth            # staff roles, isolation, logout, storefront health
npm run test:account         # /account navigation as guest + signed-in admin
```

`tests/auth.spec.mjs` verifies role-based login and redirects, invalid credential rejection, cross-role blocking, per-shop data isolation, admin CRUD through the UI, logout, and storefront health. `tests/account-nav.spec.mjs` client-navigates into `/account` (the scenario that triggered the InstantServer error) and asserts no console errors. Real Google and reset-email flows need live Firebase credentials, so they are verified manually once `.env.local` has them.

## Notes

- Data lives in `data/soleix.db` (set `SOLEIX_DATA_DIR` to move it). Delete the file to start fresh.
- Checkout is intentionally a frontend demo: no payment integration, no orders are placed from the storefront. Dashboard order records come from the seeded/recorded order data.
