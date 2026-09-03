import { getPlayerCatalog } from "@/lib/catalog/runtime";
import {
  getCatalogUpdateStatus,
  startCatalogUpdate,
  waitForCatalogUpdate,
} from "@/lib/catalog/update";
import { isLocalhostRequest } from "@/lib/http/localhost";
import { getRenderzSource } from "@/lib/providers/renderz/renderz-source";
import { after } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function forbidden() {
  return Response.json(
    { error: "Catalog update is only available on localhost" },
    { status: 403 },
  );
}

export async function GET(request: Request) {
  if (!isLocalhostRequest(request)) {
    return forbidden();
  }
  return Response.json(getCatalogUpdateStatus());
}

export async function POST(request: Request) {
  if (!isLocalhostRequest(request)) {
    return forbidden();
  }
  const started = startCatalogUpdate(getPlayerCatalog(), getRenderzSource());
  if (!started) {
    return Response.json(getCatalogUpdateStatus(), { status: 409 });
  }
  after(() => waitForCatalogUpdate());
  return Response.json(getCatalogUpdateStatus(), { status: 202 });
}
