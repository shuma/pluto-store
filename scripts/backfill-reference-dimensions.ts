// One-off: reference images stored before 202609240003 have no width_px or
// height_px, so the canvas has to guess their shape and correct it once the
// image decodes in the browser. This reads the real size of each stored object
// and writes it back. Nothing is uploaded or overwritten, so it is safe to
// re-run; rows that already carry a measurement are left alone.
//
//   pnpm backfill:dimensions            # report only
//   pnpm backfill:dimensions -- --apply # write the measurements
import nextEnv from "@next/env";
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
  .select("id,storage_path,width_px,height_px");
if (error) throw error;
let measured = 0;
for (const row of rows ?? []) {
  if (row.width_px && row.height_px) {
    console.log(`${row.id} already ${row.width_px}x${row.height_px}`);
    continue;
  }
  const file = await db.storage.from(BUCKET).download(row.storage_path);
  if (file.error) {
    console.log(`${row.id} skipped: ${file.error.message}`);
    continue;
  }
  const { width, height } = await sharp(
    Buffer.from(await file.data.arrayBuffer()),
  ).metadata();
  if (!width || !height) {
    console.log(`${row.id} skipped: no readable dimensions`);
    continue;
  }
  if (!apply) {
    console.log(`${row.id} would set ${width}x${height}`);
    continue;
  }
  const update = await db
    .from("creator_reference_images")
    .update({ width_px: width, height_px: height })
    .eq("id", row.id);
  if (update.error) throw update.error;
  measured++;
  console.log(`${row.id} set ${width}x${height}`);
}
console.log(
  apply ? `done — ${measured} measured` : "dry run — pass --apply to write",
);
