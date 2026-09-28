import { notFound } from "next/navigation";
import { DocumentView } from "@/components/DocumentView";
import type { DocKind, LensId, Summary } from "@/lib/schema";
import { db, signedPdfUrl } from "@/lib/server";

// Read-only view behind an unguessable link the owner opted into creating.
export default async function SharedDocumentPage({ params }: PageProps<"/s/[shareId]">) {
  const { shareId } = await params;

  const { data: doc } = await db()
    .from("documents")
    .select("id, kind, title, pages, storage_path, summaries(lens, content)")
    .eq("share_id", shareId)
    .maybeSingle();
  if (!doc) notFound();

  const summaries = Object.fromEntries(
    (doc.summaries as { lens: LensId; content: Summary }[]).map((s) => [s.lens, s.content]),
  );

  return (
    <DocumentView
      mode="shared"
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
