export const PLAYER_PAGE_SIZE_OPTIONS = [12, 24, 48, 96] as const;

export type PaginationToken =
  | { type: "page"; page: number }
  | { type: "ellipsis"; key: string };

export function paginationItems(
  current: number,
  total: number,
): PaginationToken[] {
  const last = Math.max(1, total);
  const page = Math.min(Math.max(1, current), last);
  if (last <= 7) {
    return Array.from({ length: last }, (_, index) => ({
      type: "page",
      page: index + 1,
    }));
  }

  const show = new Set<number>([1, last]);
  for (let nearby = page - 1; nearby <= page + 1; nearby += 1) {
    if (nearby >= 1 && nearby <= last) {
      show.add(nearby);
    }
  }
  if (page <= 3) {
    show.add(2);
    show.add(3);
    show.add(4);
  }
  if (page >= last - 2) {
    show.add(last - 3);
    show.add(last - 2);
    show.add(last - 1);
  }

  const sorted = [...show].sort((a, b) => a - b);
  const items: PaginationToken[] = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous > 0 && value - previous > 1) {
      items.push({ type: "ellipsis", key: `e-${previous}-${value}` });
    }
    items.push({ type: "page", page: value });
    previous = value;
  }
  return items;
}

export function pageAfterSizeChange(
  page: number,
  oldSize: number,
  newSize: number,
): number {
  const firstIndex = Math.max(0, (Math.max(1, page) - 1) * Math.max(1, oldSize));
  return Math.floor(firstIndex / Math.max(1, newSize)) + 1;
}
