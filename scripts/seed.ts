import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { z } from "zod";
nextEnv.loadEnvConfig(process.cwd());
const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SEED_CREATOR_USER_ID: z.union([z.uuid(), z.literal("")]).optional(),
  })
  .parse(process.env);
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
if (env.SEED_CREATOR_USER_ID) {
  const owner = await db.auth.admin.getUserById(env.SEED_CREATOR_USER_ID);
  if (owner.error) throw owner.error;
  const profile = await db
    .from("profiles")
    .upsert({ id: env.SEED_CREATOR_USER_ID });
  if (profile.error) throw profile.error;
  const assignment = await db
    .from("creators")
    .update({ owner_user_id: env.SEED_CREATOR_USER_ID })
    .eq("slug", "high-elf-club");
  if (assignment.error) throw assignment.error;
}
const creator = await db
  .from("creators")
  .select("id")
  .eq("slug", "high-elf-club")
  .single();
if (creator.error) throw creator.error;
for (const [i, name] of ["garden", "cat", "flowers"].entries()) {
  const path = `${creator.data.id}/demo-${name}.jpg`;
  const bytes = await sharp(await readFile(`public/demo/${name}.svg`))
    .resize(1400)
    .jpeg({ quality: 95 })
    .toBuffer();
  const upload = await db.storage
    .from("creator-reference-images")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (upload.error) throw upload.error;
  const existing = await db
    .from("creator_reference_images")
    .select("id")
    .eq("creator_id", creator.data.id)
    .eq("storage_path", path)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) {
    const ref = await db.from("creator_reference_images").insert({
      creator_id: creator.data.id,
      storage_path: path,
      sort_order: i,
    });
    if (ref.error) throw ref.error;
  }
}
console.info(
  env.SEED_CREATOR_USER_ID
    ? "Demo owner and original reference assets seeded."
    : "Original reference assets seeded; creator owner has not been assigned.",
);
