"""Download every Webflow-hosted asset referenced by saved page HTML (+ the site CSS) into public/images/site/.

    python3 -I scripts/fetch-assets.py <dir-with-page-html> [site.css]

Takes the original (full-size) URL, not responsive -p-500/-p-800 variants. Videos (mp4/webm) and their
posters included. Writes public/images/site/manifest.json: { original filename -> local path }.
"""
import json, os, re, sys, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'images', 'site')
os.makedirs(OUT, exist_ok=True)
URL = re.compile(r'https://cdn\.prod\.website-files\.com/(?:6989e64ef88fec894b385af9|698a51c104d02d53fd80e87e)(?:/|%2F)[^\s"\'<>)]+?\.(?:avif|webp|png|jpe?g|svg|gif|mp4|webm)(?:\b)', re.I)

texts = []
for f in sorted(os.listdir(sys.argv[1])):
    if f.endswith('.html'):
        texts.append(open(os.path.join(sys.argv[1], f), encoding='utf-8', errors='ignore').read())
if len(sys.argv) > 2:
    texts.append(open(sys.argv[2], encoding='utf-8').read())

urls = set()
for t in texts:
    for u in URL.findall(t.replace('&amp;', '&')):
        if re.search(r'-p-\d+\.', u) or '/css/' in u or '/js/' in u:
            continue
        urls.add(u)

manifest, failed = {}, []
for u in sorted(urls):
    name = urllib.parse.unquote(u.replace('%2F', '/').rsplit('/', 1)[1])
    safe = re.sub(r'[^A-Za-z0-9._-]+', '-', name)
    dest = os.path.join(OUT, safe)
    if not os.path.exists(dest):
        try:
            req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=60) as r, open(dest, 'wb') as fh:
                fh.write(r.read())
        except Exception as e:
            failed.append((u, str(e)))
            continue
    manifest[name] = '/images/site/' + safe

json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1, ensure_ascii=False)
print(f'{len(manifest)} assets in public/images/site')
for u, e in failed:
    print('FAILED', u, e)
