/**
 * Program / Event labels and order as shown on renderz.app/players
 * (newest promo first). Matching is by PROGRAM_* id aliases, not card
 * subtitles like "Numero 7 Premium Player".
 *
 * `logo` is the RenderZ programlogos_23 slug. Files are served from our
 * origin at `/program-logos/{slug}.png` — never signed upstream URLs.
 */
export type ProgramCatalogEntry = {
  label: string;
  aliases: string[];
  logo?: string;
};

export const RENDERZ_PROGRAM_CATALOG: ProgramCatalogEntry[] = [
  { label: "Numero", aliases: ["NUMERO26", "NUMERO"], logo: "NUMERO26" },
  {
    label: "Game Changer",
    aliases: ["GC26", "GAMECHANGER", "GAME_CHANGER"],
    logo: "GC26",
  },
  {
    label: "Road to AFC",
    aliases: ["RTAC26", "ROADTOAFC", "ROAD_TO_AFC"],
    logo: "RTAC26",
  },
  {
    label: "Champions",
    aliases: ["CHAMPIONS26", "CHAMPIONS"],
    logo: "CHAMPIONS26",
  },
  {
    label: "SUMMERSPECIAL",
    aliases: ["SUMMERSPECIAL", "SUMMER_SPECIAL"],
    logo: "SUMMERSPECIAL",
  },
  {
    label: "RECORDHOLDERS",
    aliases: ["RECORDHOLDERS26", "RECORDHOLDERS", "RECORD_HOLDERS"],
    logo: "RECORDHOLDERS26",
  },
  {
    label: "The World's Game 26",
    aliases: ["TWG26", "TWG", "WORLDSGAME26"],
    logo: "TWG26",
  },
  { label: "UECL 26", aliases: ["UECL26", "UECL"], logo: "UECL26" },
  { label: "UEL 26", aliases: ["UEL26", "UEL"], logo: "UEL26" },
  {
    label: "Pitch Perfect",
    aliases: ["PITCHPERFECT", "PITCH_PERFECT"],
    logo: "PITCHPERFECT",
  },
  { label: "TOTS 26", aliases: ["TOTS26", "TOTS"], logo: "TOTS26" },
  { label: "Songkran", aliases: ["SONGKRAN26", "SONGKRAN"], logo: "SONGKRAN26" },
  {
    label: "Top Duos",
    aliases: ["TOPDUOS26", "TOPDUOS", "TOP_DUOS"],
    logo: "TOPDUOS26",
  },
  {
    label: "CAPPED LEGENDS 26",
    aliases: ["CAPPEDLEGENDS26", "CAPPED_LEGENDS_26", "CAPPEDLEGENDS"],
    logo: "CAPPED_LEGENDS_26",
  },
  { label: "LNY 26", aliases: ["LNY26", "LNY"], logo: "LNY26" },
  {
    label: "Future Stars",
    aliases: ["FS26", "FUTURESTARS", "FUTURE_STARS"],
    logo: "FS26",
  },
  { label: "Ramadan", aliases: ["RAMADAN", "RA26"], logo: "RA26" },
  { label: "Ginga", aliases: ["GINGA26", "GINGA"], logo: "GINGA26" },
  {
    label: "Flashback",
    aliases: ["FLASHBACK26", "FLASHBACK"],
    logo: "FLASHBACK26",
  },
  {
    label: "OUTSTANDING26",
    aliases: ["OUTSTANDING26", "OUTSTANDING"],
    logo: "OUTSTANDING26",
  },
  { label: "TOTY 26", aliases: ["TOTY26", "TOTY"], logo: "TOTY26" },
  {
    label: "Holiday Player",
    aliases: ["WINTERHOLIDAY26", "HOLIDAY", "HOLIDAYPLAYER"],
    logo: "WINTERHOLIDAY26",
  },
  {
    label: "Festive Fixtures",
    aliases: ["EPL26_FF", "FESTIVEFIXTURES", "FESTIVE"],
    logo: "EPL26_FF",
  },
  {
    label: "Record Breakers",
    aliases: ["RB26", "RECORDBREAKERS", "RECORD_BREAKERS"],
    logo: "RB26",
  },
  { label: "Icons", aliases: ["ICONS"], logo: "ICONS" },
  {
    label: "Heroes",
    aliases: ["HEROS8", "HEROES8", "HEROES", "HEROS"],
    logo: "HEROS8",
  },
  {
    label: "Moments",
    aliases: ["MOMENT25", "MOMENTS25", "MOMENTS", "MOMENT"],
    logo: "MOMENT25",
  },
];

const LOGO_SLUG = /^[A-Z0-9_]+$/;

const aliasIndex = new Map<
  string,
  { label: string; order: number; logo?: string }
>();
for (const [order, entry] of RENDERZ_PROGRAM_CATALOG.entries()) {
  for (const alias of entry.aliases) {
    aliasIndex.set(normalizeProgramKey(alias), {
      label: entry.label,
      order,
      logo: entry.logo,
    });
  }
}

export function normalizeProgramKey(programId: string): string {
  return programId
    .trim()
    .replace(/^PROGRAM_/i, "")
    .replace(/_/g, "")
    .toUpperCase();
}

function lookup(
  programId: string,
): { label: string; order: number; logo?: string } | undefined {
  return aliasIndex.get(normalizeProgramKey(programId));
}

export function programEventLabel(programId: string): string {
  const hit = lookup(programId);
  if (hit) {
    return hit.label;
  }
  const raw = programId.replace(/^PROGRAM_/i, "").trim();
  const yearSuffix = raw.match(/^(.*?)(20)?(\d{2})$/);
  if (yearSuffix?.[1] && /^[A-Za-z]+$/.test(yearSuffix[1])) {
    const stem = yearSuffix[1];
    if (stem.length <= 5 && stem === stem.toUpperCase()) {
      return `${stem} ${yearSuffix[3]}`;
    }
    return titleCaseWords(stem);
  }
  if (raw === raw.toUpperCase() && !raw.includes(" ") && raw.length > 8) {
    return raw;
  }
  return titleCaseWords(raw.replace(/_/g, " "));
}

export function programEventOrder(programId: string): number {
  return lookup(programId)?.order ?? RENDERZ_PROGRAM_CATALOG.length + 50;
}

export function programLogoSrc(programId: string): string | undefined {
  const hit = lookup(programId);
  if (hit?.logo) {
    return `/program-logos/${hit.logo}.png`;
  }
  if (!hit) {
    const slug = programId.replace(/^PROGRAM_/i, "").trim();
    if (LOGO_SLUG.test(slug)) {
      return `/program-logos/${slug}.png`;
    }
  }
  return undefined;
}

export function sortProgramFacets<T extends { value: string; count: number }>(
  options: T[],
): T[] {
  return [...options].sort((a, b) => {
    const order = programEventOrder(a.value) - programEventOrder(b.value);
    if (order !== 0) {
      return order;
    }
    return b.count - a.count || a.value.localeCompare(b.value);
  });
}

function titleCaseWords(value: string): string {
  return value
    .replace(/_/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
