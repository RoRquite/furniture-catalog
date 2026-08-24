// Order flow: builds a readable order text and hands it to the configured
// contact. The contact URL is configurable (data/config.json). No dead ends:
// if opening an external chat is impossible (no url / blocked environment),
// the order text is shown to the user directly.

export function buildOrderText(product) {
  return [
    "Хочу заказать:",
    product.name,
    `ID: ${product.id}`,
    `Цена: ${product.price} ${product.currency}`,
  ].join("\n");
}

export async function placeOrder(product, config, telegram, clipboard) {
  const text = buildOrderText(product);
  const url = config && config.order && config.order.contactUrl;
  let opened = false;

  try {
    if (clipboard && typeof clipboard.writeText === "function") {
      await clipboard.writeText(text);
      opened = "copied";
    }
  } catch {
    /* clipboard may be unavailable; not fatal */
  }

  if (url && !url.includes("username_placeholder")) {
    const ok = telegram
      ? telegram.openChat(url)
      : (globalThis.open && globalThis.open(url, "_blank")) !== null;
    opened = ok ? "chat" : opened;
  }

  return { text, opened };
}
