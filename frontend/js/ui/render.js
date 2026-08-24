// DOM rendering per screen. Mobile-first, no framework.
import { assetURL } from "../core/assets.js";

const esc = (s) => String(s).replace(/[&<>"']/g,
  (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

export function createUI(root, router, model, favorites, telegramBridge, config) {
  function render() {
    const { screen, params } = router.current;
    telegramBridge.hideBackButton();
    if (screen === "catalog") renderCatalog();
    else if (screen === "category") renderCategory(params.categoryId);
    else if (screen === "product") renderProduct(params.productId, params.categoryId);
    else if (screen === "favorites") renderFavorites();
    else if (screen === "not_found") renderNotFound(params.message);
    applyTheme();
    root.scrollTop = 0;
  }

  function header(title) {
    const backBtn = router.canGoBack()
      ? `<button class="back" data-action="back">← Назад</button>`
      : "";
    return `${backBtn}<h1>${esc(title)}</h1>`;
  }

  function renderCatalog() {
    const cats = model.categories.map((c) => `
      <button class="card category-card" data-action="open-category" data-id="${esc(c.id)}">
        <img src="${esc(assetURL(c.image))}" alt="">
        <span class="card-title">${esc(c.name)}</span>
      </button>`).join("");
    root.innerHTML = `${header(config.shopName || "Каталог мебели")}
      ${model.categories.some ? "" : ""}
      <section class="grid">${cats}</section>
      <footer class="demo-note">${config.demoNote || ""}</footer>`;
  }

  function renderCategory(categoryId) {
    const category = model.getCategory(categoryId);
    if (!category) {
      router.navigate("not_found", { message: "Категория не найдена" });
      return;
    }
    const items = model.productsByCategory(categoryId).map((p) => `
      <button class="card product-card" data-action="open-product"
              data-id="${esc(p.id)}" data-category="${esc(p.category)}">
        <img src="${esc(assetURL(p.image))}" alt="">
        <span class="card-title">${esc(p.name)}</span>
        <span class="price">${esc(p.price)} ${esc(p.currency)}</span>
      </button>`).join("");
    root.innerHTML = `${header(category.name)}
      <section class="grid">${items}</section>
      ${items === "" ? "<p class='empty'>В категории пока нет товаров</p>" : ""}`;
  }

  function renderProduct(productId, categoryIdHint) {
    const product = model.getProduct(productId);
    if (!product) {
      router.navigate("not_found", { message: "Товар не найден" });
      return;
    }
    const categoryId = product.category || categoryIdHint;
    const inFav = favorites.has(product.id);
    const favLabel = inFav ? "✓ В избранном" : "♡ В избранное";
    root.innerHTML = `
      <div class="topbar"><button class="back" data-action="back">← Назад</button></div>
      <article class="product">
        <img class="product-img" src="${esc(assetURL(product.image))}" alt="${esc(product.name)}">
        <h1>${esc(product.name)}</h1>
        <p class="desc">${esc(product.description)}</p>
        <p class="price big">${esc(product.price)} ${esc(product.currency)}</p>
        <h2>Характеристики</h2>
        <ul class="features">${(product.features || [])
          .map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
        <div class="actions">
          <button data-action="next-product"
                  data-id="${esc(product.id)}"
                  data-category="${esc(categoryId)}">Следующий →</button>
          <button data-action="toggle-fav" data-id="${esc(product.id)}">${favLabel}</button>
          <button data-action="order" data-id="${esc(product.id)}"
                  class="primary">Заказать</button>
        </div>
      </article>`;
    telegramBridge.showBackButton(() => {
      // Telegram hardware/gesture back mirrors in-app back
      doBack();
    });
  }

  function renderFavorites() {
    const ids = favorites.list();
    const items = ids.map((id) => model.getProduct(id)).filter(Boolean)
      .map((p) => `
        <button class="card product-card" data-action="open-product"
                data-id="${esc(p.id)}" data-category="${esc(p.category)}">
          <img src="${esc(assetURL(p.image))}" alt="">
          <span class="card-title">${esc(p.name)}</span>
          <span class="price">${esc(p.price)} ${esc(p.currency)}</span>
        </button>`).join("");
    root.innerHTML = `${header("Избранное")}
      ${ids.length
        ? `<section class="grid">${items}</section>`
        : "<p class='empty'>В избранном пока ничего нет.<br>Откройте товар и нажмите «♡ В избранное».</p>"}
      <button class="link" data-action="go-catalog">Перейти в каталог</button>`;
  }

  function renderNotFound(message) {
    root.innerHTML = `${header("Не найдено")}
      <p class="empty">${esc(message || "Такой страницы нет.")}</p>
      <button data-action="go-catalog">Перейти в каталог</button>`;
  }

  function doBack() {
    if (!router.back()) router.reset(); // at root: stay on catalog
  }

  function bindEvents() {
    root.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === "back") doBack();
      else if (action === "go-catalog") router.reset();
      else if (action === "open-category")
        router.navigate("category", { categoryId: btn.dataset.id });
      else if (action === "open-product")
        router.navigate("product", { productId: btn.dataset.id });
      else if (action === "next-product")
        router.navigate("product", {
          productId: model.nextProduct(btn.dataset.id, btn.dataset.category).id,
        });
      else if (action === "toggle-fav") {
        favorites.toggle(btn.dataset.id);
        render(); // refresh button label
      } else if (action === "order") {
        const product = model.getProduct(btn.dataset.id);
        const res = await import("./core/order.js")
          .then((m) => m.placeOrder(product, config, telegramBridge, navigator.clipboard));
        alert(res.opened === "chat"
          ? "Заказ подготовлен — открываем чат…\n\n" + res.text
          : "Текст заказа:\n\n" + res.text +
            "\n\nСкопируйте его и отправьте на контакт из README.");
      }
    });
  }

  function applyTheme() {
    const theme = telegramBridge.theme();
    if (theme) {
      root.style.setProperty("--bg", theme.secondary_bg_color || theme.bg_color || "");
      root.style.setProperty("--text", theme.text_color || "");
      root.style.setProperty("--accent", theme.button_color || "");
    }
  }

  return { render, bindEvents };
}
