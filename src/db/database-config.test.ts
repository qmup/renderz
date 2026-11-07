import { describe, expect, it } from "vitest";
import { databaseUrlFromEnv, isPostgresConfigured } from "@/db/database-config";

describe("isPostgresConfigured", () => {
  it("is false without DATABASE_URL", () => {
    expect(isPostgresConfigured({ NODE_ENV: "test" })).toBe(false);
    expect(isPostgresConfigured({ NODE_ENV: "test", DATABASE_URL: "  " })).toBe(false);
  });

  it("accepts a DATABASE_URL connection string", () => {
    const env = {
      NODE_ENV: "test" as const,
      DATABASE_URL: " postgres://u:p@db.example.com/app?sslmode=require ",
    };
    expect(databaseUrlFromEnv(env)).toBe(
      "postgres://u:p@db.example.com/app?sslmode=require",
    );
    expect(isPostgresConfigured(env)).toBe(true);
  });
});
