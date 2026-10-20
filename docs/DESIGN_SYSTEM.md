# Designsystem

Grundlage ist **shadcn/ui** mit Tailwind CSS v4. Das Designsystem lebt an **einer** Stelle:
den CSS-Variablen in `src/index.css`. Komponenten verwenden nur diese Tokens, nie feste Farben.

## Leitidee

„Reisetagebuch auf Papier, Karte im Mittelpunkt.“ Ruhige, warme Neutraltöne wie Papier,
damit Relief und Route wirken. Eine kräftige Akzentfarbe (Terrakotta), die gleichzeitig
die Farbe der Route ist. Ein tiefes Ägäis-Blau als zweite Farbe für Etappenenden und Links.
Typografie: Serifenschrift für Überschriften (Tagebuch-Charakter), Grotesk für alles andere.

## Farben

Alle Werte stehen in `design/tokens.css`. Die wichtigsten Rollen:

| Token | Rolle | Hell |
|---|---|---|
| `--background` | Seitenhintergrund, Papier | warmes Off-White |
| `--foreground` | Text | warmes Fast-Schwarz |
| `--card` / `--popover` | Panels über der Karte | Weiß |
| `--primary` | Akzent, Buttons, **Route aktiv** | Terrakotta |
| `--secondary` | ruhige Buttons, Chips | helles Sand |
| `--muted-foreground` | Nebentexte, Einheiten | Grau-Braun |
| `--accent` | Hover-Flächen | helles Ägäis |
| `--border` / `--input` | Linien | Sand |
| `--chart-1` … `--chart-5` | Höhenprofil, Statistik | Terrakotta → Ägäis |
| `--route` | aktive Etappe | = primary |
| `--route-muted` | andere Etappen | Terrakotta, transparent |
| `--route-casing` | Kontur unter der Linie | Weiß |
| `--stage-end` | Punkt am Etappenende | Ägäis-Blau |
| `--finish` | Ziel Athen | Gold |

**Karte:** MapLibre versteht keine `oklch()`-Farben. Für Kartenlayer gibt es deshalb dieselben Farben
als Hex in `src/lib/map-theme.ts`. Ändert sich eine Farbe, beide Stellen anpassen.

## Typografie

| Zweck | Schrift | Tailwind |
|---|---|---|
| Überschriften, Etappenname | **Fraunces** (variable, Serif) | `font-heading` |
| Fließtext, UI | **Inter** (variable) | `font-sans` |
| Zahlen in Statistiken | Inter mit `tabular-nums` | `font-sans tabular-nums` |

Einbinden über `@fontsource-variable/fraunces` und `@fontsource-variable/inter` (keine externen Requests).

Größen: Etappenname `text-2xl md:text-3xl`, Abschnittstitel `text-sm font-medium uppercase tracking-wide text-muted-foreground`,
Statistikwert `text-xl font-semibold tabular-nums`, Einheit `text-sm text-muted-foreground`.

## Form und Raum

- `--radius: 0.75rem`. Panels `rounded-xl`, Thumbnails auf der Karte `rounded-md`.
- Panels über der Karte: `bg-card/95 backdrop-blur shadow-lg border`.
- Abstände in 4er-Schritten (Tailwind-Standard). Panel-Innenabstand `p-4 md:p-6`.
- Icons: `lucide-react`, 16 px in Buttons, 20 px allein stehend.

## Komponenten (shadcn)

Von Anfang an installieren:

```
button card badge separator scroll-area sheet drawer dialog carousel tooltip skeleton chart toggle-group
```

Verwendung:

| Element der Seite | shadcn-Komponente |
|---|---|
| Etappenliste Desktop | `ScrollArea` in einer festen Seitenleiste |
| Etappenliste Handy | `Drawer` (Bottom Sheet) |
| Zurück/Weiter | `Button variant="outline" size="icon"` |
| Statistik | `Card` mit Raster aus Kennzahlen |
| Etappennummer, „Video“ | `Badge` |
| Großansicht Medien | `Dialog` + `Carousel` |
| Höhenprofil | `Chart` (Area-Chart) |
| Laden | `Skeleton` |

Eigene Komponenten liegen in `src/components/`, shadcn-Komponenten in `src/components/ui/`
(nicht von Hand umbauen, lieber kapseln).

## Karte

- Grundkarte „positron“ wird leicht entsättigt. Das Relief (Hillshade) liegt **unter** Straßen und Beschriftungen.
- Route: 4 px Linie in `--route` mit 7 px Kontur `--route-casing`. Andere Etappen 3 px `--route-muted`.
- Etappenende: Kreis 6 px, Füllung `--stage-end`, 2 px weißer Rand. Ziel: 10 px in `--finish` mit Flaggen-Icon.
- Foto-Marker: 40 × 40 px Thumbnail, 2 px weißer Rand, `shadow-md`, Video mit kleinem Play-Symbol.
  Aktiver Marker: Rand in `--primary`, leicht vergrößert.
- Cluster: runder Badge mit Anzahl in `--primary`, Hintergrund Thumbnail des ersten Fotos.

## Dark Mode

Tokens für `.dark` sind vorhanden, aber nicht Teil der ersten Version (Karte bräuchte einen dunklen Stil).

## So ändert man das Designsystem

1. Werte in `src/index.css` (`:root` / `.dark`) ändern, bei Kartenfarben auch `src/lib/map-theme.ts`.
2. Alternativ unter https://ui.shadcn.com/create ein Preset zusammenklicken und die Variablen übernehmen.
3. Keine Farben direkt in Komponenten schreiben (`bg-[#…]`, `text-orange-600` usw. sind verboten).
