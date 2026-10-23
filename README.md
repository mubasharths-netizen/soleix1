# SOLEIX — Premium Sneaker Storefront

A premium, minimalist athletic footwear storefront built with **Next.js (App Router), JavaScript and Tailwind CSS**. Inspired by the shopping experience of modern sneaker sites, with original SOLEIX branding, copy and AI-generated product/campaign photography.

> This is a frontend demo. Browsing, search, filters, favourites and the cart all work — but checkout and payments are **not** connected and no orders are placed.

## Run it

```bash
npm install
npm run dev        # development → http://localhost:3000
```

Production:

```bash
npm run build
npm start          # → http://localhost:3000
```

## What's inside

| Route | Purpose |
| --- | --- |
| `/` | Promo bar, cinematic video hero, benefits strip, featured collections (tabbed carousels), shop-by-category, two full-width video campaigns, editorial edits, brand story, newsletter |
| `/shop` | Search, filters (audience, category, size, colour, max price), sort, live result count, clear-all, shareable URLs |
| `/product/[id]` | Gallery with labelled crops, colour/size selection, quantity, validation, delivery & returns accordions, related products |
| `/cart`, `/checkout` | Full cart page and demo checkout preview with totals and free-delivery progress |
| `/wishlist`, `/account` | Saved favourites and guest-account hub |
| `/info/[slug]` | Delivery, returns, size guide, FAQ, about, approach, contact, community, privacy, terms |

- **Cart & favourites persist** in `localStorage` (`soleix-store-v1`) across refreshes and tabs.
- **Video campaigns** autoplay muted/looping once scrolled near, fade in over their poster, pause when off-screen, and fall back to the poster if a video fails — never a black box.
- **Motion** via framer-motion: scroll reveals (once per element), staggered hero text entrance, animated wishlist heart, add-to-cart feedback, page transitions, sticky-header scroll state. Everything respects `prefers-reduced-motion`.
- Loading (`app/loading.js`), empty and error (`app/error.js`, `app/not-found.js`) states included.
- Responsive at mobile (390px), tablet (820px) and desktop (1440px+) with no horizontal overflow.

## Structure

```
app/                 routes + layout, template.js (page transitions), globals.css design system
components/          Header, Footer, ProductCard, ShopBrowser, ProductDetail,
                     CartDrawer, CartContents, StoreProvider, Modal, Newsletter,
                     VideoCampaign (lazy video hero/campaigns), Carousel, Reveal
lib/products.js      sample catalog (PKR prices), helpers
public/images/       original generated photography (WebP) + video posters
public/videos/       free-license stock videos from Coverr (cdn.coverr.co, 720p MP4)
tests/verify.mjs     Playwright end-to-end checks (59 assertions)
```

## Verify

With the production server running on port 3111 (`npx next start -p 3111`):

```bash
node tests/verify.mjs
```

Screenshots land in `tests/artifacts/`.
