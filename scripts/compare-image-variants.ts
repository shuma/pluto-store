// Renders one source photograph through several quality/size/reference settings
// so the results can be compared side by side. Style comes from the store's
// reference images; there is no prompt to vary.
//
//   pnpm compare:images -- --source photo.jpg --store high-elf-club
//   pnpm compare:images -- --source photo.jpg --refs ./refs --quality max
//
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
nextEnv.loadEnvConfig(process.cwd());
const {
  OpenAIImageTransformProvider,
  buildPrompt,
}: typeof import("../lib/ai/providers/openai") =
  await import("../lib/ai/providers/openai");
type Variant = {
  name: string;
  quality: "low" | "medium" | "high" | "xhigh" | "max" | "auto";
  size: string;
  maxReferenceImages?: number;
  inputFidelity?: "high" | "low";
};
const PROD_SIZE = "1696x2400";
const VARIANTS: Variant[] = [
  { name: "default", quality: "xhigh", size: PROD_SIZE },
  // Canvas size decides whether the creator's marks read as a medium or as
  // photographic detail, so it is the setting most worth comparing.
  { name: "small", quality: "xhigh", size: "1024x1536" },
  { name: "a2-native", quality: "xhigh", size: "2416x3424" },
  { name: "max-quality", quality: "max", size: PROD_SIZE },
  // Fewer, more consistent references define a sharper target than many that disagree.
  { name: "3refs", quality: "xhigh", size: PROD_SIZE, maxReferenceImages: 3 },
];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const { values } = parseArgs({
  options: {
    source: { type: "string" },
    store: { type: "string" },
    refs: { type: "string" },
    out: { type: "string", default: "tmp/image-variants" },
    only: { type: "string" },
    quality: { type: "string" },
    size: { type: "string" },
    "refs-limit": { type: "string" },
    "input-fidelity": { type: "string" },
  },
});
function fail(message: string): never {
  console.error(`${message}

  --source <file>            the customer photograph (required)
  --store <slug>             pull the store's reference images from Supabase
  --refs <dir|a.jpg,b.jpg>   local reference images instead of --store
  --out <dir>                output directory (default tmp/image-variants)
  --only a,b                 run only these named variants
  --quality / --size / --refs-limit / --input-fidelity
                             run a single ad-hoc variant instead of the matrix

Named variants: ${VARIANTS.map((v) => v.name).join(", ")}`);
  process.exit(1);
}
async function loadImage(path: string) {
  const extension = extname(path).toLowerCase();
  const mimeType = MIME[extension];
  if (!mimeType) fail(`Unsupported image type: ${path}`);
  return { bytes: await readFile(path), mimeType, path };
}
async function loadReferences(input: string | undefined) {
  if (!input) return [];
  const paths = input.includes(",")
    ? input.split(",").map((p) => p.trim())
    : (await readdir(input).catch(() => null))
      ? (await readdir(input))
          .filter((f) => IMAGE_EXTENSIONS.includes(extname(f).toLowerCase()))
          .sort()
          .map((f) => join(input, f))
      : [input];
  return Promise.all(paths.map(loadImage));
}
// The same rows and bucket the production round reads in lib/generations/create.ts.
async function loadStore(slug: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    fail(
      "--store needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: store, error } = await db
    .from("creators")
    .select("id,name")
    .eq("slug", slug)
    .single();
  if (error || !store) fail(`No store with slug "${slug}": ${error?.message}`);
  const { data: rows, error: refsError } = await db
    .from("creator_reference_images")
    .select("storage_path")
    .eq("creator_id", store.id)
    .eq("active", true)
    .order("sort_order")
    .limit(8);
  if (refsError) fail(refsError.message);
  const references = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { data, error: downloadError } = await db.storage
        .from("creator-reference-images")
        .download(row.storage_path);
      if (downloadError || !data)
        fail(downloadError?.message ?? "Missing reference");
      return {
        bytes: Buffer.from(await data.arrayBuffer()),
        mimeType: "image/jpeg",
        path: row.storage_path,
      };
    }),
  );
  return { store, references };
}
const sourcePath = values.source ?? fail("Missing --source");
const fromStore = values.store ? await loadStore(values.store) : null;
const source = await loadImage(sourcePath);
const references = fromStore
  ? fromStore.references
  : await loadReferences(values.refs);
if (references.length === 0)
  fail("No reference images: pass --store <slug> or --refs <dir>");
const adHoc =
  values.quality ||
  values.size ||
  values["refs-limit"] ||
  values["input-fidelity"];
const selected: Variant[] = adHoc
  ? [
      {
        name: "custom",
        quality: (values.quality as Variant["quality"]) ?? "xhigh",
        size: values.size ?? PROD_SIZE,
        maxReferenceImages: values["refs-limit"]
          ? Number(values["refs-limit"])
          : undefined,
        inputFidelity: values["input-fidelity"] as "high" | "low" | undefined,
      },
    ]
  : values.only
    ? values.only.split(",").map((name) => {
        const variant = VARIANTS.find((v) => v.name === name.trim());
        return variant ?? fail(`Unknown variant: ${name.trim()}`);
      })
    : VARIANTS;
const outDir = values.out;
await mkdir(outDir, { recursive: true });
console.log(
  `source: ${basename(source.path)} · references: ${references.length}${fromStore ? ` (${fromStore.store.name})` : ""} · variants: ${selected.length}`,
);
const report: Record<string, unknown>[] = [];
for (const variant of selected) {
  const started = Date.now();
  const referenceCount = Math.min(
    references.length,
    variant.maxReferenceImages ?? references.length,
  );
  process.stdout.write(`${variant.name}… `);
  try {
    const provider = new OpenAIImageTransformProvider({
      quality: variant.quality,
      size: variant.size,
      maxReferenceImages: variant.maxReferenceImages,
      inputFidelity: variant.inputFidelity,
    });
    const result = await provider.transform({
      sourceImage: { bytes: source.bytes, mimeType: source.mimeType },
      creatorReferenceImages: references.map(({ bytes, mimeType }) => ({
        bytes,
        mimeType,
      })),
      aspectRatio: "iso-portrait",
    });
    await writeFile(join(outDir, `${variant.name}.png`), result.images[0]);
    await writeFile(
      join(outDir, `${variant.name}.prompt.txt`),
      buildPrompt(referenceCount),
    );
    const seconds = Math.round((Date.now() - started) / 1000);
    console.log(`ok (${seconds}s) → ${variant.name}.png`);
    report.push({
      ...variant,
      referenceCount,
      seconds,
      ok: true,
      usage: result.usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`failed: ${message}`);
    report.push({ ...variant, referenceCount, ok: false, error: message });
  }
}
await writeFile(
  join(outDir, "index.json"),
  JSON.stringify(
    {
      source: source.path,
      references: references.map((r) => r.path),
      results: report,
    },
    null,
    2,
  ) + "\n",
);
console.log(`\nWrote ${outDir}/index.json`);
