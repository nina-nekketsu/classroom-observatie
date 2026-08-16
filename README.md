# Classroom Observatie App — prototype v0.1

Mobiel-eerst prototype voor snelle observatieregistratie tijdens de les.

Live prototype: <https://nina-nekketsu.github.io/classroom-observatie/>

## Starten

```bash
cd /Users/poverty/projects/classroom-observatie-app
npm install
npm run dev
```

Open daarna de URL die Vite toont. De app gebruikt voor productie het Pages-basispad `/classroom-observatie/`.

## Wat al werkt

- realistische demonstratieklas met 32 fictieve leerlingen;
- mobiele en desktop leerlinggrid;
- aparte starttab voor aanwezigheid, inclusief afwezig → aanwezig/te laat herstellen;
- smalle alfabetbalk op de tabs Aanwezigheid en Huiswerk/spullen om direct naar een beginletter te springen;
- afwezige leerlingen verdwijnen voor die les uit de live-observatieweergave;
- leerling kiezen en daarna observaties vastleggen voor antwoorden, werkhouding, tempo, gedrag en waarschuwingen;
- aparte snelle tab voor huiswerk- en spullencontrole;
- pedagogisch veilig puntenmodel;
- tegeloverzicht met beurten, goed, vraagpunten en twee dominante werkhoudingssignalen;
- herhalingstellers, onder meer voor meerdere waarschuwingen en opvolging;
- gedateerde lesnotities met notitiegeschiedenis per leerling;
- notities kunnen als belangrijk worden gemarkeerd: de leerlingbalk kleurt geel en een klasbrede knop toont alleen belangrijke notities;
- gewogen randomizer: alleen aanwezige leerlingen, met extra kans bij minder beurten/goede antwoorden;
- undo van de laatste observatie;
- lokale opslag in de browser (`localStorage`);
- zichtbare wachtrijteller als basis voor latere synchronisatie;
- responsive actieblad voor mobiel.
- hoofdnavigatie voor Live, Klassen en Overzicht;
- meerdere fictieve klassen met schooljaar en actieve-klaskeuze;
- expliciete lessessies met start/afsluiting en sessiegebonden observaties/notities;
- CSV/TSV-bestandsselectie en plakpreview met validatie, duplicaatcontrole en een fictieve-testdata-gate;
- leerlingoverzicht met lesfilter, afzonderlijke aantallen voor goed/fout/bijna goed/geen antwoord en de onderliggende observatie- en notitieregels;

## Belangrijke prototypegrens

Dit is bewust een publiek bereikbare, statische feedbackversie. Google-login, server-side allowlist, private cloudopslag, echte synchronisatie, foto's en exports zijn nog niet gekoppeld. De ingebouwde importpreview accepteert daarom uitsluitend herkenbaar fictieve testnamen. Rechtstreekse `.xlsx`-import is nog niet aanwezig; sla een Excel-werkblad eerst op als CSV. Zet geen echte leerlinggegevens in deze prototypeversie.

## Kwaliteitschecks

```bash
npm test
npm run build
npm run lint
node scripts/visual-check.mjs
```
