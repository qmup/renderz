import { describe, expect, it } from "vitest";
import { publicErrorMessage, RateLimitedError } from "@/lib/http/errors";

describe("publicErrorMessage", () => {
  it("keeps ordinary messages", () => {
    expect(publicErrorMessage(new RateLimitedError("Upstream rate limited"))).toBe(
      "Upstream rate limited",
    );
  });

  it("strips messages that mention RenderZ hosts or URLs", () => {
    expect(
      publicErrorMessage(new RateLimitedError("blocked https://renderz.app/player/1")),
    ).toBe("rate limited");
  });
});
