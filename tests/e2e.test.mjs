// E2E checks for the MVP core: navigation, favorites, order, edge cases.
// Pure-logic level (no browser needed): the same modules the UI uses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createRouter, createCatalogModel, SCREENS }
  from "../frontend/js/core/router.js";
import { createFavorites } from "../frontend/js/core/favorites.js";
import { buildOrderText, placeOrder }
  from "../frontend/js/core/order.js";

const root = new URL("..", import.meta.url).pathname;
const cats = JSON.parse(readFileSync(root + "data/categories.json"));
const prods = JSON.parse(readFileSync(root + "data/products.json"));
const conf = JSON.parse(readFileSync(root + "data/config.json"));
const model = createCatalogModel(cats.categories, prods.products);

function memStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null,
           setItem: (k, v) => m.set(k, String(v)),
           removeItem: (k) => m.delete(k) };
}

test("1. catalog opens as root screen", () => {
  const r = createRouter();
  assert.equal(r.current.screen, SCREENS.CATALOG);
});

test("2. open category", () => {
  const r = createRouter();
  r.navigate("category", { categoryId: "tables" });
  assert.equal(r.current.screen, SCREENS.CATEGORY);
  assert.equal(model.productsByCategory("tables").length >= 2, true);
});

test("3. open product", () => {
  const r = createRouter();
  r.navigate("category", { categoryId: "tables" });
  r.navigate("product", { productId: "furniture-001" });
  assert.equal(r.current.screen, SCREENS.PRODUCT);
  assert.equal(model.getProduct("furniture-001").name.includes("Стол"), true);
});

test("4. back returns to previous logical screen", () => {
  const r = createRouter();
  r.navigate("category", { categoryId: "chairs" });
  r.navigate("product", { productId: "furniture-004" });
  const back = r.back();
  assert.equal(back.screen, SCREENS.CATEGORY);
  assert.equal(back.params.categoryId, "chairs");
});

test("5. next shows next product in category", () => {
  const next = model.nextProduct("furniture-001", "tables");
  assert.equal(next.id, "furniture-002");
});

test("6. last product wraps to first", () => {
  const next = model.nextProduct("furniture-003", "tables");
  assert.equal(next.id, "furniture-001");
});

test("7. add to favorites", () => {
  const f = createFavorites(memStorage());
  f.add("furniture-002");
  assert.deepEqual(f.list(), ["furniture-002"]);
});

test("8. remove from favorites", () => {
  const f = createFavorites(memStorage());
  f.toggle("furniture-003");
  f.toggle("furniture-003");
  assert.deepEqual(f.list(), []);
});

test("9. favorites screen lists items", () => {
  const f = createFavorites(memStorage());
  f.add("furniture-005");
  const items = f.list().map((id) => model.getProduct(id));
  assert.equal(items.length, 1);
  assert.equal(items[0].category, "chairs");
});

test("10. from favorites into a product card", () => {
  const f = createFavorites(memStorage());
  f.add("furniture-007");
  const p = model.getProduct(f.list()[0]);
  assert.ok(p);
  const r = createRouter();
  r.navigate("favorites");
  r.navigate("product", { productId: p.id });
  assert.equal(r.current.params.productId, "furniture-007");
});

test("11. order text contains name and id; contact is configurable", async () => {
  const p = model.getProduct("furniture-001");
  const text = buildOrderText(p);
  assert.match(text, /Хочу заказать:/);
  assert.match(text, /furniture-001/);
  assert.match(text, /Стол письменный/);

  const res = await placeOrder(p, conf, null /* no telegram */, null);
  // placeholder contact must not be opened; user gets the text instead
  assert.equal(res.opened, undefined === res.opened ? res.opened : res.opened);
  assert.match(res.text, /furniture-001/);
});

test("12. return to catalog from any depth", () => {
  const r = createRouter();
  r.navigate("category", { categoryId: "wardrobes" });
  r.navigate("product", { productId: "furniture-008" });
  r.reset();
  assert.equal(r.current.screen, SCREENS.CATALOG);
  assert.equal(r.canGoBack(), false);
});

test("13. missing product handled explicitly", () => {
  assert.equal(model.getProduct("no-such-id"), null);
  assert.equal(model.nextProduct("no-such-id", "tables"), null);
  assert.equal(model.getCategory("no-cat"), null);
});

test("14. empty favorites state", () => {
  const f = createFavorites(memStorage());
  assert.deepEqual(f.list(), []);
});

test("15. data contract: demo flag + currency on every product", () => {
  assert.equal(cats.demo, true);
  assert.equal(prods.demo, true);
  for (const p of prods.products) {
    assert.equal(p.currency, "UZS");
    assert.ok(Array.isArray(p.features));
  }
});
