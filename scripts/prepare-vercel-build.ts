/**
 * Card art and LOOP sheets are served from CloudFront. Drop any local copies
 * so they are not uploaded with the deployment.
 */
import { rmSync } from "node:fs";

if (process.env.NEXT_PUBLIC_IMAGE_BASE_URL) {
  rmSync("public/player-art", { recursive: true, force: true });
  rmSync("public/loops", { recursive: true, force: true });
  console.log("Image CDN is set; omitted local image copies");
}
