'use client';

import { useMemo } from 'react';
import {
  ArrowUpIcon,
  LockIcon,
  RotateCcwIcon,
  SparklesIcon,
} from 'lucide-react';
import { PlayerImage } from '@/components/players/player-image';
import { RankSpriteIcon } from '@/components/players/rank-sprite-icon';
import { usePreferences } from '@/components/providers/preferences-provider';
import { Badge } from '@/components/ui/badge';
import { skillImageKind, type SkillNode } from '@/lib/domain/player';
import { statLabel } from '@/lib/stats';
import {
  getSkillStates,
  remainingSkillPoints,
  selectRankState,
  selectTrainingState,
  toggleSkillToMax,
  type PlayerUpgradeState,
  type RankLevel,
  type SkillViewState,
  type TrainingLevel,
} from '@/lib/upgrades';
import { cn } from '@/lib/utils';

const SELECTABLE_RANKS: readonly RankLevel[] = [1, 2, 3, 4, 5, 6];

export function PlayerUpgradeControls({
  playerId,
  skills,
  state,
  onChange,
}: {
  playerId: string;
  skills: readonly SkillNode[];
  state: PlayerUpgradeState;
  onChange: (next: PlayerUpgradeState) => void;
}) {
  const { m: copy } = usePreferences();

  const skillStates = useMemo(
    () => getSkillStates(skills, state.skillUpgrades, state.rank),
    [skills, state.skillUpgrades, state.rank],
  );
  const remaining = remainingSkillPoints(state.rank, state.skillUpgrades);
  const hasSkills = skillStates.length > 0;
  const hasUpgradedSkills = state.skillUpgrades.length > 0;

  const handleSelectRank = (rank: RankLevel) => {
    const nextRank: RankLevel =
      rank > 0 && state.rank === rank ? 0 : rank;
    onChange(selectRankState(state, nextRank));
  };

  const handleResetRank = () => {
    onChange(selectRankState(state, 0));
  };

  const handleSelectTraining = (level: TrainingLevel) => {
    onChange(selectTrainingState(state, level));
  };

  const handleResetSkills = () => {
    onChange({ ...state, skillUpgrades: [] });
  };

  const handleClickSkill = (skillId: string) => {
    const nextUpgrades = toggleSkillToMax(
      skills,
      state.skillUpgrades,
      skillId,
      state.rank,
    );
    onChange({ ...state, skillUpgrades: nextUpgrades });
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        {/* Select Rank (0 to 6) */}
        <div className="bg-card flex flex-col gap-3 rounded-xl border p-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading text-sm font-semibold">
              {copy.selectRank}
            </h2>
            {state.rank > 0 ? (
              <button
                type="button"
                onClick={handleResetRank}
                className="text-destructive hover:text-destructive/80 inline-flex items-center gap-1 text-xs font-medium transition-colors"
              >
                <RotateCcwIcon className="size-3" />
                {copy.resetRank}
              </button>
            ) : null}
          </div>

          <div
            role="radiogroup"
            aria-label={copy.selectRank}
            className="grid flex-1 grid-cols-3 gap-1.5 sm:grid-cols-6"
          >
            {SELECTABLE_RANKS.map((rank) => {
              const selected = state.rank === rank;
              return (
                <button
                  key={rank}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={copy.rankOption(rank)}
                  onClick={() => handleSelectRank(rank)}
                  className={cn(
                    'relative flex min-h-13 flex-col items-center justify-center rounded-lg border transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-primary bg-primary/10 ring-primary/25 ring-2'
                      : 'border-border bg-muted/40 hover:bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 right-1 text-[10px] leading-none font-bold tabular-nums',
                      selected ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {rank}
                  </span>
                  <RankSpriteIcon
                    playerId={playerId}
                    rank={rank}
                    size={rank === 6 ? 34 : 28}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Select Training (ONLY Level 0 and Level 30) */}
        <div className="bg-card flex flex-col gap-3 rounded-xl border p-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading text-sm font-semibold">
              {copy.selectTraining}
            </h2>
            {state.trainingLevel === 30 ? (
              <button
                type="button"
                onClick={() => handleSelectTraining(0)}
                className="text-destructive hover:text-destructive/80 inline-flex items-center gap-1 text-xs font-medium transition-colors"
              >
                <RotateCcwIcon className="size-3" />
                {copy.resetTraining}
              </button>
            ) : null}
          </div>

          <div
            role="radiogroup"
            aria-label={copy.selectTraining}
            className="grid flex-1 grid-cols-2 gap-2"
          >
            {(
              [
                {
                  level: 0 as const,
                  title: copy.trainingMinLabel,
                  sub: copy.trainingMinSub,
                },
                {
                  level: 30 as const,
                  title: copy.trainingMaxLabel,
                  sub: copy.trainingMaxSub,
                },
              ] as const
            ).map((option) => {
              const selected = state.trainingLevel === option.level;
              return (
                <button
                  key={option.level}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleSelectTraining(option.level)}
                  className={cn(
                    'flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-2 text-center transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-primary bg-primary/10 text-primary ring-primary/25 ring-2'
                      : 'border-border bg-muted/40 text-foreground hover:bg-muted',
                  )}
                >
                  <span className="font-heading text-sm leading-tight font-semibold tabular-nums">
                    {option.title}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] tracking-wider uppercase',
                      selected ? 'text-primary/80' : 'text-muted-foreground',
                    )}
                  >
                    {option.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Skills Grid — 1-click toggles straight to max affordable level */}
      {hasSkills ? (
        <div className="bg-card flex flex-col gap-3 rounded-xl border p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-sm font-semibold">
                {copy.skills}
              </h2>
              {state.rank > 0 ? (
                <Badge variant="secondary" className="tabular-nums">
                  {copy.skillPointsCost(remaining)}
                </Badge>
              ) : null}
            </div>
            {hasUpgradedSkills ? (
              <button
                type="button"
                onClick={handleResetSkills}
                className="text-destructive hover:text-destructive/80 inline-flex items-center gap-1 text-xs font-medium transition-colors"
              >
                <RotateCcwIcon className="size-3" />
                {copy.resetSkills}
              </button>
            ) : null}
          </div>

          {state.rank === 0 ? (
            <p className="text-muted-foreground text-xs">
              {copy.skillRequiresRankHint}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            {skillStates.map((skill) => (
              <SkillTile
                key={skill.id}
                playerId={playerId}
                skill={skill}
                onClick={() => handleClickSkill(skill.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function skillTooltip(skill: SkillViewState): string | undefined {
  const maxLvl = skill.levelsState[skill.levelsState.length - 1];
  if (!maxLvl) {
    return undefined;
  }
  const boosts = Object.entries(maxLvl.abilityModifiers)
    .map(([key, bonus]) => `${statLabel(key)} +${bonus}`)
    .join(', ');
  return boosts ? `${skill.name} (LVL ${maxLvl.level}): ${boosts}` : skill.name;
}

function SkillTile({
  playerId,
  skill,
  onClick,
}: {
  playerId: string;
  skill: SkillViewState;
  onClick: () => void;
}) {
  const { m: copy } = usePreferences();
  const iconKind = skillImageKind(skill.id);
  const upgraded = skill.currentLevel > 0;
  const locked = skill.isDisabled && !upgraded;

  const footerText =
    !skill.isRequirementMet && skill.requirement
      ? copy.skillUnlocksAfter(
          skill.requirement.skillName,
          skill.requirement.level,
        )
      : copy.skillLevelShort(skill.currentLevel);

  return (
    <button
      type="button"
      disabled={locked}
      onClick={onClick}
      title={skillTooltip(skill)}
      aria-pressed={upgraded}
      className={cn(
        'group relative flex min-h-32 flex-col items-center justify-between overflow-hidden rounded-xl border text-center transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
        upgraded
          ? 'border-emerald-500/60 bg-emerald-500/8 hover:bg-emerald-500/12 dark:border-emerald-400/50 dark:bg-emerald-400/10'
          : locked
            ? 'border-border bg-muted/30 cursor-not-allowed opacity-55 grayscale'
            : 'border-border bg-muted/40 hover:border-primary/60 hover:bg-muted/80',
      )}
    >
      <span className="pointer-events-none absolute top-1.5 right-1.5">
        {upgraded ? (
          <ArrowUpIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : locked ? (
          <LockIcon className="text-muted-foreground size-3" />
        ) : null}
      </span>

      <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-2 pt-3 pb-2">
        <div className="bg-background/70 flex size-11 items-center justify-center rounded-lg border border-black/5 dark:border-white/10">
          {iconKind ? (
            <PlayerImage
              id={playerId}
              kind={iconKind}
              alt=""
              width={36}
              height={36}
              hideOnError
              className="size-9 object-contain"
            />
          ) : (
            <SparklesIcon className="text-muted-foreground size-5" />
          )}
        </div>
        <span className="line-clamp-2 text-[11px] leading-tight font-semibold">
          {skill.name}
        </span>
      </div>

      <div
        className={cn(
          'flex min-h-7 w-full items-center justify-center px-2 py-1 text-[10px] leading-tight font-medium',
          upgraded
            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            : 'bg-muted/80 text-muted-foreground',
        )}
      >
        <span>{footerText}</span>
      </div>
    </button>
  );
}
