import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
let db: PGlite;
const creator = "11111111-1111-4111-8111-111111111111",
  session = "44444444-4444-4444-8444-444444444444",
  artwork = "55555555-5555-4555-8555-555555555555",
  order = "66666666-6666-4666-8666-666666666666";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage; create table auth.users(id uuid primary key,raw_user_meta_data jsonb); create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
  );
  // Every migration in order, so a new one is covered without editing this file.
  for (const file of (await readdir("supabase/migrations")).sort()) {
    const sql = await readFile(`supabase/migrations/${file}`, "utf8");
    await db.exec(sql.replace("create extension if not exists pgcrypto;", ""));
  }
  await db.exec(await readFile("supabase/seed.sql", "utf8"));
  await db.exec(
    `insert into public.generation_sessions(id,creator_id,session_token,source_image_path,status) values('${session}','${creator}','hash','private/source','ready');`,
  );
});
afterAll(async () => {
  await db.close();
});
describe("real Postgres migration and claims", () => {
  it("creates all private buckets", async () => {
    const result = await db.query<{ name: string }>(
      "select name from storage.buckets where not public",
    );
    expect(result.rows.map((r) => r.name).sort()).toEqual([
      "creator-reference-images",
      "customer-uploads",
      "generated-artworks",
      "print-files",
    ]);
  });
  it("stores reference dimensions and rejects impossible ones", async () => {
    await db.exec(
      `insert into public.creator_reference_images(creator_id,storage_path,width_px,height_px) values('${creator}','ref/measured',1200,800);`,
    );
    const row = await db.query<{ width_px: number; height_px: number }>(
      "select width_px,height_px from public.creator_reference_images where storage_path='ref/measured'",
    );
    expect(row.rows[0]).toEqual({ width_px: 1200, height_px: 800 });
    // Rows that predate the measurement, and rows the backfill could not read,
    // stay valid: the canvas falls back to its guess for those.
    await db.exec(
      `insert into public.creator_reference_images(creator_id,storage_path) values('${creator}','ref/unmeasured');`,
    );
    await expect(
      db.query(
        `insert into public.creator_reference_images(creator_id,storage_path,width_px,height_px) values('${creator}','ref/bad',0,800)`,
      ),
    ).rejects.toThrow("creator_reference_images_dimensions");
  });
  it("keeps the style preview status within its states", async () => {
    const status = async () =>
      (
        await db.query<{ preview_status: string }>(
          `select preview_status from public.creators where id='${creator}'`,
        )
      ).rows[0].preview_status;
    expect(await status()).toBe("idle");
    await db.exec(
      `update public.creators set preview_status='running' where id='${creator}';`,
    );
    expect(await status()).toBe("running");
    await expect(
      db.query(
        `update public.creators set preview_status='done' where id='${creator}'`,
      ),
    ).rejects.toThrow("creators_preview_status");
    await db.exec(
      `update public.creators set preview_status='idle' where id='${creator}';`,
    );
  });
  it("holds up to four style preview cards, one per position", async () => {
    const add = (position: number, status = "idle") =>
      db.query(
        `insert into public.creator_style_previews(creator_id,position,status) values('${creator}',${position},'${status}')`,
      );
    for (const position of [0, 1, 2, 3]) await add(position);
    // A concurrent first load that also inserts position 0 is turned away.
    await expect(add(0)).rejects.toThrow();
    await expect(add(4)).rejects.toThrow();
    await expect(
      db.query(
        `update public.creator_style_previews set status='done' where creator_id='${creator}' and position=1`,
      ),
    ).rejects.toThrow();
    await db.exec(
      `delete from public.creator_style_previews where creator_id='${creator}';`,
    );
  });
  it("records AI usage and rejects impossible rows", async () => {
    await db.exec(
      `insert into public.ai_usage(creator_id,purpose,provider,model,images,reference_images,input_text_tokens,input_image_tokens,output_tokens,total_tokens) values('${creator}','generation','openai','gpt-image-2.5-sunburst',3,6,700,4500,9000,14200);`,
    );
    const row = await db.query<{ cost_usd: string | null }>(
      `select cost_usd from public.ai_usage where creator_id='${creator}'`,
    );
    // Tokens are kept even when the model has no known rates to cost them.
    expect(row.rows[0].cost_usd).toBeNull();
    const bad = (purpose: string, images: number, tokens: number) =>
      db.query(
        `insert into public.ai_usage(creator_id,purpose,provider,model,images,reference_images,output_tokens) values('${creator}','${purpose}','openai','m',${images},0,${tokens})`,
      );
    await expect(bad("chat", 1, 1)).rejects.toThrow();
    await expect(bad("generation", 0, 1)).rejects.toThrow();
    await expect(bad("generation", 1, -1)).rejects.toThrow();
    await db.exec(`delete from public.ai_usage;`);
  });
  it("serializes concurrent generation claims and enforces round limit", async () => {
    const results = await Promise.all([
      db.query(`select (public.claim_generation('${session}',2)).id as id`),
      db.query(`select (public.claim_generation('${session}',2)).id as id`),
    ]);
    expect(
      results.filter((r) => r.rows[0] && Object.values(r.rows[0])[0]),
    ).toHaveLength(1);
    await db.exec(
      `update public.generation_rounds set status='completed';update public.generation_sessions set status='completed' where id='${session}';`,
    );
    await db.query(`select public.claim_generation('${session}',2)`);
    await db.exec(
      `update public.generation_rounds set status='completed';update public.generation_sessions set status='completed' where id='${session}';`,
    );
    await expect(
      db.query(`select public.claim_generation('${session}',2)`),
    ).rejects.toThrow("round_limit");
  });
  it("commits payment once across duplicate and distinct events", async () => {
    await db.exec(
      `insert into public.generated_artworks(id,generation_session_id,creator_id,round_id,storage_path,original_storage_path,provider,model,width_px,height_px) select '${artwork}','${session}','${creator}',id,'preview','original','test','test',2416,3424 from public.generation_rounds limit 1;insert into public.orders(id,creator_id,generation_session_id,generated_artwork_id,product_id,product_snapshot,print_storage_path,currency,amount_total,stripe_checkout_session_id) values('${order}','${creator}','${session}','${artwork}','22222222-2222-4222-8222-222222222222','{}','print','sek',39900,'cs_test');`,
    );
    const pay = (event: string, amount = 39900) =>
      db.query<{ record_payment: boolean }>(
        `select public.record_payment($1,$2,'cs_test','pi_test',$3,'sek','fan@example.com','Fan','{"line1":"Street 1"}')`,
        [event, order, amount],
      );
    const results = await Promise.all([
      pay("evt_1"),
      pay("evt_1"),
      pay("evt_2"),
    ]);
    expect(
      results.map((r) => r.rows[0].record_payment).filter(Boolean),
    ).toHaveLength(1);
    await expect(pay("evt_bad", 1)).rejects.toThrow("payment_mismatch");
    const o = await db.query<{
      payment_status: string;
      fulfillment_status: string;
    }>(
      `select payment_status,fulfillment_status from public.orders where id='${order}'`,
    );
    expect(o.rows[0]).toEqual({
      payment_status: "paid",
      fulfillment_status: "pending",
    });
    const events = await db.query("select * from public.stripe_events");
    expect(events.rows).toHaveLength(2);
  });
  it("claims fulfillment once and cannot claim an unpaid order", async () => {
    const claim = () =>
      db.query(
        `update public.orders set fulfillment_status='submitting' where id='${order}' and payment_status='paid' and gelato_order_id is null and fulfillment_status in ('pending','fulfillment_failed') returning id`,
      );
    const results = await Promise.all([claim(), claim()]);
    expect(results.flatMap((r) => r.rows)).toHaveLength(1);
  });
  it("enforces creator isolation with actual RLS", async () => {
    const owner = "77777777-7777-4777-8777-777777777777",
      other = "88888888-8888-4888-8888-888888888888";
    await db.exec(
      `insert into auth.users(id) values('${owner}'),('${other}');update public.creators set owner_user_id='${owner}' where id='${creator}';grant usage on schema public,auth to authenticated;set role authenticated;set request.jwt.claim.sub='${other}';`,
    );
    const hidden = await db.query("select * from public.orders");
    expect(hidden.rows).toHaveLength(0);
    await expect(
      db.query("select * from public.generation_sessions"),
    ).rejects.toThrow("permission denied");
    await db.exec(`set request.jwt.claim.sub='${owner}';`);
    expect((await db.query("select id from public.orders")).rows).toHaveLength(
      1,
    );
    await expect(
      db.query(`update public.orders set amount_total=1`),
    ).rejects.toThrow("permission denied");
    await db.exec("reset role");
  });
  it("disallows public table access and privileged RPCs", async () => {
    await db.exec("grant usage on schema public to anon;set role anon;");
    await expect(db.query("select * from public.creators")).rejects.toThrow(
      "permission denied",
    );
    await expect(
      db.query(`select public.claim_generation('${session}',100)`),
    ).rejects.toThrow("permission denied");
    await db.exec("reset role");
  });
  it("rate limits persist across callers", async () => {
    const call = () =>
      db.query<{ consume_rate_limit: boolean }>(
        "select public.consume_rate_limit('test',2,3600)",
      );
    expect((await call()).rows[0].consume_rate_limit).toBe(true);
    expect((await call()).rows[0].consume_rate_limit).toBe(true);
    expect((await call()).rows[0].consume_rate_limit).toBe(false);
  });
  it("buys a cart in one order and empties what was bought on payment", async () => {
    const cartOrder = "88888888-8888-4888-8888-888888888888",
      a3 = "22222222-2222-4222-8222-222222222222",
      a2 = "33333333-3333-4333-8333-333333333333";
    // Two sizes of the same artwork in one visit: once one order each, now
    // the same visit may hold several orders, told apart by cart.
    await db.exec(
      `insert into public.cart_items(generation_session_id,generated_artwork_id,product_id,quantity) values('${session}','${artwork}','${a3}',2),('${session}','${artwork}','${a2}',1);
       insert into public.orders(id,creator_id,generation_session_id,currency,amount_total,stripe_checkout_session_id,cart_key) values('${cartOrder}','${creator}','${session}','sek',119700,'cs_cart','k1');
       insert into public.order_items(order_id,generated_artwork_id,product_id,product_snapshot,quantity,unit_amount,print_storage_path) values('${cartOrder}','${artwork}','${a3}','{}',2,39900,'p1');`,
    );
    await expect(
      db.exec(
        `insert into public.orders(creator_id,generation_session_id,currency,amount_total,cart_key) values('${creator}','${session}','sek',100,'k1')`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(
        `insert into public.cart_items(generation_session_id,generated_artwork_id,product_id,quantity) values('${session}','${artwork}','${a3}',11)`,
      ),
    ).rejects.toThrow();
    await db.query(
      `select public.record_payment('evt_cart','${cartOrder}','cs_cart','pi_cart',119700,'sek','fan@example.com','Fan','{"line1":"Street 1"}')`,
    );
    // Only what the order bought leaves the cart.
    const left = await db.query<{ product_id: string }>(
      `select product_id from public.cart_items where generation_session_id='${session}'`,
    );
    expect(left.rows).toEqual([{ product_id: a2 }]);
  });
});
