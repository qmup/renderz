/**
 * Season-23 PlayerCard layout from RenderZ.
 *
 * Their `PlayerCard` writes `animation.layout` onto `.rating` / `.position` /
 * `.name` / `.nation` / `.league` / `.club` as `px / cardModifier` on a 256px
 * card (`player-card-fm23`, `--fm23-size: 256px`). Percentages below are that
 * 256px space so every listing and detail size stays aligned.
 *
 * Icon templates (no league) were measured on 30921214 Beckham
 * (anniversary27_icon). Live templates with a league crest were measured on
 * 24050820 Bellingham (anniversary27_live).
 */
export const FM23_CARD_SIZE = 256;

const BADGE = { top: 188, width: 24, height: 24 } as const;

export const FM23_LAYOUT = {
  rating: { left: 36.167, top: 4.083, width: 80, height: 80, fontSize: 36 },
  position: { left: 56, top: 64, width: 40, height: 20, fontSize: 24 },
  /**
   * Bottom-center of the name, 2px above the badge row. RenderZ centers a 0×0
   * flex box at y=178 with inherited `line-height: 1.2`, which still paints
   * into y=188. Anchoring the baseline above the badges keeps "BELLINGHAM"
   * (and other long names) off the flag / league / club.
   */
  name: { left: 128, top: 186, fontSize: 22, maxWidth: 140 },
  /** Icon / Heroes frames: flag + club only, inset toward the name. */
  nation: { left: 82.7, ...BADGE },
  club: { left: 146.6, ...BADGE },
  /** Live frames: flag + league + club spread across the nameplate. */
  liveNation: { left: 64, ...BADGE },
  liveLeague: { left: 116, ...BADGE },
  liveClub: { left: 168, ...BADGE },
  playStyles: { top: 24, left: 8, padding: 4, icon: 32 },
  price: { top: 96, fontSize: 18, icon: 18 },
} as const;

/** Tight line box so uppercase names do not grow into the badge row. */
export const FM23_NAME_LINE_HEIGHT = 1;

/** Bottom-center the name on `FM23_LAYOUT.name` so scale stays on the baseline. */
export const FM23_NAME_TRANSFORM = "translate(-50%, -100%)";

export function fm23NameLineBox(
  top = FM23_LAYOUT.name.top,
  fontSize = FM23_LAYOUT.name.fontSize,
  lineHeight = FM23_NAME_LINE_HEIGHT,
): { top: number; bottom: number } {
  return { top: top - fontSize * lineHeight, bottom: top };
}

export function fm23BadgeLayout(hasLeague: boolean): {
  nation: { left: number; top: number; width: number; height: number };
  club: { left: number; top: number; width: number; height: number };
  league?: { left: number; top: number; width: number; height: number };
} {
  if (hasLeague) {
    return {
      nation: FM23_LAYOUT.liveNation,
      league: FM23_LAYOUT.liveLeague,
      club: FM23_LAYOUT.liveClub,
    };
  }
  return {
    nation: FM23_LAYOUT.nation,
    club: FM23_LAYOUT.club,
  };
}

export function fm23Pct(units: number): string {
  return `${(units / FM23_CARD_SIZE) * 100}%`;
}

export function fm23Cqw(units: number): string {
  return `${(units / FM23_CARD_SIZE) * 100}cqw`;
}

export function fm23BoxStyle(box: {
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize?: number;
}): {
  left: string;
  top: string;
  width: string;
  height: string;
  fontSize?: string;
} {
  return {
    left: fm23Pct(box.left),
    top: fm23Pct(box.top),
    width: fm23Pct(box.width),
    height: fm23Pct(box.height),
    ...(box.fontSize !== undefined ? { fontSize: fm23Cqw(box.fontSize) } : {}),
  };
}
