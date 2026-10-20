# Anleitung: Die Road-to-Athen-Karte mit Cursor bauen

Dieses Starter-Paket gibt Cursor alles, was es zum Planen und Bauen braucht:

| Datei | Wofür |
|---|---|
| `docs/PROJECT_BRIEF.md` | **Was** gebaut wird: Funktionen, Phasen, Akzeptanzkriterien |
| `docs/DATA_SPEC.md` | Wie die Rohdaten aussehen und was die Pipeline daraus macht |
| `docs/DESIGN_SYSTEM.md` | Farben, Schriften, Komponenten |
| `design/tokens.css` | Die shadcn-Tokens zum Einfügen in `src/index.css` |
| `design/map-theme.ts` | Kartenfarben und Kartenquellen |
| `.cursor/rules/*.mdc` | Regeln, die Cursor automatisch beachtet (Projekt, Design, Karte, Daten) |
| `.cursor/mcp.json` | shadcn-MCP-Server: Cursor kann damit Komponenten nachschlagen und installieren |
| `.cursorignore` | hält die Foto-Metadaten aus Cursor heraus (Strava-Richtlinie) |
| `AGENTS.md` | Kurzfassung der Regeln als Rückfallebene |

## Kartenmaterial: Was ist das „Strava-Relief“?

Das heißt **Reliefschattierung (Hillshade)**. Aus einem Höhenmodell wird berechnet, wie Sonnenlicht
von Nordwesten auf das Gelände fällt. Hänge im Schatten werden dunkler, so entsteht der plastische Eindruck.
Strava nutzt dafür eine kommerzielle Kartenplattform. Wir bauen dasselbe kostenlos und ohne API-Key:

- **MapLibre GL JS**: die Kartenbibliothek (Open Source)
- **OpenFreeMap**, Stil „positron“: helle, ruhige Grundkarte aus OpenStreetMap
- **Mapterhorn**: weltweites Höhenmodell, das MapLibre per `hillshade`-Layer schattiert
  (dieselben Daten erlauben später auch 3D-Gelände)

Falls dir die Optik nicht reicht: MapTiler (Stil „Outdoor“/„Landscape“) oder Mapbox („Outdoors“)
haben fertige Relief-Stile, brauchen aber einen API-Key, und ab einer bestimmten Nutzung kostet es.
Der Wechsel ist in MapLibre nur eine andere Stil-URL.

---

## Schritt 1: Vorbereitung auf dem Mac

1. **Node.js aktualisieren.** Du hast Node 18, Vite braucht mindestens 20.19.
   ```bash
   brew install node@22
   ```
   Danach gibt `node -v` eine 22er-Version aus (ggf. Terminal neu öffnen bzw. Hinweise von brew zum PATH befolgen).
2. ffmpeg ist schon installiert (für die Videos), exiftool auch.
3. Projektordner anlegen, am besten außerhalb von „Downloads“:
   ```bash
   mkdir -p ~/Projects/road-to-athen
   ```
4. Den **Inhalt** dieses `cursor-kit`-Ordners hineinkopieren, inklusive der versteckten Dateien
   (`.cursor`, `.cursorignore`):
   ```bash
   cp -R ~/Downloads/road_to_athen_raw-data/cursor-kit/. ~/Projects/road-to-athen/
   ```
5. Die Rohdaten als `raw/` dazulegen (Kopie; das Original bleibt, wo es ist):
   ```bash
   mkdir -p ~/Projects/road-to-athen/raw && cp -R ~/Downloads/road_to_athen_raw-data/{activities.csv,media.csv,activities,media} ~/Projects/road-to-athen/raw/
   ```
6. Den Ordner `~/Projects/road-to-athen` in Cursor öffnen.
7. **Cursor-Einstellungen → MCP**: den Server „shadcn“ aktivieren (grüner Punkt = läuft).
8. **Cursor-Einstellungen → Rules**: prüfen, ob die vier Projektregeln erscheinen.

## Schritt 2: Designsystem festlegen (vor dem ersten Prompt)

Das Designsystem ist schon definiert (`docs/DESIGN_SYSTEM.md`): warmes Papier-Weiß, Terrakotta als
Routen- und Akzentfarbe, Ägäis-Blau für Etappenenden, Fraunces und Inter als Schriften.
Willst du es ändern, gibt es zwei Wege:

- **Schnell:** Werte in `design/tokens.css` ändern und die gleichen Farben als Hex in `design/map-theme.ts` eintragen.
- **Visuell:** Auf https://ui.shadcn.com/create Stil, Farben, Schrift und Radius zusammenklicken.
  Der Generator liefert einen Befehl `npx shadcn@latest init --preset <CODE> --template vite`.
  Diesen Befehl gibst du Cursor in Phase 0 statt der Datei `tokens.css` mit. Die Projekt-Tokens
  (`--route`, `--stage-end`, `--finish`, `--map-panel`) aus `tokens.css` müssen trotzdem ergänzt werden.

Warum so? shadcn liest das Design ausschließlich aus den CSS-Variablen in `src/index.css`.
Liegen sie dort von Anfang an, sieht jede neu installierte Komponente sofort richtig aus.
Die Regel `10-design-system.mdc` verbietet Cursor feste Farben, damit das so bleibt.

## Schritt 3: Cursor planen lassen

Im Chat auf **Plan-Modus** umschalten (Modus-Auswahl unter dem Eingabefeld oder `Shift+Tab`).
Dann diesen Prompt einfügen:

```text
Lies @docs/PROJECT_BRIEF.md, @docs/DATA_SPEC.md, @docs/DESIGN_SYSTEM.md, @AGENTS.md
und die Regeln in .cursor/rules.

Erstelle einen Umsetzungsplan und speichere ihn als docs/PLAN.md:
- gegliedert nach den Phasen 0–6 aus dem Brief
- pro Phase: Ziel, konkrete Aufgaben als Checkliste (- [ ]), neue Dateien,
  benötigte Pakete mit Begründung, und wie ich das Ergebnis im Browser prüfe
- Risiken und offene Fragen am Ende

Schreib noch keinen Code und installiere nichts. Wenn dir etwas unklar ist,
stell mir zuerst Fragen.
```

Lies den Plan durch, beantworte die Fragen, lass ihn anpassen. Erst wenn er passt, weiter.

## Schritt 4: Phase für Phase bauen

Für jede Phase einen **neuen Chat** im Agent-Modus. Das hält den Kontext klein.
Vorlage:

```text
Setze Phase <N> aus @docs/PLAN.md um. Halte dich an die Regeln in .cursor/rules.
Wenn du fertig bist: npm run build und npm run lint ausführen, Haken in docs/PLAN.md
setzen und mir in 3–5 Sätzen sagen, wie ich das Ergebnis prüfe.
```

Zusätze für bestimmte Phasen:

- **Phase 0**:
  „Lege das Vite-Projekt im aktuellen Ordner an (vorhandene Dateien behalten), initialisiere shadcn,
  ersetze die Tokens in src/index.css durch @design/tokens.css, verschiebe design/map-theme.ts nach
  src/lib/map-theme.ts, installiere die Komponenten aus DESIGN_SYSTEM.md, ergänze .gitignore um
  @.gitignore.append und richte Git ein.“
- **Phase 1**:
  „Schreib die Pipeline und die erfundenen fixtures. Führe die Pipeline NICHT aus, ich starte sie selbst.“
  Danach im Terminal:
  ```bash
  npm run build:data
  ```
  Melde Cursor nur die Zusammenfassung in Zahlen („32 Etappen, 319 Medien, 5 ohne Position, 2 fehlen“).
- **Phase 2–5**: Erst mit `VITE_USE_FIXTURES=true` entwickeln, dann mit den echten Daten im Browser ansehen.

Nach jeder Phase selbst im Browser testen (`npm run dev`) und dann committen:
```bash
git add -A && git commit -m "Phase N"
```
Wenn eine Phase schiefgeht, kannst du so zum letzten Stand zurück.

## Schritt 5: Veröffentlichen

`npm run build` erzeugt `dist/`. Den Ordner bei Netlify, Vercel oder Cloudflare Pages hochladen
(oder das Git-Repo verbinden). Achtung: `public/media` wird auch nach dem Umwandeln grob
200–300 MB groß (Fotos als WebP, Videos in 720p). Prüf beim Anbieter die Grenzen für Gesamtgröße und
einzelne Dateien (bei Cloudflare Pages z. B. 25 MB pro Datei). Die Pipeline sollte zu große Videos melden.

## Datenschutz, bevor die Seite online geht

- Die erste Etappe beginnt vermutlich an deiner Haustür. In `scripts/config.ts` stellst du ein,
  wie viele Meter am Anfang abgeschnitten werden (Standard 300 m). Bei Bedarf erhöhen.
- Die veröffentlichten Bilder und Videos enthalten keine EXIF-Daten mehr (die Pipeline entfernt sie).
  Die Positionen stehen aber in `media.json`, weil die Karte sie braucht.
- Prüf vor dem Veröffentlichen, ob Fotos von Personen dabei sind, die nicht im Netz sein wollen.

## Strava-Richtlinie, kurz

Die Aufnahmezeiten und Orte der Fotos stammen aus der Strava-API. Die dürfen nicht in KI-Werkzeuge
fließen, auch nicht in Cursor. Deshalb:
- `.cursorignore` schließt `raw/media`, `public/media` und `public/data/media.json` aus.
- Die Datenpipeline startest du selbst. Cursor schreibt sie nur.
- Cursor entwickelt mit erfundenen Beispieldaten (`fixtures/`).
- Kopier keine Ausgaben mit Zeiten oder Koordinaten in den Cursor-Chat.

Die GPS-Spuren und die CSV stammen aus deinem eigenen Datenexport. Die darf Cursor sehen.
