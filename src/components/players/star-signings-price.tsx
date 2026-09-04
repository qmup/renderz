import { formatCoinAmount } from '@/lib/display';

export function StarSigningsPrice({
  buy,
  sell,
}: {
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
    <div className="mt-3 flex w-full max-w-[208px] flex-col gap-1.5 px-1 sm:px-0">
      <p className="text-muted-foreground text-center text-[10px] tracking-[0.16em] uppercase">
        Star Signings
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <PriceChip label="Buy" value={buy} />
        <PriceChip label="Sell" value={sell} />
      </div>
    </div>
  );
}

function PriceChip({ label, value }: { label: string; value?: number }) {
  return (
    <div className="bg-card rounded-lg border px-2 py-1.5 text-center">
      <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
        {label}
      </p>
      <p className="text-sm font-medium tabular-nums">
        {value !== undefined ? formatCoinAmount(value) : '—'}
      </p>
    </div>
  );
}
