/**
 * Program / Event labels and order as shown on renderz.app/players
 * (newest promo first, `addedOn` descending). Matching is by PROGRAM_* id
 * aliases, not card subtitles like "Numero 7 Premium Player".
 *
 * `logo` is the RenderZ programlogos_23 slug. Files live at
 * `/program-logos/{slug}.png` and are prefixed with the image CDN when
 * NEXT_PUBLIC_IMAGE_BASE_URL is set. Never use signed upstream URLs.
 */
import { withImageCdn } from "@/lib/images";

export type ProgramCatalogEntry = {
  label: string;
  aliases: string[];
  logo?: string;
};

export const RENDERZ_PROGRAM_CATALOG: ProgramCatalogEntry[] = [
  { label: "Team of the Week", aliases: ["TOTW27"], logo: "TOTW27" },
  { label: "Unbreakable", aliases: ["UB27"], logo: "UB27" },
  { label: "Classics", aliases: ["HOFS"], logo: "HOFS" },
  { label: "CONMEBOL Libertadores", aliases: ["CL27"], logo: "CL27" },
  { label: "Stellar", aliases: ["STELLAR27"], logo: "STELLAR27" },
  { label: "3rd Anniversary", aliases: ["ANN27"], logo: "ANN27" },
  { label: "Numero", aliases: ["NUMERO26", "NUMERO"], logo: "NUMERO26" },
  { label: "Game Changer", aliases: ["GC26", "GAMECHANGER", "GAME_CHANGER"], logo: "GC26" },
  { label: "Road to AFC", aliases: ["RTAC26", "ROADTOAFC", "ROAD_TO_AFC"], logo: "RTAC26" },
  { label: "Champions", aliases: ["CHAMPIONS26", "CHAMPIONS"], logo: "CHAMPIONS26" },
  { label: "Summer Special", aliases: ["SUMMERSPECIAL", "SUMMER_SPECIAL"], logo: "SUMMERSPECIAL" },
  { label: "Record Holders", aliases: ["RECORDHOLDERS", "RECORDHOLDERS26", "RECORD_HOLDERS"], logo: "RECORDHOLDERS26" },
  { label: "The World's Game 26", aliases: ["TWG26", "TWG", "WORLDSGAME26"], logo: "TWG26" },
  { label: "UECL 26", aliases: ["UECL26", "UECL"], logo: "UECL26" },
  { label: "UEL 26", aliases: ["UEL26", "UEL"], logo: "UEL26" },
  { label: "Pitch Perfect", aliases: ["PITCHPERFECT", "PITCH_PERFECT"], logo: "PITCHPERFECT" },
  { label: "TOTS 26", aliases: ["TOTS26", "TOTS"], logo: "TOTS26" },
  { label: "Songkran", aliases: ["SONGKRAN26", "SONGKRAN"], logo: "SONGKRAN26" },
  { label: "Top Duos", aliases: ["TOPDUOS26", "TOPDUOS", "TOP_DUOS"], logo: "TOPDUOS26" },
  { label: "Capped Legends", aliases: ["CAPPED_LEGENDS_26", "CAPPEDLEGENDS26", "CAPPEDLEGENDS"], logo: "CAPPED_LEGENDS_26" },
  { label: "LNY 26", aliases: ["LNY26", "LNY"], logo: "LNY26" },
  { label: "Future Stars", aliases: ["FS26", "FUTURESTARS", "FUTURE_STARS"], logo: "FS26" },
  { label: "Ramadan", aliases: ["RA26", "RAMADAN"], logo: "RA26" },
  { label: "Ginga", aliases: ["GINGA26", "GINGA"], logo: "GINGA26" },
  { label: "Flashback", aliases: ["FLASHBACK26", "FLASHBACK"], logo: "FLASHBACK26" },
  { label: "Outstanding", aliases: ["OUTSTANDING26", "OUTSTANDING"], logo: "OUTSTANDING26" },
  { label: "TOTY 26", aliases: ["TOTY26", "TOTY"], logo: "TOTY26" },
  { label: "Holiday Player", aliases: ["WINTERHOLIDAY26", "HOLIDAY", "HOLIDAYPLAYER"], logo: "WINTERHOLIDAY26" },
  { label: "Festive Fixtures", aliases: ["EPL26_FF", "FESTIVEFIXTURES", "FESTIVE"], logo: "EPL26_FF" },
  { label: "Record Breakers", aliases: ["RB26", "RECORDBREAKERS", "RECORD_BREAKERS"], logo: "RB26" },
  { label: "Glorious Eras", aliases: ["GE26"], logo: "GE26" },
  { label: "UCL 26", aliases: ["UCL26"], logo: "UCL26" },
  { label: "A Nation‘s Story", aliases: ["ANS26"], logo: "ANS26" },
  { label: "Footyverse 26", aliases: ["FV26"], logo: "FV26" },
  { label: "CONMEBOL Libertadores", aliases: ["CL26"], logo: "CL26" },
  { label: "TOTW 26", aliases: ["TOTW26"], logo: "TOTW26" },
  { label: "Ballon d'Or 26", aliases: ["BO26"], logo: "BO26" },
  { label: "Anniversary 26", aliases: ["ANN26"], logo: "ANN26" },
  { label: "National Stars 25", aliases: ["NF25"], logo: "NF25" },
  { label: "Captains 25", aliases: ["CAP25"], logo: "CAP25" },
  { label: "Grassroot Greats 25", aliases: ["GRASSROOT25"], logo: "GRASSROOT25" },
  { label: "Ragnarok 25", aliases: ["RAGNAROK25"], logo: "RAGNAROK25" },
  { label: "Defining Legacies 25", aliases: ["DL25"], logo: "DL25" },
  { label: "Aqua vs Inferno 25", aliases: ["AQUAVSINFERNO"], logo: "AQUAVSINFERNO" },
  { label: "UECL 25", aliases: ["BOU25_UECL"], logo: "S8_UECL" },
  { label: "UEL 25", aliases: ["BOU25_UEL"], logo: "S8_UEL" },
  { label: "TOTS 25", aliases: ["TOTS25"], logo: "TOTS25" },
  { label: "Songkran 25", aliases: ["SONGKRAN25"], logo: "SONGKRAN25" },
  { label: "Pitch Beats 25", aliases: ["PB25"], logo: "PB25" },
  { label: "UCL 25 Road to the Final", aliases: ["UCL25_RTTF"], logo: "UCL25_RTTF" },
  { label: "MLS 25", aliases: ["PROGRAM_MLS25", "PROGRAMMLS25"], logo: "MLS24" },
  { label: "LALIGA 25", aliases: ["LALIGA25"], logo: "LALIGA25" },
  { label: "Holi 25", aliases: ["HOLI25"], logo: "HOLI25" },
  { label: "Outstanding Player 25", aliases: ["OUTSTANDING25"], logo: "OUTSTANDING25" },
  { label: "CODE: NEON 25", aliases: ["NEON25"], logo: "NEON25" },
  { label: "Carnival 25", aliases: ["CARNIVAL25"], logo: "CARNIVAL25" },
  { label: "TOTY 25", aliases: ["TOTY25"], logo: "TOTY25" },
  { label: "Thunderstruck 25", aliases: ["THUNDERSTUCK25"], logo: "THUNDERSTUCK25" },
  { label: "Winter Wonders 25", aliases: ["WINTER25"], logo: "WINTER25" },
  { label: "Trophy Titans 25", aliases: ["TT25"], logo: "TT25" },
  { label: "Ballon d'Or 25", aliases: ["BALLONDOR25"], logo: "BALLONDOR25" },
  { label: "UCL 25", aliases: ["UCL25"], logo: "UCL25" },
  { label: "Día De Muertos 25", aliases: ["DDLM25"], logo: "DDLM25" },
  { label: "Trick or Treat 25", aliases: ["TRICKORTREAT25"], logo: "TRICKORTREAT25" },
  { label: "POTM 25 Ligue 1", aliases: ["POTM25_LIGUE1"], logo: "POTM25_LIGUE1" },
  { label: "POTM 25 LALIGA", aliases: ["POTM25_LALIGA"], logo: "POTM25_LALIGA" },
  { label: "POTM 25 Serie A", aliases: ["POTM25_SERIEA"], logo: "POTM25_SERIEA" },
  { label: "POTM 25 Premier League", aliases: ["POTM25_PREMIER"], logo: "POTM25_PREMIER" },
  { label: "POTM 25 Bundesliga", aliases: ["POTM25_BUNDESLIGA"], logo: "POTM25_BUNDESLIGA" },
  { label: "CONMEBOL Libertadores", aliases: ["CONMEBOLLIBERTADORES25"], logo: "CONMEBOLLIBERTADORES25" },
  { label: "Team of The Week 25", aliases: ["TOTW25"], logo: "TOTW25" },
  { label: "Anniversary", aliases: ["ANN25"], logo: "ANN25" },
  { label: "Moments 25", aliases: ["MOMENT25", "MOMENTS25", "MOMENTS", "MOMENT"], logo: "MOMENT25" },
  { label: "Showdown 25", aliases: ["SHOWDOWN25"], logo: "SHOWDOWN25" },
  { label: "Retro Stars", aliases: ["RS24"], logo: "RS24" },
  { label: "Dynasties", aliases: ["DYNASTIES24"], logo: "DYNASTIES24" },
  { label: "Hall of Legends", aliases: ["HOL24"], logo: "HOL24" },
  { label: "Sunshine Ballers", aliases: ["SUNSHINE24"], logo: "SUNSHINE24" },
  { label: "Shapeshifters", aliases: ["SHAPESHIFTER"], logo: "SHAPESHIFTER" },
  { label: "Copa América 2024", aliases: ["COPA24"], logo: "COPA24" },
  { label: "UEFA EURO 2024™", aliases: ["EURO24"], logo: "EURO24" },
  { label: "End of An Era", aliases: ["EOE_LIVE"], logo: "EOE_LIVE" },
  { label: "Team of The Season", aliases: ["TOTS24"], logo: "TOTS24" },
  { label: "UCL Road to the Final", aliases: ["UCLRTF24"], logo: "UCLRTF24" },
  { label: "Centurions", aliases: ["CENTURIONS24"], logo: "CENTURIONS24" },
  { label: "MLS", aliases: ["MLS24"], logo: "MLS24" },
  { label: "Ramadan", aliases: ["RAMADAN24"], logo: "RAMADAN24" },
  { label: "Moments", aliases: ["MOMENTS24"], logo: "MOMENTS24" },
  { label: "Lunar New Year 24", aliases: ["LNY24"], logo: "LNY24" },
  { label: "TOTY", aliases: ["TOTY24"], logo: "TOTY24" },
  { label: "National Valour", aliases: ["NATIONALVALOUR24"], logo: "NATIONALVALOUR24" },
  { label: "POTM24", aliases: ["POTM24"], logo: "POTM24" },
  { label: "Winter Wildcards", aliases: ["WINTERWILD24"], logo: "WINTERWILD24" },
  { label: "Captains", aliases: ["CAPTAINS24"], logo: "CAPTAINS24" },
  { label: "TOTW24", aliases: ["TOTW24"], logo: "TOTW24" },
  { label: "Rivals", aliases: ["RIVALS24"], logo: "RIVALS24" },
  { label: "Rulebreakers", aliases: ["RULE2BREAKERS4"], logo: "RULE2BREAKERS4" },
  { label: "Universal Rank Player", aliases: ["UNIVERSALRANK24"], logo: "UNIVERSALRANK24" },
  { label: "UECL Event", aliases: ["S8_UECL"], logo: "S8_UECL" },
  { label: "UEL Event", aliases: ["S8_UEL"], logo: "S8_UEL" },
  { label: "Día de Muertos", aliases: ["DDLM24"], logo: "DDLM24" },
  { label: "CONMEBOL Sudamericana Event", aliases: ["CS24"], logo: "CS24" },
  { label: "CONMEBOL Libertadores Event", aliases: ["CL24"], logo: "CL24" },
  { label: "Founders", aliases: ["FOUNDERS"], logo: "FOUNDERS" },
  { label: "Welcome to FC Mobile", aliases: ["WF24"], logo: "WF24_LIVE" },
  { label: "UCL Tournament", aliases: ["S8_UCL"], logo: "S8_UCL" },
  { label: "Icons", aliases: ["ICONS"], logo: "ICONS" },
  { label: "Heroes", aliases: ["HEROS8", "HEROES8", "HEROES", "HEROS"], logo: "HEROS8" },
  { label: "FC Base Gold Player", aliases: ["FC_BASE_GOLD"] },
  { label: "FC Base Silver Player", aliases: ["FC_BASE_SILVER"] },
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
    return withImageCdn(`/program-logos/${hit.logo}.png`);
  }
  if (!hit) {
    const slug = programId.replace(/^PROGRAM_/i, "").trim();
    if (LOGO_SLUG.test(slug)) {
      return withImageCdn(`/program-logos/${slug}.png`);
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
