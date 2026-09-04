import { groupStatsFromPlayerStats } from '@/lib/stats';
import { cn } from '@/lib/utils';

export function PlayerGroupedStats({
  stats,
  className,
  compact = false,
}: {
  stats: Array<{ key: string; value: number; label?: string }>;
  className?: string;
  compact?: boolean;
}) {
  const items = groupStatsFromPlayerStats(stats);
  if (items.length === 0) {
    return null;
  }
  return (
    <ul
      className={cn(
        compact
          ? 'grid shrink-0 grid-cols-3 gap-x-1 gap-y-0.5 md:flex md:w-auto md:flex-none md:flex-nowrap md:items-stretch md:gap-1.5'
          : 'grid w-full min-w-0 grid-cols-3 gap-1 md:flex md:w-auto md:flex-wrap md:items-stretch md:gap-2',
        className,
      )}
    >
      {items.map((stat) => (
        <li
          key={stat.key}
          className={cn(
            'bg-muted flex min-w-0 flex-col items-center justify-center rounded-md',
            compact
              ? 'min-w-8 px-0.5 py-px md:w-11 md:min-w-11 md:flex-none md:px-1 md:py-1'
              : 'px-1 py-1 md:min-w-14 md:px-2.5 md:py-2',
          )}
        >
          <span
            className={cn(
              'font-heading leading-none tabular-nums',
              compact ? 'text-[9px] md:text-xs' : 'text-[11px] md:text-sm',
            )}
          >
            {stat.value}
          </span>
          <span
            className={cn(
              'text-muted-foreground tracking-wide',
              compact
                ? 'text-[7px] leading-none md:mt-0.5 md:text-[9px]'
                : 'mt-0.5 text-[9px] md:text-[10px]',
            )}
          >
            {stat.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
