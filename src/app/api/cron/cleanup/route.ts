import { BUCKET, db } from "@/lib/server";

export const maxDuration = 60;

// Daily Vercel Cron: uploads auto-delete after 7 days (rows cascade to summaries).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });

  const supabase = db();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let deleted = 0;

  // Batches keep each storage.remove call within API limits.
  for (;;) {
    const { data: docs, error } = await supabase
      .from("documents")
      .select("id, storage_path")
      .lt("created_at", cutoff)
      .limit(500);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!docs.length) break;

    const paths = docs.map((d) => d.storage_path).filter((p): p is string => !!p);
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
      if (storageError) return Response.json({ error: storageError.message }, { status: 500 });
    }
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .in("id", docs.map((d) => d.id));
    if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });
    deleted += docs.length;
  }

  await supabase
    .from("rate_events")
    .delete()
    .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return Response.json({ deleted });
}
