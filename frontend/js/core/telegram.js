// Telegram WebApp wrapper. Works in a normal browser too (dev fallback):
// every method checks availability before touching the Telegram API.

export function createTelegramBridge() {
  const tg = globalThis.Telegram && globalThis.Telegram.WebApp;
  const insideTelegram = Boolean(tg && tg.initData !== undefined &&
    typeof tg.expand === "function");

  return {
    insideTelegram,
    ready() {
      if (insideTelegram) tg.ready();
    },
    expand() {
      if (insideTelegram) tg.expand();
    },
    theme() {
      // returns Telegram theme parameters or null outside Telegram
      if (insideTelegram && tg.themeParams) return tg.themeParams;
      return null;
    },
    onThemeChange(fn) {
      if (insideTelegram && typeof tg.onEvent === "function") {
        tg.onEvent("themeChanged", fn);
      }
    },
    setHeaderColor(color) {
      if (insideTelegram && typeof tg.setHeaderColor === "function") {
        try { tg.setHeaderColor(color); } catch { /* older clients */ }
      }
    },
    showBackButton(onClick) {
      if (!insideTelegram || !tg.BackButton) {
        return false; // UI falls back to in-app ← Назад button
      }
      tg.BackButton.show();
      const handler = () => onClick();
      tg.BackButton.onClick(handler);
      return true;
    },
    hideBackButton() {
      if (insideTelegram && tg.BackButton) tg.BackButton.hide();
    },
    openChat(url) {
      // opens t.me links inside Telegram, other URLs via window.open
      try {
        if (url.startsWith("https://t.me") && typeof tg.openTelegramLink === "function") {
          tg.openTelegramLink(url);
          return true;
        }
      } catch { /* fall through */ }
      if (typeof globalThis.open === "function") {
        return globalThis.open(url, "_blank") !== null;
      }
      return false;
    },
  };
}
