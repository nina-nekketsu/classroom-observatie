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
- leerling kiezen en daarna observaties vastleggen voor antwoorden, werkhouding, tempo, gedrag en waarschuwingen;
- aparte snelle tab voor huiswerk- en spullencontrole;
- pedagogisch veilig puntenmodel;
- tegeloverzicht met beurten, goed, vraagpunten en twee dominante werkhoudingssignalen;
- herhalingstellers, onder meer voor meerdere waarschuwingen en opvolging;
- gedateerde lesnotities met notitiegeschiedenis per leerling;
- gewogen randomizer: alleen aanwezige leerlingen, met extra kans bij minder beurten/goede antwoorden;
- undo van de laatste observatie;
- lokale opslag in de browser (`localStorage`);
- zichtbare wachtrijteller als basis voor latere synchronisatie;
- responsive actieblad voor mobiel.

## Belangrijke prototypegrens

Dit is bewust een publiek bereikbare, statische feedbackversie. Google-login, server-side allowlist, private cloudopslag, echte synchronisatie, import, foto's en exports zijn nog niet gekoppeld. De bron en de live site mogen daarom uitsluitend fictieve of testleerlingen bevatten; zet geen echte leerlinggegevens in deze prototypeversie.

## Kwaliteitschecks

```bash
npm test
npm run build
npm run lint
node scripts/visual-check.mjs
```
