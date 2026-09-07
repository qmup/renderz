'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  PLAYER_SORT_OPTIONS,
  formatProgramFacetLabel,
  positionFilterGroups,
  toggleListValue,
} from '@/components/players/player-filter-shared';
import { programLogoSrc, sortProgramFacets } from '@/lib/catalog/programs';
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
  const filterCount = countPlayerListFilters(query);

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
          <Label htmlFor={`${idPrefix}-search`}>Search</Label>
          <Input
            id={`${idPrefix}-search`}
            value={searchDraft}
            onChange={(event) => onSearchDraft(event.target.value)}
            placeholder="Search players…"
            autoComplete="off"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5 border-b border-border pb-3">
        <Label htmlFor={`${idPrefix}-sort`}>Sort</Label>
        <select
          id={`${idPrefix}-sort`}
          className="border-input h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={query.sort}
          onChange={(event) =>
            onReplaceQuery({
              ...query,
              q: searchDraft,
              sort: event.target.value as PlayerListQuery['sort'],
              page: 1,
            })
          }
        >
          {PLAYER_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <FacetAccordion
        title="Program / Event"
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
        title="Position"
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
        title="OVR Rating"
        selectedCount={
          (query.filters.ratingMin !== undefined ? 1 : 0) +
          (query.filters.ratingMax !== undefined ? 1 : 0)
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-rating-min`}>Minimum</Label>
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
            <Label htmlFor={`${idPrefix}-rating-max`}>Maximum</Label>
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
        title="Leagues"
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
        title="Nations"
        selectedCount={query.filters.nations.length}
      >
        <SearchableFacetList
          idPrefix={`${idPrefix}-nation`}
          options={facets?.nations ?? []}
          selected={query.filters.nations}
          onToggle={(value) => toggleFacet('nations', value)}
        />
      </FacetAccordion>
      <FacetAccordion title="Clubs" selectedCount={query.filters.clubs.length}>
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
        <span>Auctionable only</span>
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
          Clear filters
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
  const switchId = `${idPrefix}-include-alt`;
  const groups = positionFilterGroups(extraValues);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor={switchId}
          className="cursor-pointer text-sm font-normal"
        >
          Include alternate positions
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
            {group.label}
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
  if (!src) {
    return null;
  }
  return (
    <img
      src={src}
      alt=""
      className="size-6 shrink-0 object-contain"
      onError={(event) => {
        event.currentTarget.style.display = 'none';
      }}
    />
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
  return (
    <details open={defaultOpen} className="group border-b border-border py-1">
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
      <div className="pb-3">{children}</div>
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
  const [needle, setNeedle] = useState('');
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

  if (options.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        No options in this catalog.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {options.length > 8 ? (
        <Input
          id={`${idPrefix}-search`}
          value={needle}
          onChange={(event) => setNeedle(event.target.value)}
          placeholder="Search options…"
          autoComplete="off"
          className="h-8"
        />
      ) : null}
      <ul className="flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-0.5">
        {filtered.map((option) => {
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
            No matching options
          </li>
        ) : null}
      </ul>
    </div>
  );
}
