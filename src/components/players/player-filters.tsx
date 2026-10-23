'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  PLAYER_SORT_OPTIONS,
  formatProgramFacetLabel,
  positionFilterGroups,
  toggleListValue,
} from '@/components/players/player-filter-shared';
import { programLogoSrc, sortProgramFacets } from '@/lib/catalog/programs';
import { usePreferences } from '@/components/providers/preferences-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  FacetValue,
  PlayerListFacets,
  PlayerListQuery,
} from '@/lib/domain/query';
import {
  countPlayerListFilters,
  playerListQueryFromSearchParams,
} from '@/lib/domain/query';
import { cn } from '@/lib/utils';

const FACET_OPTION_WINDOW = 40;

export function PlayerFilters({
  query,
  searchDraft,
  facets,
  idPrefix,
  includeSearch = false,
  onSearchDraft,
  onReplaceQuery,
}: {
  query: PlayerListQuery;
  searchDraft: string;
  facets?: PlayerListFacets;
  idPrefix: string;
  includeSearch?: boolean;
  onSearchDraft: (value: string) => void;
  onReplaceQuery: (next: PlayerListQuery) => void;
}) {
  const { m } = usePreferences();
  const filterCount = countPlayerListFilters(query);
  const sortLabels: Partial<Record<PlayerListQuery['sort'], string>> = {
    added_desc: m.sortNewest,
    rating_desc: m.sortRatingHigh,
  };

  function patchFilters(filters: PlayerListQuery['filters']) {
    onReplaceQuery({
      ...query,
      q: searchDraft,
      page: 1,
      filters,
    });
  }

  function toggleFacet(
    key: 'positions' | 'programIds' | 'nations' | 'clubs' | 'leagues',
    value: string,
  ) {
    patchFilters({
      ...query.filters,
      [key]: toggleListValue(query.filters[key], value),
    });
  }

  return (
    <div className="flex flex-col">
      {includeSearch ? (
        <div className="flex flex-col gap-1.5 pb-3">
          <Label htmlFor={`${idPrefix}-search`}>{m.search}</Label>
          <Input
            id={`${idPrefix}-search`}
            value={searchDraft}
            onChange={(event) => onSearchDraft(event.target.value)}
            placeholder={m.searchPlayers}
            autoComplete="off"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5 border-b border-border pb-3">
        <span className="text-sm leading-none font-medium">{m.sort}</span>
        <div role="group" aria-label={m.sort} className="grid grid-cols-2 gap-1.5">
          {PLAYER_SORT_OPTIONS.map((option) => {
            const active = query.sort === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  if (active) {
                    return;
                  }
                  onReplaceQuery({
                    ...query,
                    q: searchDraft,
                    sort: option.value,
                    page: 1,
                  });
                }}
                className={cn(
                  'h-8 rounded-lg text-sm font-medium transition-colors',
                  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/80 text-foreground hover:bg-muted',
                )}
              >
                {sortLabels[option.value] ?? option.label}
              </button>
            );
          })}
        </div>
      </div>
      <FacetAccordion
        title={m.programEvent}
        defaultOpen
        selectedCount={query.filters.programIds.length}
      >
        <SearchableFacetList
          idPrefix={`${idPrefix}-program`}
          options={sortProgramFacets(facets?.programs ?? [])}
          selected={query.filters.programIds}
          labelFor={formatProgramFacetLabel}
          iconSrcFor={programLogoSrc}
          hideCount
          onToggle={(value) => toggleFacet('programIds', value)}
        />
      </FacetAccordion>
      <FacetAccordion
        title={m.position}
        selectedCount={query.filters.positions.length}
      >
        <PositionFacet
          idPrefix={`${idPrefix}-position`}
          selected={query.filters.positions}
          includeAltPositions={query.filters.includeAltPositions}
          extraValues={(facets?.positions ?? []).map((option) => option.value)}
          onToggle={(value) => toggleFacet('positions', value)}
          onIncludeAltChange={(includeAltPositions) =>
            patchFilters({
              ...query.filters,
              includeAltPositions,
            })
          }
        />
      </FacetAccordion>
      <FacetAccordion
        title={m.ovrRating}
        selectedCount={
          (query.filters.ratingMin !== undefined ? 1 : 0) +
          (query.filters.ratingMax !== undefined ? 1 : 0)
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-rating-min`}>{m.minimum}</Label>
            <Input
              id={`${idPrefix}-rating-min`}
              inputMode="numeric"
              value={query.filters.ratingMin ?? ''}
              onChange={(event) => {
                const raw = event.target.value.trim();
                const parsed = Number(raw);
                patchFilters({
                  ...query.filters,
                  ratingMin:
                    raw && Number.isFinite(parsed) ? parsed : undefined,
                });
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-rating-max`}>{m.maximum}</Label>
            <Input
              id={`${idPrefix}-rating-max`}
              inputMode="numeric"
              value={query.filters.ratingMax ?? ''}
              onChange={(event) => {
                const raw = event.target.value.trim();
                const parsed = Number(raw);
                patchFilters({
                  ...query.filters,
                  ratingMax:
                    raw && Number.isFinite(parsed) ? parsed : undefined,
                });
              }}
            />
          </div>
        </div>
      </FacetAccordion>
      <FacetAccordion
        title={m.leagues}
        selectedCount={query.filters.leagues.length}
      >
        <SearchableFacetList
          idPrefix={`${idPrefix}-league`}
          options={facets?.leagues ?? []}
          selected={query.filters.leagues}
          onToggle={(value) => toggleFacet('leagues', value)}
        />
      </FacetAccordion>
      <FacetAccordion
        title={m.nations}
        selectedCount={query.filters.nations.length}
      >
        <SearchableFacetList
          idPrefix={`${idPrefix}-nation`}
          options={facets?.nations ?? []}
          selected={query.filters.nations}
          onToggle={(value) => toggleFacet('nations', value)}
        />
      </FacetAccordion>
      <FacetAccordion title={m.clubs} selectedCount={query.filters.clubs.length}>
        <SearchableFacetList
          idPrefix={`${idPrefix}-club`}
          options={facets?.clubs ?? []}
          selected={query.filters.clubs}
          onToggle={(value) => toggleFacet('clubs', value)}
        />
      </FacetAccordion>

      <label
        htmlFor={`${idPrefix}-auctionable`}
        className="flex cursor-pointer items-center justify-between gap-3 border-t border-border py-3 text-sm"
      >
        <span>{m.auctionableOnly}</span>
        <input
          id={`${idPrefix}-auctionable`}
          type="checkbox"
          className="border-input accent-foreground size-4 rounded border"
          checked={query.filters.auctionable === true}
          onChange={(event) =>
            patchFilters({
              ...query.filters,
              auctionable: event.target.checked ? true : undefined,
            })
          }
        />
      </label>

      {filterCount > 0 ? (
        <Button
          type="button"
          variant="outline"
          className="mt-1"
          onClick={() => {
            onSearchDraft('');
            onReplaceQuery({
              ...playerListQueryFromSearchParams(new URLSearchParams()),
              view: query.view,
            });
          }}
        >
          {m.clearFilters}
        </Button>
      ) : null}
    </div>
  );
}

function PositionFacet({
  idPrefix,
  selected,
  includeAltPositions,
  extraValues,
  onToggle,
  onIncludeAltChange,
}: {
  idPrefix: string;
  selected: string[];
  includeAltPositions: boolean;
  extraValues: string[];
  onToggle: (value: string) => void;
  onIncludeAltChange: (value: boolean) => void;
}) {
  const { m } = usePreferences();
  const switchId = `${idPrefix}-include-alt`;
  const groups = positionFilterGroups(extraValues);
  const groupLabels: Record<string, string> = {
    ATTACK: m.positionAttack,
    MIDFIELD: m.positionMidfield,
    DEFENCE: m.positionDefence,
    OTHER: m.positionOther,
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor={switchId}
          className="cursor-pointer text-sm font-normal"
        >
          {m.includeAltPositions}
        </Label>
        <button
          id={switchId}
          type="button"
          role="switch"
          aria-checked={includeAltPositions}
          onClick={() => onIncludeAltChange(!includeAltPositions)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            includeAltPositions ? 'bg-primary' : 'bg-input',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform',
              includeAltPositions ? 'translate-x-4' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            {groupLabels[group.label] ?? group.label}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {group.positions.map((position) => {
              const checked = selected.includes(position);
              return (
                <button
                  key={position}
                  type="button"
                  aria-pressed={checked}
                  onClick={() => onToggle(position)}
                  className={cn(
                    'h-10 rounded-lg text-sm font-bold transition-colors',
                    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                    checked
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/80 text-foreground hover:bg-muted',
                  )}
                >
                  {position}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FacetOptionIcon({ src }: { src?: string }) {
  return (
    <span
      className="inline-flex size-6 shrink-0 items-center justify-center"
      aria-hidden
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="size-6 object-contain"
          onError={(event) => {
            event.currentTarget.style.visibility = 'hidden';
          }}
        />
      ) : null}
    </span>
  );
}

function FacetAccordion({
  title,
  defaultOpen = false,
  selectedCount,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  selectedCount: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group border-b border-border py-1"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="text-muted-foreground flex items-center gap-2 text-xs tabular-nums">
          {selectedCount > 0 ? selectedCount : null}
          <span
            aria-hidden
            className="inline-block transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </span>
      </summary>
      {open ? <div className="pb-3">{children}</div> : null}
    </details>
  );
}

function SearchableFacetList({
  idPrefix,
  options,
  selected,
  labelFor,
  iconSrcFor,
  hideCount = false,
  onToggle,
}: {
  idPrefix: string;
  options: FacetValue[];
  selected: string[];
  labelFor?: (value: string) => string;
  iconSrcFor?: (value: string) => string | undefined;
  hideCount?: boolean;
  onToggle: (value: string) => void;
}) {
  const { m } = usePreferences();
  const [needle, setNeedle] = useState('');
  const [shown, setShown] = useState(FACET_OPTION_WINDOW);
  const filtered = useMemo(() => {
    const q = needle.trim().toLowerCase();
    if (!q) {
      return options;
    }
    return options.filter((option) => {
      const label = labelFor?.(option.value) ?? option.value;
      return (
        option.value.toLowerCase().includes(q) ||
        label.toLowerCase().includes(q)
      );
    });
  }, [labelFor, needle, options]);
  const visible = filtered.slice(0, shown);

  if (options.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">{m.noFacetOptions}</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {options.length > 8 ? (
        <Input
          id={`${idPrefix}-search`}
          value={needle}
          onChange={(event) => {
            setNeedle(event.target.value);
            setShown(FACET_OPTION_WINDOW);
          }}
          placeholder={m.searchOptions}
          autoComplete="off"
          className="h-8"
        />
      ) : null}
      <ul className="flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-0.5">
        {visible.map((option) => {
          const label = labelFor?.(option.value) ?? option.value;
          const checked = selected.includes(option.value);
          const inputId = `${idPrefix}-${option.value}`;
          return (
            <li key={option.value}>
              <label
                htmlFor={inputId}
                className={cn(
                  'hover:bg-muted/70 flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm',
                  checked && 'bg-muted/80',
                )}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  className="border-input accent-foreground size-3.5 rounded border"
                  checked={checked}
                  onChange={() => onToggle(option.value)}
                />
                {iconSrcFor ? (
                  <FacetOptionIcon src={iconSrcFor(option.value)} />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {hideCount ? null : (
                  <span className="text-muted-foreground tabular-nums text-xs">
                    {option.count}
                  </span>
                )}
              </label>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="text-muted-foreground px-1.5 py-1 text-xs">
            {m.noMatchingOptions}
          </li>
        ) : null}
      </ul>
      {filtered.length > shown ? (
        <Button
          type="button"
          variant="ghost"
          className="h-8 justify-start px-1.5"
          onClick={() => setShown((current) => current + FACET_OPTION_WINDOW)}
        >
          Show {Math.min(FACET_OPTION_WINDOW, filtered.length - shown)} more
        </Button>
      ) : null}
    </div>
  );
}
