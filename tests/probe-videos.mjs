import { chromium } from "@playwright/test";
const files = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
for (const f of files) {
  const dims = await page.evaluate(async (src) => {
    const v = document.createElement("video");
    v.src = src;
    await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = rej; setTimeout(() => rej(new Error("timeout")), 8000); });
    return { w: v.videoWidth, h: v.videoHeight, d: Math.round(v.duration) };
  }, "file:///" + f.replaceAll("\\", "/"));
  console.log(f, JSON.stringify(dims));
}
await browser.close();
