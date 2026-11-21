#!/bin/bash
# up.sh URL FILE -> prints hash and holder
curl -s -X POST -F "file=@$2;type=image/png" "$1" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['imageHash'],d.get('placedOnNodeId'))"
