"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlayerListFacets, PlayerListQuery } from "@/lib/domain/query";
import { playerListQueryFromSearchParams } from "@/lib/domain/query";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: Array<{ value: PlayerListQuery["sort"]; label: string }> = [
  { value: "added_desc", label: "Newest added" },
  { value: "rating_desc", label: "Rating (high)" },
  { value: "rating_asc", label: "Rating (low)" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "fetched_desc", label: "Recently fetched" },
];

const selectClassName =
  "h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:text-sm";

export function PlayerFilters({
  query,
  searchDraft,
  facets,
  idPrefix,
  includeSearch,
  onSearchDraft,
  onReplaceQuery,
}: {
  query: PlayerListQuery;
  searchDraft: string;
  facets?: PlayerListFacets;
  idPrefix: string;
  includeSearch: boolean;
  onSearchDraft: (value: string) => void;
  onReplaceQuery: (next: PlayerListQuery) => void;
}) {
  function setFilterValue(
    key: keyof PlayerListQuery["filters"],
    value: string | undefined,
  ) {
    onReplaceQuery({
      ...query,
      q: searchDraft,
      page: 1,
      filters: {
        ...query.filters,
        [key]: value ? [value] : [],
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {includeSearch ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-search`}>Search</Label>
          <Input
            id={`${idPrefix}-search`}
            value={searchDraft}
            onChange={(event) => onSearchDraft(event.target.value)}
            placeholder="Name or slug"
            autoComplete="off"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-sort`}>Sort</Label>
        <select
          id={`${idPrefix}-sort`}
          className={selectClassName}
          value={query.sort}
          onChange={(event) =>
            onReplaceQuery({
              ...query,
              q: searchDraft,
              sort: event.target.value as PlayerListQuery["sort"],
              page: 1,
            })
          }
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {facets?.positions.length ? (
        <FacetSelect
          id={`${idPrefix}-position`}
          label="Position"
          value={query.filters.positions[0] ?? ""}
          options={facets.positions}
          onChange={(value) => setFilterValue("positions", value)}
        />
      ) : null}
      {facets?.programs.length ? (
        <FacetSelect
          id={`${idPrefix}-program`}
          label="Program"
          value={query.filters.programIds[0] ?? ""}
          options={facets.programs}
          onChange={(value) => setFilterValue("programIds", value)}
        />
      ) : null}
      {facets?.nations.length ? (
        <FacetSelect
          id={`${idPrefix}-nation`}
          label="Nation"
          value={query.filters.nations[0] ?? ""}
          options={facets.nations}
          onChange={(value) => setFilterValue("nations", value)}
        />
      ) : null}
      {facets?.clubs.length ? (
        <FacetSelect
          id={`${idPrefix}-club`}
          label="Club"
          value={query.filters.clubs[0] ?? ""}
          options={facets.clubs}
          onChange={(value) => setFilterValue("clubs", value)}
        />
      ) : null}
      {facets?.leagues.length ? (
        <FacetSelect
          id={`${idPrefix}-league`}
          label="League"
          value={query.filters.leagues[0] ?? ""}
          options={facets.leagues}
          onChange={(value) => setFilterValue("leagues", value)}
        />
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-rating-min`}>Min OVR</Label>
          <Input
            id={`${idPrefix}-rating-min`}
            inputMode="numeric"
            value={query.filters.ratingMin ?? ""}
            onChange={(event) => {
              const raw = event.target.value.trim();
              const parsed = Number(raw);
              onReplaceQuery({
                ...query,
                q: searchDraft,
                page: 1,
                filters: {
                  ...query.filters,
                  ratingMin: raw && Number.isFinite(parsed) ? parsed : undefined,
                },
              });
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-rating-max`}>Max OVR</Label>
          <Input
            id={`${idPrefix}-rating-max`}
            inputMode="numeric"
            value={query.filters.ratingMax ?? ""}
            onChange={(event) => {
              const raw = event.target.value.trim();
              const parsed = Number(raw);
              onReplaceQuery({
                ...query,
                q: searchDraft,
                page: 1,
                filters: {
                  ...query.filters,
                  ratingMax: raw && Number.isFinite(parsed) ? parsed : undefined,
                },
              });
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-auctionable`}>Auctionable</Label>
        <select
          id={`${idPrefix}-auctionable`}
          className={selectClassName}
          value={
            query.filters.auctionable === undefined
              ? ""
              : query.filters.auctionable
                ? "true"
                : "false"
          }
          onChange={(event) => {
            const value = event.target.value;
            onReplaceQuery({
              ...query,
              q: searchDraft,
              page: 1,
              filters: {
                ...query.filters,
                auctionable: value === "" ? undefined : value === "true",
              },
            });
          }}
        >
          <option value="">Any</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-10 md:h-8"
        onClick={() => {
          onSearchDraft("");
          onReplaceQuery({
            ...playerListQueryFromSearchParams(new URLSearchParams()),
            view: query.view,
          });
        }}
      >
        Clear filters
      </Button>
    </div>
  );
}

function FacetSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; count: number }>;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className={cn(selectClassName, "truncate")}
        value={value}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.value} ({option.count})
          </option>
        ))}
      </select>
    </div>
  );
}
