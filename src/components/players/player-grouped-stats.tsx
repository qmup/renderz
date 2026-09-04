import { groupStatsFromPlayerStats } from '@/lib/stats';
import { cn } from '@/lib/utils';

export function PlayerGroupedStats({
  stats,
  className,
}: {
  stats: Array<{ key: string; value: number; label?: string }>;
  className?: string;
}) {
  const items = groupStatsFromPlayerStats(stats);
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className={cn('grid w-full grid-cols-6 gap-1 sm:flex sm:w-auto sm:items-stretch sm:gap-2', className)}>
      {items.map((stat) => (
        <li
          key={stat.key}
          className="bg-muted flex min-w-0 flex-col items-center justify-center rounded-md px-0.5 py-1.5 sm:min-w-12 sm:px-2.5 sm:py-2"
        >
          <span className="font-heading text-xs leading-none tabular-nums sm:text-sm">
            {stat.value}
          </span>
          <span className="text-muted-foreground mt-0.5 text-[9px] tracking-wide sm:text-[10px]">
            {stat.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
