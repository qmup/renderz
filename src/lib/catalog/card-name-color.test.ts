import { describe, expect, it } from "vitest";
import {
  applyCardNameColors,
  cardColorsFromAnimation,
  cardNameColor,
  cardOvrColors,
  cardTextColors,
  normalizeHexColor,
  resolveCardTextColors,
} from "@/lib/catalog/card-name-color";

const bg = (name: string) =>
  `https://images-v2.renderz.app/${name}?verify=1`;

describe("cardNameColor", () => {
  it("uses the anniversary icon brown and leaves the other anniversary frames white", () => {
    expect(
      cardNameColor(bg("bg_23_backgrounds_27_ANNIVERSARY27_ICON_STATIC")),
    ).toBe("#554620");
    expect(
      cardNameColor(bg("bg_23_backgrounds_27_ANNIVERSARY27_BASE_STATIC")),
    ).toBe("#FFFFFF");
    expect(
      cardNameColor(bg("bg_23_backgrounds_27_ANNIVERSARY27_LIVE_STATIC")),
    ).toBe("#FFFFFF");
  });

  it("keeps dark live and icon frames white", () => {
    expect(cardNameColor(bg("bg_23_backgrounds_26_B_TOTW27_LIVE_STATIC"))).toBe(
      "#FFFFFF",
    );
    expect(
      cardNameColor(
        bg("bg_23_backgrounds_27_CONMEBOL_LIBERTADORES27_ICON_STATIC"),
      ),
    ).toBe("#FFFFFF");
    expect(cardNameColor(bg("bg_23_NUMERO8_ICON_STATIC"))).toBe("#FFFFFF");
    expect(
      cardNameColor(bg("bg_23_backgrounds_26_UNBREAKABLE27_LIVE_BASE_STATIC")),
    ).toBe("#FFFFFF");
    expect(
      cardNameColor(bg("bg_23_backgrounds_twg26_TWG26_ICON_ENGLAND_STATIC_L3")),
    ).toBe("#FFFFFF");
    expect(cardNameColor(bg("bg_23_backgrounds_26_LIVE_FCB_STATIC"))).toBe(
      "#FFFFFF",
    );
    expect(cardNameColor(bg("bg_23_backgrounds_27_B_STELLA_LIVE_STATIC"))).toBe(
      "#FFFFFF",
    );
    expect(cardNameColor(undefined)).toBe("#FFFFFF");
  });

  it("matches the other measured template colors", () => {
    expect(cardNameColor(bg("bg_23_backgrounds_26_ICON_CHE_STATIC"))).toBe(
      "#483721",
    );
    expect(cardNameColor(bg("bg_23_B_OUTSTANDING25_STATIC"))).toBe("#F9E0A6");
    expect(cardNameColor(bg("bg_23_B_MOMENTS25_ICON_STATIC"))).toBe("#014D4D");
    expect(cardNameColor(bg("bg_23_B_FCM25_MOMENTS_LIVE_STATIC"))).toBe(
      "#FFFF00",
    );
    expect(
      cardNameColor(bg("bg_23_backgrounds_26_B_GAMECHANGER_ICON_H_STATIC")),
    ).toBe("#513C27");
    expect(
      cardNameColor(bg("bg_23_backgrounds_26_B_GAMECHANGER_LIVE_STATIC")),
    ).toBe("#FFFFFF");
    expect(
      cardNameColor(
        bg("bg_23_backgrounds_26_RECORD_HOLDER26_ICON_HIGH_STATIC"),
      ),
    ).toBe("#513C27");
    expect(
      cardNameColor(bg("bg_23_backgrounds_26_SUMMERSPECIAL26_LIVE_STATIC")),
    ).toBe("#F8D84A");
    expect(
      cardNameColor(bg("bg_23_backgrounds_twg26_TWG_CHAMPIONS_STATIC")),
    ).toBe("#FDF6D1");
    expect(
      cardNameColor(bg("bg_23_backgrounds_twg26_TWG26FINALCHAMPION_STATIC")),
    ).toBe("#FDF6D1");
    expect(cardNameColor(bg("bg_23_B_BASE_PRIMEICON_STATIC"))).toBe("#FFFFAA");
    expect(cardNameColor(bg("bg_23_B_FOOTYVERSE26_ICON_STATIC"))).toBe(
      "#3F260A",
    );
    expect(cardNameColor(bg("bg_23_B_GE26_ICON_REALMADRID_STATIC"))).toBe(
      "#513D03",
    );
    expect(
      cardTextColors(bg("bg_23_B_GE26_ICON_REALMADRID_STATIC")),
    ).toEqual({
      name: "#513D03",
      rating: "#FFEAB7",
      position: "#FFEAB7",
    });
    expect(cardOvrColors("#513D03")).toEqual({
      rating: "#FFEAB7",
      position: "#FFEAB7",
    });
    expect(cardNameColor(bg("bg_23_B_WELCOMETOFC_BASE_STATIC"))).toBe(
      "#272827",
    );
    expect(
      cardNameColor(bg("bg_23_backgrounds_26_B_GINGA26_ICON_STATIC")),
    ).toBe("#3A2D04");
    expect(
      cardNameColor(bg("bg_23_backgrounds_26_B_TOPDUOS26_LIVE_STATIC")),
    ).toBe("#E1FAE3");
    expect(cardNameColor(bg("bg_23_backgrounds_27_B_STELLA_ICON_STATIC"))).toBe(
      "#493721",
    );
  });
});

describe("cardColorsFromAnimation", () => {
  it("reads RenderZ animation.colors and ignores an unknown background", () => {
    expect(
      cardColorsFromAnimation({
        colors: {
          name: "#554620",
          rating: "rgb(255, 234, 183)",
          position: "white",
        },
      }),
    ).toEqual({
      name: "#554620",
      rating: "#FFEAB7",
      position: "#FFFFFF",
    });
    expect(normalizeHexColor("#abc")).toBe("#AABBCC");
    expect(normalizeHexColor({ r: 1, g: 2, b: 3 })).toBe("#010203");
    expect(
      resolveCardTextColors({
        name: "#010203",
        backgroundAssetUrl: bg("bg_23_backgrounds_26_B_TOTW27_LIVE_STATIC"),
      }),
    ).toEqual({
      name: "#010203",
      rating: "#FFFFFF",
      position: "#FFFFFF",
    });
  });
});

describe("applyCardNameColors", () => {
  it("joins each player to the background asset url", () => {
    const colored = applyCardNameColors(
      [{ id: "30921214" }, { id: "24054602" }],
      new Map([
        [
          "30921214",
          bg("bg_23_backgrounds_27_ANNIVERSARY27_ICON_STATIC"),
        ],
        ["24054602", bg("bg_23_backgrounds_26_B_TOTW27_LIVE_STATIC")],
      ]),
    );
    expect(colored.map((item) => item.nameColor)).toEqual([
      "#554620",
      "#FFFFFF",
    ]);
  });
});
