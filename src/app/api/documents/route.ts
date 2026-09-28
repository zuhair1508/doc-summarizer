import { z } from "zod";
import { BUCKET, db, ensureClientId, hashPages } from "@/lib/server";
import { LIMITS } from "@/lib/schema";

const bodySchema = z.object({
  kind: z.enum(["pdf", "text"]),
  title: z.string().trim().min(1).max(200),
  pages: z.array(z.string()).min(1).max(LIMITS.maxPages * 4),
});

// Text is extracted in the browser; this only stores it and hands back a signed
// upload URL so the PDF itself goes straight to Supabase (bypassing Vercel's body limit).
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid document." }, { status: 400 });

  const { kind, title, pages } = parsed.data;
  const chars = pages.reduce((n, p) => n + p.length, 0);
  if (kind === "pdf" && pages.length > LIMITS.maxPages)
    return Response.json({ error: `PDFs are limited to ${LIMITS.maxPages} pages in this demo.` }, { status: 413 });
  if (chars > LIMITS.maxChars)
    return Response.json({ error: "That document is too long for this demo (about 40k words max)." }, { status: 413 });
  if (chars < LIMITS.minChars)
    return Response.json({ error: "Not enough text to summarize." }, { status: 400 });

  const clientId = await ensureClientId();
  const supabase = db();
  const contentHash = hashPages(kind, pages);

  let { data: doc } = await supabase
    .from("documents")
    .select("id, storage_path")
    .eq("client_id", clientId)
    .eq("content_hash", contentHash)
    .maybeSingle();

  if (!doc) {
    const id = crypto.randomUUID();
    const storagePath = kind === "pdf" ? `${clientId}/${id}.pdf` : null;
    const { data, error } = await supabase
      .from("documents")
      .insert({
        id,
        client_id: clientId,
        kind,
        title,
        content_hash: contentHash,
        pages,
        page_count: pages.length,
        storage_path: storagePath,
      })
      .select("id, storage_path")
      .single();
    if (error) {
      console.error("insert document", error);
      return Response.json({ error: "Could not save document." }, { status: 500 });
    }
    doc = data;
  }

  let uploadUrl: string | null = null;
  if (doc.storage_path) {
    // upsert so a re-upload repairs a document whose first upload was interrupted.
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(doc.storage_path, { upsert: true });
    if (error) console.error("signed upload url", error);
    uploadUrl = data?.signedUrl ?? null;
  }

  return Response.json({ id: doc.id, uploadUrl });
}
