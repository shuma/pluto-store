import { afterAll, beforeAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
// The cart migration moves every existing order's print into order_items:
// applied to a database that already holds an old single-print order.
const CART = "202610060001_cart.sql";
const creator = "11111111-1111-4111-8111-111111111111",
  session = "44444444-4444-4444-8444-444444444444",
  artwork = "55555555-5555-4555-8555-555555555555",
  order = "66666666-6666-4666-8666-666666666666",
  product = "22222222-2222-4222-8222-222222222222";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage; create table auth.users(id uuid primary key,raw_user_meta_data jsonb); create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
  );
  const files = (await readdir("supabase/migrations")).sort();
  for (const file of files.slice(0, files.indexOf(CART))) {
    const sql = await readFile(`supabase/migrations/${file}`, "utf8");
    await db.exec(sql.replace("create extension if not exists pgcrypto;", ""));
  }
  // The store and print as they were before the cart: the seed follows the
  // latest schema, so it can't be loaded this far back.
  await db.exec(
    `insert into public.creators(id,name,slug,description,rights_confirmed_at,status,currency) values('${creator}','Demo','high-elf-club','Demo',now(),'live','sek');
     insert into public.products(id,creator_id,name,slug,width_mm,height_mm,aspect_ratio,currency,price_amount) values('${product}','${creator}','A3 Poster','a3-poster',297,420,'portrait','sek',39900);
     insert into public.generation_sessions(id,creator_id,session_token,source_image_path,status) values('${session}','${creator}','hash','private/source','ready');
     select public.claim_generation('${session}',2);
     insert into public.generated_artworks(id,generation_session_id,creator_id,round_id,storage_path,original_storage_path,provider,model,width_px,height_px) select '${artwork}','${session}','${creator}',id,'preview','original','test','test',2416,3424 from public.generation_rounds limit 1;
     insert into public.orders(id,creator_id,generation_session_id,generated_artwork_id,product_id,product_snapshot,print_storage_path,currency,amount_total) values('${order}','${creator}','${session}','${artwork}','${product}','{"name":"A3"}','print.png','sek',39900);`,
  );
  await db.exec(await readFile(`supabase/migrations/${CART}`, "utf8"));
});
afterAll(async () => {
  await db.close();
});
it("turns each existing order into one item of that order", async () => {
  const items = await db.query(
    `select generated_artwork_id,product_id,product_snapshot,quantity,unit_amount,print_storage_path from public.order_items where order_id='${order}'`,
  );
  expect(items.rows).toEqual([
    {
      generated_artwork_id: artwork,
      product_id: product,
      product_snapshot: { name: "A3" },
      quantity: 1,
      unit_amount: 39900,
      print_storage_path: "print.png",
    },
  ]);
});
it("drops the one-order-per-print rule", async () => {
  await db.exec(
    `insert into public.orders(creator_id,generation_session_id,generated_artwork_id,product_id,product_snapshot,print_storage_path,currency,amount_total,cart_key) values('${creator}','${session}','${artwork}','${product}','{}','p','sek',39900,'other')`,
  );
});
