StageDeck Windows 0.5.6 / Mac 0.5.1 — ekrani, samostalan rad i nazivi

EKRANI
Klikni „Ekrani“ u gornjem delu aplikacije.
Svaki priključeni monitor ima broj, naziv i rezoluciju. „Identifikuj ekrane“ prikazuje iste brojeve na fizičkim ekranima.
Za svaki od najviše tri ekrana izaberi:
- Samo kontrole: bez projekcije sa StageDecka.
- Notes: živi prikaz izvornog PowerPoint Presenter Viewa sa beleškama.
- Slajdovi: živi prikaz PowerPoint slajdova za publiku.
Ista uloga može biti na jednom, dva ili sva tri ekrana. Na primer laptop → Samo kontrole, ekran 2 → Notes, ekran 3 → Slajdovi.
Raspored se pamti. Tokom aktivne prezentacije je zaključan; prvo zatvori prikaz da ga izmeniš.
Ako nijedan izlaz nije izabran, prezentacija se ne pokreće. Ako dodeljeni ekran nije povezan, aplikacija ne preusmerava sadržaj na drugi ekran.
Prikazi pokrivaju izabrani monitor i čuvaju proporcije sadržaja; različiti odnosi stranica daju crne trake umesto isecanja.
PDF podržava više istovremenih Slajdovi izlaza. Ekrani dodeljeni Notes ulozi ostaju bez PDF projekcije; ne moraš da menjaš raspored kad pređeš sa PowerPointa na PDF. Potreban je bar jedan Slajdovi ekran.

BEZ STREAM DECKA
Stream Deck nije potreban. Ubaci fajl i klikni njegovu sliku da je izabereš. Prezentacija kreće tek kada pritisneš GO. Klik ili dvoklik na karticu ne pokreće i ne zaustavlja prikaz.
Za završetak koristi Zatvori. Dugmad levo/desno menjaju slajdove. Stream Deck taster zadržava pokretanje i potpuno zatvaranje jednim pritiskom.
Ako su svi monitori zauzeti izlazima, pomeri miš na izlazu da se pojave „Kontrole“ i „Zatvori“.
Prečica Cmd+Shift+Space (Mac) ili Ctrl+Shift+Space (Windows) vraća glavni prozor sa kontrolama. Escape zaustavlja prikaz.
Notes izlazi su kopije izvornog PowerPoint prozora; za upravljanje koristi StageDeck ili postojeći prezenter/clicker.

DVA NAZIVA
Pri ubacivanju prezentacija automatski dobija naziv fajla, bez nastavka .pptx/.pdf.
Klik na naziv ispod slike menja ime u aplikaciji: Enter čuva, Escape odustaje.
Klik na mali red sa ikonicom tastature otvara „Natpis na tasteru“. Dostupno je i desnim klikom.
Tu možeš upisati N23, GOVORNIK 1 ili nekoliko redova. Izaberi Samo tekst za krupan natpis preko celog tastera ili Slika + tekst za pregled prezentacije. Slova imaju Auto i veličine do 64 px; duži natpis se smanjuje da stane. Pregled pokazuje stvarni izgled pre čuvanja.
Puni naziv prezentacije u aplikaciji ostaje sačuvan. Natpis se odmah prikazuje i na kartici i na Stream Decku, ako je povezan.
„Vrati naziv“ uklanja poseban natpis i ponovo koristi naziv iz aplikacije.
Originalni fajl se ne preimenuje. Zaključan raspored moraš otključati za izmene.

MAC INSTALACIJA I DOZVOLE
Otvori StageDeck.dmg i prevuci StageDeck u Applications.
Paket podržava Intel i Apple Silicon uz macOS 13 ili noviji; razvojni alati nisu potrebni.
Ikonica se pravi i na radnoj površini. Svetla/tamna tema biraju se dole levo.
Za kontrolu PowerPointa potrebni su Automation i Accessibility. Za raspoređivanje živih PowerPoint prikaza potrebna je dozvola za StageDeck u System Settings → Privacy & Security → Screen & System Audio Recording (na starijim sistemima Screen Recording).
Kopiraju se isključivo prozori izabranog PowerPoint dokumenta. Slike ostaju lokalno; nema slanja na server ili drugi računar. Zvuk reprodukuje sam PowerPoint, jednom.
Mac izdanje koristi stalan lokalni sertifikat za potpisivanje. Buduće verzije koriste isti identitet, da svaka izmena ne bi poništavala dozvole. Sertifikat nije sistemski instaliran kao pouzdan koren i izdanje nema Apple Developer ID/notarizaciju. Prva instalacija i dalje zahteva standardna macOS odobrenja.

WINDOWS
Pokreni Install-StageDeck.cmd (ili StageDeck-Setup.exe za ručnu instalaciju). Instalacija pravi desktop i Start meni prečice.
Potreban je Windows 10/11 x64 i desktop Microsoft PowerPoint. Windows PowerShell se koristi za COM integraciju.
Windows 0.5.2 čeka spremnost Presenter View prozora do 15 sekundi, proverava položaje izvornih prozora i ponavlja Office pozive kada je PowerPoint zauzet. Negativni 32-bitni HWND identifikatori pravilno se povezuju sa Windows izlazom. Ako se greška ponovi, Podešavanja → Kopiraj detalje kopira fazu greške, Office odgovor i stanje dodatka; token veze se ne kopira.
Windows 0.5.6 podržava i Office COM objekte koji nemaju HWND svojstvo: stvarni prozori se povezuju sa izabranim dokumentom i geometrijom slideshowa. Na Windows 11 23H2 računaru sa dva 1920×1080 monitora potvrđeni su PowerPoint 2010 x64, slajdovi, izvorni Presenter View sa beleškama, navigacija i potpuno zatvaranje. Ovo ne potvrđuje druge Office verzije, druga skaliranja ili firmin laptop; pre događaja proveri isti paket na tom računaru.
Za stvarnu proveru otvori resources\validation\Proveri Windows.cmd u instalacionom folderu StageDecka. Test koristi zasebnu biblioteku i test prezentaciju: proverava izbor + GO, krupan natpis, stvarni PowerPoint, promenu slike na izlazima, zatvaranje i Stream Deck protokol. Privremeno zauzima ekrane; ne pokreći ga tokom događaja. Izveštaj StageDeck-provera-*.json ostaje na Desktopu. Ova provera sama ne potvrđuje sve verzije Windowsa i rasporede monitora.
Izdanje nema komercijalni Windows potpis.

OPCIONI STREAM DECK
Instaliraj zvaničnu Elgato Stream Deck aplikaciju 6.6 ili noviju.
U StageDeck podešavanjima izaberi Instaliraj dodatak, pa potvrdi instalaciju u Elgato aplikaciji. Zatim uvezi StageDeck XL profil.
Windows 0.5.6 dodatak je samostalan Windows program i ne traži Node.js ni preuzimanje Node runtimea iz Elgata. Posle ažuriranja StageDecka instaliraj i NOVI dodatak iz novog Elgato foldera / Podešavanja, potvrdi Update u Stream Decku i izaberi StageDeck XL profil. Profil sadrži svih 32 tastera i automatski se nudi pri instalaciji dodatka. Veza, prijem 32 slike, fizički pritisci i odgovori beleže se u APPDATA\StageDeck\streamdeck-plugin.log; tokeni i sadržaj prezentacija se ne zapisuju.
Dodatak i profil su u oba paketa. Postojeći profili se ne brišu.
Aplikacija i dodatak rade lokalno, bez naloga i interneta.

PODACI I PROVERA
Postojeće prezentacije, nazivi i raspored ostaju u StageDeck folderu u Application Support (Mac) ili APPDATA (Windows).
LIVE potvrđuje aktivnu PowerPoint prezentaciju i spremne izlaze u aplikaciji; ne proverava izlaz eksternog video miksera.
Na ovom Macu provereno je svih 27 izbora za tri priključena monitora: 26 aktivnih rasporeda i odbijanje rasporeda bez izlaza. Proverene su promene stvarnih kadrova na izlazima i potpuno zatvaranje. Izveštaj je u role-matrix-report.json.

JEZIK
Engleski je podrazumevan. U Settings → Language izaberi Srpski. Izbor se pamti i ne menja tvoje nazive, prezentacije ili raspored.
Tamna tema je podrazumevana na novoj instalaciji. Svetlu možeš da izabereš dole levo.
