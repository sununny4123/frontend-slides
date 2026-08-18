#!/usr/bin/env python3
"""Bundle csf-rhinorrhea/index.html into one self-contained page.

Inlines the webfonts and every referenced image/video as data URIs, and swaps
the deck's identity asset resolver (U) for one backed by the embedded map.
Nothing else about the deck changes.
"""
import re, os, base64, json, sys

DECK = '/home/user/frontend-slides/csf-rhinorrhea'
OUT  = os.path.dirname(os.path.abspath(__file__)) + '/artifact'
VID  = OUT                      # smaller re-encodes live beside the output
MIME = {'.webp':'image/webp', '.gif':'image/gif', '.mp4':'video/mp4', '.webm':'video/webm', '.woff2':'font/woff2'}

def uri(path):
    b = open(path,'rb').read()
    return 'data:%s;base64,%s' % (MIME[os.path.splitext(path)[1]], base64.b64encode(b).decode())

html  = open(DECK + '/index.html').read()
style = re.search(r'<style>(.*?)</style>\s*</head>', html, re.S).group(1)
body  = re.search(r'<body>(.*)</body>', html, re.S).group(1)

style, nfonts = re.subn(
    r'url\(assets/fonts/([^)]+\.woff2)\)',
    lambda m: 'url(' + uri(os.path.join(DECK, 'assets/fonts', m.group(1))) + ')',
    style)

images = sorted(set(re.findall(r'A\+"([^"]+\.(?:webp|gif))"', body)) | {'slide3_img1.webp', 'slide56_img2.webp'})
data = {f: uri(os.path.join(DECK, 'assets', f)) for f in images}
for f in os.listdir(VID):
    if f.startswith('video-') and f.endswith(('.mp4', '.webm')):
        data[f] = uri(os.path.join(VID, f))

old = "const D = null;\nconst U = p => p;"
new = "const D = __ASSET_DATA__;\nconst U = p => D[String(p).replace(/^.*\\//,'')] || p;"
if old not in body:
    sys.exit('asset resolver not found — did index.html change?')
body = body.replace(old, new, 1)
body = re.sub(r'const ASSETS = \[.*?\];', 'const ASSETS = ' + json.dumps(images) + ';', body, count=1, flags=re.S)

page = ('<title>Cerebrospinal Fluid Rhinorrhea</title>\n<style>\n' + style + '\n</style>\n' + body
        ).replace('__ASSET_DATA__', json.dumps(data))

os.makedirs(OUT, exist_ok=True)
open(OUT + '/deck.html', 'w').write(page)
open(OUT + '/wrapped.html', 'w').write(   # local stand-in for the publish wrapper
    '<!doctype html><html><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1">'
    '<style>*{box-sizing:border-box}body{margin:0}</style></head><body>' + page + '</body></html>')
print(f'fonts {nfonts} | assets {len(data)} | page {len(page)/1e6:.2f} MB')
