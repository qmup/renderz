import { describe, expect, it } from "vitest";
import {
  FM23_CARD_SIZE,
  FM23_LAYOUT,
  FM23_NAME_LINE_HEIGHT,
  FM23_NAME_TRANSFORM,
  fm23BadgeLayout,
  fm23BoxStyle,
  fm23Cqw,
  fm23NameLineBox,
  fm23Pct,
} from "@/lib/catalog/card-layout";

describe("fm23 layout", () => {
  it("keeps the measured 256px RenderZ coordinates", () => {
    expect(FM23_CARD_SIZE).toBe(256);
    expect(FM23_LAYOUT.name).toEqual({
      left: 128,
      top: 186,
      fontSize: 22,
      maxWidth: 140,
    });
    expect(FM23_LAYOUT.rating.fontSize).toBe(36);
    expect(FM23_LAYOUT.position.fontSize).toBe(24);
    expect(FM23_NAME_TRANSFORM).toBe("translate(-50%, -100%)");
    expect(FM23_NAME_LINE_HEIGHT).toBe(1);
  });

  it("keeps the name line box above the flag / league / club row", () => {
    const name = fm23NameLineBox();
    expect(name.bottom).toBeLessThanOrEqual(FM23_LAYOUT.nation.top);
    expect(name.bottom).toBeLessThanOrEqual(FM23_LAYOUT.liveNation.top);
    expect(name.top).toBeLessThan(name.bottom);
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

  it("spreads flag, league, and club on live frames", () => {
    expect(fm23BadgeLayout(false)).toEqual({
      nation: FM23_LAYOUT.nation,
      club: FM23_LAYOUT.club,
    });
    expect(fm23BadgeLayout(true)).toEqual({
      nation: { left: 64, top: 188, width: 24, height: 24 },
      league: { left: 116, top: 188, width: 24, height: 24 },
      club: { left: 168, top: 188, width: 24, height: 24 },
    });
  });
});
