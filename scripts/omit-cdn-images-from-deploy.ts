/**
 * On Vercel, card art and LOOP sheets are served from CloudFront.
 * Drop the copies under public/ so they are not uploaded with the deployment.
 * Local builds keep the files.
 */
import { rmSync } from "node:fs";

if (process.env.VERCEL && process.env.NEXT_PUBLIC_IMAGE_BASE_URL) {
  rmSync("public/player-art", { recursive: true, force: true });
  rmSync("public/loops", { recursive: true, force: true });
  console.log(
    "Omitted public/player-art and public/loops from the Vercel deployment",
  );
} else {
  console.log("Keeping player-art and loops in this build");
}
