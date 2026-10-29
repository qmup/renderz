import { createSync } from "@/db/follow-sync";
import {
  errorResponse,
  getSyncDb,
  readIdsBody,
  unavailable,
} from "@/app/api/follow-sync/shared";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const db = getSyncDb();
    if (!db) {
      return unavailable();
    }
    const ids = await readIdsBody(request);
    const record = await createSync(db, ids);
    return Response.json(record, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
