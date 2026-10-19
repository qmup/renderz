import { MarketRefresh } from '@/components/players/market-refresh';
import { displayLabel } from '@/lib/display';
import type { Player } from '@/lib/domain/player';
import { messages, type Messages } from '@/lib/i18n/messages';
import { getLocale } from '@/lib/i18n/server';

type BioItem = {
  label: string;
  value?: string;
};

function itemsFromPlayer(player: Player, copy: Messages): BioItem[] {
  return [
    { label: copy.birthday, value: player.birthday },
    {
      label: copy.heightWeight,
      value:
        player.heightCm && player.weightKg
          ? `${player.heightCm} cm / ${player.weightKg} kg`
          : player.heightCm
            ? `${player.heightCm} cm`
            : player.weightKg
              ? `${player.weightKg} kg`
              : undefined,
    },
    {
      label: copy.feet,
      value: displayLabel(player.foot) + ' / ' + displayLabel(player.weakFoot),
    },
    { label: copy.skillMoves, value: displayLabel(player.skillMovesLevel) },
    {
      label: copy.workRates,
      value:
        player.workRateAtt || player.workRateDef
          ? `${displayLabel(player.workRateAtt) ?? '—'} / ${displayLabel(player.workRateDef) ?? '—'}`
          : undefined,
    },
  ];
}

export async function PlayerBio({ player }: { player: Player }) {
  const copy = messages[await getLocale()];
  const items = itemsFromPlayer(player, copy);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-medium">{copy.bio}</h2>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-card rounded-xl border px-3 py-2.5"
          >
            <dt className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
              {item.label}
            </dt>
            <dd className="mt-1 text-sm font-medium">{item.value ?? '—'}</dd>
          </div>
        ))}
        {player.auctionable === true ? (
          <MarketRefresh playerId={player.id} />
        ) : null}
      </dl>
    </section>
  );
}
