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
  // ge26_icon_realmadrid_b — 30923001 (rating/position are cream, name is brown)
  { pattern: /GE26_ICON/, color: "#513D03", ovr: "#FFEAB7" },
  // nation_story26_* — 30905005 Rijkaard NL, 30905001 Nakata JP
  { pattern: /STORY26/, color: "#513D03", ovr: "#513D03" },
  // bd26_icon_b — 30904464 Rijkaard
  { pattern: /BALLONDOR/, color: "#FFFFCD", ovr: "#FFFFCD" },
  // ginga26_icon_b — 30922504
  { pattern: /GINGA26_ICON/, color: "#3A2D04", ovr: "#3A2D04" },
  // welcometofc_base_b — 24050397
  { pattern: /WELCOMETOFC/, color: "#272827", ovr: "#272827" },
  // libra27_icon / B_STELLA_ICON — 30921702. Live stays white.
  { pattern: /STELLA_ICON/, color: "#493721" },
  // icon_{club} — 30919707 Drogba, 30919701, 30919738, 30919739, 30919779
  { pattern: /backgrounds_26_ICON_[A-Z]{3}_/, color: "#483721" },
  // outstanding25_b — 24051701 van Dijk
  { pattern: /OUTSTANDING25/, color: "#F9E0A6", ovr: "#210F45" },
  // moments25_icon_b — 30921301 Ibrahimović
  { pattern: /MOMENTS25_ICON/, color: "#014D4D", ovr: "#014D4D" },
  // moments25_live_b — 24049301 Galeno
  { pattern: /FCM25_MOMENTS_LIVE/, color: "#FFFF00", ovr: "#FFFF00" },
  // gc26_icon_high — 30920501 Kanu
  { pattern: /GAMECHANGER_ICON/, color: "#513C27", ovr: "#513C27" },
  // recordholder26_icon_high — 30917310
  { pattern: /RECORD_HOLDER26_ICON/, color: "#513C27", ovr: "#513C27" },
  // summerspecial26 icon + live — 30919101 Hazard, 24047801
  { pattern: /SUMMERSPECIAL26/, color: "#F8D84A", ovr: "#F8D84A" },
  // theworldgame26_finalchampion / champions — 24049002, 24049028
  { pattern: /TWG26FINALCHAMPION|TWG_CHAMPIONS/, color: "#FDF6D1" },
  // primeicon_b — 30913054 Lizarazu
  { pattern: /PRIMEICON/, color: "#FFFFAA", ovr: "#FFFFAA" },
  // topduos26_live_b — 24052602
  { pattern: /TOPDUOS26/, color: "#E1FAE3", ovr: "#E1FAE3" },
];

const WHITE_OVR = {
  rating: CARD_NAME_WHITE,
  position: CARD_NAME_WHITE,
} as const;

const NAMED_COLORS: Record<string, string> = {
  white: CARD_NAME_WHITE,
  black: "#000000",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function channel(value: number): string | undefined {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    return undefined;
  }
  return value.toString(16).padStart(2, "0");
}

/** `#RGB`, `#RRGGBB`, `#RRGGBBAA`, `rgb()`, or a short color name. */
export function normalizeHexColor(value: unknown): string | undefined {
  if (isRecord(value)) {
    const red = channel(Number(value.r));
    const green = channel(Number(value.g));
    const blue = channel(Number(value.b));
    if (!red || !green || !blue) {
      return undefined;
    }
    return `#${red}${green}${blue}`.toUpperCase();
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const text = value.trim();
  const named = NAMED_COLORS[text.toLowerCase()];
  if (named) {
    return named;
  }
  const rgb = text.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/i,
  );
  if (rgb) {
    const red = channel(Number(rgb[1]));
    const green = channel(Number(rgb[2]));
    const blue = channel(Number(rgb[3]));
    if (!red || !green || !blue) {
      return undefined;
    }
    return `#${red}${green}${blue}`.toUpperCase();
  }
  const hex = text.startsWith("#") ? text.slice(1) : text;
  if (/^[0-9A-Fa-f]{3}$/.test(hex)) {
    return `#${hex
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`.toUpperCase();
  }
  if (/^[0-9A-Fa-f]{6}$/.test(hex) || /^[0-9A-Fa-f]{8}$/.test(hex)) {
    return `#${hex.slice(0, 6)}`.toUpperCase();
  }
  return undefined;
}

/** RenderZ `player.animation.colors` for `.name` / `.rating` / `.position`. */
export function cardColorsFromAnimation(animation: unknown): {
  name?: string;
  rating?: string;
  position?: string;
} {
  if (!isRecord(animation) || !isRecord(animation.colors)) {
    return {};
  }
  const colors = animation.colors;
  return {
    name: normalizeHexColor(colors.name),
    rating: normalizeHexColor(colors.rating),
    position: normalizeHexColor(colors.position),
  };
}

/**
 * Stored `animation.colors` win. Rows ingested before that field existed
 * fall back to the measured background-filename table.
 */
export function resolveCardTextColors(input: {
  name?: string;
  rating?: string;
  position?: string;
  backgroundAssetUrl?: string;
}): CardTextColors {
  const derived = cardTextColors(input.backgroundAssetUrl);
  return {
    name: input.name ?? derived.name,
    rating: input.rating ?? derived.rating,
    position: input.position ?? derived.position,
  };
}

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

export function applyCardNameColors<
  T extends {
    id: string;
    nameColor?: string;
    ratingColor?: string;
    positionColor?: string;
  },
>(
  items: readonly T[],
  backgroundUrlByPlayerId: ReadonlyMap<string, string>,
): Array<T & { nameColor: string; ratingColor: string; positionColor: string }> {
  return items.map((item) => {
    const colors = resolveCardTextColors({
      name: item.nameColor,
      rating: item.ratingColor,
      position: item.positionColor,
      backgroundAssetUrl: backgroundUrlByPlayerId.get(item.id),
    });
    return {
      ...item,
      nameColor: colors.name,
      ratingColor: colors.rating,
      positionColor: colors.position,
    };
  });
}
