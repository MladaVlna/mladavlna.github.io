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
    # Lead and chapters condensed from the project's full write-up, given by the owner on 16 November 2026.
    lead=('Sedem dní na prelome rokov s mladými zo Slovenska, Poľska, Rumunska a Bulharska o tom, čo sa skrýva za oblečením, ktoré nosíme: koľko rýchla móda naozaj stojí planétu aj ľudí, ktorí ho šijú, a ako to môže zmeniť kreativita, digitálne nástroje a každodenné rozhodnutia.',
          'Seven days around the turn of the year with young people from Slovakia, Poland, Romania and Bulgaria, looking beyond the clothes we wear: what fast fashion really costs the planet and the people who make it, and how creativity, digital tools and everyday choices can change it.'),
    story=[
      (('Jeden medzinárodný tím', 'One international team'),
       ('Výmena sa začala teambuildingom, energizérmi a skupinovými výzvami. Účastníci sa učili komunikovať cez jazykové bariéry, počúvať odlišné pohľady a spolupracovať s ľuďmi, ktorých práve spoznali. Zo skupiny zo štyroch krajín sa čoskoro stal jeden tím, ktorý spájala zvedavosť a chuť niečo zmeniť.',
        'The exchange began with teambuilding, energisers and group challenges. Participants learned to communicate across language barriers, listen to different views and cooperate with people they had only just met. A group from four countries soon became one team, united by curiosity and a wish to change things.')),
      (('Za visačkou', 'Behind the label'),
       ('Cesta trička či rifieľ sa pri nákupe ľahko stratí z dohľadu. Na workshopoch a v diskusiách ju účastníci sledovali a skúmali environmentálnu a sociálnu stránku rýchlej módy. Namiesto hotových odpovedí systém spochybňovali sami, aj vlastné zvyky: kupujem, lebo niečo potrebujem, alebo preto, že to káže trend?',
        'The journey of a T-shirt or a pair of jeans is easy to miss when you buy it. In workshops and discussions, participants traced it and looked at the environmental and social side of fast fashion. Instead of being handed answers, they questioned the system themselves, and their own habits: am I buying this because I need it, or because a trend says so?')),
      (('Učenie hrou', 'Learning by playing'),
       ('Namiesto prednášok simulačné hry ukázali módu z oboch strán, z pohľadu výroby aj spotreby. Účastníci sa museli spoločne rozhodovať, vážiť dôsledky a zistiť, ako sa môžu environmentálne, ekonomické a sociálne záujmy dostať do sporu. Učili sa vytvoriť si vlastný názor, nie memorovať fakty.',
        'Instead of lectures, simulation games showed fashion from both sides, production and consumption. Participants had to decide together, weigh the consequences and find out how environmental, economic and social interests can clash. They learned to form their own opinions rather than memorise facts.')),
      (('Druhý život oblečenia', 'A second life for clothes'),
       ('Udržateľnosť neznamená vzdať sa vlastného štýlu. Skupina skúmala opravy, opätovné nosenie a prerábanie oblečenia a kládla si jednoduchú otázku: musí byť každý nový outfit naozaj nový? Keď oblečenie berieme ako zdroj, nie ako vec na jedno použitie, starý kúsok sa dá opraviť, prerobiť alebo mu dať nový účel namiesto toho, aby skončil ako odpad.',
        'Sustainability does not mean giving up your style. The group looked at repairing, reusing and redesigning clothes, asking a simple question: does every new outfit really have to be new? Treated as a resource rather than something disposable, an old piece can be repaired, remade or given a new purpose instead of becoming waste.')),
      (('Swap 2. januára', 'The swap on 2 January'),
       ('Najviditeľnejším výsledkom týždňa bol náš clothes swap 2. januára. Účastníci vytvorili prvé zásoby z vlastných šatníkov, vymysleli pre návštevníkov jednoduché hry a navzájom sa pripravili na to, ako deň zorganizovať a ako sa s ľuďmi rozprávať. Splnili sme cieľ aspoň 100 návštevníkov: prišli mamy s deťmi, starší obyvatelia, študenti aj ľudia, ktorí sami majú menej príležitostí. Viacerí sa pýtali, či sa swap zopakuje, a niektorí účastníci si domov odniesli oblečenie z druhej ruky. Zvyšok, šesť 100-litrových a päť 60-litrových vriec oblečenia a vrece detských hračiek a kníh, sme darovali Gréckokatolíckej eparchiálnej charite. Niekoľko ľudí z okolia sa po akcii ozvalo, že chcú darovať ďalšie veci.',
        'The clearest result of the week was our clothes swap on 2 January. Participants built the first stock from their own wardrobes, designed simple games for visitors and briefed each other on running the day and talking to people. We reached our target of at least 100 visitors: mothers with children, older residents, students and people facing fewer opportunities themselves. Several asked whether it would happen again, and some participants went home with second-hand finds of their own. What was left, six 100-litre and five 60-litre bags of clothes plus a bag of children\'s toys and books, went to the Gréckokatolícka eparchiálna charita (Greek Catholic Eparchial Charity). A few local people got in touch afterwards to donate more.')),
      (('AI pre osvetu', 'AI for awareness'),
       ('V medzinárodných tímoch účastníci využili nástroje umelej inteligencie a premenili to, čo sa naučili, na osvetové kampane o rýchlej móde. Rozhodovali, ktoré posolstvá sú najdôležitejšie a ako zložitú tému podať jasne a pútavo. Stali sa tak aj komunikátormi a videli, že technológie môžu slúžiť dobrej veci, nielen zábave.',
        'In international teams, participants used AI tools to turn what they had learned into awareness campaigns about fast fashion. They decided which messages mattered most and how to make a complex topic clear and attractive. They became communicators as well as learners, and saw technology used for a purpose, not just for entertainment.')),
      (('Zručnosti na doma', 'Skills to take home'),
       ('Účastníci si domov odniesli zelené, digitálne aj sociálne zručnosti: hlbšie porozumenie zodpovednej spotrebe, nové spôsoby tvorivého využitia AI a komunikáciu, vedenie a riešenie problémov, ktoré prináša deľba práce, riešenie nezhôd a spoločné výsledky v multikultúrnom tíme.',
        'Participants went home with green, digital and social skills: a deeper understanding of responsible consumption, new ways to use AI creatively, and the communication, leadership and problem-solving that come from sharing out work, settling disagreements and building common results in a multicultural team.')),
      (('Štyri kultúry', 'Four cultures'),
       ('Jedlo, hudba, hry a tradície zo Slovenska, Poľska, Rumunska a Bulharska naplnili medzikultúrne večery aj chvíle medzi programom. Počuť o inej krajine od rovesníkov, nie z obrazovky či učebnice, búralo stereotypy a menilo sa na priateľstvá cez hranice.',
        'Food, music, games and traditions from Slovakia, Poland, Romania and Bulgaria filled the intercultural evenings and the moments in between. Hearing about another country from people your own age, not from a screen or a textbook, broke down stereotypes and turned into friendships across borders.')),
      (('Nový rok spolu', 'A new year together'),
       ('Výmena trvala od 27. decembra do 4. januára, a tak mladí zo štyroch krajín privítali nový rok spolu. Nový rok býva časom nových začiatkov a projekt pozval každého zamyslieť sa, ktoré zvyky chce zmeniť, nielen sám za seba, ale aj ako generácia, ktorá čelí rovnakým environmentálnym výzvam.',
        'Running from 27 December to 4 January, the exchange let young people from four countries welcome the new year together. A new year is a time for new beginnings, and the project invited everyone to think about which habits they want to change, not only on their own but as a generation facing the same environmental challenges.')),
      (('Od nápadov k činom', 'From ideas to action'),
       ('Uvážlivejší výber oblečenia, dlhšie nosenie, organizovanie swapov či rozhovory s rodinou a priateľmi sa môžu zdať ako malé kroky, no keď sa opakujú v celých komunitách, ich vplyv rastie. Účastníci odchádzali s vedomím, že nie sú len spotrebitelia, ale aktívni občania, a že zmena sa môže začať niečím takým obyčajným, ako je oblečenie, ktoré si vyberáme.',
        'Choosing clothes more carefully, wearing them longer, organising swaps and talking to friends and family can look like small steps, but repeated across communities they add up. Participants left seeing themselves not just as consumers but as active citizens, knowing that change can start with something as ordinary as the clothes we choose to wear.')),
    ],
    # swap1-5: the clothes swap on 2 January 2026, in the order they were taken (owner, 16 November 2026).
    photos=['image4.jpg', 'image1.jpg', 'image2.jpg', 'image3.jpg', 'image5.jpg', 'image6.jpg', 'image8.jpg', 'image9.jpg', 'image10.jpg', 'image7.jpg', 'image11.jpg', 'swap1.jpg', 'swap2.jpg', 'swap3.jpg', 'swap4.jpg', 'swap5.jpg'], cover=0,
    infopack=None, drive='https://drive.google.com/drive/u/1/folders/10iM9XoiMdyGh3-rM8H0AdbNKT35-HJ4l',   # info pack link removed (owner, 16 November 2026)
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
    tags=[('Ľudské práva', 'Human rights'), ('Digitálne zručnosti', 'Digital skills')],
    dates=('14.–21. júna 2025', '14–21 June 2025'), short=('06/2025', '06/2025'),
    place=('Stara Zagora, Bulharsko', 'Stara Zagora, Bulgaria'),
    countries=(['Bulharsko', 'Rumunsko', 'Poľsko', 'Slovensko'], ['Bulgaria', 'Romania', 'Poland', 'Slovakia']),
    who=('5 účastníkov a 1 vedúci skupiny z každej krajiny, vo veku 18–30 rokov', '5 participants and 1 group leader from each country, aged 18–30'),
    venue=('Youtopia, Stara Zagora', 'Youtopia, Stara Zagora'), venue_url='https://www.youtopiariverside.com/gallery/',
    # Text from the host's project page (C.E.T. Platform Bulgaria), given by the owner on 16 November 2026.
    lead=('Týždeň v Starej Zagore u C.E.T. Platform Bulgaria o ľudských právach v digitálnom svete: ako rozoznať dezinformácie a obsah vytvorený umelou inteligenciou, ako sa postaviť za práva iných a ako to všetko premeniť na hry pre ďalších mladých.',
          'A week in Stara Zagora, hosted by C.E.T. Platform Bulgaria, about human rights in a digital world: how to spot misinformation and AI-made content, how to stand up for other people\'s rights, and how to turn it all into games for other young people.'),
    story=[
      (('Práva, ktoré cítiš', 'Rights you can feel'),
       ('Cez fórum divadlo a Divadlo utláčaných sme hrali situácie, v ktorých niekto prichádza o svoje práva, a potom sme do scény vstupovali, aby sme zmenili jej koniec. K tomu patrili štruktúrované debaty, v ktorých sme za práva museli argumentovať.',
        'Through forum theatre and the Theatre of the Oppressed, we acted out situations where someone\'s rights are violated, then stepped into the scene to change how it ends. Structured debates made us argue for those rights in our own words.')),
      (('Ako odhaliť fejk', 'Spotting the fake'),
       ('Praktické cvičenia digitálnej gramotnosti nás naučili rozoznať falošné správy, dezinformácie a obsah vytvorený umelou inteligenciou a ukázali, ako deepfaky a manipulácia na internete ovplyvňujú, čomu veria celé spoločnosti.',
        'Hands-on digital literacy exercises showed us how to recognise fake news, misinformation and content made by AI, and how deepfakes and online manipulation shape what whole societies believe.')),
      (('Hry, ktoré sme vymysleli', 'Games we made ourselves'),
       ('V tímoch sme navrhli vlastné hry a workshopy o ľudských právach, napríklad „Guess my Right“, v ktorej treba otázkami uhádnuť ľudské právo. Po výmene ich dokončili a zverejnili online, aby ich mohli používať pracovníci s mládežou a pedagógovia po celej Európe.',
        'In teams we designed our own human rights games and workshops, such as “Guess my Right”, where you identify a human right by asking questions. After the exchange they were finished and published online for youth workers and educators across Europe to use.')),
      (('Štyri krajiny pri jednom stole', 'Four countries, one table'),
       ('Každé ráno začalo raňajkami v duchu jednej z krajín a večery patrili kultúrnym programom. Spolu sme si prezreli pamiatky Starej Zagory a týždeň sme uzavreli reflexiou o tom, čo sme sa naučili, a certifikátmi Youthpass.',
        'Every morning began with a breakfast themed on one of the countries, and the evenings were cultural nights. We explored Stara Zagora\'s heritage sites together, and closed the week by reflecting on what we had learned for our Youthpass certificates.')),
    ],
    # photo4-6 (forum theatre, the Slovak team's evening, Youthpass certificates): added by the owner on 16 November 2026.
    photos=['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg', 'photo5.jpg', 'photo6.jpg'], cover=0,
    infopack=None, drive=None,   # the info pack is not public (owner, 16 November 2026)
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

def head(title_sk, desc, projects='index.html'):
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
  <link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@600;700;800&family=Inter+Tight:wght@400;500;600&display=swap" rel="stylesheet">
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
      <a href="../about/index.html" data-i18n="nav_about">O nás</a>
      <a href="{projects}" data-i18n="nav_projects">Projekty</a>
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
      <p><a href="../about/index.html#documents" data-i18n="docs">Dokumenty</a><br><a href="../projects/index.html" data-i18n="nav_projects">Projekty</a></p>
    </div>
    <p class="wrap foot__note">© 2026 Mladá Vlna</p>
  </footer>

  <script>window.PAGE_EN = {json.dumps(en, ensure_ascii=False)};</script>
  <script src="https://unpkg.com/lenis@1.1.13/dist/lenis.min.js" defer></script>
  <script src="../js/home2.js" defer></script>{extra_scripts}
</body>
</html>
'''

# ---------------------------------------------------------------------------------------------------------
# Flags for the "Countries" fact (owner, 16 November 2026: flags instead of names). Flat, simplified flags
# drawn as small inline SVGs (30 x 20), so they stay sharp on any screen. The country's name is the flag's
# accessible label (Slovak in the HTML, English in window.PAGE_EN).
import math

def _star(cx, cy, r, rot=-90):
    pts = []
    for i in range(10):
        a = math.radians(rot + i * 36)
        rr = r if i % 2 == 0 else r * 0.4
        pts.append(f'{cx + rr * math.cos(a):.2f},{cy + rr * math.sin(a):.2f}')
    return ' '.join(pts)

def _stripes(colors, vertical=False):
    n = len(colors)
    if vertical:
        return ''.join(f'<rect x="{30 * i / n:.3f}" y="0" width="{30 / n + 0.02:.3f}" height="20" fill="{c}"/>' for i, c in enumerate(colors))
    return ''.join(f'<rect x="0" y="{20 * i / n:.3f}" width="30" height="{20 / n + 0.02:.3f}" fill="{c}"/>' for i, c in enumerate(colors))

def _checks():                                                     # Croatia's red and white chequy shield
    out = []
    for r in range(5):
        for c in range(5):
            out.append(f'<rect x="{12.5 + c}" y="{5.6 + r * 1.2:.2f}" width="1" height="1.2" fill="{"#ff0000" if (r + c) % 2 == 0 else "#fff"}"/>')
    return ''.join(out)

def _shield(x, y, w, h):
    hw = w / 2
    return f'M{x} {y}h{w}v{h * 0.55:.2f}c0 {h * 0.3:.2f} -{hw:.2f} {h * 0.45:.2f} -{hw:.2f} {h * 0.45:.2f}S{x} {y + h * 0.85:.2f} {x} {y + h * 0.55:.2f}Z'

FLAGS = {
  'sk': _stripes(['#fff', '#0b4ea2', '#ee1c25'])
        + f'<clipPath id="fl-sk"><path d="{_shield(7, 4.4, 6.6, 11)}"/></clipPath>'
        + f'<path d="{_shield(7, 4.4, 6.6, 11)}" fill="#ee1c25" stroke="#fff" stroke-width="0.7"/>'
        + '<g clip-path="url(#fl-sk)"><path d="M6.5 15.6 Q8.6 11.6 10.3 13.4 Q12 11.6 14.1 15.6Z" fill="#0b4ea2"/></g>'
        + '<path d="M10 6.2h0.6v6.6h-0.6Z M8.6 7.6h3.4v0.55h-3.4Z M8.1 9.2h4.4v0.6h-4.4Z" fill="#fff"/>',
  'pl': _stripes(['#fff', '#dc143c']),
  'hu': _stripes(['#cd2a3e', '#fff', '#436f4d']),
  'ro': _stripes(['#002b7f', '#fcd116', '#ce1126'], vertical=True),
  'bg': _stripes(['#fff', '#00966e', '#d62612']),
  'nl': _stripes(['#ae1c28', '#fff', '#21468b']),
  'hr': _stripes(['#ff0000', '#fff', '#171796'])
        + f'<clipPath id="fl-hr"><path d="{_shield(12.5, 5.6, 5, 8)}"/></clipPath>'
        + '<g clip-path="url(#fl-hr)">' + _checks() + '</g>'
        + f'<path d="{_shield(12.5, 5.6, 5, 8)}" fill="none" stroke="#fff" stroke-width="0.5"/>',
  'rs': _stripes(['#c6363c', '#0c4076', '#fff'])
        + f'<path d="{_shield(7.2, 4.6, 5, 7.6)}" fill="#c6363c" stroke="#fff" stroke-width="0.6"/>'
        + '<path d="M9.45 6.2h0.5v4.2h-0.5Z M8.2 7.6h3v0.5h-3Z" fill="#fff"/>'
        + '<path d="M7.6 4.3l0.5-1.4 0.9 0.9 0.7-1.3 0.7 1.3 0.9-0.9 0.5 1.4Z" fill="#e7b416"/>',   # the crown sets it apart from Slovakia
  'tr': '<rect width="30" height="20" fill="#e30a17"/><circle cx="11" cy="10" r="5" fill="#fff"/><circle cx="12.25" cy="10" r="4" fill="#e30a17"/>'
        + f'<polygon points="{_star(16.6, 10, 2.05, rot=180)}" fill="#fff"/>',
}
FLAG_CODE = {'Slovakia': 'sk', 'Poland': 'pl', 'Hungary': 'hu', 'Romania': 'ro', 'Bulgaria': 'bg', 'Croatia': 'hr',
             'the Netherlands': 'nl', 'Netherlands': 'nl', 'Serbia': 'rs', 'Turkey': 'tr'}

def flags_html(en, p):
    c_sk, c_en = p['countries']
    out = []
    for sk, en_name in zip(c_sk, c_en):
        code = FLAG_CODE[en_name]
        en['fl_' + code] = en_name
        out.append(f'<span class="flag" role="img" aria-label="{e(sk)}" data-i18n-aria="fl_{code}"><svg viewBox="0 0 30 20" aria-hidden="true" focusable="false">{FLAGS[code]}</svg></span>')
    return '<span class="flags">' + ''.join(out) + '</span>'

def facts(en, p, prefix=''):
    venue = f'<a href="{e(p["venue_url"])}" target="_blank" rel="noopener noreferrer" {t(en, "fv", p["venue"])}</a>'
    return f'''<dl class="facts">
            <div><dt {t(en, "f_dates", UI["f_dates"])}</dt><dd {t(en, "fd", p["dates"])}</dd></div>
            <div><dt {t(en, "f_place", UI["f_place"])}</dt><dd {t(en, "fp", p["place"])}</dd></div>
            <div><dt {t(en, "f_countries", UI["f_countries"])}</dt><dd>{flags_html(en, p)}</dd></div>
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
    if p.get('infopack'):
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
{f'''        <div class="materials">
          {mats}
        </div>
''' if mats else ''}      </div>
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

    <div class="paper pnext-wrap">{pnext}</div>
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
        <h1 {t(en, "ov_title", ("Naše aktivity.", "Our activities."))}</h1>
        <p class="body body--light" {t(en, "ov_p", ("Cez aktivity, ktoré organizujeme s podporou Erasmus+ aj vlastnými silami a spolu s partnermi doma aj v zahraničí, spájame mladých ľudí: spolu sa učia, tvoria a nachádzajú priateľstvá cez hranice.", "Through the activities we organise, with Erasmus+ or on our own, and with partners at home and abroad, we bring young people together to learn, create and make friends across borders."))}</p>
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

# ---------------------------------------------------------------------------------------------------------
# The About page (about/index.html). Facts from the old about-us.html, the statutes (Documents/) and the
# homepage; the team is the one on the old site, first names only and no roles (owner, 16 November 2026). Each text is (Slovak, English).
TEAM = [
  dict(name='Lukáš', photo='lukas',
       bio=('Vyštudoval informatiku a pedagogiku na Technickej univerzite v Košiciach, kde je dnes doktorandom a skúma optimalizáciu algoritmov pomocou umelej inteligencie. Prešiel mnohými mládežníckymi výmenami a kurzami Erasmus+ a priniesol si z nich kontakty z celej Európy.',
            'He studied computer science and education at the Technical University of Košice, where he is now a PhD student researching how to optimise algorithms with AI. He has taken part in many Erasmus+ youth exchanges and courses, and brought back contacts from all over Europe.')),
  dict(name='Nikola', photo='nika',
       bio=('Vyštudovala informatiku a pedagogiku na Technickej univerzite v Košiciach a ako doktorandka sa venuje matematike, konkrétne extremálnym algebrám. Vo voľnom čase bicykluje, lyžuje a hrá stolný tenis.',
            'She studied computer science and education at the Technical University of Košice, and as a PhD student researches mathematics, specifically extremal algebras. In her free time she cycles, skis and plays table tennis.')),
  dict(name='Adam', photo='adam',
       bio=('Vyštudoval lesníctvo a ochranu prírody. Rozumie environmentálnej vede, ochrane biodiverzity a udržateľnému hospodáreniu s prírodnými zdrojmi. Venuje sa ekologickej výchove, environmentálnej politike a udržateľným postupom, a preto je oporou našich zelených projektov.',
            'He studied forestry and nature conservation, and knows environmental science, biodiversity protection and sustainable resource management. His fields are ecological education, environmental policy and sustainable practice, which makes him the backbone of our green projects.')),
]

ABOUT_FOCUS = [
  (('Životné prostredie', 'Environment'),
   ('Upratovacie akcie, environmentálna výchova a projekty o zelených iniciatívach, udržateľnom rozvoji a zodpovednej spotrebe.', 'Clean-ups, environmental education, and projects on green initiatives, sustainable development and responsible consumption.')),
  (('Digitálne zručnosti', 'Digital skills'),
   ('AI, vibe coding a 3D tlač ako nástroje učenia a tvorby pre mladých s menšími príležitosťami.', 'AI, vibe coding and 3D printing as tools for learning and making, for young people with fewer opportunities.')),
  (('Duševné zdravie', 'Mental health'),
   ('Bezpečný priestor, kde sa mladí prepájajú, zdieľajú, čím prechádzajú, a zvládajú výzvy spolu.', 'Safe spaces where young people connect, share what they are going through and face challenges together.')),
  (('Medzikultúrny dialóg a začlenenie', 'Intercultural dialogue and inclusion'),
   ('Priestor, kde si mladí z rôznych prostredí vymieňajú nápady a pracujú spolu.', 'Spaces where young people from different backgrounds exchange ideas and work together.')),
  (('Výmeny a školenia Erasmus+', 'Erasmus+ exchanges and training'),
   ('Mládežnícke výmeny pre 13- až 30-ročných a tréningové kurzy pre pracovníkov s mládežou, pedagógov a dobrovoľníkov.', 'Youth exchanges for 13 to 30 year olds, and training courses for youth workers, teachers and volunteers.')),
]
ABOUT_STORY = [
  (('TrashCan', 'TrashCan'),
   ('Lukáš a Nikola dali dokopy skupinu dobrovoľníkov a zorganizovali zber odpadu v jednej slovenskej obci. Z tohto nápadu vyrástla naša environmentálna práca.',
    'Lukáš and Nikola brought together a group of volunteers and organised a litter collection in a Slovak village. Our environmental work grew out of that idea.'), None),
  (('ReToy, naša vlastná výmena', 'ReToy, our own exchange'),
   ('Zorganizovali sme mládežnícku výmenu, na ktorej mladí zo šiestich krajín upratali Košice a z odpadu postavili model inteligentného mesta s hračkami z 3D tlačiarne. Model sme darovali CVČ Domino, kde stojí na hlavnej chodbe.',
    'We organised a youth exchange where young people from six countries cleaned up Košice and built a model smart city from the rubbish, with toys from a 3D printer. We donated the model to the CVČ Domino youth centre, where it stands in the main corridor.'), '../projects/retoy.html'),
  (('Sieť partnerov po Európe', 'Partners across Europe'),
   ('Naši členovia prešli mnohými výmenami, tréningovými kurzami a strategickými partnerstvami Erasmus+. Získali sme sieť európskych partnerov, skúsenosti s riadením projektov a overený spôsob, ako aktivity pripraviť aj vyhodnotiť.',
    'Our members have taken part in many Erasmus+ exchanges, training courses and strategic partnerships. That gave us a network of European partners, experience in managing projects and a tried way of preparing and evaluating activities.'), '../projects/index.html'),
]
# Documents/ in the repository root, linked from the About page (they used to be on the old documents.html).
ABOUT_DOCS = [
  ('LT_Stanovy_20250120.pdf', ('Stanovy občianskeho združenia Mladá Vlna', 'Statutes of Mladá Vlna')),
  ('pozvanka_04_2026.pdf', ('Pozvánka pre členov združenia 04/2026', 'Invitation for members 04/2026')),
  ('pozvanka_04_2025.pdf', ('Pozvánka pre členov združenia 04/2025', 'Invitation for members 04/2025')),
]
ABOUT_VALUES = [
  (('Učíme sa robením', 'We learn by doing'),
   ('Workshopy, hry, simulácie, debaty a práca rukami. Neformálne vzdelávanie, pri ktorom sa učíš skúsenosťou a od ostatných.', 'Workshops, games, simulations, debates and hands-on work. Non-formal education, where you learn from experience and from each other.')),
  (('Vítaný je každý', 'Everyone is welcome'),
   ('Účasť je zadarmo a nemusíš byť študent. Ak nevieš dobre po anglicky, nevadí: cestuješ v slovenskom tíme, ktorý ti pomôže.', 'Taking part is free and you do not need to be a student. If your English is not great, that is fine: you travel in a Slovak team that helps you.')),
  (('Európa za dverami', 'Europe on our doorstep'),
   ('Budujeme priateľstvá a partnerstvá po celej Európe a to, čo sa naučíme, prinášame späť do Košíc a Prešova.', 'We build friendships and partnerships across Europe, and bring what we learn back home to Košice and Prešov.')),
]
ABOUT_TEXT = {
  'ab_label': ('O nás', 'About us'),
  'ab_title': ('Mladí ľudia, ktorí menia východné Slovensko.', 'Young people changing eastern Slovakia.'),
  'ab_lead': ('Mladá Vlna je mládežnícke občianske združenie so sídlom v Prešove. Pomáhame mladým ľuďom byť aktívni vo vlastnej komunite, v Košiciach, Prešove aj v ich okolí.',
              'Mladá Vlna (Youth Wave) is a youth-led civic association based in Prešov. We help young people become active in their own community, in Košice, Prešov and the towns around them.'),
  'who_label': ('Kto sme', 'Who we are'),
  'who_title': ('Zmena začína tam, kde žiješ.', 'Change starts where you live.'),
  'who_p1': ('Preto pracujeme s mladými ľuďmi na východnom Slovensku: staráme sa o miesto, kde žijeme, učíme sa spolu nové zručnosti a sme tu jeden pre druhého.',
             'That is why we work with young people in eastern Slovakia: we look after the place we live in, learn new skills together and are there for each other.'),
  'who_p2': ('Niektoré aktivity robíme vlastnými silami, iné s podporou programu Erasmus+, vždy spolu s partnermi doma aj v zahraničí. Spájame mladých z rôznych miest a krajín, aby sa navzájom inšpirovali.',
             'Some of our activities we run on our own, others with the support of Erasmus+, always together with partners at home and abroad. We bring together young people from different towns and countries so they can inspire each other.'),
  'who_p2b': ('Vytvárame príležitosti pre mladých, študentov, pracovníkov s mládežou aj širokú verejnosť zapojiť sa do medzinárodných projektov, výmen a školení. Veríme v silu vzdelávania a medzikultúrnej spolupráce: účastníci si rozvíjajú kľúčové kompetencie, kreatívne myslenie a jazykové zručnosti a nachádzajú priateľov aj pracovné kontakty po celej Európe.',
              'We create opportunities for young people, students, youth workers and the wider public to take part in international projects, exchanges and training. We believe in the power of education and intercultural cooperation: participants build key competences, creative thinking and language skills, and make friends and professional contacts across Europe.'),
  'who_p3': ('Prednosť dávame mladým ľuďom s menšími príležitosťami: tým, ktorí sa nedostanú často cestovať, vyskúšať nové technológie či byť vypočutí.',
             'We give priority to young people with fewer opportunities: those who rarely get the chance to travel, try new technology or have their voice heard.'),
  'wd_label': ('Čo robíme', 'What we do'),
  'wd_title': ('Päť ciest, jeden cieľ.', 'Five paths, one goal.'),
  'wd_link': ('Naše projekty', 'Our projects'),
  'st_label': ('Čo sme už urobili', 'What we have done'),
  'st_title': ('Od jednej dediny po celú Európu.', 'From one village to all of Europe.'),
  'st_more': ('Viac', 'More'),
  'vl_label': ('Čomu veríme', 'What we believe in'),
  'vl_title': ('Ako pracujeme.', 'How we work.'),
  'tm_label': ('Náš tím', 'Our team'),
  'tm_title': ('Ľudia za Mladou Vlnou.', 'The people behind Mladá Vlna.'),
  'fx_label': ('Združenie v skratke', 'The association at a glance'),
  'fx_lead': ('Oficiálne dokumenty združenia na stiahnutie.', "The association's official documents, to download. They are in Slovak."),
  'fx_docs': ('Dokumenty', 'Documents'),
  'fx_n': ('Názov', 'Name'),
  'fx_f': ('Forma', 'Legal form'), 'fx_fv': ('Občianske združenie', 'Civic association'),
  'fx_s': ('Sídlo', 'Registered office'), 'fx_sv': ('Tomášikova 4856/22, 080 01 Prešov', 'Tomášikova 4856/22, 080 01 Prešov, Slovakia'),
  'fx_a': ('Kde pôsobíme', 'Where we work'), 'fx_av': ('Košice, Prešov a východné Slovensko', 'Košice, Prešov and eastern Slovakia'),
  'fx_p': ('Telefón', 'Phone'),
}

def about():
    en = {}
    T = lambda key: t(en, key, ABOUT_TEXT[key])
    focus_html = '\n'.join(
        f'          <li class="reveal"><strong {t(en, f"af{i}t", a)}</strong><span {t(en, f"af{i}p", b)}</span></li>'
        for i, (a, b) in enumerate(ABOUT_FOCUS))
    story_html = '\n'.join(
        f'          <li class="reveal"><span class="values__no">0{i + 1}</span><h3 {t(en, f"as{i}t", a)}</h3><p {t(en, f"as{i}p", b)}</p>'
        + (f'<p class="values__more"><a class="link" href="{link}"><span {T("st_more")}</span> <span aria-hidden="true">→</span></a></p>' if link else '')
        + '</li>'
        for i, (a, b, link) in enumerate(ABOUT_STORY))
    docs_html = '\n'.join(
        f'            <li><a class="link" href="../../Documents/{f}" target="_blank" rel="noopener"><span {t(en, f"doc{i}", label)}</span> <span class="docs__type">PDF</span></a></li>'
        for i, (f, label) in enumerate(ABOUT_DOCS))
    values_html = '\n'.join(
        f'          <li class="reveal"><span class="values__no">0{i + 1}</span><h3 {t(en, f"av{i}t", a)}</h3><p {t(en, f"av{i}p", b)}</p></li>'
        for i, (a, b) in enumerate(ABOUT_VALUES))
    team_html = '\n'.join(
        '          <li class="reveal">\n'
        f'            <img src="../img/team/{m["photo"]}.webp" alt="{e(m["name"])}" width="720" height="900" loading="lazy" decoding="async">\n'
        f'            <h3>{e(m["name"])}</h3>\n'
        f'            <p {t(en, f"tb{i}", m["bio"])}</p>\n'
        '          </li>'
        for i, m in enumerate(TEAM))
    body = f"""
  <main id="main">
    <section class="phead" data-dark-start>
      <div class="wrap">
        <p class="label label--light"><span {T("ab_label")}</span></p>
        <h1 {T("ab_title")}</h1>
        <p class="body body--light" {T("ab_lead")}</p>
      </div>
    </section>

    <section class="section paper" data-paper-start>
      <div class="wrap pstory__grid">
        <div>
          <p class="label"><span {T("who_label")}</span></p>
          <h2 {T("who_title")}</h2>
        </div>
        <div class="about__text">
          <p class="body" {T("who_p1")}</p>
          <p class="body" {T("who_p2")}</p>
          <p class="body" {T("who_p2b")}</p>
          <p class="body" {T("who_p3")}</p>
        </div>
      </div>
    </section>

    <section class="section paper paper--deep">
      <div class="wrap pstory__grid">
        <div>
          <p class="label"><span {T("wd_label")}</span></p>
          <h2 {T("wd_title")}</h2>
          <p class="proj-all"><a class="link" href="../projects/index.html"><span {T("wd_link")}</span> <span aria-hidden="true">→</span></a></p>
        </div>
        <ul class="tools">
{focus_html}
        </ul>
      </div>
    </section>

    <section class="section paper">
      <div class="wrap">
        <p class="label"><span {T("st_label")}</span></p>
        <h2 {T("st_title")}</h2>
        <ol class="values">
{story_html}
        </ol>
      </div>
    </section>

    <section class="section paper paper--deep">
      <div class="wrap">
        <p class="label"><span {T("vl_label")}</span></p>
        <h2 {T("vl_title")}</h2>
        <ol class="values">
{values_html}
        </ol>
      </div>
    </section>

    <section class="section paper" id="team">
      <div class="wrap">
        <p class="label"><span {T("tm_label")}</span></p>
        <h2 {T("tm_title")}</h2>
        <ul class="team">
{team_html}
        </ul>
      </div>
    </section>

    <section class="section paper paper--deep pnext-wrap" id="documents">
      <div class="wrap pintro__grid">
        <div>
          <p class="label"><span {T("fx_label")}</span></p>
          <h2 class="docs__title" {T("fx_docs")}</h2>
          <p class="body" {T("fx_lead")}</p>
          <ul class="docs">
{docs_html}
          </ul>
        </div>
        <dl class="facts">
          <div><dt {T("fx_n")}</dt><dd>Mladá Vlna, o. z.</dd></div>
          <div><dt {T("fx_f")}</dt><dd {T("fx_fv")}</dd></div>
          <div><dt {T("fx_s")}</dt><dd {T("fx_sv")}</dd></div>
          <div><dt {T("fx_a")}</dt><dd {T("fx_av")}</dd></div>
          <div><dt>E-mail</dt><dd><a href="mailto:contact@mladavlna.org">contact@mladavlna.org</a></dd></div>
          <div><dt {T("fx_p")}</dt><dd><a href="tel:+421918208346">+421 918 208 346</a></dd></div>
        </dl>
      </div>
    </section>
"""
    os.makedirs(os.path.join(SITE, 'about'), exist_ok=True)
    page = head('O nás', 'Mladá Vlna je mládežnícke občianske združenie z Prešova, ktoré pomáha mladým byť aktívni vo vlastnej komunite.', '../projects/index.html') + body + foot(en)
    with open(os.path.join(SITE, 'about', 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(page)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    all_photos = {}
    for p in PROJECTS:
        all_photos[p['slug']] = make_photos(p)
    for i, p in enumerate(PROJECTS):
        project_page(i, p, all_photos[p['slug']])
    overview(all_photos)
    about()
    print('built', len(PROJECTS), 'project pages, the overview and the About page')
