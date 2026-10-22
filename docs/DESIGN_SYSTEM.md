# Designsystem

Grundlage ist **shadcn/ui** mit Tailwind CSS v4. Das Designsystem lebt an **einer** Stelle:
den CSS-Variablen in `src/index.css`. Komponenten verwenden nur diese Tokens, nie feste Farben.

## Leitidee

Griechenland-Anmutung: **kräftiges Blau `#1f26f0` + Weiß**, UI minimal, eine Sans-Familie
(**Uncut Sans Variable**). Großzügiges Spacing, harte Kanten (`--radius: 0`).
Figma-Referenz: Node `1:3` in der Design-Datei „Untitled“ / Road to Athen.

## Farben

| Token | Rolle | Wert |
|---|---|---|
| `--background` / `--card` | Flächen | Weiß |
| `--foreground` | Text | kühles Fast-Schwarz |
| `--primary` / `--route` | Akzent, aktive Route | `#1f26f0` |
| `--route-muted` | andere Etappen | Blau, transparent |
| `--stage-end` | Etappenende | dunkleres Blau |
| `--finish` | Ziel Athen | helleres Blau (kein Gold) |
| `--muted-foreground` | Nebentexte | kühles Grau |

**Karte:** Hex-Farben in `src/lib/map-theme.ts` (MapLibre kennt kein `oklch()`).

## Typografie

| Zweck | Schrift | Tailwind |
|---|---|---|
| Brand, Überschriften, UI | **Uncut Sans Variable** | `font-heading` / `font-sans` |
| Zahlen | Uncut Sans + `tabular-nums` | `font-sans tabular-nums` |

Lokal aus `src/assets/fonts/UncutSans-Variable.ttf` (Kopie von `design/fonts/`). Kein CDN.

Brand: `font-weight: 700`, enges Tracking (wie Figma).

## Form und Raum

- `--radius: 0` – keine abgerundeten Buttons, Cards, Marker oder Pills.
- Spacing weit: Panel-Innenabstand `p-6 md:p-8`, großzügige Gaps.
- Panels über der Karte: `rounded-none border bg-map-panel shadow-lg backdrop-blur`.
- Icons: `lucide-react`, 16 px in Buttons, 20 px allein stehend.

## Komponenten (shadcn)

```
button card badge separator scroll-area sheet drawer dialog carousel tooltip skeleton chart toggle-group
```

Eigene Komponenten in `src/components/`, shadcn in `src/components/ui/`.

## Dark Mode

Tokens für `.dark` sind vorhanden, aber nicht Teil der ersten Version.

## So ändert man das Designsystem

1. Werte in `src/index.css` ändern; bei Kartenfarben auch `src/lib/map-theme.ts`.
2. Keine Farben direkt in Komponenten (`bg-[#…]` usw. verboten).
