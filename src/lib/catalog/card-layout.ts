/**
 * Season-23 PlayerCard layout from RenderZ.
 *
 * Their `PlayerCard` writes `animation.layout` onto `.rating` / `.position` /
 * `.name` / `.nation` / `.club` as `px / cardModifier` on a 256px card
 * (`player-card-fm23`, `--fm23-size: 256px`). Percentages below are that
 * 256px space so every listing and detail size stays aligned.
 *
 * Measured on 30921214 Beckham (anniversary27_icon) and 30923001 Beckham
 * (ge26_icon_realmadrid_b). Other FM23 cards use the same layout object.
 */
export const FM23_CARD_SIZE = 256;

export const FM23_LAYOUT = {
  rating: { left: 36.167, top: 4.083, width: 80, height: 80, fontSize: 36 },
  position: { left: 56, top: 64, width: 40, height: 20, fontSize: 24 },
  name: { left: 128, top: 178, fontSize: 22, maxWidth: 140 },
  nation: { left: 82.7, top: 188, width: 24, height: 24 },
  club: { left: 146.6, top: 188, width: 24, height: 24 },
  playStyles: { top: 24, left: 8, padding: 4, icon: 32 },
  price: { top: 96, fontSize: 18, icon: 18 },
} as const;

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
