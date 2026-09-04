import { displayLabel } from '@/lib/display';
import type { Player } from '@/lib/domain/player';

type BioItem = {
  label: string;
  value?: string;
};

function itemsFromPlayer(player: Player): BioItem[] {
  return [
    {
      label: 'Height',
      value: player.heightCm ? `${player.heightCm} cm` : undefined,
    },
    {
      label: 'Weight',
      value: player.weightKg ? `${player.weightKg} kg` : undefined,
    },
    { label: 'Foot', value: displayLabel(player.foot) },
    {
      label: 'Weak foot',
      value: displayLabel(player.weakFoot) ?? player.weakFoot,
    },
    {
      label: 'Skill moves',
      value: displayLabel(player.skillMovesLevel) ?? player.skillMovesLevel,
    },
    {
      label: 'Work rates',
      value:
        player.workRateAtt || player.workRateDef
          ? `${displayLabel(player.workRateAtt) ?? '—'} / ${displayLabel(player.workRateDef) ?? '—'}`
          : undefined,
    },
    { label: 'Birthday', value: player.birthday },
    {
      label: 'Total stats',
      value: player.totalStats !== undefined ? String(player.totalStats) : undefined,
    },
    {
      label: 'Meta',
      value: player.metaRating !== undefined ? String(player.metaRating) : undefined,
    },
  ];
}

export function PlayerBio({ player }: { player: Player }) {
  const items = itemsFromPlayer(player);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-medium">Bio</h2>
      <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
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
      </dl>
    </section>
  );
}
