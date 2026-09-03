import { groupDetailStats } from '@/lib/stats';
import { cn } from '@/lib/utils';

const STAT_METER_MAX = 200;

function meterWidth(value: number): string {
  return `${Math.min(100, Math.max(0, Math.round((value / STAT_METER_MAX) * 100)))}%`;
}

export function PlayerDetailStats({
  stats,
  className,
}: {
  stats: Array<{ key: string; value: number; label?: string }>;
  className?: string;
}) {
  const groups = groupDetailStats(stats);
  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Detailed stats are not in the catalog yet for this player.
      </p>
    );
  }

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <h2 className="font-heading text-lg font-medium">Stats</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <li
            key={group.key}
            className="bg-card flex flex-col gap-3 rounded-xl border p-3.5"
          >
            <div className="flex items-end justify-between gap-3">
              <p className="font-heading text-sm font-medium">{group.name}</p>
              <p className="font-heading text-3xl leading-none tabular-nums">
                {group.value}
              </p>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: meterWidth(group.value) }}
              />
            </div>
            {group.children.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {group.children.map((child) => (
                  <li key={child.key} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-muted-foreground truncate">
                        {child.label}
                      </span>
                      <span className="tabular-nums">{child.value}</span>
                    </div>
                    <div className="bg-muted h-1 overflow-hidden rounded-full">
                      <div
                        className="bg-foreground/25 h-full rounded-full"
                        style={{ width: meterWidth(child.value) }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
