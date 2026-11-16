# Writes the forwarding pages that keep the old site's addresses working (links from Google, Instagram,
# partner sites). Each old page is replaced by a tiny page that sends the visitor straight on to its new
# page and tells search engines where the page moved. Run from the repository root:
#   python3 tools/make-redirects.py
# The old pages themselves are in the git history (before the new design moved to the root).
import os, html

SITE_URL = 'https://mladavlna.github.io/'
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# old address -> new address (both from the site root)
MOVED = {
    'about-us.html': 'about/index.html',
    'projects.html': 'projects/index.html',
    'blog.html': 'projects/index.html',                    # the blog posts were folded into the project pages
    'contact.html': 'contact/index.html',
    'documents.html': 'about/index.html#documents',
    'features.html': 'index.html',                          # leftovers of the old template
    'testimonials.html': 'index.html',
    'Projekty/CTRLBulgaria/ctrlaltrights.html': 'projects/ctrl-alt-rights.html',
    'Projekty/CTRLBulgaria/ctrlaltrightsblog.html': 'projects/ctrl-alt-rights.html',
    'Projekty/MasterofPuppets/masterofpuppets.html': 'projects/masters-of-puppets.html',
    'Projekty/MasterofPuppets/masterofpuppetsblog.html': 'projects/masters-of-puppets.html',
    'Projekty/Populism101/populism.html': 'projects/populism-101.html',
    'Projekty/Populism101/populismblog.html': 'projects/populism-101.html',
    'Projekty/Retoy/retoy.html': 'projects/retoy.html',
    'Projekty/Retoy/retoyblog.html': 'projects/retoy.html',
    'Projekty/Smart&Sustainable/sustainable.html': 'projects/smart-sustainable.html',
    'Projekty/Smart&Sustainable/sustainableblog.html': 'projects/smart-sustainable.html',
}

PAGE = """<!DOCTYPE html>
<!-- Forwarding page, made by tools/make-redirects.py: this address moved to {new}. -->
<html lang="sk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mladá Vlna</title>
  <meta name="robots" content="noindex">
  <link rel="canonical" href="{absolute}">
  <meta http-equiv="refresh" content="0; url={relative}">
  <script>location.replace({relative_js});</script>
</head>
<body>
  <p>Táto stránka sa presťahovala: <a href="{relative}">pokračovať na novú stránku</a>.<br>
  This page has moved: <a href="{relative}">go to the new page</a>.</p>
</body>
</html>
"""

for old, new in MOVED.items():
    depth = old.count('/')
    relative = '../' * depth + new
    absolute = SITE_URL + new.split('#')[0].replace('index.html', '')   # search engines get the plain page address
    page = PAGE.format(new=new, absolute=html.escape(absolute), relative=html.escape(relative),
                       relative_js=repr(relative))
    with open(os.path.join(ROOT, old), 'w', encoding='utf-8', newline='\n') as f:
        f.write(page)
print(f'wrote {len(MOVED)} forwarding pages')
