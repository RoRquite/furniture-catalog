// Telegram WebApp bridge checks with a mocked official-API surface:
// initialization, theme params, viewport expand, BackButton, and the
// browser fallback when window.Telegram is absent.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// load module source and evaluate it against a controlled globalThis
const src = new URL("../frontend/js/core/telegram.js", import.meta.url);

async function loadBridgeWith(globalPatch) {
  const saved = {};
  for (const k of Object.keys(globalPatch)) {
    saved[k] = globalThis[k];
    globalThis[k] = globalPatch[k];
  }
  try {
    const mod = await import(src.href + `?t=${Math.random()}`);
    return mod.createTelegramBridge();
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete globalThis[k];
      else globalThis[k] = saved[k];
    }
  }
}

function fakeWebApp() {
  const events = {};
  const state = { lastLink: null };
  const bb = {
    shown: false,
    handlers: [],
    show() { this.shown = true; },
    hide() { this.shown = false; },
    onClick(fn) { this.handlers.push(fn); },
  };
  return {
    tg: {
      initData: "query_id=abc",
      expanded: false,
      readyCalled: false,
      ready() { this.readyCalled = true; },
      expand() { this.expanded = true; },
      themeParams: { bg_color: "#ffffff", text_color: "#111111",
                     button_color: "#2f88ff" },
      onEvent: (name, fn) => { (events[name] ||= []).push(fn); },
      setHeaderColor: () => {},
      BackButton: bb,
      openTelegramLink(url) {
        state.lastLink = url;
        return true;
      },
      __events: events,
      __state: state,
    },
  };
}

test("inside Telegram: ready+expand called, theme params available", async () => {
  const f = fakeWebApp();
  const b = await loadBridgeWith({ Telegram: { WebApp: f.tg } });
  assert.equal(b.insideTelegram, true);
  b.ready();
  b.expand();
  assert.equal(f.tg.readyCalled, true);
  assert.equal(f.tg.expanded, true);
  const theme = b.theme();
  assert.equal(theme.button_color, "#2f88ff");
});

test("BackButton shows and fires handler", async () => {
  const f = fakeWebApp();
  const b = await loadBridgeWith({ Telegram: { WebApp: f.tg } });
  let clicked = false;
  assert.equal(b.showBackButton(() => { clicked = true; }), true);
  assert.equal(f.tg.BackButton.shown, true);
  f.tg.BackButton.handlers.forEach((fn) => fn());
  assert.equal(clicked, true);
  b.hideBackButton();
  assert.equal(f.tg.BackButton.shown, false);
});

test("outside Telegram: safe fallback, no crashes", async () => {
  const b = await loadBridgeWith({});
  assert.equal(b.insideTelegram, false);
  assert.equal(b.theme(), null);
  assert.equal(b.showBackButton(() => {}), false); // UI uses in-app button
  b.ready(); b.expand(); b.hideBackButton();        // must not throw
});

test("openChat routes t.me links through Telegram API", async () => {
  const f = fakeWebApp();
  const b = await loadBridgeWith({ Telegram: { WebApp: f.tg } });
  assert.equal(b.openChat("https://t.me/shop_contact"), true);
  assert.equal(f.tg.__state.lastLink, "https://t.me/shop_contact");
});

test("telegram-web-app.js is referenced in index.html", () => {
  const html = readFileSync(new URL("../dist/index.html", import.meta.url),
                            "utf8");
  assert.match(html, /telegram\.org\/js\/telegram-web-app\.js/);
});
