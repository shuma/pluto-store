import { queryOptions } from "@tanstack/react-query";
import type {
  CatalogAttribute,
  CatalogProduct,
  UnitCost,
} from "@/lib/products/catalog";
import type { Currency } from "@/lib/currency";

async function read<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error ?? "Could not load prints. Try again.");
  return data;
}

export type Catalogs =
  | { configured: false }
  | { configured: true; catalogs: { uid: string; title: string }[] };
export type CatalogResult = {
  configured: true;
  filters: CatalogAttribute[];
  products: CatalogProduct[];
};

// Gelato's catalog and prices change rarely, so browsing again in the same
// visit reuses what was already fetched.
const STALE = 10 * 60 * 1000;

export function catalogsQuery() {
  return queryOptions({
    queryKey: ["catalogs"] as const,
    queryFn: () => read<Catalogs>("/api/creator/catalog"),
    staleTime: STALE,
  });
}

export function catalogProductsQuery(
  catalog: string,
  filters: Record<string, string[]>,
) {
  return queryOptions({
    queryKey: ["catalog", catalog, filters] as const,
    queryFn: () =>
      read<CatalogResult>(
        `/api/creator/catalog?${new URLSearchParams({
          catalog,
          filters: JSON.stringify(filters),
        })}`,
      ),
    staleTime: STALE,
    enabled: Boolean(catalog),
    // Keep the grid on screen while a filter change loads.
    placeholderData: (previous) => previous,
  });
}

export function unitCostQuery(productUid: string | null, currency: Currency) {
  return queryOptions({
    queryKey: ["unit-cost", productUid, currency] as const,
    queryFn: () =>
      read<{ cost: UnitCost }>(
        `/api/creator/catalog/price?${new URLSearchParams({ uid: productUid ?? "", currency })}`,
      ).then((r) => r.cost),
    staleTime: STALE,
    enabled: Boolean(productUid),
  });
}
