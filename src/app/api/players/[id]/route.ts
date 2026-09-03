import { getPlayerCatalog } from "@/lib/catalog/runtime";
import { playerIdSchema } from "@/lib/domain/player";
import { isAppError, NotFoundError, UndiscoveredPlayerError } from "@/lib/http/errors";
import { ZodError } from "zod";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const playerId = playerIdSchema.parse(id);
    const catalog = getPlayerCatalog();
    const exists = await catalog.exists(playerId);
    if (!exists) {
      throw new UndiscoveredPlayerError(playerId);
    }
    const player = await catalog.getById(playerId);
    if (!player) {
      throw new NotFoundError();
    }
    return Response.json(player);
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "Invalid player id" }, { status: 400 });
    }
    if (isAppError(error)) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
