'use client';

import { usePreferences } from '@/components/providers/preferences-provider';
import { groupDetailStats } from '@/lib/stats';
import { cn } from '@/lib/utils';

const BASE_STAT_METER_MAX = 200;

function meterPct(value: number, max: number): number {
  return Math.min(100, Math.max(0, (value / max) * 100));
}

function StatProgressBar({
  value,
  delta,
  max,
  variant,
}: {
  value: number;
  delta: number;
  max: number;
  variant: 'group' | 'child';
}) {
  const baseValue = Math.max(0, value - Math.max(0, delta));
  const totalPct = meterPct(value, max);
  const basePct = delta > 0 ? Math.min(totalPct, meterPct(baseValue, max)) : totalPct;
  const gainPct = Math.max(0, totalPct - basePct);

  return (
    <div
      className={cn(
        'bg-muted flex overflow-hidden rounded-full',
        variant === 'group' ? 'h-1.5' : 'h-1',
      )}
    >
      <div
        className={cn(
          'h-full transition-[width] duration-200',
          variant === 'group'
            ? 'bg-primary dark:bg-white'
            : 'bg-foreground/35 dark:bg-white/80',
        )}
        style={{ width: `${basePct}%` }}
      />
      {gainPct > 0 ? (
        <div
          className="h-full bg-emerald-500 transition-[width] duration-200 dark:bg-emerald-400"
          style={{ width: `${gainPct}%` }}
        />
      ) : null}
    </div>
  );
}

export function PlayerDetailStats({
  stats,
  position,
  deltas,
  className,
}: {
  stats: Array<{ key: string; value: number; label?: string }>;
  position?: string;
  deltas?: Readonly<Record<string, number>>;
  className?: string;
}) {
  const { m: copy } = usePreferences();
  const groups = groupDetailStats(stats, position);
  if (groups.length === 0) {
    return <p className="text-muted-foreground text-sm">{copy.statsMissing}</p>;
  }

  const maxObserved = groups.reduce((max, group) => {
    const childMax = group.children.reduce((m, c) => Math.max(m, c.value), 0);
    return Math.max(max, group.value, childMax);
  }, BASE_STAT_METER_MAX);
  const meterMax = maxObserved > BASE_STAT_METER_MAX ? 250 : BASE_STAT_METER_MAX;

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <h2 className="font-heading text-lg font-medium">{copy.stats}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {groups.map((group) => {
          const groupDelta = deltas?.[group.key] ?? 0;
          return (
            <li
              key={group.key}
              className="bg-card flex flex-col gap-3 rounded-xl border p-3.5"
            >
              <div className="flex items-end justify-between gap-3">
                <p className="font-heading text-sm font-medium">{group.name}</p>
                <p
                  className={cn(
                    'font-heading text-3xl leading-none tabular-nums',
                    groupDelta > 0 && 'text-emerald-600 dark:text-emerald-400',
                  )}
                >
                  {group.value}
                </p>
              </div>
              <StatProgressBar
                value={group.value}
                delta={groupDelta}
                max={meterMax}
                variant="group"
              />
              {group.children.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {group.children.map((child) => {
                    const childDelta = deltas?.[child.key] ?? 0;
                    return (
                      <li key={child.key} className="flex flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="text-muted-foreground truncate">
                            {child.label}
                          </span>
                          <span
                            className={cn(
                              'tabular-nums',
                              childDelta > 0 &&
                                'font-medium text-emerald-600 dark:text-emerald-400',
                            )}
                          >
                            {child.value}
                          </span>
                        </div>
                        <StatProgressBar
                          value={child.value}
                          delta={childDelta}
                          max={meterMax}
                          variant="child"
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
