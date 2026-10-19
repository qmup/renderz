/**
 * RenderZ season 23 paints `.player-card .name` / `.rating` / `.position`
 * from `animation.colors`. The stylesheet default is white. A season-22
 * template table in PlayerCard (`ci[cardUiStyle]`) is not applied when the
 * season is 23.
 *
 * We do not store `colors` or `cardUiStyle`. The background asset filename
 * matches the template class, so the colors are derived from that URL.
 * Patterns below are the non-white templates in the catalog; everything else
 * stays #FFFFFF. Player ids in the comments are the RenderZ cards measured.
 */
export const CARD_NAME_WHITE = "#FFFFFF";

export type CardTextColors = {
  name: string;
  rating: string;
  position: string;
};

const CARD_NAME_COLOR_RULES: ReadonlyArray<{
  pattern: RegExp;
  color: string;
  /** Rating + position when they are not white. Measured on RenderZ listing. */
  ovr?: string;
}> = [
  // anniversary27_icon — 30921214 Beckham, 30921265 Jairzinho, 30921268
  { pattern: /ANNIVERSARY27_ICON/, color: "#554620" },
  // footyverse26_icon_b — 30923002
  { pattern: /FOOTYVERSE26/, color: "#3F260A" },
  // ge26_icon_realmadrid_b — 30923001
  { pattern: /GE26_ICON/, color: "#513D03", ovr: "#FFEAB7" },
  // ginga26_icon_b — 30922504
  { pattern: /GINGA26_ICON/, color: "#3A2D04" },
  // welcometofc_base_b — 24050397
  { pattern: /WELCOMETOFC/, color: "#272827" },
  // libra27_icon / B_STELLA_ICON — 30921702. Live stays white.
  { pattern: /STELLA_ICON/, color: "#493721" },
  // icon_{club} — 30919707 Drogba, 30919701, 30919738, 30919739, 30919779
  { pattern: /backgrounds_26_ICON_[A-Z]{3}_/, color: "#483721" },
  // outstanding25_b — 24051701 van Dijk
  { pattern: /OUTSTANDING25/, color: "#F9E0A6" },
  // moments25_icon_b — 30921301 Ibrahimović
  { pattern: /MOMENTS25_ICON/, color: "#014D4D" },
  // moments25_live_b — 24049301 Galeno
  { pattern: /FCM25_MOMENTS_LIVE/, color: "#FFFF00" },
  // gc26_icon_high — 30920501 Kanu
  { pattern: /GAMECHANGER_ICON/, color: "#513C27" },
  // recordholder26_icon_high — 30917310
  { pattern: /RECORD_HOLDER26_ICON/, color: "#513C27" },
  // summerspecial26 icon + live — 30919101 Hazard, 24047801
  { pattern: /SUMMERSPECIAL26/, color: "#F8D84A" },
  // theworldgame26_finalchampion / champions — 24049002, 24049028
  { pattern: /TWG26FINALCHAMPION|TWG_CHAMPIONS/, color: "#FDF6D1" },
  // primeicon_b — 30913054 Lizarazu
  { pattern: /PRIMEICON/, color: "#FFFFAA" },
  // topduos26_live_b — 24052602
  { pattern: /TOPDUOS26/, color: "#E1FAE3" },
];

const WHITE_OVR = {
  rating: CARD_NAME_WHITE,
  position: CARD_NAME_WHITE,
} as const;

export function cardTextColors(
  backgroundAssetUrl: string | undefined,
): CardTextColors {
  if (!backgroundAssetUrl) {
    return { name: CARD_NAME_WHITE, ...WHITE_OVR };
  }
  for (const rule of CARD_NAME_COLOR_RULES) {
    if (rule.pattern.test(backgroundAssetUrl)) {
      return {
        name: rule.color,
        rating: rule.ovr ?? CARD_NAME_WHITE,
        position: rule.ovr ?? CARD_NAME_WHITE,
      };
    }
  }
  return { name: CARD_NAME_WHITE, ...WHITE_OVR };
}

export function cardNameColor(backgroundAssetUrl: string | undefined): string {
  return cardTextColors(backgroundAssetUrl).name;
}

/**
 * Rating / position fill when only the listing `nameColor` is available.
 * GE26 is the measured template where those two are not white.
 */
export function cardOvrColors(nameColor: string | undefined): {
  rating: string;
  position: string;
} {
  if (nameColor?.toUpperCase() === "#513D03") {
    return { rating: "#FFEAB7", position: "#FFEAB7" };
  }
  return WHITE_OVR;
}

export function applyCardNameColors<T extends { id: string }>(
  items: readonly T[],
  backgroundUrlByPlayerId: ReadonlyMap<string, string>,
): Array<T & { nameColor: string }> {
  return items.map((item) => ({
    ...item,
    nameColor: cardNameColor(backgroundUrlByPlayerId.get(item.id)),
  }));
}
