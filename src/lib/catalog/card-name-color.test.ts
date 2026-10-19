import { describe, expect, it } from "vitest";
import {
  applyCardNameColors,
  cardNameColor,
  cardOvrColors,
  cardTextColors,
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
    expect(cardTextColors(bg("bg_23_B_OUTSTANDING25_STATIC"))).toEqual({
      name: "#F9E0A6",
      rating: "#210F45",
      position: "#210F45",
    });
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
      cardTextColors(bg("bg_23_backgrounds_twg26_TWG_CHAMPIONS_STATIC")),
    ).toEqual({
      name: "#FDF6D1",
      rating: "#FDF6D1",
      position: "#FDF6D1",
    });
    expect(
      cardTextColors(bg("bg_23_backgrounds_twg26_TWG26FINALCHAMPION_STATIC")),
    ).toEqual({
      name: "#FDF6D1",
      rating: "#FDF6D1",
      position: "#FDF6D1",
    });
    expect(cardNameColor(bg("bg_23_B_BASE_PRIMEICON_STATIC"))).toBe("#FFFFAA");
    expect(cardTextColors(bg("bg_23_B_FOOTYVERSE26_ICON_STATIC"))).toEqual({
      name: "#3F260A",
      rating: "#3F260A",
      position: "#3F260A",
    });
    expect(
      cardNameColor(bg("bg_23_B_FOOTYVERSE26_LIVE_STATIC")),
    ).toBe("#FFFFFF");
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
    expect(
      cardTextColors(bg("bg_23_B_STORY26_NETHERLANDS_ICON_STATIC")),
    ).toEqual({
      name: "#513D03",
      rating: "#513D03",
      position: "#513D03",
    });
    expect(
      cardTextColors(bg("bg_23_B_A_NATION_S_STORY26_JAPAN_ICON_STATIC")),
    ).toEqual({
      name: "#513D03",
      rating: "#513D03",
      position: "#513D03",
    });
    expect(cardTextColors(bg("bg_23_B_BALLONDOR_ICON_STATIC"))).toEqual({
      name: "#FFFFCD",
      rating: "#FFFFCD",
      position: "#FFFFCD",
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
      cardTextColors(bg("bg_23_backgrounds_26_B_TOPDUOS26_LIVE_STATIC")),
    ).toEqual({
      name: "#E1FAE3",
      rating: "#E1FAE3",
      position: "#E1FAE3",
    });
    expect(
      cardTextColors(bg("bg_23_backgrounds_26_B_TOPDUOS26_ICON_STATIC")),
    ).toEqual({
      name: "#001C29",
      rating: "#DFF7E1",
      position: "#E1FAE3",
    });
    expect(cardNameColor(bg("bg_23_backgrounds_27_B_STELLA_ICON_STATIC"))).toBe(
      "#493721",
    );
  });

  it("matches the remaining RenderZ templates that were still white", () => {
    expect(cardTextColors(bg("bg_23_B_BASE2"))).toEqual({
      name: "#323336",
      rating: "#323336",
      position: "#323336",
    });
    expect(cardTextColors(bg("bg_23_B_BASE3"))).toEqual({
      name: "#513D03",
      rating: "#513D03",
      position: "#513D03",
    });
    expect(cardTextColors(bg("bg_23_backgrounds_26_B_UTOTS26_STATIC"))).toEqual({
      name: "#FDF2BB",
      rating: "#FDF2BB",
      position: "#FDF2BB",
    });
    expect(cardNameColor(bg("bg_23_backgrounds_26_B_TOTS26_LIVE_STATIC"))).toBe(
      "#FFFFFF",
    );
    expect(
      cardTextColors(bg("bg_23_backgrounds_26_B_TOTS26_ICON_STATIC")),
    ).toEqual({
      name: "#2F515F",
      rating: "#2F515F",
      position: "#2F515F",
    });
    expect(cardTextColors(bg("bg_23_B_TOTW26_LIVE_STATIC"))).toEqual({
      name: "#FCEB9F",
      rating: "#FCEB9F",
      position: "#FCEB9F",
    });
    expect(cardTextColors(bg("bg_23_B_TOTY26_LIVE_STATIC"))).toEqual({
      name: "#FFEAB7",
      rating: "#FFEAB7",
      position: "#FFEAB7",
    });
    expect(cardTextColors(bg("bg_23_B_TOTY26_ICON_STATIC"))).toEqual({
      name: "#3A2D04",
      rating: "#3A2D04",
      position: "#3A2D04",
    });
    expect(cardTextColors(bg("bg_23_B_UCL26_LIVE_STATIC"))).toEqual({
      name: "#63FAE0",
      rating: "#63FAE0",
      position: "#63FAE0",
    });
    expect(cardNameColor(bg("bg_23_B_UCL26_GS_LIVE_STATIC"))).toBe("#FFFFFF");
    expect(
      cardNameColor(bg("bg_23_backgrounds_26_B_UECL26_LIVE_STATIC")),
    ).toBe("#FFFFFF");
    expect(cardTextColors(bg("bg_23_B_GE26_LIVE_REALMADRID_STATIC"))).toEqual({
      name: "#FFEAB7",
      rating: "#FFEAB7",
      position: "#FFEAB7",
    });
    expect(cardTextColors(bg("bg_23_B_CL26_LIVEHIGH_STATIC"))).toEqual({
      name: "#5D4829",
      rating: "#5D4829",
      position: "#5D4829",
    });
    expect(cardTextColors(bg("bg_23_B_CL26_LIVE_STATIC"))).toEqual({
      name: "#FFFFFF",
      rating: "#5D4829",
      position: "#5D4829",
    });
    expect(
      cardTextColors(bg("bg_23_backgrounds_26_B_SONGKRAN26_LIVE_STATIC")),
    ).toEqual({
      name: "#10307D",
      rating: "#10307D",
      position: "#10307D",
    });
    expect(cardTextColors(bg("bg_23_B_FS26_LIVE_STATIC"))).toEqual({
      name: "#171BBF",
      rating: "#171BBF",
      position: "#171BBF",
    });
    expect(cardTextColors(bg("bg_23_B_RECORDBREAKER_LIVE_STATIC"))).toEqual({
      name: "#FDF254",
      rating: "#FDF254",
      position: "#FDF254",
    });
    expect(cardNameColor(bg("bg_23_B_RECORDBREAKER_BASE_STATIC"))).toBe(
      "#FFFFFF",
    );
    expect(cardTextColors(bg("bg_23_B_RECORDBREAKER_ICON_STATIC"))).toEqual({
      name: "#4E4318",
      rating: "#FFFFFF",
      position: "#FFFFFF",
    });
    expect(cardTextColors(bg("bg_23_B_LNY26_LIVE_STATIC"))).toEqual({
      name: "#FFF99C",
      rating: "#FFF99C",
      position: "#FFF99C",
    });
    expect(cardTextColors(bg("bg_23_backgrounds_26_PF26_LIVE_STATIC"))).toEqual({
      name: "#FCEC0F",
      rating: "#FCEC0F",
      position: "#FCEC0F",
    });
    expect(
      cardTextColors(bg("bg_23_backgrounds_26_PF26_ICON_STATIC")),
    ).toEqual({
      name: "#053379",
      rating: "#053379",
      position: "#053379",
    });
    expect(cardTextColors(bg("bg_23_B_WINTERWONDERS25_LIVE_STATIC"))).toEqual({
      name: "#57171B",
      rating: "#FFF4AA",
      position: "#FFF4AA",
    });
    expect(cardTextColors(bg("bg_23_B_WINTERWONDERS25_ICON_STATIC"))).toEqual({
      name: "#57171B",
      rating: "#57171B",
      position: "#57171B",
    });
    expect(cardTextColors(bg("bg_23_B_EPL_FF_ICON_STATIC"))).toEqual({
      name: "#47005E",
      rating: "#47005E",
      position: "#47005E",
    });
    expect(cardNameColor(bg("bg_23_B_EPL_FF_LIVE_STATIC"))).toBe("#FFFFFF");
    expect(cardTextColors(bg("bg_23_B_RAGNAROK25_ICONL2_STATIC"))).toEqual({
      name: "#12273B",
      rating: "#0D405F",
      position: "#12273B",
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
    expect(colored.map((item) => item.ratingColor)).toEqual([
      "#FFFFFF",
      "#FFFFFF",
    ]);
  });
});
