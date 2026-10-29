import { z, ZodError } from "zod";
import { auroraConfigFromEnv } from "@/db/aurora-config";
import { getPostgresDb, type AuroraDatabase } from "@/db/postgres";
import {
  MAX_FOLLOWED_PLAYERS,
  parseFollowedPlayerIds,
} from "@/lib/followed-players";

const bodySchema = z.object({
  ids: z.array(z.string()).max(MAX_FOLLOWED_PLAYERS),
});

export function getSyncDb(): AuroraDatabase | null {
  return auroraConfigFromEnv() ? getPostgresDb() : null;
}

export async function readIdsBody(request: Request): Promise<string[]> {
  const body = bodySchema.parse(await request.json());
  return parseFollowedPlayerIds(JSON.stringify(body.ids));
}

export function unavailable(): Response {
  return Response.json({ error: "Sync is not configured" }, { status: 503 });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  return Response.json({ error: "Internal error" }, { status: 500 });
}
