import { PlayerImage } from '@/components/players/player-image';
import {
  displayPlayStyleLabel,
  displayTraitLabel,
} from '@/lib/display';
import {
  playStyleImageKind,
  traitImageKind,
  type PlayStyle,
  type PlayerTrait,
} from '@/lib/domain/player';

export function PlayerPlayStyles({
  playerId,
  styles,
  compact = false,
}: {
  playerId: string;
  styles: PlayStyle[];
  compact?: boolean;
}) {
  const items = styles.flatMap((style) => {
    const label = displayPlayStyleLabel(style);
    if (!label) {
      return [];
    }
    return [
      {
        id: style.id,
        label,
        description: style.description,
        level: style.level,
        kind: playStyleImageKind(style.id),
      },
    ];
  });
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2 text-left">
      {compact ? (
        <h2 className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
          Play styles
        </h2>
      ) : (
        <h2 className="font-heading text-lg font-medium">Play styles</h2>
      )}
      <ul className={compact ? 'flex flex-col gap-2' : 'grid gap-2 sm:grid-cols-2'}>
        {items.map((style) => (
          <li
            key={style.id}
            className="bg-card flex items-start gap-3 rounded-xl border p-2.5 sm:p-3"
          >
            <div className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-lg">
              {style.kind ? (
                <PlayerImage
                  id={playerId}
                  kind={style.kind}
                  alt=""
                  width={32}
                  height={32}
                  hideOnError
                  className="size-8"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm leading-tight font-semibold">{style.label}</p>
                {style.level !== undefined ? (
                  <span className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                    Level {style.level}
                  </span>
                ) : null}
              </div>
              {style.description ? (
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {style.description}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PlayerHiddenStats({
  playerId,
  traits,
}: {
  playerId: string;
  traits: PlayerTrait[];
}) {
  const items = traits.flatMap((trait) => {
    const label = displayTraitLabel(trait) ?? `Trait ${trait.id}`;
    return [
      {
        id: trait.id,
        label,
        kind: traitImageKind(trait.id),
      },
    ];
  });
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-medium">Hidden stats</h2>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
        {items.map((trait) => (
          <li
            key={trait.id}
            className="bg-card flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center"
          >
            <div className="bg-muted flex size-12 items-center justify-center rounded-lg">
              {trait.kind ? (
                <PlayerImage
                  id={playerId}
                  kind={trait.kind}
                  alt=""
                  width={40}
                  height={40}
                  hideOnError
                  className="size-10"
                />
              ) : null}
            </div>
            <span className="text-xs leading-tight font-medium">{trait.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
