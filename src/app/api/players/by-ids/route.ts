import { getPlayerCatalog } from "@/lib/catalog/runtime";
import { MAX_PLAYER_ID_LOOKUP } from "@/lib/domain/player";
import { isAppError, publicErrorMessage } from "@/lib/http/errors";
import { ZodError } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const raw = new URL(request.url).searchParams.get("ids") ?? "";
    const ids = raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      return Response.json({ items: [] });
    }
    if (ids.length > MAX_PLAYER_ID_LOOKUP) {
      return Response.json(
        { error: `At most ${MAX_PLAYER_ID_LOOKUP} player ids` },
        { status: 400 },
      );
    }
    const items = await getPlayerCatalog().listByIds(ids);
    return Response.json({ items });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "Invalid player id" }, { status: 400 });
    }
    if (isAppError(error)) {
      return Response.json(
        { error: publicErrorMessage(error), code: error.code },
        { status: error.status },
      );
    }
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
