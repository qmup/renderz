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
      <p className="text-muted-foreground mt-3 max-w-[208px] text-center text-xs">
        Star Signings price unavailable
      </p>
    );
  }

  return (
    <div className="mt-3 flex w-full max-w-[208px] flex-col gap-1.5">
      <p className="text-muted-foreground text-center text-[10px] tracking-[0.16em] uppercase">
        Star Signings
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <PriceChip playerId={playerId} label="Buy" value={buy} />
        <PriceChip playerId={playerId} label="Sell" value={sell} />
      </div>
    </div>
  );
}

function PriceChip({
  playerId,
  label,
  value,
}: {
  playerId: string;
  label: string;
  value?: number;
}) {
  return (
    <div className="bg-card rounded-lg border px-2 py-1.5 text-center">
      <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
        {label}
      </p>
      {value !== undefined ? (
        <p className="flex items-center justify-center gap-1 text-sm font-medium tabular-nums">
          <PlayerImage
            id={playerId}
            kind="star-shard"
            alt=""
            width={14}
            height={14}
            hideOnError
            className="size-3.5 shrink-0"
          />
          <span>{formatCoinAmount(value)}</span>
        </p>
      ) : (
        <p className="text-sm font-medium tabular-nums">—</p>
      )}
    </div>
  );
}
