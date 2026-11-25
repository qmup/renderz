'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { PlayerCardArt } from '@/components/players/player-card-art';
import { PlayerDetailStats } from '@/components/players/player-detail-stats';
import { PlayerUpgradeControls } from '@/components/players/player-upgrade-controls';
import { usePreferences } from '@/components/providers/preferences-provider';
import { Badge } from '@/components/ui/badge';
import { cardDisplayName, type Player } from '@/lib/domain/player';
import {
  INITIAL_UPGRADE_STATE,
  computeUpgradedPlayer,
  type PlayerUpgradeState,
} from '@/lib/upgrades';

export function PlayerDetailInteractive({
  player,
  program,
  overlayColors,
  loopSrc,
  priceSlot,
  playStylesSlot,
  bioSlot,
  hiddenStatsSlot,
}: {
  player: Player;
  program?: string;
  overlayColors: { name: string; rating: string; position: string };
  loopSrc?: string;
  priceSlot: ReactNode;
  playStylesSlot: ReactNode;
  bioSlot: ReactNode;
  hiddenStatsSlot: ReactNode;
}) {
  const { m: copy } = usePreferences();
  const [upgradeState, setUpgradeState] = useState<PlayerUpgradeState>(
    INITIAL_UPGRADE_STATE,
  );

  const upgraded = useMemo(
    () => computeUpgradedPlayer(player, upgradeState),
    [player, upgradeState],
  );

  const extraUnlockedPositions = useMemo(
    () =>
      upgraded.unlockedPositions.filter(
        (pos) =>
          pos !== player.position && !player.altPositions.includes(pos),
      ),
    [player.altPositions, player.position, upgraded.unlockedPositions],
  );

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="mx-auto flex w-64 shrink-0 flex-col items-center sm:mx-0">
          <PlayerCardArt
            id={player.id}
            kinds={player.availableImageKinds}
            rating={upgraded.rating}
            position={player.position}
            auctionable={player.auctionable}
            displayName={cardDisplayName(player)}
            playStyles={player.playStyles}
            price={player.starSigningsBuy}
            nameColor={overlayColors.name}
            ratingColor={overlayColors.rating}
            positionColor={overlayColors.position}
            size={256}
            priority
            animate
            loopSrc={loopSrc}
            rank={upgraded.rank}
            trainingLevel={upgraded.trainingLevel}
          />
          {priceSlot}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 text-center sm:text-left">
          <div>
            <p className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase sm:text-xs">
              {program ?? 'FC Mobile'}
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              {player.name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="font-heading text-3xl tabular-nums sm:text-4xl">
              {upgraded.rating}
            </span>
            {upgraded.rank > 0 ? (
              <Badge
                variant="secondary"
                className="bg-emerald-500/15 text-emerald-700 tabular-nums dark:text-emerald-300"
              >
                +{upgraded.rank}
              </Badge>
            ) : null}
            {upgraded.trainingLevel > 0 ? (
              <Badge variant="secondary" className="tabular-nums">
                {copy.trainingLevelBadge(upgraded.trainingLevel)}
              </Badge>
            ) : null}
            {player.position ? <Badge>{player.position}</Badge> : null}
            {player.altPositions.map((position) => (
              <Badge key={position} variant="secondary">
                {position}
              </Badge>
            ))}
            {extraUnlockedPositions.map((position) => (
              <Badge
                key={`unlocked-${position}`}
                variant="secondary"
                className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              >
                {position}
              </Badge>
            ))}
            {player.auctionable === true ? (
              <Badge variant="outline">{copy.auctionable}</Badge>
            ) : player.auctionable === false ? (
              <Badge variant="outline">{copy.untradeable}</Badge>
            ) : null}
          </div>
          {playStylesSlot}
        </div>
      </header>

      <PlayerUpgradeControls
        playerId={player.id}
        skills={player.skills}
        state={upgradeState}
        onChange={setUpgradeState}
      />

      {bioSlot}
      {hiddenStatsSlot}

      <PlayerDetailStats
        stats={upgraded.stats}
        position={player.position}
        deltas={upgraded.deltas}
      />
    </>
  );
}
