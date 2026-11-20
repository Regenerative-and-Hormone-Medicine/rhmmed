"""Import Webflow CMS CSV exports into Astro content collections.

    python3 -I scripts/import-cms.py <dir-with-csvs>

- Articles     -> src/content/articles/<slug>.md  (frontmatter + HTML body)
- Everything else -> src/content/<collection>.json (array of items)
- Every Webflow-CDN image referenced in the data is downloaded to public/images/cms/
  and the reference rewritten, so nothing hotlinks Webflow.
Re-runnable: overwrites generated files, skips images already downloaded.
"""
import csv, glob, json, os, re, sys, urllib.parse, urllib.request
from datetime import datetime

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'src', 'content')
IMG_DIR = os.path.join(ROOT, 'public', 'images', 'cms')
os.makedirs(os.path.join(CONTENT, 'articles'), exist_ok=True)
os.makedirs(IMG_DIR, exist_ok=True)

CDN = re.compile(r'https://cdn\.prod\.website-files\.com/[^\s"\'<>]+')
failed = []


def local_image(url):
    name = urllib.parse.unquote(url.rsplit('/', 1)[1].split('?')[0])
    name = re.sub(r'[^A-Za-z0-9._-]+', '-', name)
    dest = os.path.join(IMG_DIR, name)
    if not os.path.exists(dest):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as r, open(dest, 'wb') as f:
                f.write(r.read())
        except Exception as e:  # keep going; report at the end
            failed.append((url, str(e)))
            return url
    return '/images/cms/' + name


def rewrite(text):
    text = CDN.sub(lambda m: local_image(m.group(0)), text or '')
    # Webflow export artefacts: placeholder alt text (rendered as alt="" on the live site) and invalid size attributes.
    text = text.replace('alt="__wf_reserved_inherit"', 'alt=""').replace(' width="auto" height="auto"', '')
    return text


def date(s):
    if not s:
        return None
    return datetime.strptime(s[:24], '%a %b %d %Y %H:%M:%S').strftime('%Y-%m-%d')


def rows(name):
    path = glob.glob(os.path.join(SRC, f'RHM - {name} - *.csv'))[0]
    return [r for r in csv.DictReader(open(path, encoding='utf-8')) if r['Archived'] != 'true']


def base(r):
    # Webflow marks live items that have unpublished edits as Draft=true; keep the flag visible.
    return {'name': r['Name'], 'slug': r['Slug'], 'webflowDraft': r['Draft'] == 'true'}


def yaml_str(v):
    return json.dumps(v, ensure_ascii=False)  # JSON strings are valid YAML scalars


# Articles
for r in rows('Articles'):
    fm = {
        'title': r['Name'],
        'slug': r['Slug'],
        'metaTitle': r['Meta Title (SEO)'],
        'metaDescription': r['Meta Description (SEO)'],
        'heroBtnText': r['Hero Btn Txt'],
        'heroBtnLink': r['Hero Btn Link'],
        'author': r['author'],
        'category': r['Blog Category'],
        'image': rewrite(r['Blog Image']),
        'date': date(r['Blog Date']),
        'datePublished': date(r['Date Published']),
        'summary': rewrite(r['Summary']),
        'webflowDraft': r['Draft'] == 'true',
    }
    body = rewrite(r['Blog Content'])
    with open(os.path.join(CONTENT, 'articles', r['Slug'] + '.md'), 'w', encoding='utf-8') as f:
        f.write('---\n')
        for k, v in fm.items():
            f.write(f'{k}: {yaml_str(v) if not isinstance(v, bool) else str(v).lower()}\n')
        f.write('---\n\n')
        f.write(body + '\n')

collections = {
    'authors': ('Authors', lambda r: {**base(r), 'profile': rewrite(r['Profile']), 'bio': rewrite(r['Bio']),
                                      'link': r['Link (some sort of link; unsrue yet)']}),
    'blog-categories': ('Blog Categories', base),
    'testimonials': ('Testimonials', lambda r: {**base(r), 'testimonial': r['Testimonial'], 'age': r['Age'],
                                                'categories': [c for c in r['Categories'].split(';') if c]}),
    'solutions': ('Solutions', lambda r: {**base(r), 'image': rewrite(r['Image']), 'paragraph': r['Paragraph']}),
    'newsletters': ('Newsletters', lambda r: {**base(r), 'thumb': rewrite(r['Newsletter Thumb']),
                                              'content': rewrite(r['Newsletter Content']),
                                              'description': r['Newsletter Description'],
                                              'releaseDate': date(r['Release Date'])}),
    'researches': ('Researches', lambda r: {**base(r), 'body': rewrite(r['Post Body']), 'summary': r['Post Summary'],
                                            'mainImage': rewrite(r['Main Image']),
                                            'thumbnail': rewrite(r['Thumbnail image']),
                                            'featured': r['Featured?'] == 'true', 'color': r['Color']}),
}
for out, (name, fn) in collections.items():
    items = [{'id': r['Slug'], **fn(r)} for r in rows(name)]
    with open(os.path.join(CONTENT, out + '.json'), 'w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print(f'{out}: {len(items)}')

print('articles:', len(glob.glob(os.path.join(CONTENT, 'articles', '*.md'))))
print('images:', len(os.listdir(IMG_DIR)))
for u, e in failed:
    print('FAILED', u, e)
