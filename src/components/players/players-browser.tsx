'use client';

import Link from 'next/link';
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { CatalogNotice } from '@/components/catalog-notice';
import { PlayerFilters } from '@/components/players/player-filters';
import { PlayerCardArt } from '@/components/players/player-card-art';
import { PlayerGroupedStats } from '@/components/players/player-grouped-stats';
import { PlayerPagination } from '@/components/players/player-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { formatAddedDate } from '@/lib/display';
import { cardDisplayName } from '@/lib/domain/player';
import type { PlayerListQuery, PlayerListResult } from '@/lib/domain/query';
import {
  countPlayerListFilters,
  playerListQueryFromSearchParams,
  playerListQueryIsFiltered,
  playerListQueryToSearchParams,
} from '@/lib/domain/query';
import { usePlayerList } from '@/lib/query/hooks';

function queryFromSearch(search: string): PlayerListQuery {
  return playerListQueryFromSearchParams(new URLSearchParams(search));
}

function listingSearch(search: string): string {
  const params = new URLSearchParams(search);
  params.delete('view');
  return params.toString();
}

export function PlayersBrowser({
  initial,
  initialSearch,
}: {
  initial: PlayerListResult;
  initialSearch: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const query = useMemo(() => queryFromSearch(search), [search]);
  const fetchSearch = useMemo(() => listingSearch(search), [search]);
  const [, startTransition] = useTransition();
  const listQuery = usePlayerList(fetchSearch);
  const data =
    listQuery.data ??
    (fetchSearch === listingSearch(initialSearch) ? initial : undefined);
  const [searchDraft, setSearchDraft] = useState(query.q);
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const current = queryRef.current;
      if (searchDraft === current.q) {
        return;
      }
      replaceQuery({ ...current, q: searchDraft, page: 1 });
    }, 250);
    return () => window.clearTimeout(handle);
    // replaceQuery is stable enough via queryRef; debounce only on draft
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  function replaceQuery(next: PlayerListQuery) {
    const qs = playerListQueryToSearchParams(next).toString();
    setSearch(qs);
    startTransition(() => {
      router.replace(qs ? `/players?${qs}` : '/players');
    });
  }

  const facets = data?.facets;
  const totalPages = Math.max(
    1,
    Math.ceil((data?.total ?? 0) / query.pageSize),
  );
  const filterCount = countPlayerListFilters(query);
  const filtered = playerListQueryIsFiltered({ ...query, q: searchDraft });

  const filterProps = {
    query,
    searchDraft,
    facets,
    onSearchDraft: setSearchDraft,
    onReplaceQuery: replaceQuery,
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row">
      <div className="bg-background/95 sticky top-0 z-20 -mx-4 flex items-center gap-2 border-b border-border/70 px-4 py-2.5 backdrop-blur-sm lg:hidden">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="mobile-player-search">
            Search
          </label>
          <Input
            id="mobile-player-search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Name or slug"
            autoComplete="off"
            className="h-10"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0 gap-1.5 px-3"
            >
              <SlidersHorizontal />
              <span>Filter</span>
              {filterCount > 0 ? (
                <Badge variant="secondary" className="ml-0.5 tabular-nums">
                  {filterCount}
                </Badge>
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[min(100%,20rem)] overflow-y-auto"
          >
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">
              <PlayerFilters
                idPrefix="sheet"
                includeSearch={false}
                {...filterProps}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden w-56 shrink-0 lg:block">
        <PlayerFilters idPrefix="desktop" includeSearch {...filterProps} />
      </aside>

      <section className="min-w-0 flex-1">
        {listQuery.isError ? (
          <CatalogNotice title="Could not load the catalog." tone="danger">
            Retry the listing. The browser only talks to this origin.
          </CatalogNotice>
        ) : null}
        {!data ? (
          <ListingSkeleton view={query.view} />
        ) : (
          <>
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:mb-3">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                <p className="text-muted-foreground text-sm tabular-nums">
                  {data.total.toLocaleString()} player
                  {data.total === 1 ? '' : 's'}
                </p>
                <label
                  htmlFor="only-auctionable"
                  className="text-foreground flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    id="only-auctionable"
                    type="checkbox"
                    className="border-input accent-foreground size-4 rounded border"
                    checked={query.filters.auctionable === true}
                    onChange={(event) => {
                      replaceQuery({
                        ...query,
                        q: searchDraft,
                        page: 1,
                        filters: {
                          ...query.filters,
                          auctionable: event.target.checked ? true : undefined,
                        },
                      });
                    }}
                  />
                  Only auctionable
                </label>
              </div>
              <div className="flex items-center gap-2">
                {listQuery.isFetching && data ? (
                  <p className="text-muted-foreground hidden text-xs sm:block">
                    Updating…
                  </p>
                ) : null}
                <ViewSwitch
                  view={query.view}
                  onChange={(view) =>
                    replaceQuery({ ...query, q: searchDraft, view })
                  }
                />
              </div>
            </div>
            {data.total === 0 ? (
              <EmptyCatalog filtered={filtered} />
            ) : (
              <>
                {query.view === 'grid' ? (
                  <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {data.items.map((player) => (
                      <li key={player.id}>
                        <PlayerGridLink player={player} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="divide-border divide-y overflow-hidden rounded-xl border">
                    {data.items.map((player) => (
                      <li key={player.id}>
                        <PlayerListLink player={player} />
                      </li>
                    ))}
                  </ul>
                )}
                <PlayerPagination
                  page={data.page}
                  pageSize={query.pageSize}
                  total={data.total}
                  totalPages={totalPages}
                  onPageChange={(page) =>
                    replaceQuery({ ...query, q: searchDraft, page })
                  }
                  onPageSizeChange={(pageSize, page) =>
                    replaceQuery({ ...query, q: searchDraft, pageSize, page })
                  }
                />
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function PlayerListLink({
  player,
}: {
  player: PlayerListResult['items'][number];
}) {
  const identity = [player.rating, player.position].filter(Boolean).join(' · ');
  return (
    <Link
      href={`/players/${player.id}`}
      className="hover:bg-muted/60 flex h-20 items-center gap-2 px-2 sm:gap-2.5 sm:px-2.5 md:h-24 md:gap-3 md:px-3"
    >
      <div className="size-20 shrink-0 md:size-24">
        <PlayerCardArt
          id={player.id}
          kinds={player.availableImageKinds}
          rating={player.rating}
          position={player.position}
          auctionable={player.auctionable}
          displayName={cardDisplayName(player)}
          playStyles={player.playStyles}
          size={80}
          fill
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2 overflow-hidden md:gap-4">
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium capitalize leading-tight md:text-base">
            {cardDisplayName(player)}
          </span>
          <div className="mt-0.5 flex min-w-0 flex-col gap-0.5 overflow-hidden">
            {identity ? (
              <span className="text-muted-foreground text-[11px] tabular-nums sm:text-xs md:text-sm md:text-foreground">
                {identity}
              </span>
            ) : null}
            {player.altPositions.length > 0 ? (
              <span className="text-muted-foreground truncate text-[10px] font-medium italic sm:text-[11px]">
                {player.altPositions.join(' · ')}
              </span>
            ) : null}
          </div>
        </div>
        <PlayerGroupedStats
          stats={player.avgStats}
          compact
          className="ml-auto"
        />
      </div>
      {player.addedAt != null ? (
        <time
          dateTime={new Date(player.addedAt).toISOString()}
          className="text-muted-foreground hidden w-14 shrink-0 text-right text-xs whitespace-nowrap tabular-nums lg:block"
        >
          {formatAddedDate(player.addedAt)}
        </time>
      ) : (
        <span className="text-muted-foreground hidden w-14 shrink-0 text-right text-xs lg:block">
          —
        </span>
      )}
    </Link>
  );
}

function PlayerGridLink({
  player,
}: {
  player: PlayerListResult['items'][number];
}) {
  return (
    <Link
      href={`/players/${player.id}`}
      aria-label={player.name}
      className="hover:bg-muted/60 block rounded-lg p-1"
    >
      <PlayerCardArt
        id={player.id}
        kinds={player.availableImageKinds}
        rating={player.rating}
        position={player.position}
        auctionable={player.auctionable}
        displayName={cardDisplayName(player)}
        playStyles={player.playStyles}
        size={140}
        fill
      />
    </Link>
  );
}

function ViewSwitch({
  view,
  onChange,
}: {
  view: PlayerListQuery['view'];
  onChange: (view: PlayerListQuery['view']) => void;
}) {
  return (
    <div
      className="flex items-center rounded-lg border p-0.5"
      role="group"
      aria-label="Listing view"
    >
      <Button
        type="button"
        size="icon-sm"
        className="size-9 sm:size-7"
        variant={view === 'list' ? 'secondary' : 'ghost'}
        aria-pressed={view === 'list'}
        aria-label="List view"
        onClick={() => onChange('list')}
      >
        <List />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        className="size-9 sm:size-7"
        variant={view === 'grid' ? 'secondary' : 'ghost'}
        aria-pressed={view === 'grid'}
        aria-label="Grid view"
        onClick={() => onChange('grid')}
      >
        <LayoutGrid />
      </Button>
    </div>
  );
}

function ListingSkeleton({ view }: { view: PlayerListQuery['view'] }) {
  if (view === 'grid') {
    return (
      <div
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        aria-busy="true"
        aria-label="Loading players"
      >
        <Skeleton className="aspect-square w-full" />
        <Skeleton className="aspect-square w-full" />
        <Skeleton className="aspect-square w-full" />
        <Skeleton className="aspect-square w-full" />
        <Skeleton className="aspect-square w-full" />
        <Skeleton className="aspect-square w-full" />
      </div>
    );
  }
  return (
    <div
      className="flex flex-col gap-2"
      aria-busy="true"
      aria-label="Loading players"
    >
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function EmptyCatalog({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-xl border border-dashed px-6 py-12 text-center">
      <p className="font-medium">
        {filtered ? 'No players match these filters' : 'Catalog is empty'}
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        {filtered ? (
          'Clear filters or try another search.'
        ) : (
          <>
            Seed it with <code className="text-foreground">npm run seed</code>,
            then optionally{' '}
            <code className="text-foreground">npm run ingest sync</code>.
          </>
        )}
      </p>
    </div>
  );
}
