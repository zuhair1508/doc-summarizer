import { randomBytes } from "node:crypto";
import { db, getClientId } from "@/lib/server";

export async function POST(_req: Request, ctx: RouteContext<"/api/documents/[id]/share">) {
  const { id } = await ctx.params;
  const clientId = await getClientId();
  if (!clientId) return Response.json({ error: "Not found." }, { status: 404 });

  const supabase = db();
  const { data: doc } = await supabase
    .from("documents")
    .select("share_id")
    .eq("id", id)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!doc) return Response.json({ error: "Not found." }, { status: 404 });

  let shareId = doc.share_id as string | null;
  if (!shareId) {
    shareId = randomBytes(12).toString("base64url");
    const { error } = await supabase.from("documents").update({ share_id: shareId }).eq("id", id);
    if (error) return Response.json({ error: "Could not create link." }, { status: 500 });
  }
  return Response.json({ shareId });
}
