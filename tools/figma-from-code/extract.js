// DOM -> compact layout JSON for the Figma converter. Runs in the page.
// Returns {root, icons:{id:svg}, imgs:[srcs]}
(opts) => {
  const VW = window.innerWidth, VH = window.innerHeight;
  const icons = {}; const iconKey = new Map(); let iconN = 0;
  const imgs = new Set();
  const R = v => Math.round(v * 100) / 100;
  const px = s => parseFloat(s) || 0;
  const col = s => {
    if (!s || s === 'transparent') return null;
    const cm = s.match(/color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.e-]+))?\)/);
    if (cm) { const a = cm[4] == null ? 1 : +cm[4]; if (a === 0) return null; return [Math.round(+cm[1] * 255), Math.round(+cm[2] * 255), Math.round(+cm[3] * 255), R(a)]; }
    if (/oklab|oklch|lab\(|lch\(/.test(s)) { const cv = document.createElement('canvas').getContext('2d'); cv.fillStyle = s; const v = cv.fillStyle; if (v.startsWith('#')) { const n = parseInt(v.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, 1]; } s = v; }
    const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    const a = p.length > 3 ? p[3] : 1; if (a === 0) return null;
    return [p[0], p[1], p[2], R(a)];
  };
  const isVisible = (el, cs) => cs.display !== 'none' && cs.visibility !== 'hidden' && px(cs.opacity) > 0.01;
  const nameOf = el => {
    if (el.id === 'root') return 'App';
    const al = el.getAttribute && el.getAttribute('aria-label');
    const cls = (el.getAttribute && el.getAttribute('class') || '').split(/\s+/).filter(c => c && !/^css-|^:/.test(c));
    const ant = cls.find(c => /^ant-[a-z-]+$/.test(c) && !/-(sm|lg|default|primary|text|link|icon-only|block|color-|variant-|css-)/.test(c));
    const own = cls.find(c => !c.startsWith('ant-') && !c.startsWith('anticon'));
    let n = own || ant || el.tagName.toLowerCase();
    if (ant && own) n = own;
    return n;
  };
  const shadows = s => {
    if (!s || s === 'none') return null;
    const parts = s.split(/,(?![^(]*\))/);
    return parts.map(p => {
      const c = col((p.match(/rgba?\([^)]+\)/) || [''])[0]);
      const nums = p.replace(/rgba?\([^)]+\)/, '').trim().split(/\s+/).filter(x => /px|^0$/.test(x)).map(px);
      return c && [p.includes('inset') ? 1 : 0, nums[0] || 0, nums[1] || 0, nums[2] || 0, nums[3] || 0, c];
    }).filter(Boolean);
  };
  const bgOf = (cs) => {
    const out = {};
    const c = col(cs.backgroundColor); if (c) out.bg = c;
    const bi = cs.backgroundImage;
    if (bi && bi !== 'none') {
      const u = bi.match(/url\("?([^")]+)"?\)/);
      if (u) { out.bimg = u[1]; imgs.add(u[1]); out.bfit = cs.backgroundSize === 'contain' ? 'FIT' : 'FILL'; }
      const g = bi.match(/linear-gradient\((.*)\)\s*$/);
      if (g) {
        const body = g[1]; const args = body.split(/,(?![^(]*\))/).map(s => s.trim());
        let ang = 180; if (/deg$/.test(args[0])) { ang = parseFloat(args.shift()); }
        else if (/^to /.test(args[0])) { const t = args.shift(); ang = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270 }[t] ?? 180; }
        const raw = args.map(a => { const m = a.match(/rgba?\([^)]+\)/); const rgb = m ? m[0].match(/[\d.]+/g).map(Number) : null; return rgb; });
        const stops = args.map((a, i) => { let cc = col((a.match(/rgba?\([^)]+\)/) || [''])[0]);
          if (!cc) { const rgb = raw[i]; const nb = raw.find((x, j) => x && j !== i && (x[3] == null || x[3] > 0)); const base = (rgb && rgb.length >= 3 && (rgb[0] + rgb[1] + rgb[2]) > 0) ? rgb : (nb || [255, 255, 255]); cc = [base[0], base[1], base[2], 0]; }
          const pm = a.match(/(-?[\d.]+)%\s*$/); return [cc, pm ? R(px(pm[1]) / 100) : (args.length > 1 ? R(i / (args.length - 1)) : 0)]; });
        out.grad = [ang, stops];
      }
    }
    return out;
  };
  // ---- svg ----
  const svgNode = (el, cs, r) => {
    const clone = el.cloneNode(true);
    const src = [el, ...el.querySelectorAll('*')]; const dst = [clone, ...clone.querySelectorAll('*')];
    src.forEach((s, i) => {
      const c = getComputedStyle(s); const d = dst[i];
      if (s.tagName.toLowerCase() === 'svg') { d.setAttribute('width', R(r.width)); d.setAttribute('height', R(r.height)); d.removeAttribute('class'); d.removeAttribute('style'); return; }
      const f = c.fill, st = c.stroke;
      if (f && f !== 'none') { const cc = col(f); d.setAttribute('fill', cc ? `rgb(${cc[0]},${cc[1]},${cc[2]})` : 'none'); if (cc && cc[3] < 1) d.setAttribute('fill-opacity', cc[3]); } else d.setAttribute('fill', 'none');
      if (st && st !== 'none') { const cc = col(st); if (cc) { d.setAttribute('stroke', `rgb(${cc[0]},${cc[1]},${cc[2]})`); if (cc[3] < 1) d.setAttribute('stroke-opacity', cc[3]); d.setAttribute('stroke-width', c.strokeWidth); } }
      for (const k of ['fillOpacity', 'strokeOpacity', 'opacity']) { const v = c[k]; if (v && v !== '1') d.setAttribute(k.replace(/[A-Z]/, m => '-' + m.toLowerCase()), v); }
      if (s.tagName.toLowerCase() === 'circle' && c.strokeDasharray && c.strokeDasharray !== 'none') {
        const r0 = +s.getAttribute('r'), cx = +(s.getAttribute('cx') || 0), cy = +(s.getAttribute('cy') || 0);
        const C0 = 2 * Math.PI * r0; const dash = parseFloat(c.strokeDasharray); const off = parseFloat(c.strokeDashoffset) || 0;
        const vis = Math.max(0, Math.min(C0, dash - off)); const frac = vis / C0;
        if (frac > 0.001 && frac < 0.999) {
          const a0 = -Math.PI / 2, a1 = a0 + frac * 2 * Math.PI;
          const x0 = cx + r0 * Math.cos(a0), y0 = cy + r0 * Math.sin(a0), x1 = cx + r0 * Math.cos(a1), y1 = cy + r0 * Math.sin(a1);
          const pth = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          pth.setAttribute('d', `M${x0.toFixed(3)} ${y0.toFixed(3)} A${r0} ${r0} 0 ${frac > 0.5 ? 1 : 0} 1 ${x1.toFixed(3)} ${y1.toFixed(3)}`);
          for (const a of ['stroke', 'stroke-width', 'stroke-linecap', 'stroke-opacity', 'opacity']) { const v = d.getAttribute(a); if (v) pth.setAttribute(a, v); }
          const cc = col(c.stroke); if (cc) { pth.setAttribute('stroke', `rgb(${cc[0]},${cc[1]},${cc[2]})`); if (cc[3] < 1) pth.setAttribute('stroke-opacity', cc[3]); }
          pth.setAttribute('stroke-width', parseFloat(c.strokeWidth)); if (c.strokeLinecap !== 'butt') pth.setAttribute('stroke-linecap', c.strokeLinecap);
          pth.setAttribute('fill', 'none'); d.replaceWith(pth); dst[i] = pth; return;
        }
        if (frac <= 0.001) { d.setAttribute('stroke', 'none'); }
      }
      if (c.strokeDashoffset && c.strokeDashoffset !== '0px') d.setAttribute('stroke-dashoffset', parseFloat(c.strokeDashoffset));
      if (c.strokeLinecap !== 'butt') d.setAttribute('stroke-linecap', c.strokeLinecap);
      if (c.strokeLinejoin !== 'miter') d.setAttribute('stroke-linejoin', c.strokeLinejoin);
      d.removeAttribute('class'); d.removeAttribute('style');
    });
    let html = clone.outerHTML.replace(/\s(aria-[a-z]+|focusable|data-[a-z-]+|role)="[^"]*"/g, '');
    let nm = 'icon';
    const ac = el.closest('.anticon'); if (ac) { const m = ac.className.match(/anticon-([a-z0-9-]+)/); if (m) nm = m[1]; }
    else { const p = el.parentElement; const pc = (p.getAttribute('class') || '').split(/\s+/)[0]; if (pc) nm = pc; }
    const key = html;
    let id = iconKey.get(key);
    if (!id) { id = 'i' + (++iconN); iconKey.set(key, id); icons[id] = [nm, html]; }
    let rot = 0; { let e = el; for (let k = 0; k < 4 && e; k++, e = e.parentElement) { const tf = getComputedStyle(e).transform; if (tf && tf !== 'none') { const m = tf.match(/matrix\(([^)]+)\)/); if (m) { const v = m[1].split(',').map(Number); const a = Math.round(Math.atan2(v[1], v[0]) * 180 / Math.PI); if (a) { rot += a; } } } } }
    const out = { t: 's', n: nm, i: id, w: R(r.width), h: R(r.height), x: R(r.left), y: R(r.top) }; if (rot % 360) out.rot = ((rot % 360) + 360) % 360; return out;
  };
  // ---- text ----
  const textStyle = (cs) => {
    const c = col(cs.color) || [0, 0, 0, 1];
    const s = { fs: px(cs.fontSize), fw: +cs.fontWeight, c };
    if (cs.fontStyle === 'italic') s.it = 1;
    const ls = cs.letterSpacing; if (ls && ls !== 'normal' && px(ls) !== 0) s.ls = R(px(ls));
    const td = cs.textDecorationLine; if (td && td.includes('underline')) s.u = cs.textDecorationStyle || 'solid';
    if (td && td.includes('line-through')) s.st = 1;
    if (cs.textTransform === 'uppercase') s.tt = 'U'; else if (cs.textTransform === 'capitalize') s.tt = 'T';
    const ff = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(); if (ff && !/^Inter/i.test(ff)) s.ff = ff;
    return s;
  };
  const isInlineOnly = (el) => {
    for (const ch of el.childNodes) {
      if (ch.nodeType === 3) continue;
      if (ch.nodeType !== 1) continue;
      const cs = getComputedStyle(ch);
      if (cs.display === 'none') continue;
      if (cs.display !== 'inline' || ch.tagName.toLowerCase() === 'svg' || ch.tagName.toLowerCase() === 'img') return false;
      if (col(cs.backgroundColor) || ['Top', 'Right', 'Bottom', 'Left'].some(k => px(cs['border' + k + 'Width']) && cs['border' + k + 'Style'] !== 'none') || px(cs.paddingLeft) || px(cs.paddingTop)) return false;
      if (!isInlineOnly(ch)) return false;
    }
    return true;
  };
  const segs = (el, out) => {
    for (const ch of el.childNodes) {
      if (ch.nodeType === 3) { const t = ch.textContent; if (t) out.push([t, textStyle(getComputedStyle(ch.parentElement))]); }
      else if (ch.nodeType === 1) { const cs = getComputedStyle(ch); if (cs.display === 'none') continue; if (ch.tagName === 'BR') out.push(['\n', textStyle(cs)]); else segs(ch, out); }
    }
  };
  const collapse = (arr, ws) => {
    // collapse whitespace like the browser for normal white-space
    let out = arr.map(([t, s]) => [ws === 'pre' || ws === 'pre-wrap' ? t : t.replace(/\s+/g, ' '), s]);
    if (out.length) { out[0][0] = out[0][0].replace(/^ +/, ''); out[out.length - 1][0] = out[out.length - 1][0].replace(/ +$/, ''); }
    out = out.filter(x => x[0].length);
    // merge equal styles
    const m = []; for (const x of out) { const p = m[m.length - 1]; if (p && JSON.stringify(p[1]) === JSON.stringify(x[1])) p[0] += x[0]; else m.push(x); }
    return m;
  };
  const textNode = (el, cs, rect, segments) => {
    const lh = cs.lineHeight === 'normal' ? null : R(px(cs.lineHeight));
    const node = { t: 'x', n: segments.map(s => s[0]).join('').slice(0, 40), w: R(rect.width), h: R(rect.height), s: segments };
    if (lh) node.lh = lh;
    const ta = cs.textAlign; if (ta === 'center' || ta === 'right' || ta === 'end') node.ta = ta === 'end' ? 'right' : ta;
    const oneLine = rect.height < (lh || px(cs.fontSize) * 1.3) * 1.5;
    node.ml = oneLine ? 0 : 1;
    if (cs.textOverflow === 'ellipsis' && cs.overflow !== 'visible' && el.scrollWidth > el.clientWidth + 1) node.tr = 1;
    const lc = cs.webkitLineClamp; if (lc && lc !== 'none' && el.scrollHeight > el.clientHeight + 1) { node.tr = 1; node.mx = +lc; }
    return node;
  };
  // ---- main walk ----
  const rectOf = el => el.getBoundingClientRect();
  let DOMI = 0;
  function walk(el, depth) {
    const myI = DOMI++;
    const cs = getComputedStyle(el);
    if (!isVisible(el, cs)) return null;
    const r = rectOf(el);
    const tag = el.tagName.toLowerCase();
    if (cs.display === 'contents') { const ks = []; for (const ch of el.children) { const k = walk(ch, depth + 1); if (k) { if (k.t === 'c') ks.push(...k.kids); else ks.push(k); } } return { t: 'c', kids: ks }; }
    if (tag === 'svg') { if (r.width < 1) return null; return svgNode(el, cs, r); }
    if (tag === 'img') {
      if (r.width < 1) return null;
      imgs.add(el.currentSrc || el.src);
      const n = { t: 'i', n: (el.getAttribute('alt') || 'image').slice(0, 30), src: el.currentSrc || el.src, w: R(r.width), h: R(r.height), x: R(r.left), y: R(r.top), fit: cs.objectFit === 'contain' ? 'FIT' : 'FILL' };
      const rad = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px); if (rad.some(x => x)) n.r = rad;
      return n;
    }
    if (['script', 'style', 'noscript', 'input', 'textarea'].includes(tag) && tag !== 'input' && tag !== 'textarea') return null;
    // frame
    const f = { t: 'f', n: nameOf(el), w: R(r.width), h: R(r.height), x: R(r.left), y: R(r.top), di: myI };
    Object.assign(f, bgOf(cs));
    // a sized, non-repeating gradient (e.g. a 1px separator drawn with background-image) becomes its own line, not a fill
    let gline = null;
    if (f.grad && cs.backgroundSize && !/^(auto( auto)?|100% 100%|cover|contain)$/.test(cs.backgroundSize.trim()) && /no-repeat/.test(cs.backgroundRepeat)) {
      const toks = cs.backgroundSize.match(/calc\([^)]*\)|\S+/g) || [];
      const len = (t, full) => { if (!t || t === 'auto') return full; const c = t.match(/calc\(\s*([\d.]+)%\s*([-+])\s*([\d.]+)px\s*\)/); if (c) return full * +c[1] / 100 + (c[2] === '-' ? -1 : 1) * +c[3]; if (/%$/.test(t)) return full * parseFloat(t) / 100; return parseFloat(t); };
      const gw = len(toks[0], r.width), gh = len(toks[1] || 'auto', r.height);
      const ptoks = (cs.backgroundPosition || '0% 0%').split(/\s+/);
      const pos = (t, free) => /%$/.test(t) ? free * parseFloat(t) / 100 : parseFloat(t) || 0;
      const gx = pos(ptoks[0], r.width - gw), gy = pos(ptoks[1] || '0%', r.height - gh);
      const c0 = f.grad[1][0][0];
      gline = { t: 'f', n: 'divider', abs: 1, x: R(r.left + gx), y: R(r.top + gy), w: R(gw), h: R(gh), bg: c0, p: [0, 0, 0, 0], di: 1e8 };
      delete f.grad;
    }
    const bw = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(px);
    const bs = [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle];
    const bc = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor].map(col);
    const bwv = bw.map((w, i) => bs[i] === 'none' || !bc[i] ? 0 : w);
    if (bwv.some(x => x)) { const i = bwv.findIndex(x => x); f.bd = [bwv, bc[i], bs[i] === 'dashed' ? 'd' : bs[i] === 'dotted' ? 'o' : 's']; }
    const rad = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px);
    if (rad.some(x => x)) f.r = rad.map(x => Math.min(x, Math.min(r.width, r.height) / 2));
    const sh = shadows(cs.boxShadow); if (sh && sh.length) f.sh = sh;
    if (px(cs.opacity) < 1) f.o = R(px(cs.opacity));
    if ((cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 || rad.some(x => x))) f.clip = 1;
    const bf = cs.backdropFilter; if (bf && bf !== 'none') { const m = bf.match(/blur\(([\d.]+)px\)/); if (m) f.blur = px(m[1]); }
    const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px).map((p, i) => R(p + bwv[i]));
    f.p = pad;
    // pseudo elements
    const pseudo = (which) => {
      const ps = getComputedStyle(el, which); const ct = ps.content;
      if (!ct || ct === 'none' || ct === 'normal' || ps.display === 'none' || ps.visibility === 'hidden' || px(ps.opacity) < 0.01) return null;
      const txt = ct.replace(/^["']|["']$/g, '');
      const w = px(ps.width), h = px(ps.height);
      const pb = bgOf(ps);
      const node = { pseudo: which, di: which === '::before' ? myI + 0.5 : 1e8 };
      if (ps.zIndex !== 'auto') node.z = +ps.zIndex;
      if (txt && txt !== '""' && txt.length) { Object.assign(node, { t: 'x', n: txt, s: [[txt, textStyle(ps)]], ml: 0 }); if (ps.lineHeight !== 'normal') node.lh = px(ps.lineHeight); }
      else if ((w || ps.position === 'absolute') && (pb.bg || pb.grad || px(ps.borderTopWidth) || px(ps.borderLeftWidth))) {
        Object.assign(node, { t: 'f', n: which.replace('::', ''), p: [0, 0, 0, 0] }, pb);
        let ww = w, hh = h;
        if (ps.position === 'absolute') {
          const L = ps.left, T = ps.top, Rr = ps.right, B = ps.bottom;
          const ix = px(L), iy = px(T);
          if (!ww && L !== 'auto' && Rr !== 'auto') ww = r.width - px(L) - px(Rr);
          if (!hh && T !== 'auto' && B !== 'auto') hh = r.height - px(T) - px(B);
          node.abs = 1; node.x = R(r.left + (L !== 'auto' ? ix : r.width - px(Rr) - ww)); node.y = R(r.top + (T !== 'auto' ? iy : r.height - px(B) - hh));
        }
        node.w = R(ww); node.h = R(hh);
        const rr = [ps.borderTopLeftRadius, ps.borderTopRightRadius, ps.borderBottomRightRadius, ps.borderBottomLeftRadius].map(px); if (rr.some(x => x)) node.r = rr;
        const bw2 = [ps.borderTopWidth, ps.borderRightWidth, ps.borderBottomWidth, ps.borderLeftWidth].map(px);
        if (bw2.some(x => x)) { const i = bw2.findIndex(x => x); node.bd = [bw2, col([ps.borderTopColor, ps.borderRightColor, ps.borderBottomColor, ps.borderLeftColor][i]), 's']; }
        if (!node.w || !node.h) return null;
      } else return null;
      return node;
    };
    // form fields: show the value, or the placeholder in its own colour
    if (tag === 'input' || tag === 'textarea') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (['checkbox', 'radio', 'hidden', 'range', 'file'].includes(type)) { finishFrame(f, cs, el, r); f.kids = []; return f.bg || f.bd ? f : null; }
      const val = el.value; const ph = el.getAttribute('placeholder') || '';
      const txt = val || ph;
      f.kids = [];
      if (txt) {
        const st = textStyle(val ? cs : getComputedStyle(el, '::placeholder'));
        const lh = cs.lineHeight === 'normal' ? px(cs.fontSize) * 1.21 : px(cs.lineHeight);
        const cl = r.left + px(cs.paddingLeft) + px(cs.borderLeftWidth), ct = r.top + px(cs.paddingTop) + px(cs.borderTopWidth);
        const cw = r.width - px(cs.paddingLeft) - px(cs.paddingRight) - px(cs.borderLeftWidth) - px(cs.borderRightWidth);
        const ch = r.height - px(cs.paddingTop) - px(cs.paddingBottom) - px(cs.borderTopWidth) - px(cs.borderBottomWidth);
        const multi = tag === 'textarea';
        const lines = multi ? Math.max(1, Math.round((val ? el.scrollHeight - px(cs.paddingTop) - px(cs.paddingBottom) : lh) / lh)) : 1;
        const th = Math.min(ch, lines * lh);
        const tn = { t: 'x', n: (val ? 'value: ' : 'placeholder: ') + txt.slice(0, 30), s: [[txt, st]], lh: R(lh), w: R(cw), h: R(th), x: R(cl), y: R(multi ? ct : ct + (ch - th) / 2), ml: multi ? 1 : 0, blk: 1, bw: R(cw) };
        if (!multi && el.scrollWidth > el.clientWidth + 1) tn.tr = 1;
        f.kids.push(tn);
      }
      f.lay = 'V'; f.ai = 'normal'; finishFrame(f, cs, el, r); f.lay = 'V'; f.fld = 1;
      return f;
    }
    // inline-only text container
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (hasText && isInlineOnly(el) && !['flex', 'inline-flex', 'grid', 'inline-grid'].includes(cs.display)) {
      const s = collapse((() => { const o = []; segs(el, o); return o; })(), cs.whiteSpace);
      const plainBox = !f.bg && !f.bd && !f.grad && !f.sh && pad.every(x => !x);
      // measure the actual text extent
      let tr = (() => { const range = document.createRange(); range.selectNodeContents(el); return range.getBoundingClientRect(); })();
      // text from ::before / ::after (e.g. a "·" separator) joins the text, with its margin as a space
      const pt = (which) => {
        const p = getComputedStyle(el, which), c = p.content;
        if (!c || c === 'none' || c === 'normal' || p.display === 'none' || p.position === 'absolute') return null;
        const t = c.replace(/^["']|["']$/g, ''); if (!t) return null;
        const m = which === '::before' ? px(p.marginRight) : px(p.marginLeft);
        return { t, st: textStyle(p), sp: m >= 5 ? ' ' : (m >= 2 ? ' ' : '') };
      };
      const pb4 = pt('::before'), paf = pt('::after');
      if (pb4) s.unshift([pb4.t + pb4.sp, pb4.st]);
      if (paf) s.push([paf.sp + paf.t, paf.st]);
      if ((pb4 || paf) && r.width >= tr.width && r.width <= tr.width + 40) tr = r; // the box includes the pseudo text
      const tn = textNode(el, cs, tr.width ? tr : r, s);
      const blockish = !['inline', 'inline-block'].includes(cs.display);
      if (plainBox) { tn.blk = blockish ? 1 : 0; tn.bw = R(r.width); tn.x = R(tr.left || r.left); tn.y = R(tr.top || r.top); tn.n = nameOf(el) === tag ? tn.n : nameOf(el) + ': ' + tn.n.slice(0, 24); if (cs.position === 'absolute' || cs.position === 'fixed') { tn.abs = 1; } if (px(cs.opacity) < 1) tn.o = R(px(cs.opacity)); tn.cs = { ai: 'normal' }; return tn; }
      tn.x = R(tr.left); tn.y = R(tr.top);
      f.kids = [tn]; f.lay = 'V'; f.ai = cs.textAlign === 'center' ? 'center' : (cs.textAlign === 'right' ? 'end' : 'start');
      if (blockish) tn.blk = 1;
      finishFrame(f, cs, el, r);
      return f;
    }
    // children
    const kids = [];
    const b4 = pseudo('::before'); if (b4) kids.push(b4);
    for (const ch of el.childNodes) {
      if (ch.nodeType === 3) {
        const t = ch.textContent; if (!t.trim()) continue;
        const range = document.createRange(); const a0 = t.search(/\S/); const a1 = t.length - (t.match(/\s*$/)[0].length);
        range.setStart(ch, a0); range.setEnd(ch, a1); const tr = range.getBoundingClientRect();
        if (tr.width < 0.5) continue;
        const s = [[cs.whiteSpace.startsWith('pre') ? t.slice(a0, a1) : t.slice(a0, a1).replace(/\s+/g, ' '), textStyle(cs)]];
        const tn = textNode(el, cs, tr, s); tn.x = R(tr.left); tn.y = R(tr.top); tn.anon = 1;
        kids.push(tn);
      } else if (ch.nodeType === 1) {
        const k = walk(ch, depth + 1); if (k) { if (k.t === 'c') kids.push(...k.kids); else kids.push(k); }
      }
    }
    const af = pseudo('::after'); if (af) kids.push(af);
    if (gline) kids.push(gline);
    f.kids = kids;
    finishFrame(f, cs, el, r);
    if (!kids.length && !f.bg && !f.bd && !f.grad && !f.bimg && !f.sh) return (r.width > 0 && r.height > 0) ? f : null;
    return f;
  }
  function finishFrame(f, cs, el, r) {
    const d = cs.display;
    f.pos = (cs.position === 'absolute' || cs.position === 'fixed') ? 1 : 0;
    if (cs.zIndex !== 'auto') f.z = +cs.zIndex;
    if (d.includes('flex')) {
      f.lay = cs.flexDirection.startsWith('column') ? 'V' : 'H';
      if (cs.flexDirection.endsWith('reverse')) f.rev = 1;
      if (cs.flexWrap !== 'nowrap') f.wrap = 1;
      f.gap = px(cs.columnGap) || 0; f.rgap = px(cs.rowGap) || 0;
      if (f.lay === 'V') { const t = f.gap; f.gap = f.rgap; f.rgap = t; }
      f.jc = cs.justifyContent; f.ai = cs.alignItems;
    } else if (d.includes('grid')) {
      const cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
      f.lay = cols > 1 ? 'H' : 'V'; f.grid = cols; f.wrap = cols > 1 ? 1 : 0;
      f.gap = px(cs.columnGap) || 0; f.rgap = px(cs.rowGap) || 0;
      if (f.lay === 'V') { f.gap = f.rgap; }
      f.jc = cs.justifyContent; f.ai = cs.alignItems;
    } else if (!f.lay) { f.lay = 'B'; f.ai = cs.textAlign === 'center' ? 'center' : 'normal'; }
    // per child flex props
    for (const k of f.kids || []) {
      if (k.pseudo || k.anon) continue;
    }
    // child flex info attached in post (need element refs)
    f.scrollTop = el.scrollTop || 0;
  }
  // attach flex-item props: second pass over DOM in the same order is complex; instead compute in walk via parent check
  const root = walk(document.querySelector('#root'), 0);
  // portals / overlays
  const extra = [];
  for (const ch of document.body.children) {
    if (ch.id === 'root' || ['SCRIPT', 'STYLE'].includes(ch.tagName)) continue;
    const cs = getComputedStyle(ch); if (cs.display === 'none') continue;
    const cand = [ch, ...ch.querySelectorAll('*')].filter(e => { const c = getComputedStyle(e); const rr = e.getBoundingClientRect(); return (c.position === 'absolute' || c.position === 'fixed') && rr.width > 4 && rr.height > 4 && isVisible(e, c) && rr.right > 0 && rr.left < VW && rr.top < VH && rr.bottom > 0; });
    const top = cand.filter(e => !cand.some(o => o !== e && o.contains(e)));
    for (const e of top) { const k = walk(e, 1); if (k) { k.pos = 1; extra.push(k); } }
  }
  return { root, extra, icons, imgs: [...imgs], vw: VW, vh: VH };
}
