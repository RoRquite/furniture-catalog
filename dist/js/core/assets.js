// Single source of truth for resolving app-internal asset/data paths.
//
// All runtime resource references ("data/x.json", "images/x.svg") are
// resolved against this module's own URL, so the app behaves identically:
//   1. local HTTP at domain root      -> http://localhost:8123/<path>
//   2. GitHub Pages project sub-path  -> .../furniture-catalog/<path>
//   3. inside Telegram Mini App       -> same as the hosting page origin
// Never use document-relative or domain-absolute paths for app assets.
const APP_BASE = new URL("../../", import.meta.url);

const EXTERNAL = /^(https?:)?\/\//i;

export function assetURL(path) {
  const p = String(path);
  if (EXTERNAL.test(p)) return new URL(p);
  return new URL(p.replace(/^\.?\//, ""), APP_BASE);
}
