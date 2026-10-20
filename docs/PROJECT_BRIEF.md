# Projekt-Brief: Road to Athen – Reise-Karte

## Worum geht es

Eine Radreise in 32 Etappen über 31 Tage und rund 3.071 km mit knapp 28.000 Höhenmetern bis nach Athen.
Die Webseite zeigt die gesamte Strecke auf einer Landkarte mit Reliefschattierung
(ähnlich wie die Karten in Strava). Man kann durch die einzelnen Etappen klicken und
sieht die unterwegs aufgenommenen Fotos und Videos an der Stelle auf der Route, an der
sie entstanden sind.

Zielgruppe: Freunde, Familie und Mitreisende. Die Seite soll auf dem Handy genauso gut funktionieren
wie am Desktop.

## Kernfunktionen (Muss)

1. **Gesamtüberblick als Startansicht**
   - Alle 32 Etappen als zusammenhängende Linie auf der Karte, Karte zeigt die ganze Strecke.
   - Am Ende jeder Etappe ein gut erkennbarer Punkt (Etappenende). Das Ziel der letzten Etappe
     ist hervorgehoben (Zielflagge o. Ä.), der Start der ersten Etappe ebenfalls.
   - Kurze Gesamtstatistik: Tage, Kilometer, Höhenmeter, Fotos.
   - Fotos sind im Überblick zu Gruppen (Clustern) zusammengefasst, damit die Karte ruhig bleibt.

2. **Etappen-Navigation**
   - Liste aller Etappen (Tag, Name, Datum, km, Höhenmeter). Auf dem Desktop als Seitenleiste,
     auf dem Handy als ausziehbares Panel unten (Bottom Sheet).
   - „Zurück“/„Weiter“-Buttons und Pfeiltasten wechseln die Etappe.
   - Eigene URL pro Etappe (z. B. `/etappe/12`), damit man Links teilen kann. `/` = Überblick.
   - Beim Wechsel fliegt die Karte animiert auf die Etappe (fitBounds mit Rand).
   - Die gewählte Etappe ist farbig hervorgehoben, die übrigen bleiben blass sichtbar.

3. **Fotos und Videos auf der Route**
   - In der Etappenansicht: kleine Vorschaubilder (Thumbnails) als Marker an der Aufnahmeposition.
   - Klick öffnet eine Großansicht (Lightbox) mit Blättern durch alle Medien der Etappe
     in zeitlicher Reihenfolge. Videos werden dort abgespielt.
   - Medien ohne Position erscheinen nur in der Lightbox und in der Fotoleiste, nicht auf der Karte.
   - Eine Fotoleiste (horizontal scrollbar) unter der Etappenbeschreibung, Klick zentriert die Karte
     auf das Foto.

4. **Etappen-Details**
   - Statistik: Distanz, Höhenmeter (bergauf), Fahrzeit (Bewegungszeit), Ø-Geschwindigkeit,
     Startzeit in Ortszeit, Ø-Temperatur.
   - Höhenprofil der Etappe (Diagramm). Fährt man mit der Maus darüber, zeigt ein Punkt auf
     der Karte die Position.

## Optional (Kann, später)

- 3D-Gelände in der Etappenansicht (gleiche Höhendaten wie die Reliefschattierung).
- Dark Mode (Tokens sind schon definiert).
- „Abspielen“: automatische Fahrt durch alle Etappen.

## Nicht-Ziele

- Kein Backend, keine Datenbank, keine Anmeldung. Reine statische Seite.
- Keine Live-Anbindung an Strava. Alle Daten werden einmalig aus dem Export vorbereitet.
- Keine Strava-Optik oder -Marke kopieren. Nur die Idee „Karte mit Relief und Route“.

## Technik

| Bereich | Wahl | Begründung |
|---|---|---|
| Build | Vite + React + TypeScript | statische Seite, schnell, von shadcn unterstützt |
| UI | shadcn/ui + Tailwind CSS v4 | Designsystem über CSS-Variablen (siehe DESIGN_SYSTEM.md) |
| Routing | React Router (oder TanStack Router) | `/` und `/etappe/:nr` |
| Karte | MapLibre GL JS über `react-map-gl/maplibre` | Open Source, Vektorkarten, Hillshade-Layer |
| Grundkarte | OpenFreeMap, Stil „positron“ | kostenlos, kein API-Key, ruhige helle Optik |
| Relief | Mapterhorn-Höhendaten als `raster-dem` + `hillshade`-Layer | kostenlos, kein API-Key, weltweit |
| Diagramm | shadcn Chart (Recharts) | Höhenprofil |
| Daten-Vorbereitung | Node-Scripts in `scripts/` | FIT → GeoJSON, Fotos → Thumbnails, Videos → Web-Format |
| Hosting | Vercel, Netlify oder Cloudflare Pages | statischer Ordner `dist/` |

Details zur Karte: `.cursor/rules/20-karte.mdc`. Details zu den Daten: `docs/DATA_SPEC.md`.

## Umsetzung in Phasen

Jede Phase endet mit einem lauffähigen Stand, einem kurzen Test im Browser und einem Git-Commit.

0. **Grundgerüst**: Vite, Tailwind, shadcn (mit Designsystem-Tokens), Router, Ordnerstruktur, leere Seite mit Layout.
1. **Datenpipeline**: Scripts aus `DATA_SPEC.md`, dazu erfundene Beispieldaten in `fixtures/`.
   Der Nutzer führt `npm run build:data` selbst aus.
2. **Karte**: Grundkarte, Relief, alle Etappen als Linie, Etappenenden, Start/Ziel, Gesamtüberblick.
3. **Etappen-Navigation**: Liste, URL pro Etappe, Zurück/Weiter, Hervorhebung, Kartenflug, Statistik.
4. **Medien**: Thumbnail-Marker, Cluster im Überblick, Lightbox mit Videos, Fotoleiste.
5. **Höhenprofil und Feinschliff**: Diagramm mit Kartensynchronisierung, mobile Ansicht, Ladezeiten, Barrierefreiheit.
6. **Veröffentlichen**: Build, Größen prüfen, Deployment.

## Akzeptanzkriterien

- Startseite lädt auf einem durchschnittlichen Handy in unter 3 s bis zur sichtbaren Karte.
  Der Überblick lädt nur die vereinfachte Gesamtlinie, nicht alle Detailspuren.
- Alle 32 Etappen sind erreichbar, Zurück/Weiter funktioniert am Anfang/Ende sinnvoll (deaktiviert).
- Jedes Etappenende ist auf der Karte als Punkt erkennbar, auch bei niedrigem Zoom.
- Fotos erscheinen an der richtigen Stelle auf der Linie. Fotos ohne Position werden nicht an (0,0) gezeigt.
- Etappen-URL direkt im Browser aufgerufen zeigt sofort die richtige Etappe.
- Kartenattribution (OpenFreeMap, OpenStreetMap, Mapterhorn) ist sichtbar.
- Bedienbar mit Tastatur, Bilder haben Alt-Texte („Foto Etappe 12, 14:32 Uhr“).
