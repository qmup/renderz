/**
 * Vercel builds that already serve images from CloudFront skip the local
 * SQLite extract and LOOP check. Those files are not part of the deployment.
 */
import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

function run(command: string): void {
  const result = spawnSync(command, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.env.NEXT_PUBLIC_IMAGE_BASE_URL) {
  rmSync("public/player-art", { recursive: true, force: true });
  rmSync("public/loops", { recursive: true, force: true });
  console.log("Image CDN is set; skipped extract and LOOP verify");
} else {
  run("npx tsx scripts/extract-player-art.ts");
  run("npx tsx scripts/verify-loops.ts");
}
