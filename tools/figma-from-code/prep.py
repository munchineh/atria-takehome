"""DOM extract -> Figma build spec.
Positions are reproduced exactly by using measured leading/trailing padding and measured gaps (spacers where gaps differ).
Sizing intent (fill / hug / fixed) comes from comparing each element to its natural content size."""
import json, re, sys, math

VW, VH = 1504, 900
LIB = {}

def r2(v): return round(v * 100) / 100

def ext(n):
    return (n['x'], n['y'], n['x'] + n['w'], n['y'] + n['h'])

def visible_box(n):
    x0, y0, x1, y1 = ext(n)
    return x1 > 0 and y1 > 0 and x0 < VW and y0 < VH

def has_visual(f):
    return any(k in f for k in ('bg', 'grad', 'bimg', 'bd', 'sh', 'shd', 'blur')) or f.get('o', 1) < 1

def css_pad(f):
    return f.get('p', [0, 0, 0, 0])

def norm_text_dims(t):
    # text node carries w,h of the text run box; for block text 'bw' is the block width
    return t

def slot_of(src):
    if src and src.startswith('data:'):
        import hashlib
        return 'D' + hashlib.md5(src.encode()).hexdigest()[:10]
    m = re.search(r'/assets/([a-z0-9]+)-[A-Za-z0-9_-]+\.(webp|png|jpe?g|svg)', src or '')
    return m.group(1) if m else None

class Ctx:
    def __init__(self): self.missing = set(); self.svgbg = {}

CTX = Ctx()

def prep(n, depth=0):
    """returns spec node or None. n has absolute coords (x,y)."""
    t = n['t']
    if t == 's':
        o_ = {'k': 'S', 'n': n['n'], 'i': n['i'], 'w': r2(n['w']), 'h': r2(n['h']), 'x': n.get('x', 0), 'y': n.get('y', 0), '_nat': (n['w'], n['h'])}
        if n.get('rot'): o_['rot'] = n['rot']
        return o_
    if t == 'i':
        slot = slot_of(n.get('src'))
        spec = {'k': 'I', 'n': slot or n['n'], 'w': r2(n['w']), 'h': r2(n['h']), 'fit': n.get('fit', 'FILL')}
        if slot and slot in LIB: spec['hash'] = LIB[slot]
        else: spec['src'] = n.get('src'); CTX.missing.add(n.get('src', '')[:120])
        if n.get('r'): spec['r'] = n['r']
        spec['_nat'] = (n['w'], n['h'])
        return spec
    if t == 'x':
        lh = n.get('lh')
        if lh and not n.get('_lbox'):
            ch = max(sg[1]['fs'] for sg in n['s']) * 1.21
            h = n['h']
            if h <= lh * 1.5: nl, c0 = 1, h
            else:
                nl = max(1, round((h - ch) / lh) + 1); c0 = h - (nl - 1) * lh
            n['y'] = n['y'] - (lh - c0) / 2; n['h'] = nl * lh; n['_lbox'] = 1
        if not lh and n['h'] < max(sg[1]['fs'] for sg in n['s']) * 1.9:
            n['lh'] = round(n['h'], 2)
        s = {'k': 'T', 'n': (n.get('n') or 'text')[:40], 'segs': n['s'], 'w': r2(n['w']), 'h': r2(n['h'])}
        for k in ('lh', 'ta', 'tr', 'mx', 'o'):
            if k in n: s[k] = n[k]
        s['ml'] = n.get('ml', 0)
        s['blk'] = n.get('blk', 0)
        s['bw'] = n.get('bw', n['w'])
        s['_nat'] = (n['w'], n['h'])
        return s
    # frame
    f = n
    spec = {'k': 'F', 'n': f['n'], 'w': r2(f['w']), 'h': r2(f['h'])}
    for k in ('bg', 'grad', 'bd', 'r', 'o', 'clip', 'blur', 'bfit'):
        if k in f: spec[k] = f[k]
    if f.get('sh'): spec['shd'] = f['sh']
    if f.get('bimg'):
        slot = slot_of(f['bimg'])
        if slot and slot in LIB: spec['bhash'] = LIB[slot]; spec['bfit'] = f.get('bfit', 'FILL')
        elif f['bimg'].startswith('data:image/svg'):
            from urllib.parse import unquote
            spec['bsvg'] = unquote(f['bimg'].split(',', 1)[1])
        else: CTX.missing.add(f['bimg'][:120])
    kids_in = f.get('kids', [])
    flow, absk = [], []
    for ki_, k in enumerate(kids_in):
        k['_ord'] = ki_
        if k.get('pseudo') and k['t'] == 'f' and not k.get('abs'):
            # in-flow pseudo box: needs a position. Approximate at the parent's content start.
            k = dict(k); k.setdefault('x', f['x'] + css_pad(f)[3]); k.setdefault('y', f['y'] + css_pad(f)[0])
        if k['t'] == 'x' and k.get('pseudo') and 'x' not in k:
            continue  # pseudo text without a measured box (rare): skip
        if 'x' not in k or 'y' not in k:
            continue
        if not visible_box(k):
            continue
        if k.get('w', 0) < 0.3 and k.get('h', 0) < 0.3:
            continue
        (absk if (k.get('pos') == 1 or k.get('abs') == 1) else flow).append(k)
    flow = solve2d(f, flow)
    # build children specs
    def build_list(lst):
        out = []
        for k in lst:
            s = prep(k, depth + 1)
            if s is None: continue
            s['_x'], s['_y'] = k['x'], k['y']
            s['_w'], s['_h'] = k['w'], k['h']
            s.setdefault('_src', k)
            out.append(s)
        return out
    flow_s = build_list(flow)
    abs_s = build_list(absk)

    # collapse a plain wrapper around one child of the same box
    if not abs_s and len(flow_s) == 1 and not has_visual(f) and not f.get('clip'):
        c = flow_s[0]
        if abs(c['_x'] - f['x']) < 0.6 and abs(c['_y'] - f['y']) < 0.6 and abs(c['_w'] - f['w']) < 0.6 and abs(c['_h'] - f['h']) < 0.6:
            if c['k'] == 'F' and (c['n'] in ('div', 'span') or c['n'].startswith('ant-')) and f['n'] not in ('div', 'span'):
                c['n'] = f['n']
            c['_collapsed'] = True
            return c
    if not flow_s and not abs_s and not has_visual(f) and not spec.get('bsvg'):
        return None

    # ---- layout direction
    lay = f.get('lay', 'B')
    order = flow_s
    def horiz(a, b): return b['_x'] >= a['_x'] + a['_w'] - 1.5 and not (b['_y'] >= a['_y'] + a['_h'] - 1)
    def vert(a, b): return b['_y'] >= a['_y'] + a['_h'] - 1.5
    wrap = 0
    if len(order) >= 2:
        if lay in ('H',):
            rows_ = []
            for s_ in sorted(order, key=lambda s: s['_y']):
                if rows_ and s_['_y'] < max(q['_y'] + q['_h'] for q in rows_[-1]) - 1: rows_[-1].append(s_)
                else: rows_.append([s_])
            rows_ = [sorted(r_, key=lambda s: s['_x']) for r_ in rows_]
            if len(rows_) == 1 and all(horiz(a, b) for a, b in zip(rows_[0], rows_[0][1:])):
                order = rows_[0]
            elif len(rows_) > 1 and all(len(r_) == 1 for r_ in rows_):
                order = [r_[0] for r_ in rows_]; lay = 'V'
            else:
                order = [s_ for r_ in rows_ for s_ in r_]; wrap = 1
        elif lay == 'V':
            order = sorted(order, key=lambda s: s['_y'])
            if not all(vert(a, b) for a, b in zip(order, order[1:])):
                lay = 'N'
        else:  # block
            if all(vert(a, b) for a, b in zip(order, order[1:])): lay = 'V'
            elif all(horiz(a, b) for a, b in zip(order, order[1:])): lay = 'H'; order = sorted(order, key=lambda s: s['_x'])
            else:
                o2 = sorted(order, key=lambda s: (round(s['_y']), s['_x']))
                lay, wrap, order = 'H', 1, o2
    else:
        lay = 'V' if lay in ('B', 'V') else lay
    if lay == 'B': lay = 'V'

    fx, fy, fw, fh = f['x'], f['y'], f['w'], f['h']
    spec['L'] = lay
    if order:
        cp0 = css_pad(f)
        bx0 = min(s_['_x'] for s_ in order); bx1 = max(s_['_x'] + s_['_w'] for s_ in order)
        by0 = min(s_['_y'] for s_ in order); by1 = max(s_['_y'] + s_['_h'] for s_ in order)
        spec['_nat'] = ((bx1 - bx0) + cp0[1] + cp0[3] + max(0, bx0 - f['x'] - cp0[3]), (by1 - by0) + cp0[0] + cp0[2] + max(0, by0 - f['y'] - cp0[0]))
    kids = []
    if lay in ('H', 'V') and order:
        H = lay == 'H'
        ps = lambda s: s['_x'] if H else s['_y']
        pz = lambda s: s['_w'] if H else s['_h']
        cs = lambda s: s['_y'] if H else s['_x']
        cz = lambda s: s['_h'] if H else s['_w']
        F0, FZ = (fx, fw) if H else (fy, fh)
        C0, CZ = (fy, fh) if H else (fx, fw)
        if wrap:
            lefts = [s['_x'] for s in order]; tops = [s['_y'] for s in order]
            rights = [s['_x'] + s['_w'] for s in order]; bots = [s['_y'] + s['_h'] for s in order]
            rowsd = {}
            for s in order: rowsd.setdefault(round(s['_y'] / 3), []).append(s)
            rws = [sorted(v, key=lambda s: s['_x']) for k_, v in sorted(rowsd.items())]
            hg = [b['_x'] - (a['_x'] + a['_w']) for r_ in rws for a, b in zip(r_, r_[1:])]
            vg = [rws[i + 1][0]['_y'] - max(s['_y'] + s['_h'] for s in rws[i]) for i in range(len(rws) - 1)]
            spec['wrap'] = 1
            spec['g'] = r2(min(hg)) if hg else 0
            spec['cg'] = r2(max(0, min(vg))) if vg else 0
            spec['p'] = [r2(min(tops) - fy), r2(fx + fw - max(rights)), r2(fy + fh - max(bots)), r2(min(lefts) - fx)]
            spec['pa'] = 'MIN'; spec['ca'] = 'MIN'
            for s in order: s['sw'] = 'X' if s['k'] != 'T' else 'H'; s['sh'] = 'X' if s['k'] != 'T' else 'H'
            kids = order
        else:
            lead = ps(order[0]) - F0
            trail = F0 + FZ - (ps(order[-1]) + pz(order[-1]))
            gaps = [ps(b) - (ps(a) + pz(a)) for a, b in zip(order, order[1:])]
            jc = f.get('jc') or 'normal'
            if jc == 'space-between' and len(order) > 1 and min(gaps) > 0.5: pa = 'SB'
            elif jc in ('center',) : pa = 'CENTER'
            elif jc in ('flex-end', 'end', 'right'): pa = 'MAX'
            else: pa = 'MIN'
            grow_i = -1
            if H and pa == 'MIN' and len(gaps) >= 1:
                gm = max(gaps); others = [g for g in gaps if g != gm]
                if gm > 40 and (not others or gm > 2.5 * max(min(others), 1)) and trail <= css_pad(f)[1] + 1:
                    grow_i = gaps.index(gm)
            base = min([g for i, g in enumerate(gaps) if i != grow_i] or [0]) if gaps else 0
            if pa != 'SB':
                newk = [order[0]]
                for gi, (g, s) in enumerate(zip(gaps, order[1:])):
                    if gi == grow_i:
                        newk.append({'k': 'P', 'n': 'Spacer (fill)', '_sp': g - base, 'H': H, 'grow': 1})
                    elif g - base > 0.5:
                        # a spacer sits between two gaps, so it only adds g - 2*base;
                        # when the extra is smaller than one gap, put it on the next kid as a margin instead
                        if g - 2 * base >= 0:
                            newk.append({'k': 'P', 'n': 'Spacer', '_sp': max(g - 2 * base, 0.01), 'H': H})
                        else:
                            s['_mps'] = g - base
                    newk.append(s)
                kids = newk
                spec['g'] = r2(base)
            else:
                kids = list(order); spec['g'] = 0
            # cross axis
            offs = [(cs(s) - C0, C0 + CZ - (cs(s) + cz(s))) for s in order]
            ai = f.get('ai') or 'normal'
            if lay == 'V' and f.get('lay', 'B') == 'B': ai = 'normal'
            pcs = min(o[0] for o in offs); pce = min(o[1] for o in offs)
            if ai == 'center':
                d = [o[0] - o[1] for o in offs]
                dd = sorted(d)[len(d) // 2]
                ca = 'CENTER'; pcs, pce = max(0, dd), max(0, -dd)
                # if a kid isn't centered on that line, wrap it with a margin
                for s, o in zip(order, offs):
                    if abs((o[0] - o[1]) - dd) > 1.5: s['_mcs'] = (o[0] - o[1] - dd) / 2
                # keep the content box as wide as the measured parent allows
                pcs_m = min(o[0] for o in offs); pce_m = min(o[1] for o in offs)
                # use symmetric measured padding when it keeps centering
                if abs((pcs_m - pce_m) - dd) < 1.0: pcs, pce = pcs_m, pce_m
            elif ai in ('flex-end', 'end') :
                ca = 'MAX'
                for s, o in zip(order, offs):
                    if o[1] - pce > 1.5: s['_mce'] = o[1] - pce
            elif ai == 'baseline' and H:
                ca = 'BASELINE'
            else:
                ca = 'MIN'
                cp_ = css_pad(f)
                css_s, css_e = (cp_[0], cp_[2]) if H else (cp_[3], cp_[1])
                pcs = min(pcs, css_s)
                pce = min(pce, css_e)
                for s, o in zip(order, offs):
                    if o[0] - pcs > 1.5:
                        s['_mcs'] = o[0] - pcs
            spec['pa'] = pa; spec['ca'] = ca
            spec['_pc'] = list(css_pad(f))
            cl = lambda v: 0 if -0.5 < v < 0 else v
            spec['p'] = [r2(cl(pcs)), r2(cl(trail)), r2(cl(pce)), r2(cl(lead))] if H else [r2(cl(lead)), r2(cl(pce)), r2(cl(trail)), r2(cl(pcs))]
            # scroll offset: negative leading padding -> inner scroll content frame
            if lead < -0.5 or pcs < -0.5:
                inner = dict(spec); inner['n'] = 'Scroll content'
                for k in ('bg', 'grad', 'bd', 'r', 'shd', 'o', 'clip', 'blur', 'bhash', 'bsvg'): inner.pop(k, None)
                inner['p'] = [0, 0, 0, 0]
                inner['abs'] = 1
                bx0 = min(s['_x'] for s in order); by0 = min(s['_y'] for s in order)
                inner['x'] = r2(bx0 - fx); inner['y'] = r2(by0 - fy)
                if H: inner['p'] = [r2(pcs - (by0 - fy)) if pcs >= 0 else 0, 0, 0, 0]
                inner['kids'] = kids
                inner['sw'] = 'H'; inner['sh'] = 'H'
                finish_kids(inner, kids, lay, ca, H, CZ - max(0, pcs) - max(0, pce))
                spec['L'] = 'N'; spec.pop('p', None); spec.pop('g', None); spec.pop('pa', None); spec.pop('ca', None)
                spec['kids'] = [inner] + place_abs(abs_s, fx, fy)
                spec['clip'] = 1
                return spec
            cp_ = css_pad(f)
            css_cross = CZ - ((cp_[0] + cp_[2]) if H else (cp_[1] + cp_[3]))
            finish_kids(spec, kids, lay, ca, H, css_cross if ca == 'MIN' else CZ - pcs - pce)
        zmax = max([k_.get('_src', {}).get('z', 0) for k_ in kids if k_.get('_src')] + [0])
        dmin = min([k_.get('_src', {}).get('_ord', 1e9) for k_ in kids if k_.get('_src')] + [1e9])
        def is_behind(a):
            z = a.get('_src', {}).get('z', 0); di = a.get('_src', {}).get('_ord', 1e9)
            if z < 0: return True
            if z < zmax: return True
            return di < dmin and z <= zmax
        behind = [a for a in abs_s if is_behind(a)]
        front = [a for a in abs_s if a not in behind]
        spec['kids'] = place_abs(behind, fx, fy) + kids + place_abs(front, fx, fy)
    else:
        # no auto layout: everything absolute inside
        spec['L'] = 'N'
        allk = flow_s + abs_s
        for s in allk:
            s['x'] = r2(s['_x'] - fx); s['y'] = r2(s['_y'] - fy); s['sw'] = 'X'; s['sh'] = 'X'
        spec['kids'] = allk
    return spec

def _seq(lst, H):
    if H:
        o = sorted(lst, key=lambda k: k['x'])
        return o if all(b['x'] >= a['x'] + a['w'] - 1.5 for a, b in zip(o, o[1:])) else None
    o = sorted(lst, key=lambda k: k['y'])
    return o if all(b['y'] >= a['y'] + a['h'] - 1.5 for a, b in zip(o, o[1:])) else None

def _cluster(lst, H):
    # H=True: cluster by x-overlap (columns); False: by y-overlap (rows)
    key0 = (lambda k: k['x']) if H else (lambda k: k['y'])
    key1 = (lambda k: k['x'] + k['w']) if H else (lambda k: k['y'] + k['h'])
    o = sorted(lst, key=key0); groups = []
    for k in o:
        if groups and key0(k) < max(key1(q) for q in groups[-1]) - 1.5: groups[-1].append(k)
        else: groups.append([k])
    return groups

def _wrap_group(grp, H_inner, name):
    x0 = min(k['x'] for k in grp); y0 = min(k['y'] for k in grp)
    x1 = max(k['x'] + k['w'] for k in grp); y1 = max(k['y'] + k['h'] for k in grp)
    return {'t': 'f', 'n': name, 'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0, 'p': [0, 0, 0, 0], 'lay': 'H' if H_inner else 'V', 'ai': 'normal', 'jc': 'normal', 'kids': grp}

def solve2d(f, flow):
    """If flow kids are not a single row or column, regroup them into columns (or rows) of simple sequences."""
    if len(flow) < 2 or f.get('t') != 'f': return flow
    if _seq(flow, True) or _seq(flow, False): return flow
    cols = _cluster(flow, True)
    if len(cols) > 1 and all(len(c) == 1 or _seq(c, False) for c in cols):
        f['lay'] = 'H'; f['wrap'] = 0
        return [c[0] if len(c) == 1 else _wrap_group(c, False, 'Column') for c in cols]
    rows = _cluster(flow, False)
    if len(rows) > 1 and all(len(r) == 1 or _seq(r, True) for r in rows):
        f['lay'] = 'V'; f['wrap'] = 0
        return [r[0] if len(r) == 1 else _wrap_group(r, True, 'Row') for r in rows]
    return flow

def place_abs(abs_s, fx, fy):
    for s in abs_s:
        s['abs'] = 1; s['x'] = r2(s['_x'] - fx); s['y'] = r2(s['_y'] - fy)
        s.setdefault('sw', 'X'); s.setdefault('sh', 'X')
    return abs_s

def natural(s, axis):
    """natural (content) size of a spec node along axis 'w' or 'h' (css padding)"""
    return None

def finish_kids(spec, kids, lay, ca, H, content_cross):
    """decide sizing per kid; wrap kids that need a cross-axis margin."""
    real = [k for k in kids if k['k'] != 'P']
    stretched_primary = []
    for k in real:
        prim = k['_w'] if H else k['_h']
        cross = k['_h'] if H else k['_w']
        kind = k['k']
        # cross sizing
        fill_cross = abs(cross - content_cross) < 1.0 and ca in ('MIN', 'CENTER', 'MAX') and kind in ('F', 'T', 'I')
        if kind == 'T':
            single = not k.get('ml')
            if H:
                k['sw'] = 'H' if single and not k.get('tr') else 'X'
                k['sh'] = 'H'
                if k.get('tr'): k['sw'] = 'X'
            else:
                bw = k.get('bw', k['w'])
                # centred multi-line text: use the CSS box width, not the glyph extent, so Figma wraps the same lines
                if k.get('ml') and k.get('ta') == 'center' and bw > k['w'] + 1:
                    k['w'] = r2(bw); k['sw'] = 'X'; k['sh'] = 'H'; continue
                if single and not k.get('tr') and not (k.get('ta') in ('center', 'right') and ca == 'MIN'):
                    k['sw'] = 'H'
                elif k.get('blk') and (abs(bw - content_cross) < 1.5 or (k.get('ta') == 'center' and bw >= k['w'] - 0.5 and bw <= content_cross + 1.5)):
                    k['sw'] = 'F' if abs(bw - content_cross) < 1.5 else 'X'; k['w'] = r2(bw)
                elif single and not k.get('tr'): k['sw'] = 'H'
                else: k['sw'] = 'X'
                k['sh'] = 'H'
            continue
        if kind in ('S',):
            k['sw'] = 'X'; k['sh'] = 'X'; continue
        if kind == 'I':
            k['sw'] = 'F' if (not H and fill_cross) else 'X'; k['sh'] = 'F' if (H and fill_cross and False) else 'X'; continue
        # frames
        if not [c for c in k.get('kids', []) if not c.get('abs')]:
            k['sw'] = 'X'; k['sh'] = 'X'; continue
        hugw, hugh = can_hug(k, 'w'), can_hug(k, 'h')
        if k.get('n') in ('ant-table-cell', 'td', 'th') or 'table-cell' in k.get('n', ''): hugw = False
        if k.get('_src', {}).get('fld') or k.get('n') in ('input', 'textarea'): hugw = False; hugh = False
        if H:
            k['sh'] = 'F' if (fill_cross and not hugh_exact(k, 'h')) else ('H' if hugh else 'X')
            if hugw: k['sw'] = 'H'
            else: k['sw'] = 'X'; stretched_primary.append(k)
        else:
            k['sw'] = 'F' if (fill_cross and not hugh_exact(k, 'w')) else ('H' if hugw else 'X')
            k['sh'] = 'H' if hugh else 'X'
    has_grow = any(k['k'] == 'P' and k.get('grow') for k in kids)
    if H and len(stretched_primary) == 1 and spec.get('pa', 'MIN') == 'MIN' and not has_grow:
        stretched_primary[0]['sw'] = 'F'
    # margins -> wrapper
    out = []
    for k in kids:
        if k['k'] != 'P' and (k.get('_mcs') or k.get('_mce') or k.get('_mps')):
            m = k.get('_mcs', 0); me = k.get('_mce', 0); mp = max(0, k.get('_mps', 0))
            w = {'k': 'F', 'n': k['n'] + ' (margin)', 'L': 'V' if H else 'H', 'g': 0, 'pa': 'MIN', 'ca': 'MIN',
                 'p': ([r2(max(0, m)), 0, r2(max(0, me)), r2(mp)] if H else [r2(mp), r2(max(0, me)), 0, r2(max(0, m))]),
                 'kids': [k], 'sw': 'H', 'sh': 'H',
                 'w': r2(k['_w'] + (mp if H else max(0, m) + max(0, me))), 'h': r2(k['_h'] + (max(0, m) + max(0, me) if H else mp)),
                 '_w': k['_w'], '_h': k['_h']}
            if k.get('sw') == 'F' and H: w['sw'] = 'F'
            if k.get('sh') == 'F' and not H: w['sh'] = 'F'
            # inner fill on the wrapper's cross axis isn't possible with a hug wrapper
            if H and k.get('sh') == 'F': k['sh'] = 'X'
            if not H and k.get('sw') == 'F': k['sw'] = 'X'
            out.append(w)
        else:
            out.append(k)
    kids[:] = out

def hugh_exact(k, axis):
    return False

def can_hug(k, axis):
    """a frame can hug on an axis when it has auto layout, none of its kids fill that axis,
    and its measured size equals its content extent plus its CSS padding (i.e. it isn't stretched)."""
    if k.get('L') not in ('H', 'V'): return False
    # negative padding (a line box poking out by a fraction of a pixel) is clamped to 0 in Figma,
    # so hugging would grow the frame; keep it at its measured size instead
    pp = k.get('p') or [0, 0, 0, 0]
    if any(v < -0.05 for v in ((pp[0], pp[2]) if axis == 'h' else (pp[1], pp[3]))): return False
    kids = [c for c in k.get('kids', []) if not c.get('abs')]
    if not kids: return False
    if any(c.get('sw' if axis == 'w' else 'sh') == 'F' for c in kids): return False
    if k.get('pa') == 'SB' and ((k['L'] == 'H') == (axis == 'w')): return False
    nat = k.get('_nat')
    if not nat: return False
    size = k['_w'] if axis == 'w' else k['_h']
    return size <= (nat[0] if axis == 'w' else nat[1]) + 1.0

def finalize(n):
    if n.get('k') != 'F': return
    kids = n.get('kids', [])
    L = n.get('L')
    if L in ('H', 'V') and not n.get('wrap') and n.get('_pc') and n.get('p'):
        H = L == 'H'
        pc = n['_pc']; p = n['p']
        prim_end = 1 if H else 2; cross_end = 2 if H else 1
        prim_sz = n.get('sw' if H else 'sh'); cross_sz = n.get('sh' if H else 'sw')
        flow = [k for k in kids if not k.get('abs')]
        prim_fill = any((k.get('sw' if H else 'sh') == 'F') or (k.get('k') == 'P' and k.get('grow')) for k in flow)
        cross_fill = any(k.get('sh' if H else 'sw') == 'F' for k in flow)
        if n.get('pa') == 'MIN' and prim_sz != 'H' and not prim_fill and n.get('n') != 'Screen':
            p[prim_end] = max(0, pc[prim_end])
        if n.get('ca') == 'MIN' and cross_sz != 'H' and not cross_fill and n.get('n') != 'Screen':
            p[cross_end] = max(0, pc[cross_end])
    for k in kids: finalize(k)

def clean(s):
    if isinstance(s, dict):
        out = {k: clean(v) for k, v in s.items() if not k.startswith('_')}
        if s.get('k') == 'P':
            out = {'k': 'P', 'n': s.get('n', 'Spacer'), 'w': r2(s['_sp']) if s['H'] else 0.01, 'h': 0.01 if s['H'] else r2(s['_sp'])}
            if s.get('grow'): out['grow'] = 1
        return out
    if isinstance(s, list): return [clean(x) for x in s]
    return s

def run(raw, lib):
    global LIB, VW, VH
    LIB = lib
    VW, VH = raw.get('vw', 1504), raw.get('vh', 900)
    root = raw['root']
    root['x'], root['y'], root['w'], root['h'] = 0, 0, VW, VH
    for e in raw.get('extra', []):
        e['pos'] = 1
        root.setdefault('kids', []).append(e)
    spec = prep(root)
    spec['n'] = 'Screen'; spec['sw'] = 'X'; spec['sh'] = 'X'; spec['clip'] = 1; spec['w'] = VW; spec['h'] = VH
    finalize(spec)
    return {'root': clean(spec), 'icons': raw['icons']}

if __name__ == '__main__':
    raw = json.load(open(sys.argv[1])); lib = json.load(open(sys.argv[2]))
    out = run(raw, lib)
    json.dump(out, open(sys.argv[3], 'w'), separators=(',', ':'))
    print('missing', CTX.missing)
