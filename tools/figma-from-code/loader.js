// Paste into a use_figma call (or a Figma plugin) after replacing the three values below.
// It reads the payload PNG uploaded with up.sh, unpacks the builder and the spec, and rebuilds
// the target frame in place, so its ID, component and instances stay.
const PAGE_ID = "7686:2";        // "7 · Editable frames"
const HASH = "__IMAGE_HASH__";    // first value printed by up.sh
const HOLDER = "__HOLDER_ID__";   // second value printed by up.sh (the node the upload created), or ""
const TARGET = "__TARGET_ID__";   // frame or component to rebuild, see targets.json

const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page); // never rely on figma.currentPage

// 1. PNG -> bytes (grayscale, stored deflate blocks, 4-byte length prefix; see pack.py)
const png = await figma.getImageByHash(HASH).getBytesAsync();
const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
let W = 0, idat = [], o = 8;
while (o < png.length) {
  const len = u32(png, o), type = String.fromCharCode(...png.slice(o + 4, o + 8));
  if (type === "IHDR") W = u32(png, o + 8);
  if (type === "IDAT") idat.push(png.slice(o + 8, o + 8 + len));
  o += 12 + len;
}
const z = new Uint8Array(idat.reduce((a, c) => a + c.length, 0));
{ let p = 0; for (const c of idat) { z.set(c, p); p += c.length; } }
const raw = [];
for (let p = 2; p < z.length - 4;) { // stored blocks: header byte, LEN, NLEN, data
  const last = z[p] & 1, len = z[p + 1] | (z[p + 2] << 8);
  for (let i = 0; i < len; i++) raw.push(z[p + 5 + i]);
  p += 5 + len;
  if (last) break;
}
const rows = [];
for (let r = 0; r * (W + 1) < raw.length; r++) for (let i = 1; i <= W; i++) rows.push(raw[r * (W + 1) + i]);
const n = u32(rows, 0);
const utf8 = (b) => { // the plugin sandbox has no TextDecoder
  let s = "", i = 0;
  while (i < b.length) {
    let c = b[i++];
    if (c >= 0xf0) c = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    else if (c >= 0xe0) c = ((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    else if (c >= 0xc0) c = ((c & 31) << 6) | (b[i++] & 63);
    s += String.fromCodePoint(c);
  }
  return s;
};
const text = utf8(rows.slice(4, 4 + n));
const P = JSON.parse(text);

// 2. Builder and icon store
new Function(P.build)();
let store = page.findOne((x) => x.type === "FRAME" && x.name.startsWith("Icons from code"));
if (!store) { store = figma.createFrame(); store.name = "Icons from code (used by every screen)"; store.fills = []; page.appendChild(store); }

// 3. Rebuild in place
const target = await figma.getNodeByIdAsync(TARGET);
const keepName = target.name; // the builder names the root "Screen"
for (const c of [...target.children]) c.remove();
const res = await globalThis.BUILD(P.spec, { store, icons: P.icons, into: target });
target.name = keepName;
if (HOLDER) { const h = await figma.getNodeByIdAsync(HOLDER); if (h) h.remove(); }
return { rebuilt: target.id, name: target.name, missing: res.missing };
