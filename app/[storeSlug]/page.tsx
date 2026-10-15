import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore, getProducts, getExamples } from "@/lib/stores/get-store";
import { StoreUpload } from "@/components/store-upload";
import { money } from "@/lib/payments/pricing";
import { PRODUCT_KINDS, productKind } from "@/lib/products/catalog";
import { track } from "@/lib/analytics";
import { ownedStore } from "@/lib/auth";
import { HttpError } from "@/lib/http";
import { PreviewReady } from "@/components/preview-ready";
export const dynamic = "force-dynamic";
// `?preview` lets a signed-in creator see their own store before it is live,
// which is what the dashboard's preview frame loads. Anyone else still only
// sees live stores. The `data-preview` marks are where that frame writes
// the creator's unsaved edits as they type, once <PreviewReady> says the
// page has hydrated.
async function previewStore(slug: string) {
  try {
    const store = await ownedStore();
    return store?.slug === slug ? store : null;
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) return null;
    throw e;
  }
}
export default async function Storefront({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const [{ storeSlug }, { preview }] = await Promise.all([
    params,
    searchParams,
  ]);
  const store =
    preview !== undefined
      ? await previewStore(storeSlug)
      : await getStore(storeSlug);
  if (!store) notFound();
  const [products, examples] = await Promise.all([
    getProducts(store),
    getExamples(store.id),
  ]);
  if (preview === undefined) track("store_viewed", { creator_id: store.id });
  // What the store sells, as stickers in the headline, and its cheapest price.
  const sold = new Set(products.map((p) =>
      productKind(p.gelato_catalog, p.width_mm, p.height_mm),
    ),);
  const kinds = PRODUCT_KINDS.filter((k) => sold.has(k.kind));
  const cheapest = products.reduce<(typeof products)[number] | undefined>(
    (low, p) => (!low || p.price_amount < low.price_amount ? p : low),
    undefined,
  );
  const from = cheapest
    ? `From ${money(cheapest.price_amount, cheapest.currency)} · Delivered to your door`
    : "Delivered to your door";
  // One narrow column, centred, like a link-in-bio page: who made the style,
  // then the one thing to do. It is laid out for a phone first; wider
  // screens get the same column with more room around it. Once a photo is
  // chosen the header shrinks to a small avatar and name: the visitor has
  // read it already, and the photo and its button need the height.
  return (
    <div data-page-surface="paper" className="min-h-dvh bg-paper">
      {preview !== undefined && <PreviewReady />}
      <main
        id="main"
        className="group/store mx-auto flex min-h-dvh max-w-[30rem] flex-col px-4 pt-12 pb-6 transition-[padding] group-has-[[data-chosen]]/store:pt-6 sm:pt-16 sm:group-has-[[data-chosen]]/store:pt-12"
      >
        <header className="flex flex-col items-center text-center">
          {store.avatar_url ? (
            <img
              src={store.avatar_url}
              alt=""
              className="size-24 rounded-full object-cover ring-4 ring-background transition-[width,height] group-has-[[data-chosen]]/store:size-12"
            />
          ) : (
            <span className="grid size-24 place-items-center rounded-full bg-accent text-4xl font-semibold ring-4 ring-background transition-[width,height] group-has-[[data-chosen]]/store:size-12 group-has-[[data-chosen]]/store:text-xl">
              {store.name.slice(0, 1)}
            </span>
          )}
          <h1
            data-preview="name"
            className="mt-4 text-xl font-semibold group-has-[[data-chosen]]/store:mt-2 group-has-[[data-chosen]]/store:text-base"
          >
            {store.name}
          </h1>
          <p
            data-preview="description"
            className="mt-1 max-w-xs text-sm text-balance text-muted-foreground group-has-[[data-chosen]]/store:hidden"
          >
            {store.description}
          </p>
        </header>
        <div className="mt-8 group-has-[[data-chosen]]/store:mt-4">
          <StoreUpload slug={store.slug} examples={examples} priceLine={from} kinds={[...kinds]} />
          <p className="mt-3 px-4 text-center text-xs text-balance text-muted-foreground">
            Your photo is only used to make your artwork, never for AI
            training. By continuing you agree to the{" "}
            <Link href="/terms" className="underline underline-offset-2">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <footer className="mt-auto pt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-full bg-background px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          >
            Made with{" "}
            <span className="font-semibold tracking-[-.06em] text-foreground">
              pluto
            </span>
          </Link>
        </footer>
      </main>
    </div>
  );
}
