from pathlib import Path
HERE = Path(__file__).resolve().parent
import json
from pack import pack
def make(spec, out):
    src = open(HERE / 'build.js').read()
    payload = json.dumps({'build': src, 'spec': spec['root'], 'icons': spec['icons']}, separators=(',', ':'))
    pack(payload.encode('utf-8'), out)
    return len(payload)
