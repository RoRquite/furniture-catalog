// Production smoke check: everything the built app fetches at runtime must
// physically exist inside dist/ and resolve correctly relative to the page
// URL (GitHub Pages project site serves dist/ under /furniture-catalog/).
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

test("smoke: index.html references local assets with ./ (sub-path safe)", () => {
  const html = readFileSync(dist + "index.html", "utf8");
  for (const ref of html.matchAll(/(?:src|href)="(?!https?:)([^"]+)"/g)) {
    const url = ref[1];
    if (!url.startsWith("http")) {
      assert.ok(!url.startsWith("/") && !url.startsWith("../"),
        `non sub-path-safe asset reference in index.html: ${url}`);
      assert.ok(existsSync(dist + url), `missing in dist/: ${url}`);
    }
  }
});

test("smoke: app.js resolves data via import.meta.url (no ../data string fetch)", () => {
  const app = readFileSync(dist + "js/app.js", "utf8");
  assert.ok(app.includes('new URL(`../data/${name}`, import.meta.url)'),
    "app.js must resolve data URLs against its own module URL");
});
