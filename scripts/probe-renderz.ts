/**
 * Manual fixture refresh. Writes gitignored raw HTML/JSON under
 * test/fixtures/renderz/raw/. Not run in CI.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { RenderzClient } from "../src/lib/providers/renderz/client";
import {
  playerDataUrl,
  playerUrl,
  playersDataUrl,
  playersUrl,
} from "../src/lib/providers/renderz/urls";

const outDir = path.join(process.cwd(), "test/fixtures/renderz/raw");

async function main() {
  mkdirSync(outDir, { recursive: true });
  const client = new RenderzClient();
  const targets = [
    ["players.html", playersUrl()],
    ["players.data.json", playersDataUrl()],
    ["messi.html", playerUrl("24029971", "messi")],
    ["messi.data.json", playerDataUrl("24029971", "messi")],
    ["mbappe.html", playerUrl("24044714", "mbappe")],
    ["mbappe.data.json", playerDataUrl("24044714", "mbappe")],
  ] as const;

  for (const [name, url] of targets) {
    const body = await client.getText(url);
    writeFileSync(path.join(outDir, name), body);
    console.log(`wrote ${name} (${body.length} bytes)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
