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
  /** Shared rating + position fill when those two match. */
  ovr?: string;
  rating?: string;
  position?: string;
}> = [
  // anniversary27_icon — 30921214 Beckham, 30921265 Jairzinho, 30921268
  { pattern: /ANNIVERSARY27_ICON/, color: "#554620" },
  // footyverse26_icon — 30923002 (live / livebase stay white)
  { pattern: /FOOTYVERSE26_ICON/, color: "#3F260A", ovr: "#3F260A" },
  // ge26_icon_* — 30923001 Real Madrid, 30906113, 30906225 Juventus
  { pattern: /GE26_ICON/, color: "#513D03", ovr: "#FFEAB7" },
  // ge26 live + glorious eras base live — 24027002 Vinícius, 24027006 Reus
  { pattern: /GE26_LIVE|GLORIOUS_ERAS26/, color: "#FFEAB7", ovr: "#FFEAB7" },
  // nation_story26_* — 30905005 Rijkaard NL, 30905001 Nakata JP
  { pattern: /STORY26/, color: "#513D03", ovr: "#513D03" },
  // bd26 / bd24 — 30904464 Rijkaard, 30902696
  { pattern: /BALLONDOR|BD24/, color: "#FFFFCD", ovr: "#FFFFCD" },
  // ginga26 icon + live — 30922504, 24030508 Martínez
  { pattern: /GINGA26/, color: "#3A2D04", ovr: "#3A2D04" },
  // welcometofc base + icon — 24050397, 309 icon
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
  { pattern: /TWG26FINALCHAMPION|TWG_CHAMPIONS/, color: "#FDF6D1", ovr: "#FDF6D1" },
  // primeicon_b — 30913054 Lizarazu
  { pattern: /PRIMEICON/, color: "#FFFFAA", ovr: "#FFFFAA" },
  // topduos26_icon — 309 sampled; rating and position differ
  {
    pattern: /TOPDUOS26_ICON/,
    color: "#001C29",
    rating: "#DFF7E1",
    position: "#E1FAE3",
  },
  // topduos26_live_b — 24052602
  { pattern: /TOPDUOS26/, color: "#E1FAE3", ovr: "#E1FAE3" },

  // FC base silver / gold — 24025327 Cambeses, 89256630 Wirtz
  { pattern: /B_BASE2(?![A-Z0-9])/, color: "#323336", ovr: "#323336" },
  { pattern: /B_BASE3(?![A-Z0-9])/, color: "#513D03", ovr: "#513D03" },

  // utots26 — 24044746 Fernandes
  { pattern: /UTOTS26/, color: "#FDF2BB", ovr: "#FDF2BB" },
  // tots26_icon — live / base / highlights stay white
  { pattern: /TOTS26_ICON/, color: "#2F515F", ovr: "#2F515F" },
  // totw26 — 24034717 van Dijk (TOTW27 stays white)
  { pattern: /TOTW26/, color: "#FCEB9F", ovr: "#FCEB9F" },
  // toty26_icon is brown-gold; live / base are cream
  { pattern: /TOTY26_ICON/, color: "#3A2D04", ovr: "#3A2D04" },
  { pattern: /TOTY26/, color: "#FFEAB7", ovr: "#FFEAB7" },
  // ucl26 knockout / best xi / icon — 24034313 Eze, 24046020, 30910408
  // group-stage UCL26_GS_LIVE stays white
  { pattern: /UCL26_ICON|UCL26_LIVE/, color: "#63FAE0", ovr: "#63FAE0" },
  // capped legends icon + live high — 30909519, 24031678 Silva
  // B_ prefix avoids UCL26 / UECL26 / CONMEBOL26
  { pattern: /B_CL26_ICON|B_CL26_LIVEHIGH/, color: "#5D4829", ovr: "#5D4829" },
  // capped legends live — 24031604 Muslera (name white)
  { pattern: /B_CL26_LIVE_/, color: "#FFFFFF", ovr: "#5D4829" },
  // songkran26 icon + live — 30910207, 24032514 Hincapié
  { pattern: /SONGKRAN26/, color: "#10307D", ovr: "#10307D" },
  // older songkran icon — position is a darker navy
  {
    pattern: /SONGKRAN_ICON/,
    color: "#233769",
    rating: "#233769",
    position: "#1F3A6C",
  },
  // future stars icon + live + base — 30909003 Fàbregas, 24031112 Cubarsí
  { pattern: /FS26/, color: "#171BBF", ovr: "#171BBF" },
  // record breaker icon — 30907011 (live is yellow)
  { pattern: /RECORDBREAKER_ICON/, color: "#4E4318" },
  // record breaker live — 24028708 Martínez
  { pattern: /RECORDBREAKER_LIVE/, color: "#FDF254", ovr: "#FDF254" },
  // lny26 icon + live — 24031422 Alonso
  { pattern: /LNY26/, color: "#FFF99C", ovr: "#FFF99C" },
  // pitch perfect icon vs live
  { pattern: /PF26_ICON/, color: "#053379", ovr: "#053379" },
  { pattern: /PF26/, color: "#FCEC0F", ovr: "#FCEC0F" },
  // winter wonders live — 24030024 Mbappé (icon is all burgundy)
  { pattern: /WINTERWONDERS25_LIVE/, color: "#57171B", ovr: "#FFF4AA" },
  { pattern: /WINTERWONDERS25/, color: "#57171B", ovr: "#57171B" },
  // festive fixtures icon — 30907147 (live stays white)
  { pattern: /EPL_FF_ICON/, color: "#47005E", ovr: "#47005E" },
  // euro / copa / anniversary 24 icons — name gold, ovr white
  { pattern: /EURO24_ICON|COPA24_ICON|ANNIVERSARY24_ICON/, color: "#4E3D0E" },
  // neon25 — 30903334
  { pattern: /NEON25_ICON/, color: "#FCFE20", ovr: "#FCFE20" },
  // toty25 — 30903136
  { pattern: /TOTY25_ICON/, color: "#3B2621", ovr: "#3B2621" },
  // tots25 — 30903808
  { pattern: /TOTS25_ICON/, color: "#0D405F", ovr: "#0D405F" },
  // shared gold-brown icon family
  {
    pattern:
      /2ND_ANNIVERSARY_ICON|TOTY24_ICON|TOTS24_UTOTS|CENTURIONS24|CAPTAINS?25|CAPTAINS24|ICONJOURNEY|LNY24_ICON|S10_ICON|RIVALS_ICON/,
    color: "#513D03",
    ovr: "#513D03",
  },
  // hol24 — 30901793
  { pattern: /HOL24/, color: "#14355B", ovr: "#14355B" },
  // trophy titans — 30902835
  { pattern: /TROPHYTITANS25/, color: "#553411", ovr: "#553411" },
  // aqua vs inferno 25
  { pattern: /AQUA25/, color: "#152762", ovr: "#152762" },
  { pattern: /INFERNO25/, color: "#580A09", ovr: "#580A09" },
  // chronicles
  { pattern: /CHRONICLES/, color: "#42340E", ovr: "#42340E" },
  // elderwood
  { pattern: /ELDERWOOD25/, color: "#1F3246", ovr: "#1F3246" },
  // pitch beats 25
  { pattern: /PB25_CLASSIC/, color: "#FFEFB7", ovr: "#FFEFB7" },
  { pattern: /PB25_ROCK/, color: "#CCE9FF", ovr: "#CCE9FF" },
  { pattern: /PB25_JAZZ/, color: "#FFE4B8", ovr: "#FFE4B8" },
  // ragnarok 25 — rating and name/position differ
  {
    pattern: /RAGNAROK/,
    color: "#12273B",
    rating: "#0D405F",
    position: "#12273B",
  },
  // ramadan festival 24
  { pattern: /RAMADANFESTIVAL24/, color: "#535116", ovr: "#535116" },
  // retro stars 24
  { pattern: /RS24/, color: "#FBEBA3", ovr: "#FBEBA3" },
  // thunderstruck 25
  { pattern: /THUNDERSTRUCK25/, color: "#FDEE80", ovr: "#FDEE80" },
  // tot icon (not TOTY / TOTS / TOTW)
  { pattern: /B_TOT_ICON/, color: "#47189A", ovr: "#47189A" },
  // laliga 25 icon
  { pattern: /LALIGA25_ICON/, color: "#313337", ovr: "#313337" },
  // mls 24 icon
  { pattern: /MLS24_ICON/, color: "#463C24", ovr: "#463C24" },
  // winter wildcards 24 — position is a slightly lighter gold
  {
    pattern: /WINTERWILD24/,
    color: "#513D03",
    rating: "#513D03",
    position: "#553F06",
  },
  // dynasties
  { pattern: /DYNASTIES/, color: "#391815", ovr: "#391815" },
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
        rating: rule.rating ?? rule.ovr ?? CARD_NAME_WHITE,
        position: rule.position ?? rule.ovr ?? CARD_NAME_WHITE,
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
 * Used for the few templates where those two are not the name color.
 */
export function cardOvrColors(nameColor: string | undefined): {
  rating: string;
  position: string;
} {
  switch (nameColor?.toUpperCase()) {
    case "#513D03":
      return { rating: "#FFEAB7", position: "#FFEAB7" };
    case "#F9E0A6":
      return { rating: "#210F45", position: "#210F45" };
    case "#57171B":
      return { rating: "#FFF4AA", position: "#FFF4AA" };
    case "#001C29":
      return { rating: "#DFF7E1", position: "#E1FAE3" };
    default:
      return WHITE_OVR;
  }
}

export function applyCardNameColors<T extends { id: string }>(
  items: readonly T[],
  backgroundUrlByPlayerId: ReadonlyMap<string, string>,
): Array<T & { nameColor: string; ratingColor: string; positionColor: string }> {
  return items.map((item) => {
    const colors = cardTextColors(backgroundUrlByPlayerId.get(item.id));
    return {
      ...item,
      nameColor: colors.name,
      ratingColor: colors.rating,
      positionColor: colors.position,
    };
  });
}
