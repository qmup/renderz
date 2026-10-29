import { readSync, writeSync } from "@/db/follow-sync";
import {
  errorResponse,
  getSyncDb,
  readIdsBody,
  unavailable,
} from "@/app/api/follow-sync/shared";
import { normalizeSyncCode } from "@/lib/followed-players";

export const runtime = "nodejs";
export const maxDuration = 60;

type Context = { params: Promise<{ code: string }> };

const NO_STORE = { "Cache-Control": "no-store" };

function notFound(): Response {
  return Response.json({ error: "Unknown sync code" }, { status: 404 });
}

export async function GET(_request: Request, context: Context) {
  try {
    const code = normalizeSyncCode((await context.params).code);
    if (!code) {
      return notFound();
    }
    const db = getSyncDb();
    if (!db) {
      return unavailable();
    }
    const record = await readSync(db, code);
    return record ? Response.json(record, { headers: NO_STORE }) : notFound();
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const code = normalizeSyncCode((await context.params).code);
    if (!code) {
      return notFound();
    }
    const db = getSyncDb();
    if (!db) {
      return unavailable();
    }
    const ids = await readIdsBody(request);
    const record = await writeSync(db, code, ids);
    return record ? Response.json(record) : notFound();
  } catch (error) {
    return errorResponse(error);
  }
}
