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

- mobiele en desktop leerlinggrid;
- aanwezigheid aan/uit;
- leerling kiezen en daarna één van twaalf observatieknoppen;
- pedagogisch veilig puntenmodel;
- aparte telling voor beurten, goed, fout en niet beantwoord;
- eerlijke randomizer op basis van het laagste aantal beurten;
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
```
