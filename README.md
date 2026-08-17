# Gruppegenerator

Setter opp fotballag av en fast tropp, og fordeler spillerne rettferdig over tid.
Ren nettside uten byggsteg: `index.html` inneholder alt av markup, stil og logikk.
Alle data ligger i `localStorage` på enheten. Ingen server, ingen konto.

Publisert med GitHub Pages fra `main`.

## Filer

| Fil | Hva |
|---|---|
| `index.html` | Hele appen |
| `sw.js` | Service worker, gjør appen brukbar uten nett |
| `manifest.webmanifest` | Gjør appen installerbar på hjemskjermen |
| `icon-*.png`, `apple-touch-icon.png` | Appikoner, generert (hvit ball på blå flate) |
| `tests/` | Testsuiter som kjøres i Node |

## Tester

```bash
node tests/run.js
```

Testene trekker logikken rett ut av `index.html` (se `tests/extract.js`), så koden
finnes bare ett sted. DOM-avhengige deler stubbes.

## Ting som er lett å tråkke feil i

**Navnet er spillerens identitet.** Det står i statistikknøklene (`"Ada|Bo"`), i
arkivet, i bindingene, i «ikke sammen» og i utelatelsene. `renamePlayer()` flytter
alle stedene samtidig. Legger du til et nytt sted et navn lagres, må det inn der òg.
Tegnet `|` er forbudt i navn, det ville ødelagt nøklene.

**Arkivet er fasit.** Statistikken kan alltid regnes ut på nytt fra det med
`rebuildStatsFromArchive()`, og det skjer automatisk ved enhver arkivsletting.

**To sett tall.** `S.coOcc`/`S.opp` er rå antall og brukes bare til visning.
Generering bruker vektede tall bygget fra arkivet i `buildCoMatrix()`, der
gamle økter teller mindre (halvering per `HALVERING` økter). Ikke bland dem.

**Rettferdighet måles som andel, ikke antall.** `pairVal()` deler samspill på
antall økter begge var med i, ellers ville de som møter sjelden dra alle skjevt.
`SMOOTH` demper par med få økter.

**`buildCoMatrix()` må kalles før `buildGroups()`.** Uten den faller oppslagene
tilbake på en langt tregere vei via strengnøkler.

**Kategorifarger henger på `cat.color`, ikke på plasseringen i lista.** Ellers
ville sletting av én kategori endre fargen på alle etter den, også i arkivet.
All CSS leser `var(--cc)`; ikke legg inn faste `[data-c=a]`-regler.

**Krav plasseres før frie spillere.** Bindinger først, så «ikke sammen». Fyller
man lagene først, kan siste medlem av et «ikke sammen»-sett stå uten lovlig lag.

**Bump `VERSION` i `sw.js`** når filer endres, ellers serverer service workeren
gamle filer til alle som har appen installert.
