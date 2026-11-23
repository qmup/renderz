import { describe, expect, it } from "vitest";
import type { RenderzClient } from "@/lib/providers/renderz/client";
import {
  listUpstreamPrograms,
  parseProgramsData,
} from "@/lib/providers/renderz/programs-parser";

function svelteKitProgramsPayload(
  programs: Array<{ id: string; image?: string; addedOn?: string }>,
  page: number,
  totalPages: number,
): string {
  const table: unknown[] = [
    { programs: 1, pagination: 2 },
    [],
    { page: 3, totalPages: 4 },
    page,
    totalPages,
  ];
  const programRefs: number[] = [];
  for (const item of programs) {
    const objIndex = table.length;
    const idIndex = objIndex + 1;
    const imageIndex = objIndex + 2;
    const addedIndex = objIndex + 3;
    table.push({
      id: idIndex,
      image: imageIndex,
      addedOn: addedIndex,
    });
    table.push(item.id, item.image ?? "", item.addedOn ?? "");
    programRefs.push(objIndex);
  }
  table[1] = programRefs;
  return JSON.stringify({
    type: "data",
    nodes: [
      { type: "data", data: [{}] },
      { type: "data", data: table },
    ],
  });
}

describe("parseProgramsData", () => {
  it("extracts program ids, signed logo URLs, and pagination", () => {
    const json = svelteKitProgramsPayload(
      [
        {
          id: "PROGRAM_RV27",
          image: "https://images-v2.renderz.app/programlogos_23_RV27?verify=1-abc",
          addedOn: "2026-11-18T12:52:51.091Z",
        },
        {
          id: "PROGRAM_POTM27_EPL",
          image: "https://images-v2.renderz.app/programlogos_23_POTM27_EPL?verify=1-def",
          addedOn: "2026-11-11T10:44:10.111Z",
        },
        {
          id: "PROGRAM_RV27",
          image: "https://images-v2.renderz.app/duplicate",
        },
        {
          id: "PROGRAM_NO_LOGO",
          image: "http://insecure.example/logo.png",
        },
      ],
      1,
      10,
    );

    expect(parseProgramsData(json)).toEqual({
      page: 1,
      totalPages: 10,
      programs: [
        {
          id: "PROGRAM_RV27",
          imageUrl: "https://images-v2.renderz.app/programlogos_23_RV27?verify=1-abc",
          addedAt: Date.parse("2026-11-18T12:52:51.091Z"),
        },
        {
          id: "PROGRAM_POTM27_EPL",
          imageUrl: "https://images-v2.renderz.app/programlogos_23_POTM27_EPL?verify=1-def",
          addedAt: Date.parse("2026-11-11T10:44:10.111Z"),
        },
        {
          id: "PROGRAM_NO_LOGO",
          imageUrl: undefined,
          addedAt: undefined,
        },
      ],
    });
  });

  it("returns an empty page on invalid JSON", () => {
    expect(parseProgramsData("not-json")).toEqual({
      programs: [],
      page: 1,
      totalPages: 1,
    });
  });
});

describe("listUpstreamPrograms", () => {
  it("pages through /programs/__data.json until shouldStopAfterPage returns true", async () => {
    const fetched: string[] = [];
    const client = {
      getText: async (url: string) => {
        fetched.push(url);
        if (url === "https://renderz.app/programs/__data.json") {
          return svelteKitProgramsPayload(
            [
              {
                id: "PROGRAM_RV27",
                image: "https://images-v2.renderz.app/programlogos_23_RV27?verify=1-a",
              },
              {
                id: "PROGRAM_STREETSTARS27",
                image: "https://images-v2.renderz.app/programlogos_23_STREETSTARS27?verify=1-b",
              },
            ],
            1,
            4,
          );
        }
        if (url === "https://renderz.app/programs/__data.json?page=2") {
          return svelteKitProgramsPayload(
            [
              {
                id: "PROGRAM_TOTS25",
                image: "https://images-v2.renderz.app/programlogos_23_TOTS25?verify=1-c",
              },
            ],
            2,
            4,
          );
        }
        throw new Error(`unexpected url ${url}`);
      },
    } as unknown as RenderzClient;

    const programs = await listUpstreamPrograms(client, {
      shouldStopAfterPage: (page) =>
        page.every((entry) => entry.id === "PROGRAM_TOTS25"),
    });

    expect(fetched).toEqual([
      "https://renderz.app/programs/__data.json",
      "https://renderz.app/programs/__data.json?page=2",
    ]);
    expect(programs.map((entry) => entry.id)).toEqual([
      "PROGRAM_RV27",
      "PROGRAM_STREETSTARS27",
      "PROGRAM_TOTS25",
    ]);
  });
});
