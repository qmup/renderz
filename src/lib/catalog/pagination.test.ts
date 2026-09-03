import { describe, expect, it } from "vitest";
import {
  pageAfterSizeChange,
  paginationItems,
} from "@/lib/catalog/pagination";

describe("paginationItems", () => {
  it("lists every page when there are few", () => {
    expect(paginationItems(1, 5).map((item) => item.type === "page" ? item.page : "…")).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("keeps first, last, and neighbors with ellipses", () => {
    expect(
      paginationItems(30, 60).map((item) => (item.type === "page" ? item.page : "…")),
    ).toEqual([1, "…", 29, 30, 31, "…", 60]);
  });

  it("expands the start of a long range", () => {
    expect(
      paginationItems(1, 60).map((item) => (item.type === "page" ? item.page : "…")),
    ).toEqual([1, 2, 3, 4, "…", 60]);
  });

  it("expands the end of a long range", () => {
    expect(
      paginationItems(60, 60).map((item) => (item.type === "page" ? item.page : "…")),
    ).toEqual([1, "…", 57, 58, 59, 60]);
  });
});

describe("pageAfterSizeChange", () => {
  it("keeps the first visible item after changing page size", () => {
    expect(pageAfterSizeChange(2, 24, 12)).toBe(3);
    expect(pageAfterSizeChange(1, 24, 48)).toBe(1);
  });
});
