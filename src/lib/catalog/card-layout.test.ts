import { describe, expect, it } from "vitest";
import { FM23_CARD_SIZE, FM23_LAYOUT, fm23BoxStyle, fm23Cqw, fm23Pct } from "@/lib/catalog/card-layout";

describe("fm23 layout", () => {
  it("keeps the measured 256px RenderZ coordinates", () => {
    expect(FM23_CARD_SIZE).toBe(256);
    expect(FM23_LAYOUT.name).toEqual({
      left: 128,
      top: 178,
      fontSize: 22,
      maxWidth: 140,
    });
    expect(FM23_LAYOUT.rating.fontSize).toBe(36);
    expect(FM23_LAYOUT.position.fontSize).toBe(24);
  });

  it("converts layout units to card-relative CSS", () => {
    expect(fm23Pct(128)).toBe("50%");
    expect(fm23Pct(178)).toBe("69.53125%");
    expect(fm23Cqw(22)).toBe("8.59375cqw");
    expect(fm23BoxStyle(FM23_LAYOUT.nation)).toEqual({
      left: "32.3046875%",
      top: "73.4375%",
      width: "9.375%",
      height: "9.375%",
    });
  });
});
