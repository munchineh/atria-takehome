"""states/*.json -> specs -> payload PNGs. usage: process.py key1,key2 ..."""
from pathlib import Path
HERE = Path(__file__).resolve().parent
import json, sys, copy, importlib
sys.path.insert(0, str(HERE))
import prep, mkpayload_lib
LIB = json.load(open(HERE / 'lib.json'))

def walk(n, f):
    f(n)
    for k in n.get('kids', []): walk(k, f)

def patch(key, raw):
    if key in ('a09', 'a10'):
        # the result of "Make the product bigger" for this creative (prototype mapping), shown in the main preview
        imgs = []
        walk(raw['root'], lambda n: imgs.append(n) if n.get('t') == 'i' and 'x02-' in (n.get('src') or '') else None)
        if imgs:
            big = max(imgs, key=lambda n: n['w'] * n['h'])
            big['src'] = big['src'].replace('x02-CYIYqB_L', 'l02-XXXX')
    if key == 'a10':
        c03 = json.load(open(HERE / 'states' / 'c03.json'))
        toast = []
        for e in c03.get('extra', []):
            if 'Ad created in Ad Library' in json.dumps(e): toast.append(e)
        if toast:
            t = copy.deepcopy(toast[0])
            s = json.dumps(t).replace('Ad created in Ad Library', 'Saved as v2')
            t = json.loads(s)
            # shrink the pill to the shorter text and sit it where the editor shows its message (bottom centre)
            def fix(n):
                if n.get('t') == 'x' and 'Saved as v2' in n.get('n', ''):
                    n['w'] = 82.0
            walk(t, fix)
            dw = 160.63 - 82.0
            def shift(n):
                n['x'] = n.get('x', 0) + (752 - (643.69 + 216.63 / 2)) + dw / 2
                if n.get('t') == 'f' and n.get('w', 0) >= 200: n['w'] -= dw
            walk(t, shift)
            def reid(n):
                if n.get('t') == 's':
                    nid = 'c03_' + n['i']; raw['icons'][nid] = c03['icons'][n['i']]; n['i'] = nid
            walk(t, reid)
            raw.setdefault('extra', []).append(t)
    return raw

def main(keys):
    for k in keys:
        raw = json.load(open(HERE / 'states' / f'{k}.json'))
        raw = patch(k, raw)
        importlib.reload(prep)
        out = prep.run(raw, LIB)
        json.dump(out, open(HERE / 'states' / f'{k}.spec.json', 'w'), separators=(',', ':'))
        n = mkpayload_lib.make(out, str(HERE / 'states' / f'{k}.payload.png'))
        print(k, n, 'missing:', list(prep.CTX.missing)[:3])

if __name__ == '__main__':
    main(sys.argv[1].split(','))
