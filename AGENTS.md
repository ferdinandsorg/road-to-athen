# AGENTS.md

Kurzfassung für KI-Agenten. Die ausführlichen Regeln stehen in `.cursor/rules/*.mdc`.

1. Lies zuerst `docs/PROJECT_BRIEF.md`, `docs/DATA_SPEC.md`, `docs/DESIGN_SYSTEM.md` und `docs/PLAN.md`.
2. Erst planen, dann bauen – immer nur eine Phase aus `docs/PLAN.md`, danach Build + Lint prüfen.
3. UI nur mit shadcn/ui und den Tokens aus `src/index.css`. Keine festen Farben.
4. **Nicht lesen:** `raw/media/**`, `public/media/**`, `public/data/media.json` (Strava-API-Daten).
   Für Entwicklung nur `fixtures/` verwenden. Die Datenpipeline startet der Nutzer selbst.
5. Mit dem Nutzer Deutsch sprechen; Code und Commits auf Englisch.
