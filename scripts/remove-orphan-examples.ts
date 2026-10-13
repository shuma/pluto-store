// One-off: 202610120001 deleted the artwork-only examples, but not their files
// in the public bucket. This removes every file under {store}/example/ that no
// example row points at any more. Rows are read first, so a file still in use
// is never touched; safe to re-run.
//
//   pnpm remove:orphan-examples            # report only
//   pnpm remove:orphan-examples -- --apply # delete the files
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd());
const apply = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase credentials are missing.");
const db = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = "creator-assets";
const marker = `/object/public/${BUCKET}/`;
const { data: rows, error } = await db
  .from("creator_examples")
  .select("image_url,source_url");
if (error) throw error;
const used = new Set(
  (rows ?? []).flatMap((r) =>
    [r.image_url, r.source_url].flatMap((u: string) =>
      u.includes(marker) ? [u.split(marker)[1]] : [],
    ),
  ),
);
const { data: stores, error: storesError } = await db
  .from("creators")
  .select("id");
if (storesError) throw storesError;
const orphans: string[] = [];
for (const { id } of stores ?? []) {
  const { data: files, error: listError } = await db.storage
    .from(BUCKET)
    .list(`${id}/example`, { limit: 1000 });
  if (listError) throw listError;
  for (const file of files ?? []) {
    const path = `${id}/example/${file.name}`;
    if (!used.has(path)) orphans.push(path);
  }
}
for (const path of orphans)
  console.log(`${apply ? "removing" : "orphan"} ${path}`);
if (apply && orphans.length) {
  const { error: removeError } = await db.storage.from(BUCKET).remove(orphans);
  if (removeError) throw removeError;
}
console.log(
  `${orphans.length} orphaned file${orphans.length === 1 ? "" : "s"}${apply ? " removed" : ". Re-run with --apply to remove them"}.`,
);
