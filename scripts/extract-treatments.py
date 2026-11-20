"""Extract the treatment/condition pages (T3) from saved live HTML into structured JSON.

    python3 -I scripts/extract-treatments.py <dir-with-page-html>

Writes src/data/treatments/<group>__<slug>.json — one file per page, an ordered list of typed sections
that src/components/treatment/* render. Text is copied, never retyped: rich fields keep only <a href>, <br>,
<strong>, <em> and an accent <span>. Every section is checked for visible text the extractor did not capture;
anything missed is printed as COVERAGE so nothing is silently dropped.
"""
import html as htmllib, json, os, re, sys, urllib.parse
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'data', 'treatments')
os.makedirs(OUT, exist_ok=True)
VOID = {'img', 'br', 'input', 'meta', 'link', 'source', 'hr', 'wbr'}


class Node:
    def __init__(self, tag, attrs, parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []

    @property
    def cls(self):
        return (self.attrs.get('class') or '').split()

    def has(self, *names):
        return all(n in self.cls for n in names)

    def variant(self):
        return [c[10:] for c in self.cls if c.startswith('w-variant-')]

    def walk(self):
        for c in self.children:
            if isinstance(c, Node):
                yield c
                yield from c.walk()

    def find(self, pred):
        return next((n for n in self.walk() if pred(n)), None)

    def findall(self, pred):
        return [n for n in self.walk() if pred(n)]

    def by(self, *names):
        return self.find(lambda n: n.has(*names))

    def all(self, *names):
        return self.findall(lambda n: n.has(*names))


class Builder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node('root', {})
        self.cur = self.root
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if self.skip or tag in ('script', 'style', 'svg', 'noscript'):
            if tag not in VOID:
                self.skip += 1
            return
        n = Node(tag, attrs, self.cur)
        self.cur.children.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_endtag(self, tag):
        if self.skip:
            self.skip -= 1
            return
        if tag in VOID:
            return
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is not self.root:
            self.cur = n.parent

    def handle_data(self, d):
        if not self.skip:
            self.cur.children.append(d)


# Collapse ASCII whitespace only: the source uses &nbsp; to control heading wraps, keep it.
WS = r'[ \t\n\r\f\v]+'


def text(n):
    if n is None:
        return ''
    out = []
    for c in n.children:
        out.append(c if isinstance(c, str) else (' ' if c.tag == 'br' else text(c)))
    return re.sub(WS, ' ', ''.join(out)).strip()


def rich(n):
    """Inner HTML reduced to safe inline markup."""
    if n is None:
        return ''

    def r(node):
        out = []
        for c in node.children:
            if isinstance(c, str):
                out.append(htmllib.escape(c, quote=False))
            elif c.tag == 'br':
                out.append('<br>')
            elif c.tag == 'a':
                out.append(f'<a href="{htmllib.escape(c.attrs.get("href", "#"))}">{r(c)}</a>')
            elif c.tag in ('strong', 'b'):
                out.append(f'<strong>{r(c)}</strong>')
            elif c.tag in ('em', 'i'):
                out.append(f'<em>{r(c)}</em>')
            elif c.tag == 'span' and any('color' in x for x in c.cls):
                out.append(f'<span class="accent">{r(c)}</span>')
            elif c.tag == 'p' and node.has('w-richtext') or c.tag == 'p' and len([x for x in node.children if isinstance(x, Node) and x.tag == 'p']) > 1:
                out.append(f'<p>{r(c)}</p>')
            elif c.tag in ('ul', 'ol', 'li'):
                out.append(f'<{c.tag}>{r(c)}</{c.tag}>')
            else:
                out.append(r(c))
        return ''.join(out)

    s = re.sub(WS, ' ', r(n)).strip()
    # Webflow rich text keeps its <p> (the source styles bare <p> differently from the wrapper)
    s = re.sub(r'^<p>(.*)</p>$', r'\1', s) if s.count('<p>') == 1 and not n.has('w-richtext') else s
    return s


def img(n):
    if n is None:
        return None
    src = n.attrs.get('src', '')
    name = urllib.parse.unquote(src.replace('%2F', '/').rsplit('/', 1)[-1])
    safe = re.sub(r'[^A-Za-z0-9._-]+', '-', name)
    return {'src': '/images/site/' + safe, 'alt': n.attrs.get('alt', '')}


def mw(n):
    """Webflow max-width utility (mw-594 → '594px'); the last one wins, as in the source cascade."""
    if n is None:
        return None
    ws = [c[3:] for c in n.cls if re.fullmatch(r'mw-\d+', c)]
    return f'{ws[-1]}px' if ws else None


def btn(n):
    if not n:
        return None
    b = {'text': text(n.by('btn-text1')), 'href': n.attrs.get('href', '/scheduling')}
    if n.attrs.get('data-wf--button--variant') == 'button-white':
        b['variant'] = 'light'
    return b


def buttons(n):
    return [btn(b) for b in n.all('btn')] if n else []


def first_tag(n, *tags):
    found = n.find(lambda x: x.tag in tags) if n else None
    # A <p> inside Webflow rich text: keep the wrapper so its paragraph markup (and base <p> size) survives.
    if found is not None and found.tag == 'p' and found.parent is not None and found.parent.has('w-richtext') and found.parent is not n:
        return found.parent
    return found


# ---------------------------------------------------------------- section handlers
def hero(s):
    crumb = s.by('inline-link')
    current = s.by('color-brownish')
    heading = s.find(lambda n: n.has('heading-style-h2') and n.tag in ('h1', 'h2'))
    card = s.by('dropdown_hero-card')
    card_label = None
    if card:
        lbl = card.find(lambda n: n.has('label') and n.by('inline-link') is None and not n.has('color-brownish'))
        card_label = text(lbl) if lbl else None
        # Drop it only when it *is* the breadcrumb label (wraps the current-page span), not when it merely repeats its text.
        par = current
        while par is not None and par is not lbl:
            par = par.parent
        if card_label and current is not None and par is lbl:
            card_label = None
    body = card.find(lambda n: n.has('body-m')) if card else None
    return {
        'type': 'hero',
        'men': any(n.variant() for n in [s.by('dropdown_hero-img-wrap')] if n),
        'headingInCard': bool(card and heading and card.find(lambda n: n is heading)),
        'crumb': {'label': text(crumb).rstrip('/ ').strip(), 'href': crumb.attrs.get('href')} if crumb else None,
        'current': text(current),
        'currentIsH1': bool(current and current.tag == 'h1'),
        'heading': rich(heading),
        'headingTag': heading.tag if heading else 'h1',
        'cardLabel': card_label,
        'body': rich(body),
        'cta': btn(card.by('btn')) if card else None,
        'image': img(s.by('abs-img')),
    }


def symptom(s):
    block = s.by('symptom-block')
    box = s.by('symptom_box')
    bot = s.by('symptom-bot')
    top = s.by('flex-vert_24')
    return {
        'type': 'symptom',
        'men': bool(block and block.variant()),
        'heading': rich(first_tag(top, 'h2')),
        'body': rich(first_tag(top, 'p')),
        'toldLabel': text(block.by('label')) if block else '',
        'told': [rich(li) for li in block.findall(lambda n: n.tag == 'li')] if block else [],
        'box': rich(box),
        'image': img(s.by('symptom-top').find(lambda n: n.tag == 'img')) if s.by('symptom-top') else None,
        'bottom': rich(first_tag(bot, 'p')),
        'buttons': buttons(bot),
    }


def statement(s):
    """'What is X?' — coloured band with a small label and a large statement."""
    content = s.by('causes-content')
    return {
        'type': 'statement',
        'slate': bool(s.variant()),
        'label': rich(first_tag(s, 'h2')),
        'blocks': [{'tag': c.tag, 'cls': 'h1' if c.has('heading-style-h1') else 'body', 'html': rich(c)}
                   for c in content.children if isinstance(c, Node)] if content else [],
    }


def signs(s):
    head = s.find(lambda n: any(c.startswith('heading-center') for c in n.cls))
    grid = s.find(lambda n: n.has('signs-grid') or n.has('causes-grid'))
    cards = []
    for c in s.all('signs-card'):
        stat = c.find(lambda n: n.has('heading-style-h1'))
        cards.append({
            'title': rich(c.by('heading-style-h4')),
            'stat': text(stat) if stat else None,
            'body': rich(c.find(lambda n: n.has('body-m'))),
            'image': img(c.by('signs-img_abs')),
            'accent': c.has('is-purple'),
            'mist': bool(c.variant()),
        })
    return {
        'type': 'signs',
        'grey': s.has('is-signs_w'),
        'headMax': mw(head),
        'heading': rich(first_tag(head, 'h2')),
        'body': rich(first_tag(head, 'p')),
        'grid': [c for c in grid.cls if c.startswith('is-')] if grid else [],
        'gridKind': 'causes' if grid is not None and grid.has('causes-grid') else 'signs',
        'cards': cards,
        'bottom': rich(first_tag(s.by('symptom-bot'), 'p')) if s.by('symptom-bot') else None,
        'bottomButtons': buttons(s.by('symptom-bot')),
    }


def standard(s):
    """'Why standard care falls short' — label, big heading, paragraph, stat-like cards."""
    v = s.variant()
    white = s.has('is-causes_white') and not s.has('is-brown')
    return {
        'type': 'standard',
        'big': s.has('is-big'),
        'lightCards': bool(s.find(lambda n: n.has('causes-card', 'is-light_bg'))),
        'variant': 'white' if white else {'486bb1c6-8a29-3cd1-d5d6-fa9d698e32f6': 'blush', '5878f821-62fa-640e-d59a-cc276c2ccd5a': 'mist',
                    'e1caed4f-92b7-caf2-0716-5ab693e38085': 'brown'}.get(v[0] if v else '', 'slate'),
        'label': rich(first_tag(s, 'h2')),
        'heading': rich(s.find(lambda n: n.has('heading-style-h1'))),
        'body': rich(s.find(lambda n: n.has('body-l'))),
        'grid': [c for c in (s.by('causes-grid').cls if s.by('causes-grid') else []) if c.startswith('is-')],
        'signsGrid': bool(s.by('signs-grid')),
        'cards': [{'small': rich(c.find(lambda n: n.has('body-r'))), 'big': rich(c.by('heading-style-h4')), 'reverse': c.has('is-reverse'),
                   'icon': img(c.find(lambda n: n.tag == 'img'))}
                  for c in s.all('causes-card')],
        'stacked': bool(s.all('causes-card')) and not (s.by('causes-grid') or s.by('signs-grid')),
        'headingMax': mw(s.find(lambda n: n.has('heading-style-h1'))),
    }


def compare(s):
    head = s.by('flex-vert_24')
    rows = s.all('compare-table_row')
    hdr = next((r for r in rows if r.has('is-h')), None)
    heads = [rich(f) if text(f) else None for f in hdr.all('compare-teble_field')] if hdr else []
    ours_logo = bool(hdr and hdr.find(lambda n: n.has('is-heading', 'is-bg') and n.find(lambda x: x.tag == 'img')))
    lbl = head.find(lambda n: n.has('label')) if head else None
    return {
        'type': 'compare',
        'big': s.has('is-big'),
        'label': text(lbl) if lbl else None,
        'men': any(f.variant() for f in s.all('compare-teble_field')),
        'heading': rich(first_tag(head, 'h2')),
        'headingMax': mw(first_tag(head, 'h2')),
        'body': rich(first_tag(head, 'p')),
        'bodyMax': mw(first_tag(head, 'p')),
        'heads': heads,
        'oursImage': img(hdr.find(lambda x: x.tag == 'img')) if ours_logo else None,
        'rows': [[rich(f) for f in r.all('compare-teble_field')] for r in rows if not r.has('is-h')],
    }


def missions(s):
    content = s.by('missions-content')
    blocks = []
    for c in content.children if content else []:
        if not isinstance(c, Node):
            continue
        if c.has('missions-imgs'):
            blocks.append({'kind': 'images', 'two': c.has('is-2'),
                           'images': [img(i) for i in c.findall(lambda n: n.tag == 'img')]})
        else:
            blocks.append({'kind': 'h1' if c.has('heading-style-h1') else 'body', 'html': rich(c)})
    cont = s.by('container')
    return {'type': 'missions', 'compact': bool(cont and cont.variant()), 'label': rich(first_tag(s, 'h2')), 'blocks': blocks}


def voices(s):
    top = s.by('voices-top')
    quotes = []
    for c in s.all('voices-slide_card'):
        name = c.find(lambda n: n.tag == 'p' and not n.find(lambda x: True) and n.parent is not c.by('stories-rte') and c.by('stories-rte').find(lambda x: x is n) is None)
        quotes.append({'quote': rich(c.by('stories-rte')), 'name': text(name)})
    h2 = first_tag(top, 'h2')
    # Source CSS: only some mw-* classes also set width:100% (mw-120, mw-200, mw-504); it decides how the heading shares the row.
    return {'type': 'voices', 'heading': rich(h2), 'headingMax': mw(h2), 'headingFull': any(c in ('mw-120', 'mw-200', 'mw-504') for c in (h2.cls if h2 else [])),
            'body': rich(first_tag(top, 'p')), 'quotes': quotes}


def process(s):
    left = s.by('proces-left')
    steps = []
    for sl in s.findall(lambda n: n.has('swiper-slide')):
        steps.append({'label': text(sl.by('label')), 'title': rich(sl.by('heading-style-h4')),
                      'body': rich(sl.find(lambda n: n.has('body-l'))), 'image': img(sl.by('process-slide_img'))})
    return {
        'type': 'process',
        'heading': rich(first_tag(left, 'h2')),
        'body': rich(left.find(lambda n: n.tag == 'p')) if left else '',
        'buttons': buttons(left),
        'steps': steps,
    }


def why(s):
    head = s.by('why-heading')
    spacers = [n for n in s.children if isinstance(n, Node) and n.has('spacer')]
    sv = {'a4b001f8-d444-33f1-9007-39af8e5ab7d7': 'xl', '52fdd8df-cbd0-d007-625e-492ba834932c': 'md',
          'fb4ddd5a-439b-834c-a6dc-efe9512b42bc': 'none'}
    return {
        'type': 'why',
        'spacers': [sv.get((x.variant() or [''])[0], 'base') for x in spacers],
        'image': img(s.by('why-img')),
        'label': text(head.by('label')) if head else '',
        'heading': rich(first_tag(head, 'h2')),
        'body': rich(head.find(lambda n: n.tag == 'p')) if head else '',
        'stats': [{'value': text(r.by('heading-style-h1')), 'label': text(r.by('body-r'))} for r in s.all('why-results')],
    }


def insights(s):
    cards = []
    for c in s.all('blog-card'):
        a = c.find(lambda n: n.tag == 'a' and n.has('body-l'))
        cards.append({'href': a.attrs.get('href') if a else '#', 'title': text(a),
                      'summary': text(c.find(lambda n: n.tag == 'p')), 'category': text(c.by('blog-category')),
                      'date': text(c.find(lambda n: n.has('body-r', 'color-body70') and n.tag == 'div')),
                      'image': img(c.by('blog-card_img'))})
    return {'type': 'insights', 'men': s.has('is-men'), 'heading': text(first_tag(s, 'h2')),
            'button': btn(s.by('btn')), 'cards': cards}


def cta_block(s):
    blk = s.by('cta-block')
    return {
        'type': 'ctaBlock',
        'slate': bool(s.variant()),
        'heading': rich(first_tag(blk, 'h2')),
        'points': [rich(li) for li in blk.findall(lambda n: n.tag == 'li')],
        'buttons': buttons(blk),
        'image': img(s.by('cta-img')),
    }


def faq(s):
    items = []
    for w in s.all('faq-wrap'):
        items.append({'q': rich(w.by('heading-style-h5')), 'a': rich(w.by('faq-flex').find(lambda n: n.has('body-m')))})
    return {'type': 'faq', 'men': any(w.variant() and '89304392' in w.variant()[0] for w in s.all('faq-wrap')),
            'heading': rich(first_tag(s, 'h2')), 'items': items}


def hub_hero(s):
    h1 = first_tag(s, 'h1')
    right = s.find(lambda n: n.has('flex-vert_32'))
    return {'type': 'hubHero', 'label': text(s.by('label')), 'heading': rich(h1),
            'headingStyle': 'large' if h1 is not None and h1.has('her-h1_large') else ('h74' if h1 is not None and h1.has('h1-74') else ('light' if h1 is not None and h1.has('f-300') else 'plain')),
            'headingMax': mw(h1),
            'body': rich(first_tag(right, 'p')), 'buttons': buttons(right),
            'image': img(s.by('hero-image')), 'solid': bool(s.by('hero-img-gradient') and s.by('hero-img-gradient').has('is-solid')),
            'imageClass': [c for c in (s.by('hero-image').cls if s.by('hero-image') else []) if c.startswith('is-')],
            'short': s.has('is-patient'), 'row': bool(s.by('container') and s.by('container').has('flex-h')),
            # page custom code adds a second overlay via .hero-img-wrap::after (34% ink tint or a dark gradient)
            'extraOverlay': (lambda m: None if not m else ('gradient' if 'gradient' in m[-1] else 'tint'))(
                re.findall(r'\.hero-img-wrap::?after\s*\{([^}]*)\}', RAW))}


def hormones(s):
    head = s.by('testosteron-heading')
    return {'type': 'hormones', 'heading': rich(first_tag(head, 'h2')),
            'body': rich(head.find(lambda n: n.has('body-m'))) if head else '',
            'checks': [{'icon': img(c.find(lambda n: n.tag == 'img')), 'text': rich(first_tag(c, 'p'))} for c in s.all('testosteron-check_flex')],
            'image': img(s.by('testosteron-content_right').find(lambda n: n.tag == 'img')) if s.by('testosteron-content_right') else None}


def why_work(s):
    left = s.by('home_h1-wrap')
    return {'type': 'whyWork', 'heading': rich(first_tag(left, 'h2')),
            'body': rich(left.find(lambda n: n.has('body-l'))) if left else '', 'buttons': buttons(left),
            'items': [{'q': rich(w.by('heading-style-h5')), 'a': rich(w.by('faq-flex').find(lambda n: n.has('body-m')))} for w in s.all('faq-wrap')]}


def final_cta(s):
    return {'type': 'finalCta', 'heading': text(first_tag(s, 'h2')),
            'points': [text(li) for li in s.findall(lambda n: n.tag == 'li')], 'buttons': buttons(s),
            # Component variant "top-padding" (legal pages) adds 5rem of white above the sky-blue block.
            'topPad': s.attrs.get('data-wf--cta-section--variant') == 'top-padding'}


def rich_html(n):
    """Block-level rich text (legal pages): keep headings, paragraphs, lists, links, emphasis."""
    if n is None:
        return ''
    out = []
    for c in n.children:
        if isinstance(c, str):
            out.append(htmllib.escape(c, quote=False))
        elif c.tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'blockquote'):
            out.append(f'<{c.tag}>{rich_html(c)}</{c.tag}>')
        elif c.tag == 'a':
            out.append(f'<a href="{htmllib.escape(c.attrs.get("href", "#"))}">{rich_html(c)}</a>')
        elif c.tag in ('strong', 'b'):
            out.append(f'<strong>{rich_html(c)}</strong>')
        elif c.tag in ('em', 'i'):
            out.append(f'<em>{rich_html(c)}</em>')
        elif c.tag == 'br':
            out.append('<br>')
        else:
            out.append(rich_html(c))
    return re.sub(r'[ \t\n]+', ' ', ''.join(out))


def page_hero(s):
    """Grey intro band with label + h1 on the left, copy + buttons on the right (.is-location-hero)."""
    left = s.find(lambda n: n.has('flex-vert_24'))
    right = s.find(lambda n: n.has('flex-vert_32'))
    h1 = first_tag(left, 'h1')
    lw = mw(left) or ('423px' if left is not None and left.has('ms-423') else None)
    return {'type': 'pageHero', 'big': bool(h1 and h1.has('h1-74')), 'leftMax': lw, 'rightMax': mw(right),
            'label': text(left.by('label')) if left else '', 'heading': rich(h1),
            'body': rich(first_tag(right, 'p')) if right else '', 'buttons': buttons(right)}


def faq_page(s):
    return {'type': 'faqPage', 'heading': rich(first_tag(s, 'h2')),
            'items': [{'q': rich(w.by('heading-style-h5')), 'a': rich(w.by('faq-flex').find(lambda n: n.has('body-m')))} for w in s.all('faq-wrap')],
            'extra': {'heading': rich(s.by('faq-additional').by('heading-style-h5')), 'body': rich(s.by('faq-additional').by('body-m'))} if s.by('faq-additional') else None}


def legal_hero(s):
    return {'type': 'legalHero', 'heading': rich(first_tag(s, 'h1'))}


def legal(s):
    return {'type': 'legal', 'html': rich_html(s.by('pp-rte'))}



def locations(s):
    cards = []
    for c in s.all('location-card'):
        infos = []
        for inf in c.all('location-info'):
            link = inf.by('location-link')
            infos.append({'label': text(first_tag(inf, 'h4')),
                          'lines': [rich(d) for d in inf.findall(lambda n: n.has('body-r'))],
                          'link': {'text': text(link), 'href': link.attrs.get('href')} if link else None})
        cards.append({'name': text(c.find(lambda n: n.tag == 'h3')), 'image': img(c.find(lambda n: n.tag == 'img')),
                      'infos': infos, 'buttons': buttons(c)})
    return {'type': 'locations', 'heading': rich(first_tag(s, 'h2')), 'cards': cards}


def telehealth(s):
    card = s.by('telehealth-content')
    return {'type': 'telehealth', 'label': text(card.by('label')), 'heading': rich(first_tag(card, 'h2')),
            'body': rich(card.find(lambda n: n.has('body-l'))), 'buttons': buttons(card),
            'image': img(s.by('telehealth-img'))}



RAW = ''  # raw HTML of the page being processed (for inline SVG icons the tree skips)


def raw_svgs(cls):
    return [re.sub(r'\s+', ' ', m) for m in re.findall(r'class="' + re.escape(cls) + r'"[^>]*>\s*(<svg\b.*?</svg>)', RAW, re.S)]


def team(s):
    head = s.find(lambda n: any(c.startswith('heading-center') for c in n.cls))
    cards = []
    for c in s.all('team-card_wrap'):
        h3 = c.by('heading-style-h4')
        cards.append({'tag': text(c.by('team-card_text')), 'bio': rich(c.by('team-popup').find(lambda n: n.tag == 'p')),
                      'image': img(c.find(lambda n: n.tag == 'img')), 'name': rich(h3)})
    return {'type': 'team', 'heading': rich(first_tag(head, 'h2')), 'body': rich(first_tag(head, 'p')),
            'bodyMax': mw(first_tag(head, 'p')), 'cards': cards}


def access(s):
    holder = s.by('access-text_holder')
    return {'type': 'access', 'heading': rich(first_tag(holder, 'h2')), 'body': rich(first_tag(holder, 'p')),
            'items': [rich(li) for li in s.all('access-list_item')], 'buttons': buttons(s.by('cta-wrap')),
            'image': img(s.by('access-img'))}


def preparation(s):
    head = s.by('preparation-heading')
    icons = raw_svgs('preparation-icon')
    cards = []
    for i, c in enumerate(s.all('preparation-card')):
        t = c.by('preparation-card_text')
        cards.append({'icon': icons[i] if i < len(icons) else None, 'title': rich(t.by('heading-style-h4')),
                      'body': rich(t.find(lambda n: n.has('body-m'))), 'buttons': buttons(t)})
    return {'type': 'preparation', 'heading': rich(first_tag(head, 'h2')), 'body': rich(first_tag(head, 'p')), 'cards': cards}



def blog_hero(s):
    """Article hero: only what the CMS export lacks (image alt, category label as shown)."""
    im = s.by('blog-hero_img')
    lbl = s.by('blog-single_text').find(lambda n: n.has('label')) if s.by('blog-single_text') else None
    return {'type': 'articleHero', 'imageAlt': im.attrs.get('alt', '') if im else '', 'category': text(lbl)}



def book_hero(s):
    head = s.by('book-hero_head')
    done = s.by('book-hero_done')
    return {'type': 'bookHero', 'heading': rich(first_tag(head, 'h1')), 'body': rich(first_tag(head, 'p')),
            'image': img(s.by('book3d__fallback')),
            'fields': [{'label': text(f.find(lambda n: n.tag == 'label')), 'placeholder': live_placeholder(f.find(lambda n: n.tag == 'input') or Node('i', {}))} for f in s.all('book-hero_field')],
            'submit': text(s.by('book-hero_submit').by('btn-text1')), 'consent': rich(s.by('book-hero_consent')),
            'done': {'label': text(done.by('book-done_label')), 'heading': text(done.by('heading-style-h4')),
                     'body': rich(done.find(lambda n: n.has('body-m'))), 'note': text(done.by('book-done_note'))} if done else None,
            'fail': text(s.by('book-fail_text'))}


def book_steps(s):
    head = s.find(lambda n: any(c.startswith('heading-center') for c in n.cls))
    return {'type': 'bookSteps', 'heading': rich(first_tag(head, 'h2')), 'body': rich(first_tag(head, 'p')),
            'steps': [{'num': text(c.by('book-steps_num')), 'title': rich(c.by('heading-style-h4')), 'body': rich(c.find(lambda n: n.has('body-m')))} for c in s.all('book-steps_card')]}



def carousel(s):
    head = s.by('home_designed-content-wrap')
    return {'type': 'carousel', 'heading': rich(first_tag(head, 'h2')), 'body': rich(first_tag(head, 'p')),
            'slides': [{'title': rich(sl.find(lambda n: n.tag == 'h3')), 'body': rich(sl.find(lambda n: n.tag == 'p')),
                        'image': img(sl.by('solutions-img'))} for sl in s.findall(lambda n: n.has('swiper-slide'))],
            'after': (lambda w: {'body': rich(first_tag(w, 'p')), 'heading': rich(first_tag(w, 'h3')), 'buttons': buttons(w)} if w else None)(
                ([x for x in s.all('home_designed-content-wrap')] + [None])[1])}


def classify(s):
    c = s.find(lambda n: n.has('container'))
    cc = c.cls if c else []
    if s.has('is-location-hero') and s.by('flex-vert_32'): return page_hero
    if s.has('is-faq_n'): return faq_page
    if s.has('is-location'): return locations
    if s.by('telehealth-content'): return telehealth
    if s.has('is-pp_hero'): return legal_hero
    if s.has('is-pp'): return legal
    if 'is-swiper-cent' in cc: return carousel
    if 'is-paddings' in cc and 'lc-reviews' in RAW: return lambda s: {'type': 'reviewsBare', 'pad': 'is-paddings'}
    if s.has('book-hero'): return book_hero
    if s.has('book-steps'): return book_steps
    if s.has('is-blog-hero') and s.has('is-padding'): return blog_hero
    if s.has('is-blog-content'): return lambda s: {'type': 'articleBody'}
    if s.has('is-men_hero') or s.has('is-patient'): return hub_hero
    if 'is-team' in cc: return team
    if s.has('is-access'): return access
    if s.has('is-preparation'): return preparation
    if s.has('is-testoteron'): return hormones
    if 'is-lr' in cc and s.by('faq-wrap'): return why_work
    if s.by('cta-abs_img'): return final_cta
    if s.has('is-women-drop-hero'): return hero
    if s.has('is-symptom'): return symptom
    if 'is-cta-2-grid' in cc: return cta_block
    if s.has('is-causes_white') and 'is-causes' in cc: return statement if s.has('is-brown') else standard
    if s.has('is-signs') or s.has('is-signs_w'): return signs
    if s.has('is-causes'): return standard
    if s.has('is-compare'): return compare
    if 'is-missions' in cc: return missions
    if s.has('is-voices'): return voices
    if s.has('is-process'): return process
    if s.has('is-why'): return why
    if 'is-stories' in cc:
        return lambda s: {'type': 'reviews', 'heading': rich(first_tag(s.by('stories-text_wrap'), 'h2')),
                          'body': rich(first_tag(s.by('stories-text_wrap'), 'p'))}
    if 'is-inner-resources' in cc: return insights
    if 'is-faq' in cc: return faq
    return None


def live_placeholder(inp):
    # The page's custom code replaces the Designer placeholders on load: var f={'book-name':['Your name','name'],...}
    m = re.search(r"var f=\{(.*?)\};", RAW)
    js = dict(re.findall(r"'([\w-]+)':\['([^']*)'", m.group(1))) if m else {}
    return js.get(inp.attrs.get('id', ''), inp.attrs.get('placeholder', ''))


def spaced(n):
    return ' '.join((c if isinstance(c, str) else spaced(c)) for c in n.children)


def coverage(section, data):
    """Visible words in the section that never made it into the JSON."""
    have = re.sub(r'<[^>]+>', ' ', json.dumps(data, ensure_ascii=False))
    have = set(re.findall(r"[\w’']+", htmllib.unescape(have).lower()))
    missing = [w for w in re.findall(r"[\w’']+", spaced(section).lower()) if w not in have]
    return sorted(set(missing))


def main():
    # usage: extract-treatments.py <html-dir> [out-subdir file.html ...]
    global OUT
    if len(sys.argv) > 3:
        OUT = os.path.join(ROOT, 'src', 'data', sys.argv[2])
        os.makedirs(OUT, exist_ok=True)
        pages = sys.argv[3:]
    else:
        pages = sorted(f for f in os.listdir(sys.argv[1]) if re.match(r'(men|women)__.+\.html$', f))
    for f in pages:
        global RAW
        RAW = open(os.path.join(sys.argv[1], f), encoding='utf-8', errors='ignore').read()
        b = Builder()
        b.feed(RAW)
        main_el = b.root.find(lambda n: n.tag == 'main')
        head = open(os.path.join(sys.argv[1], f), encoding='utf-8', errors='ignore').read()
        title = htmllib.unescape(re.search(r'<title>(.*?)</title>', head, re.S).group(1))
        desc = re.search(r'<meta content="([^"]*)" name="description"', head)
        sections, report = [], []
        def in_footer(n):
            while n is not None:
                if n.tag == 'footer':
                    return True
                n = n.parent
            return False
        # Webflow markup is not always balanced, so <main> can close early: take every section outside the footer.
        for s in b.root.findall(lambda n: n.tag == 'section' and not in_footer(n)):
            if s.find(lambda n: n.tag == 'section'):
                continue
            fn = classify(s)
            if fn is None:
                report.append(f'  UNHANDLED section {s.cls} :: {text(s)[:120]}')
                sections.append({'type': 'unhandled', 'classes': s.cls, 'text': text(s)[:500]})
                continue
            d = fn(s)
            miss = coverage(s, d) if d['type'] not in ('articleBody', 'articleHero', 'reviewsBare') else []
            if miss:
                report.append(f'  COVERAGE {d["type"]}: {" ".join(miss[:25])}')
            sections.append(d)
        slug = f[:-5]
        foot = b.root.find(lambda n: n.tag == 'footer')
        footer = None
        if foot is not None and not foot.by('footer-links_wrap'):  # landing-page variant: logo + blurb only
            footer = {'minimal': True, 'blurb': rich(foot.by('footer-mid_text').find(lambda n: n.tag == 'p'))}
        nav = re.search(r'data-wf--nav--variant="([^"]*)"', RAW)
        header = 'light' if nav and nav.group(1) == 'white-text' else 'dark'  # header component variant set per page
        json.dump({'path': '/' + slug.replace('__', '/'), 'title': title, 'footer': footer, 'headerTheme': header,
                   'description': htmllib.unescape(desc.group(1)) if desc else '', 'sections': sections},
                  open(os.path.join(OUT, slug + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'{slug}: {" ".join(x["type"] for x in sections)}')
        for line in report:
            print(line)


main()
