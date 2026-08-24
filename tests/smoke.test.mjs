// Production smoke check: everything the built app fetches at runtime must
// physically exist inside dist/ and resolve correctly via the single asset
// resolver (js/core/assets.js), which keeps the app working at domain root
// (local HTTP) and under the GitHub Pages sub-path /furniture-catalog/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const dist = root + "dist/";

const cats = JSON.parse(readFileSync(dist + "data/categories.json"));
const prods = JSON.parse(readFileSync(dist + "data/products.json"));
const conf = JSON.parse(readFileSync(dist + "data/config.json"));

test("smoke: dist/data/*.json exist and parse", () => {
  assert.ok(Array.isArray(cats.categories) && cats.categories.length > 0);
  assert.ok(Array.isArray(prods.products) && prods.products.length > 0);
  assert.equal(typeof conf.order.contactUrl, "string");
});

test("smoke: every product/category image exists in dist/", () => {
  for (const c of cats.categories)
    assert.ok(existsSync(dist + c.image), `missing in dist/: ${c.image}`);
  for (const p of prods.products)
    assert.ok(existsSync(dist + p.image), `missing in dist/: ${p.image}`);
});

function stripQuery(url) {
  return url.split("?")[0];
}

test("smoke: index.html local refs are sub-path safe and versioned", () => {
  const html = readFileSync(dist + "index.html", "utf8");
  let versioned = 0;
  for (const ref of html.matchAll(/(?:src|href)="(?!https?:)([^"]+)"/g)) {
    const url = ref[1];
    if (url.includes("?v=")) versioned += 1;
    const file = stripQuery(url);
    assert.ok(!url.startsWith("/") && !file.startsWith("../"),
      `non sub-path-safe asset reference in index.html: ${url}`);
    assert.ok(existsSync(dist + file), `missing in dist/: ${file}`);
  }
  assert.ok(versioned >= 2, "index.html should carry cache-busting ?v= refs");
});

test("smoke: no raw document-relative fetches remain in dist/js", () => {
  for (const f of ["app.js", "core/router.js", "core/favorites.js",
                   "core/order.js", "core/telegram.js", "core/assets.js",
                   "ui/render.js"]) {
    const src = readFileSync(dist + "js/" + f, "utf8");
    assert.ok(!/fetch\(\s*["'`]\.\.\//.test(src),
      `${f}: raw "../" fetch is forbidden — use js/core/assets.js`);
    assert.ok(!/fetch\(\s*["'`]\/(?!\/)/.test(src),
      `${f}: domain-absolute fetch is forbidden — use js/core/assets.js`);
  }
});

test("smoke: images render through the unified asset resolver", () => {
  const render = readFileSync(dist + "js/ui/render.js", "utf8");
  assert.ok(!/src="\$\{esc\((c|p|product)\.image\)\}"/.test(render),
    "render.js must wrap image paths in assetURL()");
  assert.ok(render.includes("assetURL"), "render.js must import assetURL");
});
