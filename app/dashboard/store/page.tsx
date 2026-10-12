import { ownedStore } from "@/lib/auth";
import { StoreEditor } from "@/components/store-editor";
import { getExamples } from "@/lib/stores/get-store";
import { countActiveProducts } from "@/lib/products/store-products";
export default async function StoreSettings() {
  const store = await ownedStore();
  const [examples, productCount] = store
    ? await Promise.all([getExamples(store.id), countActiveProducts(store)])
    : [[], 0];
  return (
    <>
      <h1 className="text-3xl font-semibold">
        Your storefront.
      </h1>
      <p className="mb-8 mt-3 max-w-2xl text-sm text-muted-foreground">
        This is the first thing customers see. Give it a name, an address and a
        line about what you make. The preview updates as you type.
      </p>
      <StoreEditor
        store={store}
        examples={examples}
        productCount={productCount}
      />
    </>
  );
}
