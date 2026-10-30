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

Ausgabe: `dist/`. SPA-Fallback: Netlify (`public/_redirects`), Vercel (`vercel.json`), Apache/FTP (`public/.htaccess`).

### Branches

| Branch | Bedeutung |
|---|---|
| `main` | Live-Stand → wird bei jedem Push per SFTP auf die Website deployed |
| `develop` | Arbeit / noch nicht fertig — kein Auto-Deploy |

Workflow: auf `develop` bauen → Pull Request nach `main` → Merge → Website aktualisiert sich.

### SFTP-Upload (IONOS / 1&1)

IONOS hat klassisches FTP abgeschaltet — Upload läuft per **SFTP** (Port 22).

**Lokal (z. B. erste Medien-Sync):**

1. Zugangsdaten in `.env.local` (Vorlage: `.env.example`)
2. `npm run build:data` dann `npm run deploy`

**Automatisch von GitHub (`main`):**

Repo → Settings → Secrets and variables → Actions — diese Secrets anlegen:

- `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`
- `FTP_REMOTE_DIR` (meist `/`)
- `FTP_PORT` (`22`)
- `VITE_MAPBOX_ACCESS_TOKEN` (optional, aktuell ungenutzt — Karte läuft ohne Token)

`public/media/` liegt nicht im Git. Einmal lokal hochladen; CI überschreibt nur Build-Dateien und lässt vorhandene Medien auf dem Server.

## Design

- Primärfarben: Blau `#1f26f0` + Weiß (Griechenland)
- Schrift: Uncut Sans Variable (`design/fonts/` → `src/assets/fonts/`)
- Radius: 0, großzügiges Spacing

Siehe `docs/DESIGN_SYSTEM.md` und `docs/PLAN.md`.

## Font-Lizenz

`UncutSans-Variable.ttf` ist lizenzpflichtig. Ob die Datei ins öffentliche Git darf, liegt bei dir.

## Automatischer GitHub-Sync (macOS)

Täglich um **20:00** (Lokalzeit) committen und pushen — respektiert `.gitignore` (keine `.env`, kein `raw/`, kein `public/media`).

**Einmalige Anmeldung** (nötig, damit Push ohne Passwort-Prompt läuft).
`gh` liegt unter `~/.local/bin` (bereits installiert):

```bash
export PATH="$HOME/.local/bin:$PATH"
gh auth login          # GitHub.com → HTTPS → Login with browser
gh auth setup-git
```

Danach:

```bash
# einmalig einrichten (täglich 20:00)
./scripts/install-github-sync-agent.sh

# sofort synchronisieren
./scripts/sync-to-github.sh

# deaktivieren
./scripts/uninstall-github-sync-agent.sh
```

Andere Uhrzeit: `SYNC_HOUR=9 SYNC_MINUTE=30 ./scripts/install-github-sync-agent.sh`  
Logs: `.cursor/logs/github-sync.log`
