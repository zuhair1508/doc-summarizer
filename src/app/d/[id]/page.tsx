import { notFound } from "next/navigation";
import { DocumentView } from "@/components/DocumentView";
import type { DocKind, LensId, Summary } from "@/lib/schema";
import { db, getClientId, signedPdfUrl } from "@/lib/server";

export default async function OwnedDocumentPage({ params }: PageProps<"/d/[id]">) {
  const { id } = await params;
  const clientId = await getClientId();
  if (!clientId || !/^[0-9a-f-]{36}$/.test(id)) notFound();

  const { data: doc } = await db()
    .from("documents")
    .select("id, kind, title, pages, storage_path, summaries(lens, content)")
    .eq("id", id)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!doc) notFound();

  const summaries = Object.fromEntries(
    (doc.summaries as { lens: LensId; content: Summary }[]).map((s) => [s.lens, s.content]),
  );

  return (
    <DocumentView
      mode="owner"
      doc={{
        id: doc.id,
        kind: doc.kind as DocKind,
        title: doc.title,
        pages: doc.pages as string[],
        pdfUrl: await signedPdfUrl(doc.storage_path),
      }}
      initialSummaries={summaries}
    />
  );
}
