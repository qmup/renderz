import { PlayerImage } from '@/components/players/player-image';
import { formatCoinAmount } from '@/lib/display';

export function StarSigningsPrice({
  playerId,
  buy,
  sell,
}: {
  playerId: string;
  buy?: number;
  sell?: number;
}) {
  if (buy === undefined && sell === undefined) {
    return (
      <p className="text-muted-foreground mt-3 text-center text-xs">
        Star Signings price unavailable
      </p>
    );
  }

  if (sell === undefined) return null;

  return (
    <p className="text-muted-foreground mt-2 flex items-center justify-center gap-1 text-[11px] tabular-nums">
      <span className="tracking-[0.12em] uppercase">Sell</span>
      <PlayerImage
        id={playerId}
        kind="star-shard"
        alt=""
        width={12}
        height={12}
        hideOnError
        className="size-3 shrink-0"
      />
      <span>{formatCoinAmount(sell)}</span>
    </p>
  );
}
