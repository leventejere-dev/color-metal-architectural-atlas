"""One-off: cleaned company post texts (docx_texts.json from the archive scan) -> data/curation/texts.json"""
import json, re, sys
BS = chr(92)
raw = json.load(open(sys.argv[1], encoding='utf-8'))
src = json.load(open('data/sources/project-sources.json', encoding='utf-8'))
emoji = re.compile('[\U0001F000-\U0001FFFF\u2600-\u27BF\uFE0F\u200d]')
def clean(t):
    t = emoji.sub('', t)
    out = []
    for l in t.split('\n'):
        l = re.sub(r'#\S+', '', l).strip()
        if l:
            out.append(l)
    return out
def cut(paras, n=900):
    out = ''
    for p in paras:
        if len(out) + len(p) > n and out:
            break
        out += ('\n\n' if out else '') + p
    return out
texts = {}
for pr in src['projects']:
    d = pr.get('docx')
    if not d:
        continue
    key = [k for k in raw if k.replace(BS, '/').endswith(d)]
    if not key:
        print('missing', pr['id'])
        continue
    lines = clean(raw[key[0]])
    ro, en = [], []
    cur = ro
    for l in lines:
        if l == 'RO':
            cur = ro; continue
        if l == 'EN':
            cur = en; continue
        if l.startswith('Copper used in architecture'):
            cur = en
        cur.append(l)
    if ro:
        ro[0] = re.sub(r'([a-zăâîșțé”])([A-ZĂÂÎȘȚ][a-zăâîșț])', r'\1 — \2', ro[0], count=1)
    rec = {'ro': cut(ro)}
    if en:
        rec['en'] = cut(en)
    texts[pr['id']] = rec
json.dump({'_doc': 'Project descriptions from COLOR METAL published posts (archive .docx), cleaned of hashtags/emoji. RO original; EN only where the post had an English version. Missing languages fall back transparently in the UI.', 'texts': texts}, open('data/curation/texts.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for k, v in texts.items():
    print(k, len(v['ro']), 'en' in v, '|', v['ro'][:90].replace('\n', ' '))
