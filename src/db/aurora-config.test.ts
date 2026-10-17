import { describe, expect, it } from "vitest";
import { auroraConfigFromEnv } from "@/db/aurora-config";

describe("auroraConfigFromEnv", () => {
  it("returns null when AURORA_HOST is absent", () => {
    expect(auroraConfigFromEnv({ NODE_ENV: "test" })).toBeNull();
  });

  it("reads the writer endpoint settings", () => {
    expect(
      auroraConfigFromEnv({
        NODE_ENV: "test",
        AURORA_HOST: "renderz.example.com",
        AURORA_PORT: "5432",
        AURORA_USER: "postgres",
        AURORA_DATABASE: "postgres",
        AWS_REGION: "ap-southeast-1",
      }),
    ).toEqual({
      host: "renderz.example.com",
      port: 5432,
      user: "postgres",
      database: "postgres",
      region: "ap-southeast-1",
    });
  });
});
