import { getPlayerCatalog } from "@/lib/catalog/runtime";
import { playerListQueryFromSearchParams } from "@/lib/domain/query";
import { isAppError, publicErrorMessage } from "@/lib/http/errors";
import { ZodError } from "zod";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = playerListQueryFromSearchParams(url.searchParams);
    const result = await getPlayerCatalog().list(query);
    return Response.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "Invalid query" }, { status: 400 });
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
