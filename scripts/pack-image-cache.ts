import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const root = path.join(process.cwd(), "data", "image-cache");
const dest = path.join(process.cwd(), "data", "images.sqlite");

mkdirSync(path.dirname(dest), { recursive: true });
const db = new Database(dest);
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS images (
  player_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  bytes BLOB NOT NULL,
  PRIMARY KEY (player_id, kind)
)`);
const insert = db.prepare(
  "INSERT OR REPLACE INTO images (player_id, kind, bytes) VALUES (?, ?, ?)",
);

let packed = 0;
const insertMany = db.transaction((rows: Array<[string, string, Buffer]>) => {
  for (const row of rows) {
    insert.run(...row);
  }
});

const batch: Array<[string, string, Buffer]> = [];
for (const playerDir of readdirSync(root)) {
  const dir = path.join(root, playerDir);
  for (const kind of readdirSync(dir)) {
    const bytes = readFileSync(path.join(dir, kind));
    batch.push([decodeURIComponent(playerDir), decodeURIComponent(kind), bytes]);
    packed += 1;
    if (batch.length >= 200) {
      insertMany(batch.splice(0, batch.length));
    }
  }
}
if (batch.length > 0) {
  insertMany(batch);
}
db.close();
console.log(`packed ${packed} images into ${dest}`);
