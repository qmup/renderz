import { RenderzClient } from "@/lib/providers/renderz/client";
import {
  findInflatedField,
  inflateSvelteKitData,
} from "@/lib/providers/renderz/sveltekit-data";
import { programsDataUrl } from "@/lib/providers/renderz/urls";

const DEFAULT_MAX_PROGRAM_PAGES = 10;

export type UpstreamProgramEntry = {
  id: string;
  imageUrl?: string;
  addedAt?: number;
};

export type UpstreamProgramsPage = {
  programs: UpstreamProgramEntry[];
  page: number;
  totalPages: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asHttpsUrl(value: unknown): string | undefined {
  const url = asString(value);
  return url?.startsWith("https://") ? url : undefined;
}

function asPositiveInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

function parseAddedAt(value: unknown): number | undefined {
  const text = asString(value);
  if (!text) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? undefined : ms;
}

export function parseProgramsData(dataJson: string): UpstreamProgramsPage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(dataJson);
  } catch {
    return { programs: [], page: 1, totalPages: 1 };
  }
  const nodes = inflateSvelteKitData(parsed);
  const rawPrograms = findInflatedField<unknown>(nodes, "programs");
  const rawPagination = findInflatedField<unknown>(nodes, "pagination");

  const programs: UpstreamProgramEntry[] = [];
  const seen = new Set<string>();
  if (Array.isArray(rawPrograms)) {
    for (const item of rawPrograms) {
      if (!isRecord(item)) {
        continue;
      }
      const id = asString(item.id);
      if (!id || seen.has(id)) {
        continue;
      }
      seen.add(id);
      programs.push({
        id,
        imageUrl: asHttpsUrl(item.image),
        addedAt: parseAddedAt(item.addedOn),
      });
    }
  }

  const pagination = isRecord(rawPagination) ? rawPagination : undefined;
  const page = asPositiveInt(pagination?.page) ?? 1;
  const totalPages = asPositiveInt(pagination?.totalPages) ?? page;
  return { programs, page, totalPages };
}

export async function listUpstreamPrograms(
  client = new RenderzClient(),
  options: {
    maxPages?: number;
    shouldStopAfterPage?: (programs: UpstreamProgramEntry[]) => boolean;
  } = {},
): Promise<UpstreamProgramEntry[]> {
  const maxPages = options.maxPages ?? DEFAULT_MAX_PROGRAM_PAGES;
  const entries: UpstreamProgramEntry[] = [];
  const seen = new Set<string>();
  let totalPages = 1;

  for (let page = 1; page <= totalPages && page <= maxPages; page += 1) {
    const dataJson = await client.getText(programsDataUrl(page));
    const parsed = parseProgramsData(dataJson);
    totalPages = Math.max(totalPages, parsed.totalPages);
    for (const program of parsed.programs) {
      if (seen.has(program.id)) {
        continue;
      }
      seen.add(program.id);
      entries.push(program);
    }
    if (
      parsed.programs.length === 0 ||
      options.shouldStopAfterPage?.(parsed.programs)
    ) {
      break;
    }
  }

  return entries;
}
