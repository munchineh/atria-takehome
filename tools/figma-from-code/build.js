// Figma builder: spec -> nodes. Defines BUILD(spec, target, opts) on globalThis.
(function () {
  const STY = { 100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' };
  const fontOf = (fw, it) => { let s = STY[Math.round((fw || 400) / 100) * 100] || 'Regular'; if (it) s = s === 'Regular' ? 'Italic' : s + ' Italic'; return { family: 'Inter', style: s }; };
  const C = (a) => ({ r: a[0] / 255, g: a[1] / 255, b: a[2] / 255 });
  const solid = (a) => ({ type: 'SOLID', color: C(a), opacity: a[3] == null ? 1 : a[3] });
  const gradPaint = (g) => {
    const ang = g[0], phi = (ang - 90) * Math.PI / 180, c = Math.cos(phi), s = Math.sin(phi);
    const T = [[c, s, 0.5 - 0.5 * c - 0.5 * s], [-s, c, 0.5 + 0.5 * s - 0.5 * c]];
    return { type: 'GRADIENT_LINEAR', gradientTransform: T, gradientStops: g[1].map(([cc, pos]) => ({ position: Math.max(0, Math.min(1, pos)), color: { ...C(cc), a: cc[3] == null ? 1 : cc[3] } })) };
  };
  const fills = (sp) => {
    const out = [];
    if (sp.bg) out.push(solid(sp.bg));
    if (sp.grad) out.push(gradPaint(sp.grad));
    if (sp.bhash) out.push({ type: 'IMAGE', imageHash: sp.bhash, scaleMode: sp.bfit === 'FIT' ? 'FIT' : 'FILL' });
    return out;
  };
  const effects = (sp) => {
    const fx = [];
    for (const s of sp.shd || []) fx.push({ type: s[0] ? 'INNER_SHADOW' : 'DROP_SHADOW', color: { ...C(s[5]), a: s[5][3] }, offset: { x: s[1], y: s[2] }, radius: s[3], spread: s[4], visible: true, blendMode: 'NORMAL' });
    if (sp.blur) fx.push({ type: 'BACKGROUND_BLUR', radius: sp.blur, visible: true });
    return fx;
  };
  const applyBox = (n, sp) => {
    n.fills = fills(sp);
    // inset hairline shadows (used as separators) become strokes; shadows on transparent frames would hit the children
    if (sp.shd) {
      const keep = [];
      for (const s of sp.shd) {
        if (s[0] && !s[3] && !s[4] && (s[1] || s[2]) && !sp.bd) {
          const w = [s[2] > 0 ? s[2] : 0, s[1] < 0 ? -s[1] : 0, s[2] < 0 ? -s[2] : 0, s[1] > 0 ? s[1] : 0];
          sp.bd = [w, s[5], 's'];
        } else if (n.fills.length) keep.push(s);
      }
      sp.shd = keep;
    }
    if (sp.bd) {
      const [w, c, st] = sp.bd;
      n.strokes = [solid(c)]; n.strokeAlign = 'INSIDE';
      // the padding already includes the CSS border, so the stroke must not push the content in again
      if (n.layoutMode && n.layoutMode !== 'NONE') n.strokesIncludedInLayout = false;
      n.strokeTopWeight = w[0]; n.strokeRightWeight = w[1]; n.strokeBottomWeight = w[2]; n.strokeLeftWeight = w[3];
      if (st === 'd') n.dashPattern = [4, 3]; else if (st === 'o') n.dashPattern = [1, 2];
    }
    if (sp.r) { n.topLeftRadius = sp.r[0]; n.topRightRadius = sp.r[1]; n.bottomRightRadius = sp.r[2]; n.bottomLeftRadius = sp.r[3]; }
    const fx = effects(sp); if (fx.length) n.effects = fx;
    if (sp.o != null && sp.o < 1) n.opacity = sp.o;
  };
  const ICONS = {};
  async function iconComp(id, store, defs) {
    // cache by the SVG itself: icon ids (i1, i2...) are only unique within one screen
    const [nm, svg] = defs[id];
    const key = 'svg:' + hash(svg);
    if (ICONS[key]) return ICONS[key];
    let comp = store.findOne((c) => c.type === 'COMPONENT' && c.description === key);
    if (!comp) {
      const v = figma.createNodeFromSvg(svg);
      comp = figma.createComponent(); comp.name = 'icon/' + nm; comp.description = key;
      comp.resize(Math.max(v.width, 0.01), Math.max(v.height, 0.01)); comp.fills = []; comp.clipsContent = false;
      for (const ch of [...v.children]) comp.appendChild(ch);
      v.remove(); store.appendChild(comp);
    }
    ICONS[key] = comp; return comp;
  }
  function hash(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36) + s.length.toString(36); }
  const FONTS = new Set();
  async function loadFonts(spec) {
    const need = new Set();
    const walk = (n) => { if (n.k === 'T') for (const s of n.segs) need.add(JSON.stringify(fontOf(s[1].fw, s[1].it))); (n.kids || []).forEach(walk); };
    walk(spec);
    for (const f of need) if (!FONTS.has(f)) { try { await figma.loadFontAsync(JSON.parse(f)); } catch (e) { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); } FONTS.add(f); }
  }
  function mkText(sp) {
    const t = figma.createText();
    const st0 = sp.segs[0][1];
    t.fontName = fontOf(st0.fw, st0.it);
    const txt = sp.segs.map((s) => s[0]).join('');
    t.characters = txt;
    let i = 0;
    for (const [str, st] of sp.segs) {
      const a = i, b = i + str.length; i = b; if (a === b) continue;
      t.setRangeFontName(a, b, fontOf(st.fw, st.it));
      t.setRangeFontSize(a, b, st.fs);
      t.setRangeFills(a, b, [solid(st.c)]);
      if (st.ls) t.setRangeLetterSpacing(a, b, { unit: 'PIXELS', value: st.ls });
      if (st.u) { t.setRangeTextDecoration(a, b, 'UNDERLINE'); try { t.setRangeTextDecorationStyle(a, b, st.u === 'dashed' || st.u === 'dotted' ? 'DOTTED' : 'SOLID'); } catch (e) {} }
      else if (st.st) t.setRangeTextDecoration(a, b, 'STRIKETHROUGH');
      if (st.tt === 'U') t.setRangeTextCase(a, b, 'UPPER'); else if (st.tt === 'T') t.setRangeTextCase(a, b, 'TITLE');
    }
    // Figma rounds an auto-height text box up to a whole pixel, so a 17.14 px line would render 18 px tall
    if (sp.lh) t.lineHeight = { unit: 'PIXELS', value: Math.max(1, Math.round(sp.lh)) };
    if (sp.ta) t.textAlignHorizontal = sp.ta === 'center' ? 'CENTER' : 'RIGHT';
    t.name = sp.n;
    if (sp.o != null && sp.o < 1) t.opacity = sp.o;
    return t;
  }
  async function make(sp, ctx) {
    let n;
    if (sp.k === 'T') {
      n = mkText(sp);
      if (sp.sw === 'H') n.textAutoResize = 'WIDTH_AND_HEIGHT';
      else { n.resize(Math.max(sp.w, 1), Math.max(sp.h, 1)); n.textAutoResize = 'HEIGHT'; }
      if (sp.tr) { n.textTruncation = 'ENDING'; n.maxLines = sp.mx || 1; if (!sp.mx || sp.mx === 1) { n.textAutoResize = 'NONE'; n.resize(Math.max(sp.w, 1), Math.max(sp.h, 1)); } }
      return n;
    }
    if (sp.k === 'S') {
      const comp = await iconComp(sp.i, ctx.store, ctx.icons);
      n = comp.createInstance(); n.name = 'icon/' + sp.n;
      if (Math.abs(n.width - sp.w) > 0.2 || Math.abs(n.height - sp.h) > 0.2) n.resize(Math.max(sp.w, 0.01), Math.max(sp.h, 0.01));
      if (sp.rot) { const w = new Map(); n.rotation = -sp.rot; }
      return n;
    }
    if (sp.k === 'I') {
      n = figma.createRectangle(); n.name = sp.n; n.resize(Math.max(sp.w, 0.01), Math.max(sp.h, 0.01));
      n.fills = sp.hash ? [{ type: 'IMAGE', imageHash: sp.hash, scaleMode: sp.fit === 'FIT' ? 'FIT' : 'FILL' }] : [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
      if (sp.r) { n.topLeftRadius = sp.r[0]; n.topRightRadius = sp.r[1]; n.bottomRightRadius = sp.r[2]; n.bottomLeftRadius = sp.r[3]; }
      if (!sp.hash) ctx.missing.push(sp.src || sp.n);
      return n;
    }
    if (sp.k === 'P') {
      n = figma.createFrame(); n.name = sp.n; n.fills = []; n.resize(Math.max(sp.w, 0.01), Math.max(sp.h, 0.01));
      return n;
    }
    // frame
    n = ctx.into || figma.createFrame();
    ctx.into = null;
    n.name = sp.n;
    if (sp.L === 'H' || sp.L === 'V') {
      n.layoutMode = sp.L === 'H' ? 'HORIZONTAL' : 'VERTICAL';
      if (sp.wrap) { n.layoutWrap = 'WRAP'; n.counterAxisSpacing = sp.cg || 0; }
      const p = sp.p || [0, 0, 0, 0];
      n.paddingTop = Math.max(0, p[0]); n.paddingRight = Math.max(0, p[1]); n.paddingBottom = Math.max(0, p[2]); n.paddingLeft = Math.max(0, p[3]);
      if (sp.pa === 'SB') n.primaryAxisAlignItems = 'SPACE_BETWEEN';
      else { n.primaryAxisAlignItems = sp.pa || 'MIN'; n.itemSpacing = sp.g || 0; }
      n.counterAxisAlignItems = sp.ca || 'MIN';
    } else n.layoutMode = 'NONE';
    n.resize(Math.max(sp.w, 0.01), Math.max(sp.h, 0.01));
    applyBox(n, sp);
    n.clipsContent = !!sp.clip;
    if (sp.bsvg) {
      try { const v = figma.createNodeFromSvg(sp.bsvg); v.name = 'bg'; v.resize(Math.max(sp.w, 0.01), Math.max(sp.h, 0.01)); n.appendChild(v); if (n.layoutMode !== 'NONE') v.layoutPositioning = 'ABSOLUTE'; v.x = 0; v.y = 0; v.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' }; } catch (e) {}
    }
    for (const ks of sp.kids || []) {
      const c = await make(ks, ctx);
      n.appendChild(c);
      const al = n.layoutMode !== 'NONE';
      if (ks.abs || !al) {
        if (al) c.layoutPositioning = 'ABSOLUTE';
        c.x = ks.x || 0; c.y = ks.y || 0;
      } else {
        if (ks.k === 'P') { if (ks.grow) { c.layoutGrow = 1; } continue; }
        setSize(c, ks, n);
      }
    }
    // frame's own hug after kids exist (parent sets FILL later)
    if (n.layoutMode !== 'NONE') {
      if (sp.sw === 'H') n.layoutSizingHorizontal = 'HUG';
      if (sp.sh === 'H') n.layoutSizingVertical = 'HUG';
    }
    return n;
  }
  function setSize(c, ks, parent) {
    const isText = c.type === 'TEXT';
    const tryset = (prop, v) => { try { c[prop] = v; } catch (e) {} };
    const sw = ks.sw || 'X', sh = ks.sh || 'X';
    if (sw === 'F') tryset('layoutSizingHorizontal', 'FILL');
    else if (sw === 'H' && (isText || (c.layoutMode && c.layoutMode !== 'NONE'))) tryset('layoutSizingHorizontal', 'HUG');
    else tryset('layoutSizingHorizontal', 'FIXED');
    if (sh === 'F') tryset('layoutSizingVertical', 'FILL');
    else if (sh === 'H' && (isText || (c.layoutMode && c.layoutMode !== 'NONE'))) tryset('layoutSizingVertical', 'HUG');
    else tryset('layoutSizingVertical', 'FIXED');
  }
  globalThis.BUILD = async function (spec, opts) {
    const ctx = { store: opts.store, icons: opts.icons, missing: [], into: opts.into || null };
    await loadFonts(spec);
    const n = await make(spec, ctx);
    return { node: n, missing: ctx.missing };
  };
})();
