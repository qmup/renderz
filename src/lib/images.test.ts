import { describe, expect, it } from "vitest";
import {
  playerArtPublicDir,
  playerArtPublicFileName,
  playerArtPublicSrc,
  playerImageApiSrc,
  playerImageSrc,
  SHARED_PLAYER_ART_DIR,
} from "@/lib/images";

describe("player art paths", () => {
  it("builds static CDN paths with encoded segments", () => {
    expect(playerArtPublicDir("30920616")).toBe("30920616");
    expect(playerArtPublicFileName("card")).toBe("card.png");
    expect(playerArtPublicSrc("30920616", "card")).toBe(
      "/player-art/30920616/card.png",
    );
    expect(playerImageSrc("30920616", "card")).toBe(
      "/player-art/30920616/card.png",
    );
    expect(playerArtPublicSrc("30920616", "untradeable")).toBe(
      `/player-art/${SHARED_PLAYER_ART_DIR}/untradeable.png`,
    );
    expect(playerArtPublicSrc("30920616", "playstyle-1012306335-l2")).toBe(
      `/player-art/${SHARED_PLAYER_ART_DIR}/playstyle-1012306335-l2.png`,
    );
  });

  it("prefixes CloudFront when the image base URL is set", () => {
    const previous = process.env.NEXT_PUBLIC_IMAGE_BASE_URL;
    process.env.NEXT_PUBLIC_IMAGE_BASE_URL = "https://cdn.example/";
    expect(playerArtPublicSrc("30920616", "card")).toBe(
      "https://cdn.example/player-art/30920616/card.png",
    );
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_IMAGE_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_IMAGE_BASE_URL = previous;
    }
  });

  it("keeps the image API on the same origin", () => {
    expect(playerImageApiSrc("id/with space", "card")).toBe(
      "/api/images/player/id%2Fwith%20space/card",
    );
  });
});
