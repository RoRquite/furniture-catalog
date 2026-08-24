// Screen router with a real history stack. No fake navigation:
// every back() pops exactly the previously visited screen.

export const SCREENS = {
  CATALOG: "catalog",
  CATEGORY: "category",
  PRODUCT: "product",
  FAVORITES: "favorites",
  NOT_FOUND: "not_found",
};

export function createRouter() {
  let current = { screen: SCREENS.CATALOG, params: {} };
  const stack = [];
  const listeners = [];

  function notify() {
    for (const fn of listeners) fn(current);
  }

  return {
    get current() {
      return current;
    },
    onNavigate(fn) {
      listeners.push(fn);
    },
    navigate(screen, params = {}) {
      if (!Object.values(SCREENS).includes(screen)) {
        throw new Error(`unknown screen: ${screen}`);
      }
      stack.push(current);
      current = { screen, params };
      notify();
      return current;
    },
    back() {
      if (stack.length === 0) return null; // already at root
      current = stack.pop();
      notify();
      return current;
    },
    canGoBack() {
      return stack.length > 0;
    },
    reset() {
      stack.length = 0;
      current = { screen: SCREENS.CATALOG, params: {} };
      notify();
    },
  };
}

export function createCatalogModel(categories, products) {
  function productsByCategory(categoryId) {
    return products.filter((p) => p.category === categoryId);
  }
  return {
    categories,
    products,
    getCategory: (id) => categories.find((c) => c.id === id) || null,
    productsByCategory,
    getProduct: (id) => products.find((p) => p.id === id) || null,
    nextProduct(productId, categoryId) {
      // wraps around: after the last product -> first one
      const list = productsByCategory(categoryId);
      const idx = list.findIndex((p) => p.id === productId);
      if (idx === -1 || list.length === 0) return null;
      return list[(idx + 1) % list.length];
    },
  };
}
