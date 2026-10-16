import { notFound } from "next/navigation";
import { getStore } from "@/lib/stores/get-store";
import { requireSession } from "@/lib/generations/session";
import { FlowHeader } from "@/components/flow-header";
import { GenerationProgress } from "@/components/generation-progress";
import { ArtworkResults } from "@/components/artwork-results";
import { config } from "@/lib/config";
import { generationResult } from "@/lib/generations/result";
import { Hydrate } from "@/components/hydrate";
import { generationQuery } from "@/lib/queries/generation";
export default async function ResultsPage({
  params,
}: {
  params: Promise<{ storeSlug: string; generationId: string }>;
}) {
  const { storeSlug, generationId } = await params;
  const [store, session] = await Promise.all([
    getStore(storeSlug),
    requireSession(generationId),
  ]);
  if (!store || session.creator_id !== store.id) notFound();
  const result = await generationResult(session);
  return (
    <Hydrate queryKey={generationQuery(session.id).queryKey} data={result}>
      <div data-page-surface="paper" className="min-h-dvh bg-paper">
        <FlowHeader
          slug={store.slug}
          name={store.name}
          avatarUrl={store.avatar_url}
          progress={<GenerationProgress sessionId={session.id} />}
        />
        <main id="main" className="mx-auto max-w-5xl px-4 pt-4 pb-6 sm:pt-8">
          <ArtworkResults
            sessionId={session.id}
            slug={store.slug}
            maxRounds={config().maxRounds}
          />
        </main>
      </div>
    </Hydrate>
  );
}
