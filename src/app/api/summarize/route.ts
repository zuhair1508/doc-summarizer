import { createTextStreamResponse, generateText, Output, streamText, toTextStream } from "ai";
import { generationSettings, summarizerModel } from "@/lib/llm";
import {
  buildDocumentPrompt,
  buildSystemPrompt,
  cleanRefs,
  jsonOnlyInstructions,
  parseSummaryText,
  stripJsonFences,
} from "@/lib/prompt";
import { summarizeRequestSchema, summarySchema, type DocKind, type Summary } from "@/lib/schema";
import { checkRateLimit, clientIp, db, getClientId } from "@/lib/server";

export const maxDuration = 120;

// Errors are plain text because useObject surfaces the response body as error.message.
// The RATE_LIMIT: prefix lets the client show a friendlier message.
const text = (body: string, status: number) =>
  new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

export async function POST(req: Request) {
  const parsed = summarizeRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return text("Invalid request.", 400);
  const { documentId, lens, retry } = parsed.data;

  const clientId = await getClientId();
  if (!clientId) return text("Document not found.", 404);

  const supabase = db();
  const { data: doc } = await supabase
    .from("documents")
    .select("id, kind, title, pages")
    .eq("id", documentId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!doc) return text("Document not found.", 404);

  const { data: cached } = await supabase
    .from("summaries")
    .select("content")
    .eq("document_id", documentId)
    .eq("lens", lens)
    .maybeSingle();
  if (cached) return text(JSON.stringify(cached.content), 200);

  const ip = await clientIp();
  // A validation retry of an attempt we already counted is free.
  const alreadyCounted =
    retry &&
    (
      await supabase
        .from("rate_events")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .eq("document_id", documentId)
        .eq("lens", lens)
        .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
    ).count;
  if (!alreadyCounted) {
    const waitSeconds = await checkRateLimit(ip);
    if (waitSeconds > 0) {
      const minutes = Math.ceil(waitSeconds / 60);
      return text(
        `RATE_LIMIT:You've used this hour's free summaries. Try again in ~${minutes} min, or explore the sample documents (they're instant).`,
        429,
      );
    }
    await supabase.from("rate_events").insert({ ip, document_id: documentId, lens });
  }

  const pages = doc.pages as string[];
  const kind = doc.kind as DocKind;
  const model = summarizerModel();
  const system = buildSystemPrompt(lens, kind, pages.length);
  const prompt = buildDocumentPrompt(doc.title, pages);

  const save = async (summary: Summary, modelId: string | undefined) => {
    const { error } = await supabase
      .from("summaries")
      .upsert({ document_id: documentId, lens, content: cleanRefs(summary, pages.length), model: modelId });
    if (error) console.error("save summary", error);
  };

  if (retry) {
    // Strict schema via response_format: not streamable on free endpoints, but reliable.
    try {
      const result = await generateText({
        model,
        ...generationSettings,
        system,
        prompt,
        output: Output.object({ schema: summarySchema }),
      });
      const summary = cleanRefs(result.output, pages.length);
      await save(summary, result.response.modelId);
      return text(JSON.stringify(summary), 200);
    } catch (error) {
      console.error("summarize retry", error);
      return text("The free model couldn't produce a valid summary right now. Please try again in a minute.", 502);
    }
  }

  const result = streamText({
    model,
    ...generationSettings,
    system: `${system}\n\n${jsonOnlyInstructions()}`,
    prompt,
    onError: ({ error }) => console.error("summarize stream", error),
    onEnd: async ({ text: output, response }) => {
      // Invalid JSON isn't cached; the client sees the same failure and requests a retry.
      const summary = parseSummaryText(output);
      if (summary) await save(summary, response.modelId);
    },
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }).pipeThrough(stripJsonFences()),
  });
}
