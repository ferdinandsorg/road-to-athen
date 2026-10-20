# Datenspezifikation

## Rohdaten (Strava-Export, liegt in `raw/`, nicht im Git)

```
raw/
  activities.csv          32 Zeilen = 32 Etappen
  activities/<id>.fit.gz  GPS-Spur je Etappe (FIT-Format, gzip)
  media/<UUID>.jpg|.mp4   284 Fotos + 35 Videos, ca. 520 MB, Videos allein ca. 410 MB
```

Den Ordner `routes/` mit seinen GPX-Dateien braucht die Seite **nicht**. Das sind geplante
Routen, nicht die gefahrenen Strecken. Die echten Spuren stecken in `activities/*.fit.gz`.

### activities.csv

- Trennzeichen `;`, UTF-8 mit BOM, Zellen können Zeilenumbrüche enthalten → mit einem echten
  CSV-Parser lesen (z. B. `csv-parse`), nicht zeilenweise splitten.
- Einige Spaltennamen kommen doppelt vor → **über den Index** zugreifen, nicht über den Namen.

| Index | Spalte | Beispiel / Hinweis |
|---|---|---|
| 0 | Aktivitäts-ID | `20556522258` |
| 1 | Aktivitätsdatum | `12.10.2026, 05:47:46` – Format `DD.MM.YYYY, HH:mm:ss`, **UTC** |
| 2 | Name der Aktivität | `Road to Athen 31 — FINAL DESTINATION 🏁` (enthält Emojis) |
| 4 | Aktivitätsbeschreibung | meist leer, mehrzeilig möglich |
| 12 | Dateiname | `activities/21715967182.fit.gz` |
| 15 | Verstrichene Zeit | Sekunden |
| 16 | Bewegungszeit | Sekunden |
| 17 | Distanz | **Meter** (Spalte 6 ist km mit Dezimalkomma – nicht verwenden) |
| 19 | Durchschnittliche Geschwindigkeit | m/s |
| 20 | Höhenzunahme | Meter |
| 22 / 23 | Min. / Max. Höhe | Meter |
| 36 | Durchschnittliche Temperatur | °C |
| 102 | Medien | `media/A.jpg\|media/B.mp4`, kann mit `\|\|` beginnen → leere Einträge verwerfen |

### FIT-Dateien

- Mit `@garmin/fitsdk` lesen (vorher `zlib.gunzipSync`).
- Nachrichten vom Typ `record`: `timestamp` (UTC), `positionLat`/`positionLong` in Semicircles
  (Grad = Wert × 180 / 2³¹), `altitude` bzw. `enhancedAltitude` (m), `distance` (m).
- Datensätze ohne Position überspringen.

### Medien

- Dateiname = UUID. Die Zuordnung zur Etappe ergibt sich **nur** aus Spalte 102 der CSV.
- Fotos (JPG) haben EXIF: `DateTimeOriginal` + `OffsetTimeOriginal` (Ortszeit + Zeitzone) und
  GPS-Tags. Videos (MP4) haben `QuickTime:CreateDate` (UTC) und `Keys:GPSCoordinates`.
- Lesen mit `exifr` (Fotos) bzw. `exiftool-vendored` (Videos, funktioniert auch für Fotos).
- Einige Dateien haben **keine Position** → `lat/lng = null`, nie 0/0.
- 2 Videos stehen in der CSV, fehlen aber im Ordner → überspringen und im Log melden.

## Pipeline: `npm run build:data`

Ein Node-Script (`scripts/build-data.ts`, ausgeführt mit `tsx`) erzeugt alles unter `public/`.
Es muss **idempotent** sein (bereits erzeugte Bilder/Videos überspringen, mit `--force` neu bauen)
und am Ende eine Zusammenfassung ausgeben: nur Zahlen und Dateinamen, **keine** Koordinaten oder Zeiten.

### Schritte

1. CSV lesen → Etappen nach Startzeit sortieren → `nr` = 1…32.
2. Pro Etappe FIT lesen →
   - Detailspur: Douglas-Peucker-Vereinfachung (`@turf/simplify`, Toleranz ca. 0,00002°),
     Koordinaten auf 5 Nachkommastellen runden, Höhe auf ganze Meter.
   - Höhenprofil: ca. 300 gleichmäßig über die Distanz verteilte Punkte `[distanzKm, höheM]`.
   - Zeitzone: aus dem Startpunkt mit `@photostructure/tz-lookup` bestimmen (IANA-Name).
3. Gesamtlinie für den Überblick: alle Etappen stark vereinfacht (Toleranz ca. 0,0005°) in einer Datei.
4. Medien pro Etappe:
   - Fotos mit `sharp`: `thumb` 160 px (quadratisch, `cover`), `medium` 1600 px lange Kante, beides WebP.
     `sharp` entfernt dabei die EXIF-Daten (gewollt).
   - Videos mit `ffmpeg` (muss installiert sein): 720p, H.264, `-crf 28`, `-movflags +faststart`,
     ohne Metadaten (`-map_metadata -1`), dazu ein Posterbild (Frame bei 1 s) als WebP
     in `thumb`- und `medium`-Größe. Videos über 25 MB nach dem Umwandeln im Log melden.
   - Fehlt einem Medium die Position, nicht auf die Spur raten (das ist schon beim Wiederherstellen
     der Metadaten passiert), sondern `null` lassen.
5. Datenschutz: Die ersten und letzten `PRIVACY_TRIM_METERS` (Standard 300 m) **der ersten Etappe**
   abschneiden, falls sie zu Hause beginnt (Konfiguration in `scripts/config.ts`).

### Ausgabe

```
public/data/stages.json            Liste aller Etappen (klein, wird sofort geladen)
public/data/overview.geojson       vereinfachte Gesamtlinie + Etappenend-Punkte
public/data/stages/<nr>.json       Detailspur + Höhenprofil einer Etappe (wird bei Bedarf geladen)
public/data/media.json             alle Medien mit Zeit und Position
public/media/thumb/<uuid>.webp
public/media/medium/<uuid>.webp
public/media/video/<uuid>.mp4
```

### Typen (`src/types/data.ts`)

```ts
export type Stage = {
  nr: number;                 // 1..32, sortiert nach Startzeit
  id: string;                 // Strava-Aktivitäts-ID
  name: string;
  day: number;                // Reisetag 1..31 (zwei Etappen können denselben Tag haben)
  startUtc: string;           // ISO 8601
  timeZone: string;           // z. B. "Europe/Athens"
  distanceM: number;
  movingTimeS: number;
  elapsedTimeS: number;
  elevationGainM: number;
  avgSpeedMs: number;
  avgTempC: number | null;
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  start: [number, number];    // [lng, lat]
  end: [number, number];
  mediaCount: number;
};

export type StageDetail = {
  nr: number;
  line: GeoJSON.Feature<GeoJSON.LineString>; // Koordinaten [lng, lat, ele]
  profile: [number, number][];               // [distanzKm, höheM]
};

export type MediaItem = {
  id: string;                  // UUID = Dateiname ohne Endung
  stageNr: number;
  type: "photo" | "video";
  takenAt: string;             // ISO 8601 mit Offset, z. B. "2026-10-12T09:14:03+03:00"
  lat: number | null;
  lng: number | null;
  width: number;               // vom medium-Bild
  height: number;
  thumb: string;               // "/media/thumb/<id>.webp"
  medium: string;              // "/media/medium/<id>.webp" (bei Videos: Poster)
  video?: string;              // "/media/video/<id>.mp4"
  caption?: string;            // aus media.csv, falls nicht leer
};
```

`overview.geojson` enthält eine `FeatureCollection` mit
- je Etappe ein `LineString` mit `properties: { nr }`
- je Etappe ein `Point` am Ende mit `properties: { nr, kind: "stage-end" | "finish" }`
- ein `Point` am Start der ersten Etappe mit `properties: { nr: 1, kind: "start" }`

## Beispieldaten für die Entwicklung

`fixtures/` enthält **erfundene** Daten im gleichen Format (3 Etappen, ca. 10 Medien mit Platzhalterbildern
irgendwo in Griechenland). Die App kann per `VITE_USE_FIXTURES=true` darauf umgeschaltet werden.
So lässt sich die Oberfläche bauen und testen, ohne die echten Daten zu öffnen (siehe Regel `30-daten.mdc`).
