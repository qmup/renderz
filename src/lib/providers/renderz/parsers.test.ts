import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseListingSeed } from "@/lib/providers/renderz/listing-parser";
import {
  parseAddedAt,
  parseHeightCm,
  parsePlayerPage,
  parseWeightKg,
} from "@/lib/providers/renderz/player-parser";
import {
  parseSitemapChildLocs,
  parseSitemapPlayerLocs,
} from "@/lib/providers/renderz/sitemap-parser";
import { ParseError } from "@/lib/http/errors";

const fixtures = path.join(process.cwd(), "test/fixtures/renderz/minimized");

function read(name: string): string {
  return readFileSync(path.join(fixtures, name), "utf8");
}

describe("parseListingSeed", () => {
  it("parses HTML kit.start and links", () => {
    const seeds = parseListingSeed({ html: read("listing.html") });
    expect(seeds.map((seed) => seed.id).sort()).toEqual(["24029971", "30920624"]);
    expect(seeds.find((seed) => seed.id === "30920624")?.rating).toBe(122);
  });

  it("parses packed __data.json", () => {
    const seeds = parseListingSeed({ dataJson: read("listing.data.json") });
    expect(seeds).toHaveLength(2);
    expect(seeds.find((seed) => seed.slug === "mbappe")?.rating).toBe(120);
  });

  it("merges HTML and data.json without duplicating ids", () => {
    const seeds = parseListingSeed({
      html: read("listing.html"),
      dataJson: read("listing.data.json"),
    });
    const ids = seeds.map((seed) => seed.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("24044714");
    expect(ids).toContain("30920624");
  });

  it("fails closed when neither source has players", () => {
    expect(() => parseListingSeed({ html: "<html></html>" })).toThrow(ParseError);
  });
});

describe("player field helpers", () => {
  it("parses height, weight, and added timestamps", () => {
    expect(parseHeightCm("5'7\" (169 cm)")).toBe(169);
    expect(parseWeightKg("67 kg")).toBe(67);
    expect(parseAddedAt("2026-01-14T12:50:28.852Z")).toBe(
      Date.parse("2026-01-14T12:50:28.852Z"),
    );
  });
});

describe("parsePlayerPage", () => {
  it("parses HTML-only player pages and prefers visible labels", () => {
    const { player, assets } = parsePlayerPage({ html: read("messi.html") });
    expect(player.id).toBe("24029971");
    expect(player.rating).toBe(114);
    expect(player.cardName).toBe("Messi");
    expect(player.firstName).toBe("Lionel");
    expect(player.lastName).toBe("Messi");
    expect(player.position).toBe("ST");
    expect(player.heightCm).toBe(169);
    expect(player.weightKg).toBe(67);
    expect(player.auctionable).toBe(true);
    expect(player.clubName).toBe("Inter Miami CF");
    expect(player.nationName).toBe("Argentina");
    expect(player.leagueName).toBe("Major League Soccer");
    expect(player.programName).toBe("Team of The Year 26 Player");
    expect(player.stats.some((stat) => stat.key === "avg1" && stat.value === 136)).toBe(true);
    expect(player.stats.some((stat) => stat.key === "acc")).toBe(true);
    expect(player.starSigningsBuy).toBe(12500);
    expect(player.starSigningsSell).toBe(4000);
    expect(player.playStyles[0]?.name).toBe("Precision Header");
    expect(player.playStyles[0]?.description).toBe(
      "Player has exceptional performance when heading the ball.",
    );
    expect(player.traits.map((trait) => trait.name)).toEqual(["Hard Stop", "Finesse Shot"]);
    expect(JSON.stringify(player)).not.toContain("https://images-v2.renderz.app");
    expect(assets.some((asset) => asset.kind === "card")).toBe(true);
    expect(assets.some((asset) => asset.kind === "playstyle-12683081-l1")).toBe(true);
    expect(
      assets.find((asset) => asset.kind === "playstyle-12683081-l1")?.upstreamUrl,
    ).toContain("playstyle_256_");
    expect(assets.some((asset) => asset.kind === "trait-13")).toBe(true);
    expect(player.availableImageKinds).toEqual([
      "card",
      "background",
      "flag",
      "club",
      "league",
    ]);
    expect(assets[0]?.upstreamUrl.startsWith("https://images-v2.renderz.app")).toBe(true);
  });

  it("parses __data.json-only and keeps unresolved i18n keys", () => {
    const { player } = parsePlayerPage({ dataJson: read("mbappe.data.json") });
    expect(player.id).toBe("24044714");
    expect(player.rating).toBe(120);
    expect(player.position).toBe("LW");
    expect(player.auctionable).toBe(false);
    expect(player.clubName).toBe("TeamName_243");
    expect(player.stats.some((stat) => stat.key === "avg1")).toBe(true);
    expect(JSON.stringify(player)).not.toContain("https://images-v2.renderz.app");
    expect(player.availableImageKinds.some((kind) => kind.startsWith("playstyle-"))).toBe(
      false,
    );
  });

  it("merges data.json fields with HTML labels", () => {
    const { player } = parsePlayerPage({
      html: read("messi.html"),
      dataJson: read("mbappe.data.json"),
    });
    expect(player.id).toBe("24044714");
    expect(player.clubName).toBe("Inter Miami CF");
  });

  it("does not copy the whole page into programName", () => {
    const html = `<h1>Osimhen</h1>
<div>FC Mobile Like Dislike Champions Club Player 122 ST Osimhen Animate Compare Download Card TEAM ignored
<p>Champions Club Player</p>
<div>TEAM</div><div>Galatasaray SK</div>
<script>kit.start(app, element, {data:[null,{type:"data",data:{player:{id:24048401,cardName:"Osimhen",firstName:"Victor",lastName:"Osimhen",rating:122,position:"ST",auctionable:true,clubName:"TeamName_1",images:{}}}}]});</script>`;
    const { player } = parsePlayerPage({ html });
    expect(player.programName).toBe("Champions Club Player");
    expect(player.programName?.length).toBeLessThan(80);
    expect(player.clubName).toBe("Galatasaray SK");
    expect(player.cardName).toBe("Osimhen");
    expect(player.firstName).toBe("Victor");
    expect(player.lastName).toBe("Osimhen");
    expect(player.name).toBe("Victor Osimhen");
  });

  it("reads Star Signings buy/sell from auction JSON when HTML copy is split", () => {
    const html = `<h1>Varane</h1>
<span>Star Signings Price</span>
<span>Buy</span><span>62,240</span>
<span>Sell</span><span>10,000</span>
<a href="/playstyles/12683081-precision-header">
  <img src="https://images-v2.renderz.app/playstyle_256_PLAYSTYLE_AERIAL_MASTER_1?verify=1-abc" alt="Precision Header" />
  <span>Precision Header</span>
  <span>Level 1</span>
  <p>Player has exceptional performance when heading the ball.</p>
</a>
<img src="https://images-v2.renderz.app/traitlogo_23_7?verify=1-abc" alt="" />
<span>Hard Stop</span>
<script>kit.start(app, element, {data:[null,{type:"data",data:{player:{id:30920624,cardName:"Varane",firstName:"Raphael",lastName:"Varane",rating:122,position:"CB",auctionable:false,auction:{purchasePrice:62240,sellPrice:10000},playStyles:[{id:12683081,name:"PLAYSTYLE_AERIAL_DEFENSE",level:1}],traits:[{id:7,title:"traits_title_7"}],images:{}}}}]});</script>`;
    const { player, assets } = parsePlayerPage({ html });
    expect(player.starSigningsBuy).toBe(62240);
    expect(player.starSigningsSell).toBe(10000);
    expect(player.playStyles[0]?.name).toBe("Precision Header");
    expect(player.playStyles[0]?.description).toContain("heading the ball");
    expect(player.playStyles[0]?.level).toBe(1);
    expect(player.traits[0]?.name).toBe("Hard Stop");
    expect(assets.some((asset) => asset.kind === "playstyle-12683081-l1")).toBe(true);
    expect(assets.some((asset) => asset.kind === "trait-7")).toBe(true);
    expect(JSON.stringify(player)).not.toContain("https://images-v2.renderz.app");
  });

  it("keeps negative playstyle ids and trait names next to logos", () => {
    const html = `<h1>Carlos Alberto</h1>
<a href="/playstyles/-1765936151-accelerator">
  <img src="https://images-v2.renderz.app/playstyle_256_PLAYSTYLE_ACCELERATOR_2?verify=1-abc" alt="Accelerator" />
  <span>Accelerator</span>
  <span>Level 2</span>
  <p>Player accelerates more quickly over the first few metres.</p>
</a>
<div>
  <img src="https://images-v2.renderz.app/traitlogo_23_15?verify=1-abc" alt="" />
  <span class="block max-w-[90%] truncate text-[11px]">Long Passer</span>
</div>
<div>
  <img src="https://images-v2.renderz.app/traitlogo_23_29?verify=1-abc" alt="" />
  <span class="block max-w-[90%] truncate text-[11px]">Acrobatic Clearance</span>
</div>
<script>kit.start(app, element, {data:[null,{type:"data",data:{player:{id:30920616,cardName:"Carlos Alberto",firstName:"Carlos Alberto",lastName:"Torres",rating:121,position:"RB",playStyles:[{id:-1765936151,name:"PLAYSTYLE_ACCELERATOR",level:2,levelImage:"https://images-v2.renderz.app/playstyle_256_PLAYSTYLE_ACCELERATOR_2?verify=1-abc"}],traits:[{id:15,title:"traits_title_15"},{id:29,title:"traits_title_29"}],images:{}}}}]});</script>`;
    const { player, assets } = parsePlayerPage({ html });
    expect(player.playStyles[0]?.id).toBe("-1765936151");
    expect(player.playStyles[0]?.name).toBe("Accelerator");
    expect(player.playStyles[0]?.description).toContain("accelerates");
    expect(player.traits.map((trait) => [trait.id, trait.name])).toEqual([
      ["15", "Long Passer"],
      ["29", "Acrobatic Clearance"],
    ]);
    expect(assets.some((asset) => asset.kind === "playstyle--1765936151-l2")).toBe(
      true,
    );
    expect(assets.some((asset) => asset.kind === "trait-29")).toBe(true);
  });

  it("reads Star Signings from auction fields without Buy/Sell HTML", () => {
    const html = `<h1>Varane</h1>
<script>kit.start(app, element, {data:[null,{type:"data",data:{player:{id:30920624,cardName:"Varane",firstName:"Raphael",lastName:"Varane",rating:122,auction:{purchasePrice:62240,sellPrice:10000},images:{}}}}]});</script>`;
    const { player } = parsePlayerPage({ html });
    expect(player.starSigningsBuy).toBe(62240);
    expect(player.starSigningsSell).toBe(10000);
  });

  it("parses card LOOP sprite into loop-f{n} asset without exposing URLs", () => {
    const html = `<h1>Carlos Alberto</h1>
<script>kit.start(app, element, {data:[null,{type:"data",data:{player:{id:30920616,cardName:"Carlos Alberto",firstName:"Carlos Alberto",lastName:"Torres",rating:122,position:"CB",images:{playerCardImage:"https://images-v2.renderz.app/player_25_x?verify=1-abc",playerCardBackground:"https://images-v2.renderz.app/cardbg_x?verify=1-abc"},animation:{cardData:["background","player"],animations:[{animations:[{id:"jry8g8",image:"https://images-v2.renderz.app/sprite_23_numero26_NUMERO4_ICON_LOOP?verify=1-abc",imageName:"numero26_NUMERO4_ICON_LOOP",imageHeight:0,imageWidth:0,maxFrames:45}],when:"(#cardSize == big)"}]}}}}]});</script>`;
    const { player, assets } = parsePlayerPage({ html });
    expect(assets.some((asset) => asset.kind === "loop-f45")).toBe(true);
    expect(
      assets.find((asset) => asset.kind === "loop-f45")?.upstreamUrl,
    ).toContain("ICON_LOOP");
    expect(player.availableImageKinds).toContain("loop-f45");
    expect(JSON.stringify(player)).not.toContain("images-v2.renderz.app");
    expect(JSON.stringify(player)).not.toContain("ICON_LOOP");
  });
});

describe("sitemap parsers", () => {
  it("extracts player ids and ignores program URLs", () => {
    const entries = parseSitemapPlayerLocs(read("sitemap-players.xml"));
    expect(entries.map((entry) => entry.id)).toEqual(["24029971", "24044714"]);
  });

  it("extracts player sitemap children", () => {
    const locs = parseSitemapChildLocs(read("sitemap-index.xml"));
    expect(locs).toEqual([
      "https://renderz.app/sitemap-players-1.xml",
      "https://evil.example/sitemap-players-2.xml",
    ]);
  });
});
