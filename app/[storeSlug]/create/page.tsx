import { notFound } from "next/navigation";
import { getStore } from "@/lib/stores/get-store";
import { FlowHeader } from "@/components/flow-header";
import { UploadFlow } from "@/components/upload-flow";
export const dynamic = "force-dynamic";
export default async function CreatePage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const store = await getStore((await params).storeSlug);
  if (!store) notFound();
  return (
    <div data-page-surface="paper" className="min-h-dvh bg-paper">
      <FlowHeader
        slug={store.slug}
        name={store.name}
        avatarUrl={store.avatar_url}
      />
      <main id="main" className="px-4 pt-6 pb-16 sm:pt-12">
        <UploadFlow slug={store.slug} />
      </main>
    </div>
  );
}
