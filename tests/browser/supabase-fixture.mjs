// Read-only Supabase HTTP fixture for browser layout tests. Not used by the application.
import { createServer } from "node:http";
import { createHash } from "node:crypto";
const creator = "11111111-1111-4111-8111-111111111111";
const session = "44444444-4444-4444-8444-444444444444";
const store = {
  id: creator,
  owner_user_id: null,
  name: "High Elf Club Demo",
  slug: "high-elf-club",
  description: "Turn a photo you love into a unique illustrated poster.",
  avatar_url: null,
  hero_url: "/demo/garden.svg",
  transformation_instruction: "Original botanical illustration",
  status: "live",
  currency: "sek",
  currencies: ["sek", "eur"],
};
const products = [
  {
    id: "22222222-2222-4222-8222-222222222222",
    creator_id: creator,
    name: "A3 Poster",
    slug: "a3-poster",
    gelato_product_uid: null,
    width_mm: 297,
    height_mm: 420,
    aspect_ratio: "iso-portrait",
    product_prices: [
      { currency: "sek", amount: 39900 },
      { currency: "eur", amount: 3499 },
    ],
    active: true,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    creator_id: creator,
    name: "A2 Poster",
    slug: "a2-poster",
    gelato_product_uid: null,
    width_mm: 420,
    height_mm: 594,
    aspect_ratio: "iso-portrait",
    product_prices: [
      { currency: "sek", amount: 59900 },
      { currency: "eur", amount: 4999 },
    ],
    active: true,
  },
];
const artworks = ["garden", "cat", "flowers"].map((name, i) => ({
  id: `55555555-5555-4555-8555-55555555555${i}`,
  generation_session_id: session,
  creator_id: creator,
  round_id: "66666666-6666-4666-8666-666666666666",
  storage_path: name,
  original_storage_path: name,
  print_storage_path: null,
  width_px: 2416,
  height_px: 3424,
  status: "ready",
  selected: true,
}));
createServer((req, res) => {
  const url = new URL(req.url, "http://localhost:54329");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (url.pathname.startsWith("/storage/v1/object/sign/")) {
    const name = url.pathname.split("/").at(-1);
    res.end(
      JSON.stringify({ signedURL: `/object/public/fixture/${name}.svg` }),
    );
    return;
  }
  if (url.pathname.startsWith("/storage/v1/object/public/fixture/")) {
    res.writeHead(302, {
      Location: `http://localhost:3100/demo/${url.pathname.split("/").at(-1)}`,
    });
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("{}");
    return;
  }
  let data = [];
  if (url.pathname === "/rest/v1/creators") data = [store];
  if (url.pathname === "/rest/v1/products") data = products;
  if (url.pathname === "/rest/v1/generation_sessions")
    data = [
      {
        id: session,
        creator_id: creator,
        session_token: createHash("sha256")
          .update("browser-test-secret")
          .digest("hex"),
        source_image_path: "source",
        round_count: 1,
        status: "completed",
        expires_at: "2099-01-01T00:00:00Z",
      },
    ];
  if (url.pathname === "/rest/v1/generated_artworks") data = artworks;
  for (const [key, value] of url.searchParams) {
    if (value.startsWith("eq."))
      data = data.filter((row) => String(row[key]) === value.slice(3));
  }
  res.end(
    JSON.stringify(
      (req.headers.accept ?? "").includes("vnd.pgrst.object")
        ? (data[0] ?? null)
        : data,
    ),
  );
}).listen(54329, "127.0.0.1", () =>
  console.log("Read-only browser fixture on 54329"),
);
