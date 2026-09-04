"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";
import { useId, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  PLAYER_PAGE_SIZE_OPTIONS,
  pageAfterSizeChange,
  paginationItems,
} from "@/lib/catalog/pagination";
import { PLAYER_LIST_MAX_PAGE_SIZE } from "@/lib/domain/query";

const selectClassName =
  "h-10 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-8 sm:text-sm";

export function PlayerPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number, page: number) => void;
}) {
  const jumpId = useId();
  const sizeId = useId();

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const items = paginationItems(page, totalPages);
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  function goTo(next: number) {
    const clamped = Math.min(totalPages, Math.max(1, next));
    if (clamped !== page) {
      onPageChange(clamped);
    }
  }

  function submitJump(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = new FormData(form).get("page");
    const parsed = Number.parseInt(String(raw ?? ""), 10);
    if (Number.isFinite(parsed)) {
      goTo(parsed);
    } else {
      const input = form.elements.namedItem("page");
      if (input instanceof HTMLInputElement) {
        input.value = String(page);
      }
    }
  }

  function changePageSize(nextSize: number) {
    const size = Math.min(PLAYER_LIST_MAX_PAGE_SIZE, Math.max(1, nextSize));
    onPageSizeChange(size, pageAfterSizeChange(page, pageSize, size));
  }

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          Showing{" "}
          <span className="text-foreground font-medium">
            {start.toLocaleString()}–{end.toLocaleString()}
          </span>{" "}
          of {total.toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          <Label htmlFor={sizeId} className="text-muted-foreground text-xs font-normal">
            Per page
          </Label>
          <select
            id={sizeId}
            className={selectClassName}
            value={pageSize}
            onChange={(event) => changePageSize(Number(event.target.value))}
          >
            {PLAYER_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
            {!(PLAYER_PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSize) ? (
              <option value={pageSize}>{pageSize}</option>
            ) : null}
          </select>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Pagination className="mx-0 w-full justify-center lg:w-auto lg:justify-start">
          <PaginationContent className="w-full justify-between sm:w-auto sm:justify-center">
            <PaginationItem>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 sm:size-8"
                disabled={atStart}
                aria-label="Go to first page"
                onClick={() => goTo(1)}
              >
                <ChevronsLeftIcon />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                type="button"
                variant="ghost"
                size="default"
                className="h-10 pl-1.5 sm:h-8"
                disabled={atStart}
                aria-label="Go to previous page"
                onClick={() => goTo(page - 1)}
              >
                <ChevronLeftIcon data-icon="inline-start" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
            </PaginationItem>
            {items.map((item) =>
              item.type === "ellipsis" ? (
                <PaginationItem key={item.key} className="hidden sm:flex">
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem
                  key={item.page}
                  className={item.page === page ? undefined : "hidden sm:flex"}
                >
                  <Button
                    type="button"
                    size="icon"
                    className="size-10 sm:size-8"
                    variant={item.page === page ? "outline" : "ghost"}
                    aria-label={`Go to page ${item.page}`}
                    aria-current={item.page === page ? "page" : undefined}
                    onClick={() => goTo(item.page)}
                  >
                    {item.page}
                  </Button>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <Button
                type="button"
                variant="ghost"
                size="default"
                className="h-10 pr-1.5 sm:h-8"
                disabled={atEnd}
                aria-label="Go to next page"
                onClick={() => goTo(page + 1)}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 sm:size-8"
                disabled={atEnd}
                aria-label="Go to last page"
                onClick={() => goTo(totalPages)}
              >
                <ChevronsRightIcon />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>

        <form className="flex items-center justify-center gap-2" onSubmit={submitJump}>
          <Label htmlFor={jumpId} className="text-muted-foreground text-xs font-normal">
            Go to
          </Label>
          <Input
            key={page}
            id={jumpId}
            name="page"
            type="number"
            min={1}
            max={totalPages}
            inputMode="numeric"
            className="h-10 w-16 text-center sm:h-8"
            defaultValue={page}
            aria-label="Page number"
          />
          <span className="text-muted-foreground text-xs">/ {totalPages}</span>
          <Button type="submit" size="sm" variant="outline" className="h-10 sm:h-8">
            Go
          </Button>
        </form>
      </div>
    </div>
  );
}
