# Road to Athen

Statische Reise-Karte: 32 Rad-Etappen auf MapLibre mit Relief, Fotos und Videos.

## Voraussetzungen

- **Node.js ≥ 20.19** (empfohlen 22)
- Für echte Daten: `ffmpeg`, `exiftool`
- Rohdaten in `raw/` (nicht im Git)

Dieses Repo enthält unter `.n/` ggf. eine lokale Node-Installation für die Entwicklung.

## Entwicklung (Fixtures)

```bash
# Falls lokal Node 22 unter .n liegt (Kommentar in eigener Zeile!):
export PATH="$(pwd)/.n/bin:$PATH"
npm install
npm run fixtures
npm run dev
```

`.env.development` setzt `VITE_USE_FIXTURES=true`. Die App lädt erfundene Daten aus `fixtures/`.

## Echte Daten

```bash
npm run build:data          # idempotent
npm run build:data -- --force
```

Schreibt nach `public/data` und `public/media` (gitignored). Danach `VITE_USE_FIXTURES=false` bzw. ohne die Env-Variable bauen.

Logs enthalten nur Zählungen und Dateinamen — keine Koordinaten oder Zeiten.

## Build & Deploy

```bash
npm run build
npm run preview
```

Ausgabe: `dist/`. SPA-Fallback ist für Netlify (`public/_redirects`) und Vercel (`vercel.json`) vorbereitet. Beliebiger Static Host möglich.

## Design

- Primärfarben: Blau `#1f26f0` + Weiß (Griechenland)
- Schrift: Uncut Sans Variable (`design/fonts/` → `src/assets/fonts/`)
- Radius: 0, großzügiges Spacing

Siehe `docs/DESIGN_SYSTEM.md` und `docs/PLAN.md`.

## Font-Lizenz

`UncutSans-Variable.ttf` ist lizenzpflichtig. Ob die Datei ins öffentliche Git darf, liegt bei dir.

## Automatischer GitHub-Sync (macOS)

Täglich um **20:00** (Lokalzeit) committen und pushen — respektiert `.gitignore` (keine `.env`, kein `raw/`, kein `public/media`).

```bash
# einmalig einrichten
./scripts/install-github-sync-agent.sh

# sofort synchronisieren
./scripts/sync-to-github.sh

# deaktivieren
./scripts/uninstall-github-sync-agent.sh
```

Andere Uhrzeit: `SYNC_HOUR=9 SYNC_MINUTE=30 ./scripts/install-github-sync-agent.sh`  
Logs: `.cursor/logs/github-sync.log`
