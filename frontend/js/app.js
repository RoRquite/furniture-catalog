// App bootstrap: loads data, wires router + UI + Telegram bridge.

import { createRouter } from "./core/router.js";
import { createFavorites } from "./core/favorites.js";
import { createTelegramBridge } from "./core/telegram.js";
import { assetURL } from "./core/assets.js";
import { createUI } from "./ui/render.js";

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`failed to load ${path}: ${res.status}`);
  return res.json();
}

async function main() {
  const [categoriesData, productsData, config] = await Promise.all([
    loadJSON(assetURL("data/categories.json")),
    loadJSON(assetURL("data/products.json")),
    fetch(assetURL("data/config.json")).then((r) => r.json()).catch(() => ({})),
  ]);

  const telegram = createTelegramBridge();
  telegram.ready();
  telegram.expand();
  if (telegram.insideTelegram) telegram.setHeaderColor("secondary_bg_color");

  const router = createRouter();
  const model = {
    categories: categoriesData.categories || [],
    products: productsData.products || [],
    getCategory: (id) => (categoriesData.categories || []).find((c) => c.id === id) || null,
    productsByCategory: (id) =>
      (productsData.products || []).filter((p) => p.category === id),
    getProduct: (id) => (productsData.products || []).find((p) => p.id === id) || null,
    nextProduct(productId, categoryId) {
      const list = (productsData.products || []).filter((p) => p.category === categoryId);
      const idx = list.findIndex((p) => p.id === productId);
      if (idx === -1 || list.length === 0) return null;
      return list[(idx + 1) % list.length];
    },
  };
  const favorites = createFavorites();
  const root = document.getElementById("app");

  const configFull = {
    ...config,
    shopName: config.shopName || "Каталог мебели",
    demoNote: categoriesData.note || "",
  };
  const ui = createUI(root, router, model, favorites, telegram, configFull);
  ui.bindEvents();
  router.onNavigate(() => ui.render());
  ui.render();
}

main().catch((err) => {
  document.getElementById("app").innerHTML =
    `<h1>Ошибка загрузки</h1><p>${String(err && err.message)}</p>`;
});
