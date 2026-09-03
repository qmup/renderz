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
    <ul className={cn('flex items-stretch gap-3', className)}>
      {items.map((stat) => (
        <li
          key={stat.key}
          className="bg-muted flex min-w-15 flex-col items-center justify-center rounded-md px-3 py-3"
        >
          <span className="font-heading text-sm leading-none tabular-nums">
            {stat.value}
          </span>
          <span className="text-muted-foreground mt-0.5 text-[10px] tracking-wide">
            {stat.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
