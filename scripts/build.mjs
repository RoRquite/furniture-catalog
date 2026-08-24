// Build/validate gate: checks data contracts, images, and assembles dist/.
import { readFileSync, existsSync, mkdirSync, cpSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url).pathname;
let errors = [];

const cats = JSON.parse(readFileSync(root + "data/categories.json"));
const prods = JSON.parse(readFileSync(root + "data/products.json"));
const conf = JSON.parse(readFileSync(root + "data/config.json"));

if (!Array.isArray(cats.categories) || cats.categories.length < 3)
  errors.push("need >= 3 categories");
for (const c of cats.categories) {
  for (const k of ["id", "name", "image"]) if (!c[k]) errors.push(`category missing ${k}`);
  if (c.image && !existsSync(root + "public/" + c.image))
    errors.push(`category image not found: ${c.image}`);
}
const ids = new Set();
if (!Array.isArray(prods.products) || prods.products.length < 3 * 2)
  errors.push("need >= 2 products per each of 3 categories");
for (const p of prods.products) {
  for (const k of ["id", "category", "name", "description", "price",
                   "currency", "image", "features"])
    if (p[k] === undefined) errors.push(`${p.id || "?"} missing ${k}`);
  if (ids.has(p.id)) errors.push(`duplicate id ${p.id}`);
  ids.add(p.id);
  if (!cats.categories.some((c) => c.id === p.category))
    errors.push(`${p.id}: unknown category ${p.category}`);
  if (p.image && !existsSync(root + "public/" + p.image))
    errors.push(`product image not found: ${p.image}`);
}
if (!conf.order || typeof conf.order.contactUrl !== "string")
  errors.push("config.order.contactUrl is required");

// Production URL comes from environment only — never hardcoded anywhere.
const appUrl = process.env.MINI_APP_URL || "";
let appUrlValid = false;
if (appUrl) {
  if (/^https:\/\/[^\s]+$/i.test(appUrl)) {
    conf.appUrl = appUrl;
    appUrlValid = true;
  } else {
    errors.push(`MINI_APP_URL must start with https:// (got: "${appUrl}")`);
  }
}

if (errors.length) {
  console.error("BUILD FAILED:\n" + errors.map((e) => " - " + e).join("\n"));
  process.exit(1);
}

mkdirSync(root + "dist", { recursive: true });
cpSync(root + "frontend", root + "dist", { recursive: true });
cpSync(root + "data", root + "dist/data", { recursive: true });
cpSync(root + "public", root + "dist", { recursive: true });
writeFileSync(root + "dist/data/config.json",
              JSON.stringify(conf, null, 2) + "\n");

// Cache-busting: version local asset references so webviews (Telegram
// in-app browser) never serve a stale mix of HTML/JS/CSS after redeploy.
const V = Date.now().toString(36);
let html = readFileSync(root + "frontend/index.html", "utf8");
html = html.replaceAll('href="./css/styles.css"', `href="./css/styles.css?v=${V}"`);
html = html.replaceAll('src="./js/app.js"', `src="./js/app.js?v=${V}"`);
if (!html.includes(`?v=${V}`)) errors.push("index.html: expected asset refs not found for cache-busting");
writeFileSync(root + "dist/index.html", html);

console.log("BUILD OK:", prods.products.length,
  "products in", cats.categories.length, "categories -> dist/");
if (appUrlValid) {
  console.log("\nГотовая команда для BotFather (Menu Button URL):");
  console.log(`/setmenubutton — используйте этот адрес: ${appUrl}\n`);
} else {
  console.log("MINI_APP_URL не задан — Telegram Menu Button URL придётся");
  console.log("указать вручную после публикации (см. TELEGRAM_SETUP.md).");
}
