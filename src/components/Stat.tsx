type Props = {
  label: string
  value: string
  unit?: string
}

export function Stat({ label, value, unit }: Props) {
  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="stat-value mt-1">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-normal tracking-normal text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </p>
    </div>
  )
}
