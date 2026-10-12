import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { HttpError } from "@/lib/http";
import { adminDb, check } from "@/lib/supabase/admin";
import { ORDER_WITH_ITEMS, orderRow, storeRow } from "@/lib/domain";
import { OrdersTable } from "@/components/orders-table";
export default async function Admin() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof HttpError) {
      if (e.status === 401) redirect("/auth/login");
      notFound();
    }
    throw e;
  }
  const db = adminDb();
  const [orders, creators, rounds] = await Promise.all([
    db
      .from("orders")
      .select(ORDER_WITH_ITEMS)
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("creators")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("generation_rounds")
      .select("*")
      .in("status", ["failed", "running"])
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  [orders, creators, rounds].forEach((r) => check(r.error));
  return (
    <main id="main" className="mx-auto max-w-[1500px] space-y-12 px-6 py-12">
      <Link href="/dashboard" className="text-sm">
        ← Creator workspace
      </Link>
      <h1 className="text-3xl font-semibold">
        Pluto operations.
      </h1>
      <section>
        <h2 className="mb-6 text-xl font-semibold">Orders</h2>
        <OrdersTable orders={orderRow.array().parse(orders.data)} admin />
      </section>
      <section>
        <h2 className="mb-6 text-xl font-semibold">Creators</h2>
        <ul className="*:not-last:shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)]">
          {storeRow
            .array()
            .parse(creators.data)
            .map((c) => (
              <li key={c.id} className="flex justify-between py-4 text-sm">
                <Link href={`/${c.slug}`}>{c.name} ↗</Link>
                <span>{c.status}</span>
              </li>
            ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-6 text-xl font-semibold">
          Failed or running generations
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Running rounds older than ten minutes may have been interrupted.
          Customers can recover within their remaining round allowance.
        </p>
        <ul className="space-y-4">
          {z
            .object({
              id: z.uuid(),
              generation_session_id: z.uuid(),
              status: z.string(),
              error_code: z.string().nullable(),
              created_at: z.string(),
            })
            .array()
            .parse(rounds.data)
            .map((r) => (
              <li key={r.id} className="break-all text-xs">
                {r.id} · {r.status} · {r.error_code ?? "—"} · {r.created_at}
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
