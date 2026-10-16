import { notFound } from "next/navigation";
import { z } from "zod";
import { getStore, getProducts } from "@/lib/stores/get-store";
import { requireSession } from "@/lib/generations/session";
import { adminDb, check } from "@/lib/supabase/admin";
import { cachedSignedUrl } from "@/lib/storage";
import { FlowHeader } from "@/components/flow-header";
import { PosterSelection } from "@/components/poster-selection";
import { getCart } from "@/lib/cart/cart";
export default async function PosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string; generationId: string }>;
  searchParams: Promise<{ artwork?: string }>;
}) {
  const { storeSlug, generationId } = await params;
  const artworkId = z.uuid().parse((await searchParams).artwork);
  const store = await getStore(storeSlug);
  if (!store) notFound();
  const session = await requireSession(generationId);
  if (session.creator_id !== store.id) notFound();
  const { data, error } = await adminDb()
    .from("generated_artworks")
    .select("storage_path")
    .eq("id", artworkId)
    .eq("generation_session_id", session.id)
    .eq("status", "ready")
    .single();
  check(error);
  if (!data) notFound();
  const artworkUrl = await cachedSignedUrl(
    "generated-artworks",
    data.storage_path,
  );
  return (
    <div data-page-surface="paper" className="min-h-dvh bg-paper">
      <FlowHeader
        slug={store.slug}
        name={store.name}
        avatarUrl={store.avatar_url}
        back={`/${store.slug}/create/${session.id}`}
        step={2}
        wide
      />
      <main id="main" className="mx-auto max-w-6xl px-4 pt-4 pb-12 sm:pt-12">
        <PosterSelection
          products={await getProducts(store)}
          artworkUrl={artworkUrl}
          sessionId={session.id}
          artworkId={artworkId}
          initialCart={await getCart(session.id, session.creator_id, artworkId)}
        />
      </main>
    </div>
  );
}
