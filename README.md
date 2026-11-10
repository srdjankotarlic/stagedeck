# StageDeck

PowerPoint i PDF prezentacije na jednom mestu. Kontrola iz aplikacije ili sa svih 32 tastera na Elgato Stream Deck XL-u. Radi lokalno, bez naloga i bez interneta tokom događaja.

## Preuzmi

**Windows 0.5.6:** provereno otvaranje i potpuno zatvaranje PowerPoint prozora na stvarnom Windows računaru, sa fizičkim Stream Deck XL-om. Mac paket ostaje proverena verzija **0.5.1**.

| Računar | Kompletan paket | Šta pokrenuti posle raspakivanja |
| --- | --- | --- |
| **Windows 10 / 11 · 64-bit** | **[PREUZMI WINDOWS](https://github.com/srdjankotarlic/stagedeck/releases/latest/download/StageDeck-Windows.zip)** | `INSTALIRAJ SVE.cmd` u raspakovanom folderu |
| **Mac · Intel i Apple Silicon** | **[PREUZMI MAC](https://github.com/srdjankotarlic/stagedeck/releases/latest/download/StageDeck-Mac.zip)** | `StageDeck-Mac/StageDeck.dmg` |

**[Sva izdanja i datoteke →](https://github.com/srdjankotarlic/stagedeck/releases)**

Svaki ZIP sadrži aplikaciju, Elgato dodatak, XL profil i kratko uputstvo. Za korišćenje instalacije preuzmi gornji paket; GitHub dugme „Code → Download ZIP“ preuzima razvojni kod.

Windows 0.5.6 je instaliran i proveren na Windows 11 sa desktop PowerPointom 2010 x64, dva fizička monitora i fizičkim Stream Deck XL-om. Provereni su crveni LIVE, oba pritiska istog tastera, potpuno zatvaranje svih prozora i ponovno otvaranje. Drugi računari i Office verzije zahtevaju svoju proveru; [ovde su merenja i granice provere](docs/VERIFICATION.md). Mac paket nije menjan.

## Instalacija

1. Preuzmi paket za svoj sistem i raspakuj ZIP.
2. Windows: pokreni `INSTALIRAJ SVE.cmd` za aplikaciju i Windows Elgato dodatak. Mac: otvori `StageDeck.dmg` i prevuci StageDeck u Applications.
3. Pokreni StageDeck sa desktop ikonice ili iz Applications / Start menija.
4. Za Stream Deck: instaliraj zvaničnu Elgato aplikaciju. U StageDecku otvori **Podešavanja → Instaliraj dodatak**, zatim uvezi **StageDeck XL profil**. Isti fajlovi su u folderu `Elgato` unutar preuzetog paketa. Postojeći Elgato profili ostaju sačuvani.

Za PowerPoint fajlove potreban je instaliran desktop Microsoft PowerPoint. Cilj za Windows je Microsoft 365 / PowerPoint 2021 ili noviji. PDF radi bez PowerPointa. Mac zahteva macOS 13 ili noviji i pri prvoj instalaciji traži dozvole za kontrolu PowerPointa i lokalni prikaz njegovih prozora. Ova izdanja nemaju Apple notarizaciju / komercijalni Windows potpis; [detalji instalacije i dozvola](INSTALL-SR.md).

## Rad

- Prevuci prezentacije u mrežu; naziv se preuzima iz fajla.
- Klik na sliku bira prezentaciju. **GO** je pokreće. **Zatvori** potpuno zatvara njen prikaz i dokument.
- Na Stream Decku isti taster pokreće i zatvara prezentaciju.
- Klik na naziv menja ime u aplikaciji. **Natpis** podešava poseban, krupan naziv na Stream Decku, veličinu slova i prikaz sa slikom ili samo tekstom.
- **Ekrani** identifikuje do tri monitora. Svakom dodeli **Samo kontrole**, **Notes** ili **Slajdovi**. Ista uloga može biti na više ekrana.
- Dostupne su svetla i tamna tema. Stream Deck je opcioni.

Beleške dolaze iz izvornog PowerPoint Presenter Viewa; animacije i video ostaju u PowerPointu. PDF se prikazuje na Slajdovi ekranima. Originalni dokumenti se ne preimenuju.

## Pouzdanost i brzina

Provere spremnosti i bezbednog rasporeda izlaza ostaju uključene. Ne koristimo prečice koje preskaču proveru prikaza. U 0.5.1 izlazi se pripremaju paralelno; u lokalnom testu PDF na tri ekrana otvarao se približno **14% brže**. Vreme otvaranja PowerPointa u istom testu ostalo je približno isto. [Merenja i granice provere](docs/VERIFICATION.md).

[![Windows verification](https://github.com/srdjankotarlic/stagedeck/actions/workflows/verify.yml/badge.svg)](https://github.com/srdjankotarlic/stagedeck/actions/workflows/verify.yml)

## Razvoj

[Tehnički opis, testovi i pravljenje paketa](docs/DEVELOPMENT.md) · [Uputstvo](INSTALL-SR.md) · [MIT licenca](LICENSE)
