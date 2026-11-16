# Builds the projects overview (projects/index.html) and one page per project (projects/<slug>.html),
# and makes web-sized, upright copies of each project's photos (img/projects/<slug>/).
#
# Content comes from the original site's project pages and blog posts (Projekty/*), condensed so the photos
# lead. Slovak is the text in the HTML; English goes into window.PAGE_EN for the language switch.
# Run from the redesign folder:   python tools/build-projects.py      (needs Pillow)
import html, json, os, sys
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)                 # redesign/
ROOT = os.path.dirname(SITE)                 # repository root, with Projekty/
OUT = os.path.join(SITE, 'projects')

# ---------------------------------------------------------------------------------------------------------
# The projects, newest first. Each text is (Slovak, English).
PROJECTS = [
  dict(
    slug='populism-101', title='Populism 101', folder='Populism101',
    tags=[('Demokracia', 'Democracy')],
    dates=('14.–22. júla 2026', '14–22 July 2026'), short=('07/2026', '07/2026'),
    place=('Orahovica, Chorvátsko', 'Orahovica, Croatia'),
    countries=(['Chorvátsko', 'Holandsko', 'Maďarsko', 'Slovensko', 'Rumunsko', 'Srbsko', 'Bulharsko'],
               ['Croatia', 'the Netherlands', 'Hungary', 'Slovakia', 'Romania', 'Serbia', 'Bulgaria']),
    who=('7 účastníkov a 1 vedúci skupiny z každej krajiny, vo veku približne 18–25 rokov',
         '7 participants and 1 group leader from each country, aged about 18–25'),
    venue=('Vzdelávacie centrum Chorvátskeho Červeného kríža', 'Croatian Red Cross education centre'), venue_url='https://shorturl.at/2Hyv0',
    lead=('Týždeň v Orahovici o populizme: čo to je, prečo funguje a ako kriticky premýšľať o politike a médiách.',
          'A week in Orahovica about populism: what it is, why it works, and how to think critically about politics and the media.'),
    story=[
      (('Demokracia zblízka', 'Democracy, up close'),
       ('Workshopy, diskusie a simulácie sa venovali právnemu štátu, ľudským právam, slobode médií a fungovaniu demokratických inštitúcií. Skúmali sme, ako populizmus vzniká a ako sa prejavuje v každej z našich krajín.',
        'Workshops, discussions and simulations covered the rule of law, human rights, media freedom and how democratic institutions work. We looked at how populism arises and how it shows up in each of our countries.')),
      (('Sedem krajín pri jednom stole', 'Seven countries, one table'),
       ('V medzinárodných skupinách priniesol každý vlastný pohľad. Naučili sme sa rešpektovať odlišné názory, argumentovať vecne a viesť otvorený dialóg a naša angličtina bola každý deň istejšia.',
        'Working in international groups, everyone brought their own view. We learned to respect different opinions, argue with facts and keep the conversation open, and our English got more confident every day.')),
      (('Večery a jazero', 'Evenings by the lake'),
       ('Medzikultúrne večery priniesli jedlo, hudbu, tance a príbehy z každej krajiny. Pokojná Orahovica obklopená prírodou nám dala čas pri jazere a priateľstvá, ktoré pretrvajú aj po projekte.',
        'Intercultural evenings brought food, music, dances and stories from every country. Orahovica, a quiet town surrounded by nature, gave us time by the lake and friendships that last beyond the project.')),
    ],
    photos=['image1.jpeg', 'image2.jpeg', 'image3.jpeg'], cover=0,
    infopack='Infopack.pdf', drive=None,
  ),
  dict(
    slug='masters-of-puppets', title='The Masters of Puppets', folder='MasterofPuppets',
    tags=[('Ekológia', 'Environment')],
    dates=('11.–19. marca 2026', '11–19 March 2026'), short=('03/2026', '03/2026'),
    place=('Rymanów, Poľsko', 'Rymanów, Poland'),
    countries=(['Slovensko', 'Poľsko', 'Rumunsko', 'Bulharsko', 'Turecko'], ['Slovakia', 'Poland', 'Romania', 'Bulgaria', 'Turkey']),
    who=('5 účastníkov a 1 vedúci skupiny z každej krajiny, vo veku 18–30 rokov', '5 participants and 1 group leader from each country, aged 18–30'),
    venue=('Jaś Wędrowniczek pri meste Krosno', 'Jaś Wędrowniczek, near Krosno'), venue_url='https://jas-wedrowniczek.pl/pl/marek_napiorkowski',
    lead=('Odpad nazbieraný okolo Rymanówa sa zmenil na bábky, rekvizity a príbeh a nakoniec na bábkové predstavenie pre deti v škôlke.',
          'Litter collected around Rymanów became puppets, props and a story, and finally a puppet show for kindergarten children.'),
    story=[
      (('Z odpadu bábky', 'From litter to puppets'),
       ('Začali sme čistením prírody okolo Rymanówa. Odpad sme nevyhodili, ale použili ako materiál: s trochou fantázie sa z neho stali bábky a divadelné rekvizity, každá s vlastným charakterom.',
        'We started by cleaning up nature around Rymanów. Instead of throwing the rubbish away, we used it as material: with some imagination it turned into puppets and stage props, each with its own character.')),
      (('Predstavenie pre škôlku', 'A show for the kindergarten'),
       ('V medzinárodných tímoch sme písali scenár, skúšali scény a učili sa, ako cez divadlo odovzdať ekologické posolstvo. Vidieť smiech detí na predstavení bolo jedným z najkrajších momentov týždňa.',
        'In international teams we wrote the script, rehearsed the scenes and learned how to pass on an ecological message through theatre. Seeing the children laugh at the show was one of the best moments of the week.')),
      (('AI a medzikultúrny večer', 'AI and an intercultural night'),
       ('Učili sme sa tiež využívať digitálne nástroje a umelú inteligenciu na šírenie environmentálnych myšlienok a na medzikultúrnom večeri sme ochutnali jedlá zo všetkých krajín.',
        'We also learned to use digital tools and AI to spread environmental ideas, and tasted food from every country at the intercultural night.')),
    ],
    photos=['image2.jpg', 'image3.jpg', 'image1.jpeg'], cover=0,
    infopack='The Masters of Puppets infopack.pdf', drive=None,
  ),
  dict(
    slug='smart-sustainable', title='Smart & Sustainable', subtitle='Youth vs. Fast Fashion', folder='Smart&Sustainable',
    tags=[('Ekológia', 'Environment'), ('Digitálne zručnosti', 'Digital skills')],
    dates=('27. decembra 2025 – 4. januára 2026', '27 December 2025 – 4 January 2026'), short=('12/2025', '12/2025'),
    place=('Košice, Slovensko', 'Košice, Slovakia'),
    countries=(['Slovensko', 'Poľsko', 'Rumunsko', 'Bulharsko'], ['Slovakia', 'Poland', 'Romania', 'Bulgaria']),
    who=('6 účastníkov a 1 vedúci skupiny z každej krajiny, vo veku 18–30 rokov', '6 participants and 1 group leader from each country, aged 18–30'),
    venue=('Penzión Sivec pri Košickej Belej', 'Penzión Sivec near Košická Belá'), venue_url='http://www.penzionsivec.sk',
    lead=('Deväť dní na prelome rokov o tom, koľko naše oblečenie naozaj stojí planétu aj ľudí, ktorí ho šijú, a čo môžeme robiť inak.',
          'Nine days around the turn of the year, spent looking at what our clothes really cost the planet and the people who make them, and at what we can do instead.'),
    story=[
      (('Za visačkou', 'Behind the label'),
       ('Cez workshopy, diskusie a simulačné hry účastníci sledovali cestu trička či rifieľ a skúmali environmentálnu a sociálnu stránku rýchlej módy aj vlastné nákupné zvyky.',
        'Through workshops, discussions and simulation games, participants followed the journey of a T-shirt or a pair of jeans and looked at the environmental and social side of fast fashion, and at their own shopping habits.')),
      (('Druhý život oblečenia', 'A second life for clothes'),
       ('Udržateľnosť neznamená vzdať sa vlastného štýlu. Skupina skúmala opravy, opätovné nosenie a výmenu oblečenia a pracovala s myšlienkou komunitného clothes swapu.',
        'Sustainability does not mean giving up your style. The group explored repairing, reusing and swapping clothes, and worked with the idea of a community clothes swap.')),
      (('AI pre osvetu', 'AI for awareness'),
       ('V medzinárodných tímoch účastníci využili nástroje umelej inteligencie a premenili to, čo sa naučili, na osvetové kampane, ktoré vysvetľujú rýchlu módu jednoducho a pútavo.',
        'In international teams, participants used AI tools to turn what they had learned into awareness campaigns that explain fast fashion simply and attractively.')),
      (('Nový rok spolu', 'A new year together'),
       ('Keďže výmena trvala od 27. decembra do 4. januára, mladí ľudia zo štyroch krajín privítali nový rok spolu, s plánmi na uvedomelejšie rozhodnutia doma.',
        'With the exchange running from 27 December to 4 January, young people from four countries welcomed the new year together, with plans for more conscious choices back home.')),
    ],
    photos=['image4.jpg', 'image1.jpg', 'image2.jpg', 'image3.jpg', 'image5.jpg', 'image6.jpg', 'image8.jpg', 'image9.jpg', 'image10.jpg', 'image7.jpg', 'image11.jpg'], cover=0,
    infopack='infopack.pdf', drive='https://drive.google.com/drive/u/1/folders/10iM9XoiMdyGh3-rM8H0AdbNKT35-HJ4l',
  ),
  dict(
    slug='retoy', title='ReToy', folder='Retoy',
    tags=[('Ekológia', 'Environment'), ('Digitálne zručnosti', 'Digital skills')],
    dates=('8.–16. septembra 2025', '8–16 September 2025'), short=('09/2025', '09/2025'),
    place=('Košice, Slovensko', 'Košice, Slovakia'),
    countries=(['Slovensko', 'Poľsko', 'Maďarsko', 'Rumunsko', 'Bulharsko', 'Chorvátsko'], ['Slovakia', 'Poland', 'Hungary', 'Romania', 'Bulgaria', 'Croatia']),
    who=('6 účastníkov a 1 vedúci skupiny z každej krajiny, vo veku 18–30 rokov', '6 participants and 1 group leader from each country, aged 18–30'),
    venue=('Penzión Sivec pri Košickej Belej', 'Penzión Sivec near Košická Belá'), venue_url='http://www.penzionsivec.sk',
    lead=('Týždeň o tom, ako dať odpadu druhý život. Mladí ľudia zo šiestich krajín upratali centrum Košíc, z nazbieraného odpadu postavili model inteligentného mesta a popri tom sa naučili 3D tlačiť.',
          'A week about giving rubbish a second life. Young people from six countries cleaned up the centre of Košice, built a model smart city out of what they collected, and learned to 3D print along the way.'),
    story=[
      (('Spoločné upratovanie mesta', 'Cleaning the city together'),
       ('V medzinárodných tímoch účastníci zbierali odpadky z verejných priestranstiev v centre Košíc a rozprávali sa s miestnymi o tom, ako sa starať o miesto, kde žijú. Odpad však neskončil hneď v koši: stal sa stavebným materiálom pre najväčšiu výzvu týždňa.',
        'In international teams, participants collected litter from public spaces in the centre of Košice and talked with local residents about looking after the place they live in. The rubbish did not go straight to the bin: it became the building material for the week\'s biggest challenge.')),
      (('Inteligentné mesto z odpadu', 'A smart city built from waste'),
       ('Z fliaš, kartónu, obalov a plechoviek vznikli domy, cesty, parky a verejné budovy farebného modelu inteligentného mesta. Model sme darovali CVČ Domino v Košiciach, kde dodnes inšpiruje mladých návštevníkov.',
        'Bottles, cardboard, packaging and cans turned into the houses, roads, parks and public buildings of a colourful Smart City model. It was donated to CVČ Domino in Košice, where it still inspires young visitors.')),
      (('3D tlač a umelá inteligencia', '3D printing and AI'),
       ('Mnohí účastníci po prvý raz pracovali s 3D tlačiarňou, od prípravy modelu až po samotnú tlač. Vytlačené detaily sa stali súčasťou mesta a sadu vytlačených hračiek sme darovali charite Podaj Ďalej. Tímy tiež vytvorili krátke osvetové videá, v ktorých spojili obsah vytvorený umelou inteligenciou so zábermi z upratovania.',
        'Many participants used a 3D printer for the first time, from preparing a model to running the print. Printed details went into the city, and a set of printed toys was donated to the Podaj Ďalej charity. Teams also made short awareness videos combining AI-generated content with footage from the clean-up.')),
      (('Výsledky pre Košice', 'Sharing it with Košice'),
       ('Na verejnom podujatí v CVČ Domino si návštevníci prezreli model, pozreli si 3D tlačiareň pri práci a dozvedeli sa o možnostiach programu Erasmus+. Medzikultúrne večery s jedlom, hudbou a hrami z nás urobili priateľov.',
        'At a public event at CVČ Domino, visitors explored the model, watched the 3D printer at work and heard about Erasmus+ opportunities. Intercultural evenings with food, music and games turned the group into friends.')),
    ],
    photos=['image2.jpg', 'image1.jpg', 'image3.jpg', 'image4.jpeg', 'image8.jpeg', 'image6.jpeg', 'image7.jpeg', 'image12.jpeg', 'image13.jpeg',
            'image14.jpeg', 'image15.jpeg', 'image16.jpeg', 'image17.jpeg', 'image18.jpeg', 'image9.jpeg', 'image10.jpeg', 'image11.jpeg', 'image5.jpeg'], cover=0,
    infopack='Infopack.pdf', drive='https://drive.google.com/drive/folders/1d_O0zVyf4OAbiKIrzTeoK7Xpf97jQQ_i',
  ),
  dict(
    slug='ctrl-alt-rights', title='CTRL + ALT + RIGHTS', folder='CTRLBulgaria',
    tags=[('Ľudské práva', 'Human rights')],
    dates=('14.–21. júna 2025', '14–21 June 2025'), short=('06/2025', '06/2025'),
    place=('Stara Zagora, Bulharsko', 'Stara Zagora, Bulgaria'),
    countries=(['Bulharsko', 'Rumunsko', 'Poľsko', 'Slovensko'], ['Bulgaria', 'Romania', 'Poland', 'Slovakia']),
    who=('5 účastníkov a 1 vedúci skupiny z každej krajiny, vo veku 18–30 rokov', '5 participants and 1 group leader from each country, aged 18–30'),
    venue=('Penzión Youthopia, Stara Zagora', 'Youthopia guesthouse, Stara Zagora'), venue_url='https://www.youtopiariverside.com/gallery/',
    lead=('Ľudské práva, demokracia a overovanie faktov cez hry, simulácie a diskusie v Starej Zagore.',
          'Human rights, democracy and fact-checking, explored through games, simulations and discussions in Stara Zagora.'),
    story=[
      (('Vážne témy hravo', 'Serious topics, played'),
       ('Výmena, ktorú zorganizovala C.E.T. Platform Bulgaria, otvárala témy ako ohrozenie demokracie, ľudské práva či manipulácia informácií pomocou hier, simulácií a diskusií.',
        'Organised by C.E.T. Platform Bulgaria, the exchange used games, simulations and discussions to open up topics like threats to democracy, human rights and manipulated information.')),
      (('Guess my Right', 'Guess my Right'),
       ('Jednu hru vymysleli priamo pre tento projekt: „Guess my Right“, v ktorej treba otázkami uhádnuť ľudské právo. Domov sme si priniesli mnoho ďalších aktivít aj nové priateľstvá.',
        'One game was invented just for this project: “Guess my Right”, where you identify a human right by asking questions. We took home many more activities like it, and new friendships.')),
    ],
    photos=['photo1.jpg', 'photo2.jpg', 'photo3.jpg'], cover=0,
    infopack='infopack.pdf', drive=None,
  ),
]

# Words used on every project page: (Slovak, English).
UI = {
  'kind': ('Mládežnícka výmena Erasmus+', 'Erasmus+ youth exchange'),
  'all': ('Všetky projekty', 'All projects'),
  'f_dates': ('Termín', 'Dates'), 'f_place': ('Miesto', 'Place'), 'f_countries': ('Krajiny', 'Countries'),
  'f_who': ('Účastníci', 'Participants'), 'f_venue': ('Ubytovanie', 'Venue'),
  'photos': ('Fotky', 'Photos'),
  'story_label': ('Ako to prebiehalo', 'How it went'),
  'materials': ('Všetky materiály projektu', 'All materials of the project'),
  'infopack': ('Infopack (PDF)', 'Info pack (PDF)'),
  'prev': ('Predchádzajúci projekt', 'Previous project'), 'next': ('Ďalší projekt', 'Next project'),
  'lb_close': ('Zavrieť', 'Close'), 'lb_prev': ('Predchádzajúca fotka', 'Previous photo'), 'lb_next': ('Ďalšia fotka', 'Next photo'),
  'view': ('Pozrieť projekt', 'View project'),
}

def plural_photos(n):
    sk = 'fotka' if n == 1 else 'fotky' if 2 <= n <= 4 else 'fotiek'
    return (f'{n} {sk}', f'{n} photo' + ('' if n == 1 else 's'))

def plural_countries(n):
    sk = 'krajina' if n == 1 else 'krajiny' if 2 <= n <= 4 else 'krajín'
    return (f'{n} {sk}', f'{n} countr' + ('y' if n == 1 else 'ies'))

def join_list(items, last):
    return ', '.join(items[:-1]) + f' {last} ' + items[-1] if len(items) > 1 else items[0]

e = html.escape

# ---------------------------------------------------------------------------------------------------------
# Photos: upright (EXIF), large 1800 px for the viewer, 900 px for the page.
def make_photos(p):
    src_dir = os.path.join(ROOT, 'Projekty', p['folder'])
    out_dir = os.path.join(SITE, 'img', 'projects', p['slug'])
    os.makedirs(out_dir, exist_ok=True)
    result = []
    for i, name in enumerate(p['photos'], 1):
        src = os.path.join(src_dir, name)
        big, small = os.path.join(out_dir, f'{i:02d}.webp'), os.path.join(out_dir, f'{i:02d}-sm.webp')
        if not (os.path.exists(small) and os.path.getmtime(small) > os.path.getmtime(src)):
            im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
            b = im.copy(); b.thumbnail((1800, 1800), Image.LANCZOS); b.save(big, quality=80, method=6)
            s = im.copy(); s.thumbnail((900, 900), Image.LANCZOS); s.save(small, quality=74, method=6)
        w, h = Image.open(small).size
        result.append(dict(big=f'../img/projects/{p["slug"]}/{i:02d}.webp', small=f'../img/projects/{p["slug"]}/{i:02d}-sm.webp', w=w, h=h))
    return result

# ---------------------------------------------------------------------------------------------------------
# Shared parts. `en` collects the English text of the page for window.PAGE_EN.
def t(en, key, pair):
    en[key] = pair[1]
    return f'data-i18n="{key}">{e(pair[0])}'

def head(title_sk, desc):
    return f'''<!DOCTYPE html>
<!-- Built by tools/build-projects.py: edit the content there and run it again, not this file. -->
<!-- Development: opens in English (DEFAULT_LANG in js/home2.js). Before release, switch it and this lang back to "sk". -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{e(title_sk)} – Mladá Vlna</title>
  <meta name="description" content="{e(desc)}">
  <meta name="theme-color" content="#0e1f26">
  <link rel="icon" href="../../images/logos/logo_small.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter+Tight:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/home2.css">
  <link rel="stylesheet" href="../css/pages.css">
  <script>if ('scrollRestoration' in history) history.scrollRestoration = 'manual';</script>
</head>
<body>
  <a class="skip" href="#main" data-i18n="skip">Preskočiť na obsah</a>
  <header class="top">
    <a class="brand" href="../home2.html">
      <img src="../img/logo-mark.png" alt="" width="46" height="46">
      <span>Mladá Vlna</span>
    </a>
    <nav class="nav" id="nav" aria-label="Hlavná navigácia" data-lenis-prevent>
      <a href="../home2.html#mission" data-i18n="nav_about">O nás</a>
      <a href="../home2.html#environment" data-i18n="nav_focus">Čo robíme</a>
      <a href="index.html" data-i18n="nav_projects">Projekty</a>
      <a href="../home2.html#join" data-i18n="nav_join">Ako sa zapojiť</a>
      <a href="#contact" data-i18n="nav_contact">Kontakt</a>
      <span class="lang" role="group" aria-label="Jazyk / Language">
        <button type="button" data-lang="en" aria-pressed="true">EN</button><span aria-hidden="true">/</span><button type="button" data-lang="sk" aria-pressed="false">SK</button>
      </span>
    </nav>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav"><span data-i18n="menu">Menu</span><i aria-hidden="true"></i></button>
  </header>
'''

TREELINE = '<svg class="treeline" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 120V84l18-22 8 10 14-34 14 30 10-12 16 32 12-20 14-40 16 44 10-14 14 26 18-36 12 18 16-44 18 52 10-10 12 22 16-30 14 18 18-46 14 34 12-12 16 30 14-24 16-38 16 42 12-10 14 24 16-32 12 14 18-48 16 50 12-14 14 28 16-28 14 16 16-40 18 44 10-12 14 26 16-34 14 20 16-42 16 46 12-16 14 30 16-26 14 18 18-50 14 48 12-12 16 26 14-30 16 20 14-38 18 40 12-14 14 28 16-36 14 22 16-44 16 48 12-14 14 24 16-30 14 16 18-42 14 40 12-12 16 30 14-26 16 18 14-40 18 44 10-10 14 24 16-34 14 20 16-46 16 50 12-16 14 28 16-28 14 16 16-38 18 42 12-12 14 26 16-32 14 18 16-44 16 46 12-14 14 26 16-28 14 18 18-40 14 38 12-10 16 28 14-24 16 20 14-36 18 40 10-12 14 24 16-30 14 16 16-42 16 44 12-14 14 28 16-26 14 14 V120z"/></svg>'

def foot(en, extra_scripts=''):
    return f'''
    <section class="cta" id="contact">
      {TREELINE}
      <div class="wrap">
        <p class="label label--light"><span data-i18n="cta_label">Kontakt</span></p>
        <h2 data-i18n="cta_title">Chceš niečo zmeniť tam, kde žiješ? Ozvi sa.</h2>
        <div class="actions">
          <a class="btn" href="mailto:contact@mladavlna.org">contact@mladavlna.org<span class="btn__arrow" aria-hidden="true">→</span></a>
          <a class="link link--light" href="https://www.instagram.com/mladavlna/" target="_blank" rel="noopener noreferrer">Instagram <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  </main>

  <footer class="foot">
    <div class="wrap foot__in">
      <p><strong>Mladá Vlna, o. z.</strong><br>Tomášikova 22, 080 01 Prešov<br><a href="tel:+421918208346">+421 918 208 346</a></p>
      <p><a href="../../documents.html" data-i18n="docs">Dokumenty</a><br><a href="../../blog.html">Blog</a><br><a href="../index.html" data-i18n="other">Prvá verzia stránky</a></p>
    </div>
    <p class="wrap foot__note">© 2026 Mladá Vlna</p>
  </footer>

  <script>window.PAGE_EN = {json.dumps(en, ensure_ascii=False)};</script>
  <script src="https://unpkg.com/lenis@1.1.13/dist/lenis.min.js" defer></script>
  <script src="../js/home2.js" defer></script>{extra_scripts}
</body>
</html>
'''

def facts(en, p, prefix=''):
    c_sk, c_en = p['countries']
    en['fc'] = join_list(c_en, 'and')
    venue = f'<a href="{e(p["venue_url"])}" target="_blank" rel="noopener noreferrer" {t(en, "fv", p["venue"])}</a>'
    return f'''<dl class="facts">
            <div><dt {t(en, "f_dates", UI["f_dates"])}</dt><dd {t(en, "fd", p["dates"])}</dd></div>
            <div><dt {t(en, "f_place", UI["f_place"])}</dt><dd {t(en, "fp", p["place"])}</dd></div>
            <div><dt {t(en, "f_countries", UI["f_countries"])}</dt><dd data-i18n="fc">{e(join_list(c_sk, "a"))}</dd></div>
            <div><dt {t(en, "f_who", UI["f_who"])}</dt><dd {t(en, "fw", p["who"])}</dd></div>
            <div><dt {t(en, "f_venue", UI["f_venue"])}</dt><dd>{venue}</dd></div>
          </dl>'''

# ---------------------------------------------------------------------------------------------------------
def project_page(i, p, photos):
    en = {}
    prev_p, next_p = PROJECTS[i - 1] if i > 0 else None, PROJECTS[i + 1] if i + 1 < len(PROJECTS) else None
    cover = photos[p['cover']]
    title = p['title'] + (f'<span class="soft">: {e(p["subtitle"])}</span>' if p.get('subtitle') else '')
    tags = ''.join(f'<span {t(en, f"tag{j}", tg)}</span>' for j, tg in enumerate(p['tags']))
    n = len(photos)
    pc_sk, pc_en = plural_photos(n)
    en['pcount'] = pc_en
    thumbs = '\n'.join(
        f'            <a href="{ph["big"]}" data-full="{ph["big"]}"><img src="{ph["small"]}" alt="{e(p["title"])}, {k}/{n}" width="{ph["w"]}" height="{ph["h"]}" loading="{"eager" if k <= 3 else "lazy"}" decoding="async"></a>'
        for k, ph in enumerate(photos, 1))
    chapters = '\n'.join(
        f'''            <article class="reveal"><h3 {t(en, f"c{j}t", ch[0])}</h3><p {t(en, f"c{j}p", ch[1])}</p></article>'''
        for j, ch in enumerate(p['story']))
    mats = ''
    if p.get('drive'):
        mats += f'<a class="btn btn--dark" href="{e(p["drive"])}" target="_blank" rel="noopener noreferrer"><span {t(en, "materials", UI["materials"])}</span><span class="btn__arrow" aria-hidden="true">↗</span></a>\n          '
    mats += f'<a class="link" href="../../Projekty/{e(p["folder"])}/{e(p["infopack"])}" target="_blank" rel="noopener"><span {t(en, "infopack", UI["infopack"])}</span> <span aria-hidden="true">↗</span></a>'

    def nav_link(q, cls, label_key):
        qp = make_photos(q)[q['cover']]
        return f'<a class="{cls}" href="{q["slug"]}.html"><img src="{qp["small"]}" alt="" loading="lazy"><span><small {t(en, label_key, UI[label_key])}</small><strong>{e(q["title"])}</strong></span></a>'
    pnext = ''
    if prev_p or next_p:
        pnext = '<nav class="pnext" aria-label="Projekty">' + (nav_link(prev_p, 'is-prev', 'prev') if prev_p else '<span></span>') + (nav_link(next_p, 'is-next', 'next') if next_p else '') + '</nav>'

    body = f'''
  <main id="main">
    <section class="pcover">
      <img src="{cover["big"]}" alt="" fetchpriority="high">
      <div class="pcover__copy">
        <a class="crumb" href="index.html"><span aria-hidden="true">←</span> <span {t(en, "all", UI["all"])}</span></a>
        <p class="label label--light" style="margin-bottom:14px"><span {t(en, "kind", UI["kind"])}</span></p>
        <h1>{title}</h1>
        <p class="pmeta"><span {t(en, "md", p["dates"])}</span><span {t(en, "mp", p["place"])}</span></p>
        <div class="tags">{tags}</div>
      </div>
    </section>

    <section class="paper pintro" data-paper-start>
      <div class="wrap pintro__grid">
        <p class="plead" {t(en, "lead", p["lead"])}</p>
        <div>
          {facts(en, p)}
          <img class="eu-funded" src="../img/eu-cofunded.png" alt="Co-funded by the European Union" width="320" height="68" loading="lazy">
        </div>
      </div>
    </section>

    <section class="paper pgallery" aria-labelledby="photos-title">
      <div class="wrap">
        <div class="pgallery__head">
          <p class="label" id="photos-title"><span {t(en, "photos", UI["photos"])}</span></p>
          <span class="pgallery__count" data-i18n="pcount">{e(pc_sk)}</span>
        </div>
        <div class="photos{" photos--few" if n <= 4 else ""}">
{thumbs}
        </div>
        <div class="materials">
          {mats}
        </div>
      </div>
    </section>

    <section class="section paper paper--deep pstory">
      <div class="wrap pstory__grid">
        <div>
          <p class="label"><span {t(en, "story_label", UI["story_label"])}</span></p>
          <h2>{e(p["title"])}</h2>
        </div>
        <div class="chapters">
{chapters}
        </div>
      </div>
    </section>

    <div class="paper">{pnext}</div>
'''
    lightbox = f'''
  <dialog class="lightbox" aria-label="{e(p["title"])}">
    <div class="lightbox__bar">
      <span class="lightbox__title">{e(p["title"])}</span>
      <span class="lightbox__count" aria-live="polite"></span>
      <button class="lightbox__close" type="button" aria-label="Zavrieť" data-i18n-aria="lb_close">×</button>
    </div>
    <div class="lightbox__stage"><img alt=""></div>
    <button class="lightbox__prev" type="button" aria-label="Predchádzajúca fotka" data-i18n-aria="lb_prev">←</button>
    <button class="lightbox__next" type="button" aria-label="Ďalšia fotka" data-i18n-aria="lb_next">→</button>
  </dialog>'''
    en['lb_close'], en['lb_prev'], en['lb_next'] = UI['lb_close'][1], UI['lb_prev'][1], UI['lb_next'][1]
    desc = p['lead'][0]
    page = head(p['title'], desc) + body + foot(en, '\n  <script src="../js/gallery.js" defer></script>').replace('  </main>\n', '  </main>\n' + lightbox + '\n', 1)
    with open(os.path.join(OUT, p['slug'] + '.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(page)

# ---------------------------------------------------------------------------------------------------------
def overview(all_photos):
    en = {}
    rows = []
    for i, p in enumerate(PROJECTS):
        ph = all_photos[p['slug']]
        picks = [ph[p['cover']]] + [x for k, x in enumerate(ph) if k != p['cover']][:2]
        imgs = ''.join(f'<span><img src="{x["small"]}" alt="" loading="{"eager" if i == 0 else "lazy"}" decoding="async"></span>' for x in picks)
        tags = ''.join(f'<span {t(en, f"t{i}_{j}", tg)}</span>' for j, tg in enumerate(p['tags']))
        pc, cc = plural_photos(len(ph)), plural_countries(len(p['countries'][0]))
        en[f'n{i}'] = f'{cc[1]} · {pc[1]}'
        title = p['title'] + (f': {p["subtitle"]}' if p.get('subtitle') else '')
        rows.append(f'''        <a class="prow reveal" href="{p["slug"]}.html">
          <div class="prow__photos{" prow__photos--one" if len(picks) == 1 else ""}">{imgs}</div>
          <div>
            <div class="ptags">{tags}</div>
            <h2>{e(title)}</h2>
            <p class="prow__meta"><span {t(en, f"d{i}", p["dates"])}</span> · <span {t(en, f"p{i}", p["place"])}</span></p>
            <p class="prow__lead" {t(en, f"l{i}", p["lead"])}</p>
            <div class="prow__more"><span class="link"><span {t(en, "view", UI["view"])}</span> <span aria-hidden="true">→</span></span><span class="prow__count" data-i18n="n{i}">{e(cc[0] + " · " + pc[0])}</span></div>
          </div>
        </a>''')
    body = f'''
  <main id="main">
    <section class="phead" data-dark-start>
      <div class="wrap">
        <p class="label label--light"><span {t(en, "ov_label", ("Projekty", "Projects"))}</span></p>
        <h1 {t(en, "ov_title", ("Kde sme už boli.", "Where we have been."))}</h1>
        <p class="body body--light" {t(en, "ov_p", ("Mládežnícke výmeny Erasmus+, na ktorých sa naši mladí zúčastnili, doma v Košiciach aj po Európe. Každá je týždeň učenia, tvorenia a nových priateľstiev.", "Erasmus+ youth exchanges our young people have taken part in, at home in Košice and across Europe. Each one is a week of learning, making and new friends."))}</p>
      </div>
    </section>

    <section class="section paper" data-paper-start>
      <div class="wrap">
        <div class="plist">
{chr(10).join(rows)}
        </div>
        <div class="pnextcall reveal">
          <div>
            <p class="ptags"><span {t(en, "nc_tag", ("Ďalšia výzva", "Next call"))}</span></p>
            <h2 {t(en, "nc_t", ("Tu môže byť tvoja výmena.", "Your exchange could be here."))}</h2>
            <p {t(en, "nc_p", ("Momentálne nie je otvorená žiadna výzva. Nové oznamujeme na Instagrame.", "No call is open at the moment. We announce new ones on Instagram."))}</p>
          </div>
          <a class="btn btn--dark" href="https://www.instagram.com/mladavlna/" target="_blank" rel="noopener noreferrer">Instagram<span class="btn__arrow" aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
'''
    page = head('Projekty', 'Mládežnícke výmeny Erasmus+, na ktorých sa zúčastnili mladí z Mladej Vlny.') + body + foot(en)
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(page)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    all_photos = {}
    for p in PROJECTS:
        all_photos[p['slug']] = make_photos(p)
    for i, p in enumerate(PROJECTS):
        project_page(i, p, all_photos[p['slug']])
    overview(all_photos)
    print('built', len(PROJECTS), 'project pages and the overview in', OUT)
