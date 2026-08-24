// Deterministic local SVG demo assets (no external URLs that could die).
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const out = root + "public/images/";
mkdirSync(out, { recursive: true });

const palettes = {
  tables:  ["#e8dcc8", "#c8a97a", "#8b6f47"],
  chairs:  ["#dce8e0", "#9dc3ae", "#5c8a72"],
  wardrobes:["#e3e3ee", "#aeb2d6", "#6d729e"],
};

function svg(label, palette, kind) {
  const [bg, mid, dark] = palette;
  const shape = kind === "table"
    ? `<rect x="40" y="90" width="120" height="12" rx="4" fill="${dark}"/>
       <rect x="52" y="102" width="10" height="50" fill="${dark}"/>
       <rect x="138" y="102" width="10" height="50" fill="${dark}"/>`
    : kind === "chair"
    ? `<rect x="60" y="60" width="80" height="14" rx="6" fill="${dark}"/>
       <rect x="66" y="20" width="68" height="42" rx="10" fill="${mid}"/>
       <rect x="62" y="74" width="10" height="70" fill="${dark}"/>
       <rect x="128" y="74" width="10" height="70" fill="${dark}"/>`
    : `<rect x="45" y="25" width="110" height="125" rx="8" fill="${dark}"/>
       <rect x="55" y="35" width="40" height="105" rx="4" fill="${mid}"/>
       <rect x="103" y="35" width="42" height="105" rx="4" fill="${mid}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160">
  <rect width="200" height="160" rx="12" fill="${bg}"/>
  ${shape}
  <text x="100" y="150" text-anchor="middle" font-size="11"
        font-family="sans-serif" fill="${dark}">${label}</text>
</svg>`;
}

const categories = JSON.parse(readFileSync(root + "data/categories.json"));
for (const c of categories.categories) {
  const kind = c.id.replace(/s$/, "");
  writeFileSync(out + c.image.split("/").pop(),
    svg(c.name, palettes[c.id] || palettes.tables,
        { tables: "table", chairs: "chair", wardrobes: "wardrobe" }[c.id]));
}

const products = JSON.parse(readFileSync(root + "data/products.json"));
const catKind = Object.fromEntries(
  categories.categories.map((c) => [c.id,
    { tables: "table", chairs: "chair", wardrobes: "wardrobe" }[c.id]]));
for (const p of products.products) {
  writeFileSync(out + `p_${p.id}.svg`,
    svg(p.name.split("«")[1]?.replace("»", "") || p.id,
        palettes[p.category], catKind[p.category]));
}
console.log("images generated:", products.products.length + categories.categories.length);
