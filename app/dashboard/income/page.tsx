import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { ORDER_WITH_ITEMS, orderRow } from "@/lib/domain";
import { IncomeBoard } from "@/components/income-board";
// A year and more of a small store's orders; the charts, figures and
// search all work on these in the browser, so they are instant.
const LIMIT = 2000;
// With the time they were read, which every period is counted back from.
async function loadOrders(creatorId: string) {
  const { data, error } = await adminDb()
    .from("orders")
    .select(ORDER_WITH_ITEMS)
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  check(error);
  return { orders: orderRow.array().parse(data), loadedAt: Date.now() };
}
export default async function Income() {
  const store = await ownedStore();
  if (!store) return <p>Save your store first.</p>;
  const { orders, loadedAt } = await loadOrders(store.id);
  return (
    <IncomeBoard
      orders={orders}
      currency={store.currency}
      now={loadedAt}
      truncated={orders.length === LIMIT}
    />
  );
}
