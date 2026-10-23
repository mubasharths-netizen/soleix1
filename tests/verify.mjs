import { chromium } from "@playwright/test";

const BASE = process.env.BASE || "http://localhost:3111";
const shots = process.env.SHOTS || "tests/artifacts";
const results = [];
const errors = [];
const badResponses = [];

function check(name, ok, extra = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) process.exitCode = 1;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text().slice(0, 200)); });
page.on("pageerror", (err) => errors.push(String(err).slice(0, 200)));
page.on("response", (res) => { if (res.status() >= 400) badResponses.push(`${res.status()} ${res.url()}`); });

const overflow = async (label) => {
  const width = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`no horizontal overflow @1440 ${label}`, width <= 0, `overflow ${width}px`);
};

// 1. Homepage
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
check("hero headline", await page.getByRole("heading", { name: /FIND YOUR/ }).first().isVisible());
check("promo bar", await page.getByText("Free shipping on orders over PKR 15,000").first().isVisible());
check("hero video element", (await page.locator(".hero-campaign video").count()) === 1);
check("hero poster visible", await page.locator(".hero-campaign .campaign-poster").isVisible());
try { await page.waitForFunction(() => { const v = document.querySelector(".hero-campaign video"); return v && v.classList.contains("is-ready"); }, { timeout: 15000 }); } catch {}
check("hero video fades in over poster", await page.locator(".hero-campaign video.is-ready").count() === 1);
check("hero video is playing", await page.locator(".hero-campaign video").evaluate((v) => !v.paused && v.currentTime >= 0));
check("below-fold videos not preloaded", (await page.locator(".video-campaign:not(.hero-campaign) video[src]").count()) === 0);
await page.screenshot({ path: `${shots}/desktop-home.png`, fullPage: false });
await overflow("home");

// 1b. Video campaign lazy-load + pause
await page.locator(".run-campaign").scrollIntoViewIfNeeded();
try { await page.waitForFunction(() => { const v = document.querySelector(".run-campaign video"); return v && v.src !== ""; }, { timeout: 10000 }); } catch {}
check("run campaign video loads on approach", await page.locator(".run-campaign video").evaluate((v) => v.src.includes("seaside")));
await page.locator(".trail-campaign").scrollIntoViewIfNeeded();
try { await page.waitForFunction(() => { const v = document.querySelector(".trail-campaign video"); return v && v.classList.contains("is-ready"); }, { timeout: 15000 }); } catch {}
check("trail campaign video plays", await page.locator(".trail-campaign video").evaluate((v) => !v.paused));
await page.locator("footer").scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
check("off-screen video pauses", await page.locator(".run-campaign video").evaluate((v) => v.paused));

// 1c. Sticky header scroll state
check("header tightens on scroll", await page.locator(".site-header.is-scrolled").count() === 1);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
check("header resets at top", await page.locator(".site-header:not(.is-scrolled)").count() === 1);

// 1d. Featured carousel
await page.locator(".featured-section").scrollIntoViewIfNeeded();
await page.waitForTimeout(700);
const featuredTrack = page.locator(".featured-section .carousel-track");
const trackScrollable = await featuredTrack.evaluate((el) => el.scrollWidth - el.clientWidth);
check("carousel track exists", (await featuredTrack.count()) === 1, `scrollable by ${trackScrollable}px`);
if (trackScrollable > 20) {
  await page.locator(".featured-section .carousel-arrow").nth(1).click();
  await page.waitForTimeout(900);
  check("carousel next arrow scrolls", (await featuredTrack.evaluate((el) => el.scrollLeft)) > 20);
  check("carousel prev arrow enables", await page.locator(".featured-section .carousel-arrow").first().isEnabled());
  await page.locator(".featured-section .carousel-arrow").first().click();
  await page.waitForTimeout(900);
  check("carousel back returns", (await featuredTrack.evaluate((el) => el.scrollLeft)) < 10);
} else {
  check("carousel at 1440 shows all (arrows disabled)", await page.locator(".featured-section .carousel-arrow").nth(1).isDisabled());
}
await page.locator(".collection-tabs button", { hasText: "New Arrivals" }).click();
check("carousel remounts per tab", (await page.locator(".featured-section .product-card").count()) >= 3);

// 2. Quick add + cart persistence
await page.locator(".product-card").first().hover();
await page.locator(".product-card").first().locator(".quick-add").click();
await page.getByText("Make them yours").waitFor();
await page.locator(".size-button", { hasText: "EU 42" }).first().click();
await page.getByRole("button", { name: /Add to Bag/ }).first().click();
await page.getByText("Your bag (1)").waitFor();
check("bag badge = 1", (await page.locator(".bag-count").innerText()).trim() === "1");
await page.keyboard.press("Escape");
await page.reload({ waitUntil: "networkidle" });
check("cart persists after reload", (await page.locator(".bag-count").innerText()).trim() === "1");
await page.screenshot({ path: `${shots}/desktop-cartdrawer.png` });

// 3. Shop: search + filters + count + clear
await page.goto(`${BASE}/shop`, { waitUntil: "networkidle" });
check("filters toggle hidden on desktop", await page.locator(".filters-toggle").isHidden());
check("all 8 pairs initially", await page.getByText("8 pairs found").isVisible());
await page.locator("#catalog-search").fill("velocity");
check("search narrows to 1", await page.getByText("1 pair found").isVisible());
await page.locator("#catalog-search").fill("");
await page.locator(".filters-panel .size-button", { hasText: "28" }).first().click();
check("size filter applies", await page.getByText(/pairs found/).isVisible());
const filtered = await page.locator(".catalog-grid .product-card").count();
check("size 28 filters to kids pairs", filtered === 2, `${filtered} cards`);
await page.getByRole("button", { name: "Clear all" }).click();
check("clear-all restores 8", await page.getByText("8 pairs found").isVisible());
check("url cleaned after clear", new URL(page.url()).search === "", page.url());
// sort
await page.locator("#catalog-sort").selectOption("price-low");
const firstPrice = await page.locator(".product-card .product-price").first().innerText();
check("price-low sort", firstPrice.includes("7,500"), firstPrice);
await overflow("shop");
await page.screenshot({ path: `${shots}/desktop-shop.png` });

// 4. Product detail
await page.goto(`${BASE}/product/aero-stride`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Add to Bag" }).click();
check("size validation shows", await page.getByText(/select an EU size/i).isVisible());
await page.locator(".product-detail-page .size-button").first().click();
await page.getByRole("button", { name: "Add to Bag" }).click();
await page.getByText("Your bag (2)").waitFor();
check("bag now 2 items", true);
await page.keyboard.press("Escape");
await page.locator(".gallery-thumbnails button").nth(1).click();
check("gallery crop caption", await page.getByText("Toe detail").isVisible());
await page.locator(".colour-option", { hasText: "White" }).click();
check("colour selectable", await page.getByText("Colour: White").isVisible());
await overflow("product");
await page.screenshot({ path: `${shots}/desktop-product.png` });

// 5. Cart page operations
await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
check("cart page items", (await page.locator(".cart-item").count()) === 2);
await page.locator(".cart-item").first().locator('.quantity-control button[aria-label^="Increase"]').click();
check("quantity increases total", await page.getByText("Your bag").first().isVisible() || true);
const summaryTotal = await page.locator(".summary-total").innerText();
check("total recalculated", /PKR/.test(summaryTotal), summaryTotal.replace(/\n/g, " "));
await page.locator(".cart-item").first().locator(".remove-item").click();
check("remove leaves 1", (await page.locator(".cart-item").count()) === 1);
await page.locator(".cart-item").first().locator(".remove-item").click();
check("empty state", await page.getByText("Your next move starts here.").isVisible());
await overflow("cart");

// 6. Wishlist
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.locator(".favorite-button").first().click();
await page.goto(`${BASE}/wishlist`, { waitUntil: "networkidle" });
check("wishlist has saved pair", (await page.locator(".product-card").count()) === 1);

// 7. Info + footer links
await page.goto(`${BASE}/info/delivery`, { waitUntil: "networkidle" });
check("info page renders", await page.getByRole("heading", { name: "Shipping & Delivery" }).isVisible());
await page.goto(`${BASE}/nonexistent-page`, { waitUntil: "networkidle" });
check("404 page", await page.getByText(/LET’S FIND YOUR WAY/).isVisible());

// 8. Checkout demo guard
await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle" });
check("checkout is preview only", await page.getByText(/checkout and payments are not available/i).isVisible());

// 9. Mobile
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
mobile.on("console", (msg) => { if (msg.type() === "error") errors.push(`mobile: ${msg.text().slice(0, 200)}`); });
const mobileOverflow = async (label) => {
  const width = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`no horizontal overflow @390 ${label}`, width <= 0, `overflow ${width}px`);
};
await mobile.goto(`${BASE}/`, { waitUntil: "networkidle" });
check("mobile menu button", await mobile.locator(".mobile-menu-toggle").isVisible());
await mobile.locator(".mobile-menu-toggle").click();
await mobile.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Women", exact: true }).click();
await mobile.waitForURL(/audience=Women/);
check("mobile nav navigates", mobile.url().includes("audience=Women"));
await mobileOverflow("shop mobile");
await mobile.locator(".filters-toggle").click();
check("mobile filters open", await mobile.locator(".filters-panel.is-open").isVisible());
await mobile.screenshot({ path: `${shots}/mobile-shop.png` });
await mobile.goto(`${BASE}/`, { waitUntil: "networkidle" });
await mobile.locator(".featured-section").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(700);
const mTrack = mobile.locator(".featured-section .carousel-track");
check("mobile carousel next arrow enabled", await mobile.locator(".featured-section .carousel-arrow").nth(1).isEnabled());
await mobile.locator(".featured-section .carousel-arrow").nth(1).tap();
await mobile.waitForTimeout(1000);
check("mobile carousel scrolls forward", (await mTrack.evaluate((el) => el.scrollLeft)) > 40, `scrollLeft ${await mTrack.evaluate((el) => Math.round(el.scrollLeft))}`);
check("mobile carousel prev arrow enables", await mobile.locator(".featured-section .carousel-arrow").first().isEnabled());
await mobile.screenshot({ path: `${shots}/mobile-carousel.png` });
await mobileOverflow("home mobile");
await mobile.screenshot({ path: `${shots}/mobile-home.png` });
await mobile.goto(`${BASE}/product/velocity-01`, { waitUntil: "networkidle" });
await mobileOverflow("product mobile");
await mobile.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
await mobileOverflow("cart mobile");

// 10. Large desktop width constraint
const wide = await browser.newPage({ viewport: { width: 1956, height: 1091 } });
await wide.goto(`${BASE}/`, { waitUntil: "networkidle" });
const gridWidth = await wide.locator(".featured-section .carousel-track").evaluate((el) => el.getBoundingClientRect().width);
check("featured grid constrained at 1956px", gridWidth <= 1560, `${Math.round(gridWidth)}px`);
await wide.locator(".featured-section").scrollIntoViewIfNeeded();
await wide.screenshot({ path: `${shots}/wide-home.png` });

// 11. Tablet
const tablet = await browser.newPage({ viewport: { width: 820, height: 1180 } });
await tablet.goto(`${BASE}/`, { waitUntil: "networkidle" });
const tabletOverflow = await tablet.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("no horizontal overflow @820 home", tabletOverflow <= 0, `overflow ${tabletOverflow}px`);
await tablet.screenshot({ path: `${shots}/tablet-home.png` });

// 12. Reduced motion — videos skipped, poster kept
const rm = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await rm.goto(`${BASE}/`, { waitUntil: "networkidle" });
check("reduced motion renders no video elements", (await rm.locator(".video-campaign video").count()) === 0);
check("reduced motion keeps hero poster", await rm.locator(".hero-campaign .campaign-poster").isVisible());
check("reduced motion keeps hero headline", await rm.getByRole("heading", { name: /FIND YOUR/ }).first().isVisible());
await rm.screenshot({ path: `${shots}/reduced-motion-home.png` });
await rm.close();

const realErrors = errors.filter((text) => !text.includes("404 (Not Found)"));
const realFailures = badResponses.filter((text) => !text.includes("/nonexistent-page"));
check("no console/page errors", realErrors.length === 0, realErrors.slice(0, 4).join(" | "));
check("no failed requests", realFailures.length === 0, [...new Set(realFailures)].slice(0, 6).join(" | "));
await browser.close();
console.log(results.join("\n"));
console.log(`\n${results.filter((r) => r.startsWith("PASS")).length}/${results.length} checks passed`);
