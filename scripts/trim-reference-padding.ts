// One-off: existing reference images were stored letterboxed inside a uniform
// background, so they showed padding on the canvas. This writes a trimmed copy
// to a NEW storage path and repoints the row. The original object is left in
// place, so the change is reversible by restoring the old storage_path.
//
//   pnpm trim:references            # report only
//   pnpm trim:references -- --apply # write the trimmed copies
import nextEnv from "@next/env";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd());
const apply = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase credentials are missing.");
const db = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = "creator-reference-images";
const { data: rows, error } = await db
  .from("creator_reference_images")
  .select("id,creator_id,storage_path");
if (error) throw error;
for (const row of rows ?? []) {
  const file = await db.storage.from(BUCKET).download(row.storage_path);
  if (file.error) {
    console.log(`${row.id} skipped: ${file.error.message}`);
    continue;
  }
  const original = Buffer.from(await file.data.arrayBuffer());
  const before = await sharp(original).metadata();
  const { data: trimmed, info } = await sharp(original)
    .trim({ threshold: 12 })
    .jpeg({ quality: 95 })
    .toBuffer({ resolveWithObject: true });
  const kept =
    (info.width * info.height) /
    Math.max((before.width ?? 1) * (before.height ?? 1), 1);
  const label = `${before.width}x${before.height} -> ${info.width}x${info.height}`;
  if (!(kept > 0.02 && kept < 0.999)) {
    console.log(`${row.id} unchanged (${label})`);
    continue;
  }
  if (!apply) {
    console.log(`${row.id} would trim ${label}`);
    continue;
  }
  const next = `${row.creator_id}/reference/${randomUUID()}.jpg`;
  const upload = await db.storage
    .from(BUCKET)
    .upload(next, trimmed, { contentType: "image/jpeg", upsert: false });
  if (upload.error) throw upload.error;
  const update = await db
    .from("creator_reference_images")
    .update({ storage_path: next })
    .eq("id", row.id);
  if (update.error) throw update.error;
  console.log(`${row.id} trimmed ${label} (was ${row.storage_path})`);
}
console.log(apply ? "done" : "dry run — pass --apply to write");
