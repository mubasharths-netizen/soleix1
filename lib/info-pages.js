// The help and legal library. Plain data (no JSX) so the storefront page, the sitemap and the
// structured-data output can all read the same source of truth.
//
// Keep every claim here honest against what the app actually does: Cash on Delivery orders are
// written to the database, prices come from the shop settings, and the only cookies are the
// sign-in cookies this site sets itself.

export const INFO_PAGES = [
  {
    slug: "delivery",
    title: "Shipping & Delivery",
    intro: "How your pair travels, what it costs and how long it takes.",
    description: "SOLEIX delivery charges, free-delivery threshold, timelines and order tracking across Pakistan.",
    sections: [
      {
        heading: "What does delivery cost?",
        paragraphs: [
          "Delivery is charged once per order. The exact figures are set by the shop and shown live on this page, in your bag and at checkout — nothing is added after you place the order.",
        ],
        settings: true,
      },
      {
        heading: "How long will it take?",
        paragraphs: [
          "Estimated delivery is 3–5 business days to major cities across Pakistan. Outlying areas can need a little longer, and the shop calls you before the parcel leaves so you always know when to expect the rider.",
        ],
      },
      {
        heading: "How do you pay?",
        bullets: [
          "Cash on Delivery only. You hand the rider the order total in cash when your parcel arrives.",
          "No card, wallet or bank details are ever collected on this site, so there is nothing to leak.",
          "The shop confirms every order by phone before it is packed.",
        ],
      },
      {
        heading: "Where do you deliver?",
        paragraphs: [
          "Nationwide within Pakistan. All prices are shown in Pakistani Rupees (PKR) and include applicable taxes.",
        ],
      },
      {
        heading: "Tracking an order",
        paragraphs: [
          "Every order gets a reference such as SOL-01-00042. Put it into the tracking form on the order page, or open My orders after signing in to see each status change with the time it happened.",
        ],
      },
    ],
    notice: {
      icon: "truck",
      text: "Delivery is free once your merchandise total reaches the threshold above. Bags that qualify show “On us” at checkout before you pay anything.",
    },
    related: [["Track an order", "/track"], ["Returns & exchanges", "/info/returns"], ["Contact us", "/info/contact"]],
  },
  {
    slug: "returns",
    title: "Returns & Exchanges",
    intro: "A little room to change your mind.",
    description: "SOLEIX returns and exchanges: 14 days for unworn pairs in original packaging, plus how size exchanges work.",
    sections: [
      {
        heading: "14-day returns",
        paragraphs: [
          "If a pair isn't the one, you have 14 days from delivery to return it, provided the shoes are unworn and back in the original packaging with all tags attached.",
        ],
      },
      {
        heading: "Exchanges",
        paragraphs: ["Size exchanges follow the same conditions. Tell the shop the size you need and we hold the pair while your return is on the way."],
      },
      {
        heading: "How to start one",
        bullets: [
          "Signed in: open My orders and use Request cancellation while an order is still pending or confirmed.",
          "Already shipped or delivered: use the contact form and quote your order reference — the shop that packed your pair handles it.",
          "Cash on Delivery refunds are handed back in cash by the rider or paid at the shop counter.",
        ],
      },
      {
        heading: "Good to know",
        bullets: [
          "Try shoes indoors on carpet or a mat to keep the soles clean.",
          "Keep the box and paperwork until you are sure.",
          "Items returned without original packaging may not qualify.",
        ],
      },
    ],
    notice: { icon: "return", text: "A pair that has been worn outdoors cannot be returned — the soles tell us, and the next shopper deserves a clean shoe." },
    related: [["Size guide", "/info/size-guide"], ["Contact us", "/info/contact"], ["My orders", "/account/orders"]],
  },
  {
    slug: "size-guide",
    title: "Size Guide",
    intro: "Every size on SOLEIX is a European (EU) size.",
    description: "How to find your EU sneaker size with SOLEIX, plus the size ranges we carry for men, women and kids.",
    sections: [
      {
        heading: "Find your EU size",
        paragraphs: [
          "Start with the EU size printed inside a well-fitting pair you already own. If you are between sizes, we generally suggest going up — feet swell during the day and during runs.",
        ],
      },
      {
        heading: "Measure up",
        bullets: [
          "Measure both feet while standing, wearing the socks you plan to use.",
          "Use the longer foot when comparing against a size chart.",
          "Leave about a thumb's width in front of your longest toe.",
        ],
      },
      {
        heading: "Size ranges we carry",
        bullets: [
          "Men's and running styles: EU 39–45",
          "Women's styles: EU 36–41",
          "Kids' styles: EU 28–34",
        ],
      },
    ],
    notice: { icon: "info", text: "This storefront does not publish a verified centimetre / UK / US conversion chart, and fit varies by style — the sizes listed on a product page are the sizes we actually hold in stock." },
    related: [["Shop the collection", "/shop"], ["Returns & exchanges", "/info/returns"]],
  },
  {
    slug: "faq",
    title: "FAQs",
    intro: "Quick answers to the questions we hear most.",
    description: "Answers about SOLEIX orders, Cash on Delivery, accounts, favourites, stock and pricing.",
    faqs: [
      { question: "Is this a real store?", answer: "SOLEIX is an independent concept storefront with a fully working shopping flow: live stock, a real bag, Cash on Delivery checkout and orders that land in the shop dashboard. The brand, products and prices are samples, but nothing in the flow is faked." },
      { question: "How do I pay?", answer: "Cash on Delivery. You pay the rider in cash when the parcel arrives. No card or wallet details are collected anywhere on this site." },
      { question: "Do I need an account?", answer: "No. You can check out as a guest and track the order with its reference. An account adds order history, saved addresses and the ability to request a cancellation yourself." },
      { question: "Where is my bag and my favourites stored?", answer: "In this browser's local storage, so they survive a refresh and follow you between tabs. Creating an account keeps your orders against your email as well." },
      { question: "What currency do you use?", answer: "Pakistani Rupees (PKR), taxes included in every displayed price." },
      { question: "Do you ship internationally?", answer: "Not at the moment — delivery is within Pakistan only." },
      { question: "How do I save a pair for later?", answer: "Tap the heart on any product. Saved pairs live under Favourites." },
      { question: "How do I know a size is really available?", answer: "Stock is read from the shop's inventory rows on every page, and checkout re-checks it before the order is written. Sold-out sizes are struck through instead of quietly hidden." },
      { question: "Can I cancel an order?", answer: "Yes, while it is still pending or confirmed — open My orders and use Request cancellation. After that, contact the shop and we will do our best." },
      { question: "Can I review a pair I bought?", answer: "Once your order is delivered you can write a review on the product page. Reviews from a matching delivered order are marked Verified buyer." },
    ],
    related: [["Contact us", "/info/contact"], ["Delivery", "/info/delivery"], ["Returns", "/info/returns"]],
  },
  {
    slug: "about",
    title: "Our Story",
    intro: "A fresh perspective on everyday movement.",
    description: "Why SOLEIX exists, what we make and where the concept store is going.",
    sections: [
      {
        heading: "Why SOLEIX exists",
        paragraphs: [
          "We believe the right pair does more than complete a look. It opens a door — to a new place, a new pace, a new version of you. SOLEIX started with a simple question: what if everyday sneakers felt as considered as they look?",
        ],
      },
      {
        heading: "What we make",
        paragraphs: [
          "Thoughtfully designed footwear for running, trails and the in-between. Breathable uppers, sculpted cushioning, and palettes built to live with what you already wear.",
        ],
      },
      {
        heading: "How this store is built",
        paragraphs: [
          "SOLEIX runs as a small chain of shops rather than one anonymous warehouse. Each location holds its own stock, its own staff log in, and its own delivery runner — which is why a bag with pairs from two shops becomes two orders, each tracked on its own.",
        ],
      },
      {
        heading: "Where we're going",
        paragraphs: [
          "SOLEIX is an independent concept brand — a design study of a premium sneaker storefront. Every product, price and policy here is a sample, made to show what care in the details feels like.",
        ],
      },
    ],
    related: [["Our approach", "/info/approach"], ["Store locations", "/stores"], ["Shop the collection", "/shop"]],
  },
  {
    slug: "approach",
    title: "Our Approach",
    intro: "Comfort, considered. Design, honest.",
    description: "How SOLEIX designs sneakers: quiet materials, honest stock, and a storefront with nothing hidden.",
    sections: [
      { heading: "Design in the open", paragraphs: ["Quiet colours, clean lines, and silhouettes meant to last a season or five. We design for the everyday — the commute, the long walk, the early start."] },
      { heading: "Comfort first, always", paragraphs: ["Every pair pairs breathable mesh with responsive cushioning, because a shoe you don't notice is the shoe you'll reach for again."] },
      { heading: "No invented urgency", paragraphs: ["Stock counts, sold-out sizes and low-stock warnings come straight from the inventory rows. If we say only two are left, that is what the shop physically has."] },
      { heading: "Pricing you can read", paragraphs: ["One price per pair, taxes included, plus the delivery line. Discounts only apply when a campaign code is entered and verified — never silently, and never against your total twice."] },
    ],
    notice: { icon: "shield", text: "Generated imagery: every sneaker and campaign photo on this site was made for SOLEIX. No real footwear brand is represented or implied." },
    related: [["Our story", "/info/about"], ["Store locations", "/stores"]],
  },
  {
    slug: "community",
    title: "Community",
    intro: "Where movers find each other.",
    description: "The SOLEIX community: #FindYourNextMove, store events and where our channels actually live.",
    sections: [
      { heading: "#FindYourNextMove", paragraphs: ["Early starts, city laps and off-duty fits — this is the tag our shoppers use. If a pair took you somewhere worth photographing, that is the post."] },
      { heading: "Run club", paragraphs: ["The Downtown and Harbour shops host a Saturday morning group run. No pace requirement, no entry fee; turn up and walk out with the group if running is not your thing yet."] },
      { heading: "Where our channels live", paragraphs: ["This build is not wired to any social network, so the handles below are structure rather than a link out. Ask a shop on the contact page and a human will answer."] },
    ],
    channels: [
      { id: "instagram", name: "Instagram", status: "Not connected in this build" },
      { id: "tiktok", name: "TikTok", status: "Not connected in this build" },
      { id: "whatsapp", name: "WhatsApp", status: "Not connected in this build" },
    ],
    related: [["Contact us", "/info/contact"], ["Store locations", "/stores"]],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    intro: "What this store keeps, what it forgets, and who can see it.",
    description: "SOLEIX privacy: the data an order needs, the cookies this site sets, and how to get your record removed.",
    sections: [
      {
        heading: "What we collect",
        paragraphs: [
          "Only what a delivery needs. When you place an order we keep your name, email, phone number and address against that order so the shop can call you and the rider can find you.",
        ],
        bullets: [
          "Account: your sign-in is handled by Firebase Authentication; we store a profile row (name, email, phone, optional photo) so your order history can be shown to you and only you.",
          "Saved addresses: only if you save them in your account.",
          "Orders: items, sizes, colours, totals and status history, including a cancellation request and its reason.",
          "Reviews: the display name and rating you choose to publish, plus a verified-buyer flag derived from your delivered orders. Your email is never shown.",
          "Enquiries and newsletter sign-ups: what you type into those forms.",
          "Bag and favourites: local storage in this browser only — they never reach our server until you check out.",
        ],
      },
      {
        heading: "Cookies this site sets",
        bullets: [
          "soleix_session — staff sign-in, HttpOnly, expires with the session.",
          "soleix_firebase — customer sign-in, HttpOnly, SameSite=Lax, five days.",
          "No advertising, profiling or third-party tracking cookies are set, and no analytics script runs on this site.",
        ],
      },
      {
        heading: "Who can see it",
        paragraphs: [
          "Staff accounts are scoped in the database: a shop account sees only its own orders, an admin sees the shops assigned to them, and a super admin sees everything. Roles are never read from the browser.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: ["Order records stay while the shop needs them for returns and reconciliation. Newsletter sign-ups are removed the moment you use the unsubscribe link we give you."],
      },
      {
        heading: "Your choices",
        paragraphs: [
          "Ask through the contact form and we will export or delete the record tied to your email. Blocking an account from the dashboard stops sign-in without destroying its order history.",
        ],
      },
    ],
    notice: { icon: "shield", text: "This is a concept storefront: the database lives on the machine running the site, and no payment credentials exist here to protect." },
    related: [["Terms of use", "/info/terms"], ["Contact us", "/info/contact"]],
  },
  {
    slug: "terms",
    title: "Terms of Use",
    intro: "The fine print, in plain language.",
    description: "Terms for using the SOLEIX storefront: sample products, Cash on Delivery orders, reviews and conduct.",
    sections: [
      { heading: "What this store is", paragraphs: ["SOLEIX is an independent concept storefront built as a design and engineering study. The shopping flow works end to end — stock, checkout and orders are real inside this system — while the brand, products and prices are samples. Nothing here is an offer of sale by a trading company."] },
      { heading: "Orders", paragraphs: ["Placing an order sends it to the shop that holds your pair. The shop confirms it by phone before packing. Cash on Delivery means you pay the rider in cash on arrival; nothing is charged online."] },
      { heading: "Prices and stock", paragraphs: ["Prices are shown in PKR including taxes and can change without notice. Stock is live per shop, and a pair that sells out during checkout is held back rather than charged."] },
      { heading: "Reviews", paragraphs: ["Reviews must describe the pair you received. A verified-buyer flag is added only when a delivered order for that product matches your email. Abusive, off-topic or fabricated reviews can be hidden by the shop."] },
      { heading: "Imagery", paragraphs: ["All sneaker and campaign imagery was generated for SOLEIX. SOLEIX is not affiliated with, endorsed by, or connected to any existing footwear brand."] },
      { heading: "Your use", paragraphs: ["Browse, experiment and buy a sample pair. You agree not to hammer the forms, impersonate another shopper, or post reviews for pairs you never received."] },
    ],
    related: [["Privacy policy", "/info/privacy"], ["Delivery", "/info/delivery"]],
  },
];

// The contact page is rendered from its own component, but it still needs registry entries so
// the sitemap, the footer links and the help navigation all agree.
export const CONTACT_PAGE = {
  slug: "contact",
  title: "Contact Us",
  intro: "Tell us what you need — a human on the shop floor reads this.",
  description: "Contact SOLEIX about an order, sizing, delivery or a pair you are looking for. Every shop's phone number is listed too.",
  subjects: ["An order I placed", "Sizing and product advice", "Delivery or returns", "Stock and restock requests", "Something else"],
  related: [["Track an order", "/track"], ["FAQs", "/info/faq"], ["Delivery times", "/info/delivery"]],
};

export const ALL_INFO_PAGES = [...INFO_PAGES.filter((page) => page.slug !== "contact"), CONTACT_PAGE].sort(
  (a, b) => a.title.localeCompare(b.title)
);

export const infoBySlug = (slug) => ALL_INFO_PAGES.find((page) => page.slug === String(slug));

// The order in which the help centre lists them; contact first because that is the intent.
export const HELP_NAV = [
  ["Contact us", "/info/contact"],
  ["Delivery", "/info/delivery"],
  ["Returns & exchanges", "/info/returns"],
  ["Size guide", "/info/size-guide"],
  ["FAQs", "/info/faq"],
  ["Store locations", "/stores"],
  ["Our story", "/info/about"],
  ["Our approach", "/info/approach"],
  ["Community", "/info/community"],
  ["Privacy policy", "/info/privacy"],
  ["Terms of use", "/info/terms"],
];
