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
  /**
   * Event name as it prefixes Icon / Hero / Classic subtitles, e.g.
   * "Scream Team" in "Scream Team Icon Player".
   */
  names?: string[];
  /** First day (UTC) of the event when another entry shares one of `names`. */
  since?: string;
};

export const RENDERZ_PROGRAM_CATALOG: ProgramCatalogEntry[] = [
  { label: "Scream Team", aliases: ["SCREAMTEAM27"], logo: "SCREAMTEAM27", names: ["Scream Team"] },
  { label: "Ballon d'Or", aliases: ["BD27"], logo: "BD27", names: ["Ballon d'Or"] },
  { label: "Team of the Week", aliases: ["TOTW27"], logo: "TOTW27" },
  { label: "Unbreakable", aliases: ["UB27"], logo: "UB27", names: ["Unbreakable"] },
  { label: "Classics", aliases: ["HOFS"], logo: "HOFS" },
  { label: "CONMEBOL Libertadores", aliases: ["CL27"], logo: "CL27", names: ["CONMEBOL Libertadores"], since: "2026-09-01" },
  { label: "Stellar", aliases: ["STELLAR27"], logo: "STELLAR27", names: ["Stellar"] },
  { label: "3rd Anniversary", aliases: ["ANN27"], logo: "ANN27", names: ["3rd Anniversary"] },
  { label: "Numero", aliases: ["NUMERO26", "NUMERO"], logo: "NUMERO26", names: ["Numero"] },
  { label: "Game Changer", aliases: ["GC26", "GAMECHANGER", "GAME_CHANGER"], logo: "GC26", names: ["Game Changer"] },
  { label: "Road to AFC", aliases: ["RTAC26", "ROADTOAFC", "ROAD_TO_AFC"], logo: "RTAC26" },
  { label: "Champions", aliases: ["CHAMPIONS26", "CHAMPIONS"], logo: "CHAMPIONS26", names: ["Champions Club", "Champions Signature"] },
  { label: "Summer Special", aliases: ["SUMMERSPECIAL", "SUMMER_SPECIAL"], logo: "SUMMERSPECIAL", names: ["Summer Special"] },
  { label: "Record Holders", aliases: ["RECORDHOLDERS", "RECORDHOLDERS26", "RECORD_HOLDERS"], logo: "RECORDHOLDERS26", names: ["Record Holders"] },
  { label: "The World's Game 26", aliases: ["TWG26", "TWG", "WORLDSGAME26"], logo: "TWG26", names: ["The World's Game"] },
  { label: "UECL 26", aliases: ["UECL26", "UECL"], logo: "UECL26" },
  { label: "UEL 26", aliases: ["UEL26", "UEL"], logo: "UEL26" },
  { label: "Pitch Perfect", aliases: ["PITCHPERFECT", "PITCH_PERFECT"], logo: "PITCHPERFECT", names: ["Pitch Perfect 26"] },
  { label: "TOTS 26", aliases: ["TOTS26", "TOTS"], logo: "TOTS26", names: ["TOTS 26"] },
  { label: "Songkran", aliases: ["SONGKRAN26", "SONGKRAN"], logo: "SONGKRAN26", names: ["Songkran"] },
  { label: "Top Duos", aliases: ["TOPDUOS26", "TOPDUOS", "TOP_DUOS"], logo: "TOPDUOS26", names: ["Top Duos"] },
  { label: "Capped Legends", aliases: ["CAPPED_LEGENDS_26", "CAPPEDLEGENDS26", "CAPPEDLEGENDS"], logo: "CAPPED_LEGENDS_26", names: ["Capped Legends"] },
  { label: "LNY 26", aliases: ["LNY26", "LNY"], logo: "LNY26", names: ["Lunar New Year 26"] },
  { label: "Future Stars", aliases: ["FS26", "FUTURESTARS", "FUTURE_STARS"], logo: "FS26", names: ["Future Stars"] },
  { label: "Ramadan", aliases: ["RA26", "RAMADAN"], logo: "RA26", names: ["Ramadan"], since: "2025-09-01" },
  { label: "Ginga", aliases: ["GINGA26", "GINGA"], logo: "GINGA26", names: ["Ginga"] },
  { label: "Flashback", aliases: ["FLASHBACK26", "FLASHBACK"], logo: "FLASHBACK26" },
  { label: "Outstanding", aliases: ["OUTSTANDING26", "OUTSTANDING"], logo: "OUTSTANDING26" },
  { label: "TOTY 26", aliases: ["TOTY26", "TOTY"], logo: "TOTY26", names: ["Team of The Year 26"] },
  { label: "Holiday Player", aliases: ["WINTERHOLIDAY26", "HOLIDAY", "HOLIDAYPLAYER"], logo: "WINTERHOLIDAY26" },
  { label: "Festive Fixtures", aliases: ["EPL26_FF", "FESTIVEFIXTURES", "FESTIVE"], logo: "EPL26_FF", names: ["Festive Fixtures"] },
  { label: "Record Breakers", aliases: ["RB26", "RECORDBREAKERS", "RECORD_BREAKERS"], logo: "RB26", names: ["Record Breakers"] },
  { label: "Glorious Eras", aliases: ["GE26"], logo: "GE26", names: ["Glorious Eras"] },
  { label: "UCL 26", aliases: ["UCL26"], logo: "UCL26", names: ["UEFA Dreamchasers"] },
  { label: "A Nation‘s Story", aliases: ["ANS26"], logo: "ANS26", names: ["A Nation‘s Story 26"] },
  { label: "Footyverse 26", aliases: ["FV26"], logo: "FV26", names: ["Footyverse 26"] },
  { label: "CONMEBOL Libertadores", aliases: ["CL26"], logo: "CL26", names: ["CONMEBOL Libertadores"], since: "2025-09-01" },
  { label: "TOTW 26", aliases: ["TOTW26"], logo: "TOTW26" },
  { label: "Ballon d'Or 26", aliases: ["BO26"], logo: "BO26", names: ["Ballon d'Or 26"] },
  { label: "Anniversary 26", aliases: ["ANN26"], logo: "ANN26", names: ["2nd Anniversary"] },
  { label: "National Stars 25", aliases: ["NF25"], logo: "NF25" },
  { label: "Captains 25", aliases: ["CAP25"], logo: "CAP25", names: ["Captains 25"] },
  { label: "Grassroot Greats 25", aliases: ["GRASSROOT25"], logo: "GRASSROOT25", names: ["Grassroot Greats 25"] },
  { label: "Ragnarok 25", aliases: ["RAGNAROK25"], logo: "RAGNAROK25", names: ["Ragnarok 25"] },
  { label: "Defining Legacies 25", aliases: ["DL25"], logo: "DL25", names: ["Defining Legacies 25"] },
  { label: "Aqua vs Inferno 25", aliases: ["AQUAVSINFERNO"], logo: "AQUAVSINFERNO", names: ["Aqua 25", "Inferno 25"] },
  { label: "UECL 25", aliases: ["BOU25_UECL"], logo: "S8_UECL" },
  { label: "UEL 25", aliases: ["BOU25_UEL"], logo: "S8_UEL" },
  { label: "TOTS 25", aliases: ["TOTS25"], logo: "TOTS25", names: ["TOTS 25"] },
  { label: "Songkran 25", aliases: ["SONGKRAN25"], logo: "SONGKRAN25", names: ["Songkran 25"] },
  { label: "Pitch Beats 25", aliases: ["PB25"], logo: "PB25", names: ["Pitch Beats 25"] },
  { label: "UCL 25 Road to the Final", aliases: ["UCL25_RTTF"], logo: "UCL25_RTTF" },
  { label: "MLS 25", aliases: ["PROGRAM_MLS25", "PROGRAMMLS25"], logo: "MLS24" },
  { label: "LALIGA 25", aliases: ["LALIGA25"], logo: "LALIGA25", names: ["LALIGA 25"] },
  { label: "Holi 25", aliases: ["HOLI25"], logo: "HOLI25" },
  { label: "Outstanding Player 25", aliases: ["OUTSTANDING25"], logo: "OUTSTANDING25" },
  { label: "CODE: NEON 25", aliases: ["NEON25"], logo: "NEON25", names: ["CODE: NEON"] },
  { label: "Carnival 25", aliases: ["CARNIVAL25"], logo: "CARNIVAL25", names: ["Carnival 25"] },
  { label: "TOTY 25", aliases: ["TOTY25"], logo: "TOTY25", names: ["TOTY 25"] },
  { label: "Thunderstruck 25", aliases: ["THUNDERSTUCK25"], logo: "THUNDERSTUCK25", names: ["Thunderstruck"] },
  { label: "Winter Wonders 25", aliases: ["WINTER25"], logo: "WINTER25", names: ["Winter Wonders 25"] },
  { label: "Trophy Titans 25", aliases: ["TT25"], logo: "TT25", names: ["Trophy Titans"] },
  { label: "Ballon d'Or 25", aliases: ["BALLONDOR25"], logo: "BALLONDOR25", names: ["Ballon d'Or 25"] },
  { label: "UCL 25", aliases: ["UCL25"], logo: "UCL25" },
  { label: "Día De Muertos 25", aliases: ["DDLM25"], logo: "DDLM25", names: ["Día De Muertos 25"] },
  { label: "Trick or Treat 25", aliases: ["TRICKORTREAT25"], logo: "TRICKORTREAT25", names: ["Trick or Treat 25"] },
  { label: "POTM 25 Ligue 1", aliases: ["POTM25_LIGUE1"], logo: "POTM25_LIGUE1" },
  { label: "POTM 25 LALIGA", aliases: ["POTM25_LALIGA"], logo: "POTM25_LALIGA" },
  { label: "POTM 25 Serie A", aliases: ["POTM25_SERIEA"], logo: "POTM25_SERIEA" },
  { label: "POTM 25 Premier League", aliases: ["POTM25_PREMIER"], logo: "POTM25_PREMIER" },
  { label: "POTM 25 Bundesliga", aliases: ["POTM25_BUNDESLIGA"], logo: "POTM25_BUNDESLIGA" },
  { label: "CONMEBOL Libertadores", aliases: ["CONMEBOLLIBERTADORES25"], logo: "CONMEBOLLIBERTADORES25", names: ["CONMEBOL Libertadores"], since: "2024-09-01" },
  { label: "Team of The Week 25", aliases: ["TOTW25"], logo: "TOTW25" },
  { label: "Anniversary", aliases: ["ANN25"], logo: "ANN25", names: ["Anniversary"] },
  { label: "Moments 25", aliases: ["MOMENT25", "MOMENTS25", "MOMENTS", "MOMENT"], logo: "MOMENT25", names: ["Moments"], since: "2024-09-01" },
  { label: "Showdown 25", aliases: ["SHOWDOWN25"], logo: "SHOWDOWN25" },
  { label: "Retro Stars", aliases: ["RS24"], logo: "RS24", names: ["Retro Stars"] },
  { label: "Dynasties", aliases: ["DYNASTIES24"], logo: "DYNASTIES24", names: ["Dynasties"] },
  { label: "Hall of Legends", aliases: ["HOL24"], logo: "HOL24", names: ["Hall of Legends"] },
  { label: "Sunshine Ballers", aliases: ["SUNSHINE24"], logo: "SUNSHINE24" },
  { label: "Shapeshifters", aliases: ["SHAPESHIFTER"], logo: "SHAPESHIFTER" },
  { label: "Copa América 2024", aliases: ["COPA24"], logo: "COPA24", names: ["Copa América"] },
  { label: "UEFA EURO 2024™", aliases: ["EURO24"], logo: "EURO24", names: ["UEFA EURO 2024™"] },
  { label: "End of An Era", aliases: ["EOE_LIVE"], logo: "EOE_LIVE" },
  { label: "Team of The Season", aliases: ["TOTS24"], logo: "TOTS24", names: ["Team of The Season"] },
  { label: "UCL Road to the Final", aliases: ["UCLRTF24"], logo: "UCLRTF24" },
  { label: "Centurions", aliases: ["CENTURIONS24"], logo: "CENTURIONS24", names: ["Centurions"] },
  { label: "MLS", aliases: ["MLS24"], logo: "MLS24", names: ["MLS"] },
  { label: "Ramadan", aliases: ["RAMADAN24"], logo: "RAMADAN24", names: ["Ramadan"] },
  { label: "Moments", aliases: ["MOMENTS24"], logo: "MOMENTS24", names: ["Moments"] },
  { label: "Lunar New Year 24", aliases: ["LNY24"], logo: "LNY24", names: ["Lunar New Year"] },
  { label: "TOTY", aliases: ["TOTY24"], logo: "TOTY24", names: ["Team of The Year"] },
  { label: "National Valour", aliases: ["NATIONALVALOUR24"], logo: "NATIONALVALOUR24", names: ["National Valour"] },
  { label: "POTM24", aliases: ["POTM24"], logo: "POTM24" },
  { label: "Winter Wildcards", aliases: ["WINTERWILD24"], logo: "WINTERWILD24", names: ["Winter Wildcards"] },
  { label: "Captains", aliases: ["CAPTAINS24"], logo: "CAPTAINS24", names: ["Captains"] },
  { label: "TOTW24", aliases: ["TOTW24"], logo: "TOTW24" },
  { label: "Rivals", aliases: ["RIVALS24"], logo: "RIVALS24", names: ["Rivals"] },
  { label: "Rulebreakers", aliases: ["RULE2BREAKERS4"], logo: "RULE2BREAKERS4" },
  { label: "Universal Rank Player", aliases: ["UNIVERSALRANK24"], logo: "UNIVERSALRANK24" },
  { label: "UECL Event", aliases: ["S8_UECL"], logo: "S8_UECL" },
  { label: "UEL Event", aliases: ["S8_UEL"], logo: "S8_UEL" },
  { label: "Día de Muertos", aliases: ["DDLM24"], logo: "DDLM24", names: ["Día de Muertos"] },
  { label: "CONMEBOL Sudamericana Event", aliases: ["CS24"], logo: "CS24" },
  { label: "CONMEBOL Libertadores Event", aliases: ["CL24"], logo: "CL24", names: ["CONMEBOL Libertadores"] },
  { label: "Founders", aliases: ["FOUNDERS"], logo: "FOUNDERS" },
  { label: "Welcome to FC Mobile", aliases: ["WF24"], logo: "WF24_LIVE", names: ["Welcome to FC Mobile"] },
  { label: "UCL Tournament", aliases: ["S8_UCL"], logo: "S8_UCL", names: ["UCL Group Stage"] },
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
  // Unknown ids are events newer than the hardcoded list, so they sort first.
  return lookup(programId)?.order ?? -1;
}

export function isCatalogProgram(programId: string): boolean {
  return lookup(programId) !== undefined;
}

/** RenderZ `programlogos_23` slug when this event has a logo (catalog or new id). */
export function programLogoSlug(programId: string): string | undefined {
  const hit = lookup(programId);
  if (hit) {
    return hit.logo;
  }
  const slug = programId.replace(/^PROGRAM_/i, "").trim();
  return LOGO_SLUG.test(slug) ? slug : undefined;
}

/** Logo file slug for an event that is not already in the hardcoded catalog. */
export function unknownProgramLogoSlug(programId: string): string | undefined {
  if (isCatalogProgram(programId)) {
    return undefined;
  }
  return programLogoSlug(programId);
}

/** Distinct catalog logo slugs, including events whose PNG is not in public yet. */
export function catalogProgramLogoSlugs(): string[] {
  const slugs: string[] = [];
  const seen = new Set<string>();
  for (const entry of RENDERZ_PROGRAM_CATALOG) {
    if (!entry.logo || seen.has(entry.logo)) {
      continue;
    }
    seen.add(entry.logo);
    slugs.push(entry.logo);
  }
  return slugs;
}

/** Unsigned RenderZ program-logo sprite. Missing art is ignored by the sync. */
export function programLogoUpstreamUrl(slug: string): string {
  return `https://images-v2-unsigned.renderz.app/programlogos_23_${slug}`;
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

/** Programs that only group cards released for other events. */
const CROSS_EVENT_PROGRAMS = new Set(["ICONS", "HEROS8", "HEROES8", "HEROES", "HEROS", "HOFS"]);

const eventNames = RENDERZ_PROGRAM_CATALOG.flatMap((entry) =>
  (entry.names ?? []).map((name) => ({
    prefix: `${name.toLowerCase()} `,
    programId: entry.aliases[0]!.startsWith("PROGRAM_")
      ? entry.aliases[0]!
      : `PROGRAM_${entry.aliases[0]}`,
    since: entry.since ? Date.parse(`${entry.since}T00:00:00Z`) : Number.NEGATIVE_INFINITY,
  })),
);

/**
 * Event program for an Icon / Hero / Classic card, read from its subtitle
 * ("Scream Team Icon Player" -> PROGRAM_SCREAMTEAM27). The longest event name
 * wins; names reused across seasons are split by `since` and `addedAt`.
 */
export function eventProgramIdFor(card: {
  programId?: string;
  programName?: string;
  addedAt?: number;
}): string | undefined {
  if (!card.programId || !card.programName) {
    return undefined;
  }
  if (!CROSS_EVENT_PROGRAMS.has(normalizeProgramKey(card.programId))) {
    return undefined;
  }
  const subtitle = card.programName.trim().toLowerCase();
  const matches = eventNames.filter((entry) => subtitle.startsWith(entry.prefix));
  if (matches.length === 0) {
    return undefined;
  }
  const longest = Math.max(...matches.map((entry) => entry.prefix.length));
  const sameName = matches.filter((entry) => entry.prefix.length === longest);
  const addedAt = card.addedAt ?? Number.POSITIVE_INFINITY;
  const started = sameName.filter((entry) => entry.since <= addedAt);
  const pool = started.length > 0 ? started : sameName;
  return pool.reduce((best, entry) => (entry.since > best.since ? entry : best)).programId;
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
