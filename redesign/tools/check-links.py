# Checks the new design for broken links. Run from the repository root: python3 redesign/tools/check-links.py
# Starting at redesign/home2.html it follows every page link and checks that every link, script, stylesheet and
# image exists, every #section link has its section, and no link leads to an old page outside the new design.
import os, re, sys, html
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse, unquote
ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "."); START = 'redesign/home2.html'
NEW = {'redesign/home2.html'} | {f'redesign/{d}/{f}' for d in ('about','contact','projects') for f in os.listdir(os.path.join(ROOT,'redesign',d)) if f.endswith('.html')}
class P(HTMLParser):
    def __init__(s): super().__init__(); s.refs=[]; s.ids=set()
    def handle_starttag(s, tag, a):
        a=dict(a)
        if 'id' in a: s.ids.add(a['id'])
        for k in ('href','src','srcset','poster'):
            if a.get(k):
                vals=[v.strip().split(' ')[0] for v in a[k].split(',')] if k=='srcset' else [a[k]]
                for v in vals: s.refs.append((tag,k,v))
def parse(rel):
    p=P(); txt=open(os.path.join(ROOT,rel),encoding='utf-8').read(); p.feed(txt)
    # also url(...) in inline styles, and import map / module imports
    for m in re.finditer(r'url\(["\']?([^)"\']+)', txt): p.refs.append(('css','url',m.group(1)))
    return p
seen, queue, problems, external, idcache = set(), [START], [], set(), {}
while queue:
    rel=queue.pop()
    if rel in seen: continue
    seen.add(rel); p=parse(rel); idcache[rel]=p.ids
    for tag,k,v in p.refs:
        u=urlparse(v)
        if u.scheme in ('http','https'):
            external.add(v); 
            if 'mladavlna.github.io' in v and not v.startswith('https://mladavlna.github.io/Documents/'): problems.append((rel,'links to the live site',v))
            continue
        if u.scheme in ('mailto','tel','data','javascript'): continue
        target = os.path.normpath(os.path.join(os.path.dirname(rel), unquote(u.path))) if u.path else rel
        if not os.path.exists(os.path.join(ROOT,target)): problems.append((rel,'missing',v)); continue
        if os.path.isdir(os.path.join(ROOT,target)): target=os.path.join(target,'index.html')
        if target.endswith('.html'):
            if target not in NEW and tag=='a': problems.append((rel,'leads to a page outside the new design',v))
            elif target in NEW: queue.append(target)
            if u.fragment: problems.append(('ANCHOR', target, u.fragment, rel))
# check anchors
for pr in [x for x in problems if x[0]=='ANCHOR']:
    _,t,frag,src=pr; problems.remove(pr)
    if t not in idcache: idcache[t]=parse(t).ids
    if frag not in idcache[t]: problems.append((src,'missing anchor',f'{t}#{frag}'))
# CSS files: url() references
for root_,_,fs in os.walk(os.path.join(ROOT,'redesign/css')):
    for f in fs:
        txt=open(os.path.join(root_,f),encoding='utf-8').read()
        for m in re.finditer(r'url\(["\']?([^)"\'#]+)', txt):
            v=m.group(1)
            if v.startswith(('data:','http')): continue
            t=os.path.normpath(os.path.join('redesign/css',v))
            if not os.path.exists(os.path.join(ROOT,t)): problems.append((f'css/{f}','missing',v))
print('pages crawled:', len(seen)); print('\n'.join(sorted(seen)))
print('unreached new pages:', sorted(NEW-seen))
print('external:', '\n  '+'\n  '.join(sorted(external)))
print('PROBLEMS:', len(problems)); [print(' ',x) for x in problems]
