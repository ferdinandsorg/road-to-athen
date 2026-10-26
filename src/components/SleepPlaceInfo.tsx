import type { StageSleep } from "@/data/sleeps"
import { sleepKindLabel } from "@/data/sleeps"
import { sleepIcons } from "@/lib/sleep-icons"

type Props = {
  sleep: StageSleep
}

function formatPhone(phone: string): string {
  return phone.replace(/(\d{4})(?=\d)/g, "$1 ").trim()
}

export function SleepPlaceInfo({ sleep }: Props) {
  const Icon = sleepIcons[sleep.kind]
  const kind = sleepKindLabel[sleep.kind]
  const nightsLabel =
    sleep.nights === 1 ? "1 Nacht" : `${sleep.nights} Nächte`

  return (
    <div>
      <p className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Schlafplatz
      </p>

      <div className="flex gap-5">
        <Icon
          className="mt-1 size-5 shrink-0 text-primary"
          strokeWidth={2.25}
          aria-hidden
        />

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-lg font-semibold tracking-tight">
              {kind}
              <span className="font-normal text-muted-foreground">
                {" "}
                · {nightsLabel}
              </span>
            </p>
            <p className="mt-1 text-base text-foreground">{sleep.label}</p>
          </div>

          {sleep.detail && (
            <p className="text-sm text-muted-foreground">{sleep.detail}</p>
          )}

          {sleep.phone && (
            <p className="text-sm">
              <a
                href={`tel:${sleep.phone.replace(/\s/g, "")}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {formatPhone(sleep.phone)}
              </a>
            </p>
          )}
        </div>

        {sleep.image ? (
          <img
            src={sleep.image}
            alt=""
            className="size-24 shrink-0 object-cover"
          />
        ) : null}
      </div>
    </div>
  )
}
