import { ownedStore } from "@/lib/auth";
import { listStoreProducts } from "@/lib/products/store-products";
import {
  gelatoConfigured,
  getUnitCost,
} from "@/lib/fulfillment/gelato-catalog";
import { ProductsManager } from "@/components/products-manager";
import { getExamples } from "@/lib/stores/get-store";
import { readStylePreview } from "@/lib/stores/style-preview";
import type { Artwork } from "@/lib/products/art";
import { resizedPublicUrl } from "@/lib/storage";
// Art is drawn at most about 200 px across on a print mock, so the originals
// were far more image than the page can show.
const ART_SIZE = { width: 400, height: 400 };
export default async function Products() {
  const store = await ownedStore();
  if (!store) return <p>Save your store first.</p>;
  const [products, examples, preview] = await Promise.all([
    listStoreProducts(store.id),
    getExamples(store.id),
    readStylePreview(store.id, ART_SIZE),
  ]);
  // The creator's style previews from the reference images page, which are
  // what customers will get, shown on every print. Their first example, or
  // their storefront image, stands in when there are none yet.
  const fallback = examples[0]?.image_url ?? store.hero_url;
  const art: Artwork = {
    urls: preview.cards.flatMap((card) =>
      card.status === "ready" && card.url ? [card.url] : [],
    ),
    fallback: fallback && resizedPublicUrl(fallback, ART_SIZE),
  };
  // Costs are cached for hours, and a missing one only hides the earnings
  // line, so a Gelato hiccup never blocks the page.
  const costs = gelatoConfigured()
    ? Object.fromEntries(
        (
          await Promise.all(
            products.map(async (p) => {
              // Earnings only mean something for what is priced in the
              // store's currency.
              if (!p.gelato_product_uid || p.currency !== store.currency)
                return null;
              const cost = await getUnitCost(
                p.gelato_product_uid,
                store.currency,
              ).catch(() => null);
              return cost ? [p.id, cost] : null;
            }),
          )
        ).filter((entry) => entry !== null),
      )
    : {};
  return (
    <>
      <h1 className="text-3xl font-semibold">Your products.</h1>
      <p className="mb-8 mt-3 max-w-2xl text-sm text-muted-foreground">
        Choose which prints customers can order and what they cost. We print and
        ship every order, so you only set the price.
      </p>
      <ProductsManager
        products={products}
        costs={costs}
        currency={store.currency}
        art={art}
      />
    </>
  );
}
