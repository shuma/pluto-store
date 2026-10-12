import { api, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import {
  gelatoConfigured,
  getCatalogAttributes,
  assertCatalog,
  listCatalogs,
  searchCatalog,
} from "@/lib/fulfillment/gelato-catalog";
import { catalogSearchSchema } from "@/lib/validation/schemas";
import { FEATURES, valueTitle } from "@/lib/products/catalog";
import {
  CURATED,
  SIZE_FILTER,
  SIZE_SYSTEM_LABELS,
} from "@/lib/products/curated";
// Without a catalog: which catalogs a creator can browse. With one: its
// filters and the curated prints, each with its cost and a suggested price.
export async function GET(request: Request) {
  return api(async () => {
    if (!(await ownedStore())) throw new HttpError(404, "Store not found.");
    if (!gelatoConfigured()) return { configured: false };
    const params = new URL(request.url).searchParams;
    if (!params.get("catalog"))
      return { configured: true, catalogs: await listCatalogs() };
    const { catalog, filters } = catalogSearchSchema.parse({
      catalog: params.get("catalog"),
      filters: JSON.parse(params.get("filters") ?? "{}"),
    });
    await assertCatalog(catalog);
    const [attributes, products] = await Promise.all([
      getCatalogAttributes(catalog),
      searchCatalog(catalog, filters),
    ]);
    const curated = CURATED[catalog] ?? {};
    return {
      configured: true,
      // The curated choices a creator filters by, in their words: only where
      // there is more than one to pick from.
      filters: [
        // Our own filter, first: which size system to show.
        {
          uid: SIZE_FILTER,
          title: "Sizes",
          values: Object.entries(SIZE_SYSTEM_LABELS).map(([uid, title]) => ({
            uid,
            title,
          })),
        },
        ...Object.entries(curated)
          .filter(([uid, values]) => uid in FEATURES && values.length > 1)
          .map(([uid, values]) => {
            const titles = attributes.find((a) => a.uid === uid)?.values ?? [];
            return {
              uid,
              title: FEATURES[uid],
              values: values.map((v) => ({
                uid: v,
                title: valueTitle(
                  uid,
                  v,
                  titles.find((t) => t.uid === v)?.title ?? v,
                ).replace(/ frame$/, ""),
              })),
            };
          }),
      ],
      products,
    };
  });
}
