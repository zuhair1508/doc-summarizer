import { z } from "zod";
import { LENS_BY_ID } from "./lenses";
import { summarySchema, type DocKind, type LensId, type Summary } from "./schema";

// Plain module (no server-only imports) so the sample-building script can reuse it.

export function buildSystemPrompt(lens: LensId, kind: DocKind, sourceCount: number) {
  const unit = kind === "pdf" ? "page" : "paragraph";
  return `You summarize documents for a reader who wants to verify every claim.

The document is split into ${sourceCount} ${unit}s, each introduced by a marker like [#3] (= ${unit} 3).

${LENS_BY_ID[lens].instructions}

Rules:
- Every point MUST include "refs": the ${unit} numbers (1-${sourceCount}) whose text supports it. Use 1-3 refs.
- Only state what the document supports. Never invent facts, names, dates or numbers.
- Keep each point to one or two sentences. No markdown inside strings, and never write refs or page numbers inside "text".
- "tldr" is its own field; do not repeat it as a section.
- Respond with JSON only, matching the requested schema.`;
}

// Free endpoints buffer the whole response when sent a JSON schema via response_format,
// which kills streaming. So the streamed attempt asks for JSON in the prompt instead,
// and the server validates the final text (with a strict-schema retry as the fallback).
export function jsonOnlyInstructions() {
  return `Output a single raw JSON object (no code fences, no commentary) that matches this JSON Schema:
${JSON.stringify(z.toJSONSchema(summarySchema))}`;
}

export function parseSummaryText(text: string): Summary | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = summarySchema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Drops code fences and chatter around the JSON as it streams, so the client's
 * partial-JSON parser sees clean input. Backticks are held back briefly until we
 * know whether they start a fence or are real content.
 */
export function stripJsonFences(): TransformStream<string, string> {
  let started = false;
  let held = "";
  const isFence = (s: string) => /^\s*`{1,3}\s*$/.test(s);
  return new TransformStream({
    transform(chunk, controller) {
      let s = held + chunk;
      held = "";
      if (!started) {
        const i = s.indexOf("{");
        if (i === -1) return;
        started = true;
        s = s.slice(i);
      }
      const k = s.indexOf("`");
      if (k === -1) return controller.enqueue(s);
      controller.enqueue(s.slice(0, k));
      held = s.slice(k);
      if (!isFence(held) && held.length > 3) {
        controller.enqueue(held);
        held = "";
      }
    },
    flush(controller) {
      if (held && !isFence(held)) controller.enqueue(held);
    },
  });
}

export function buildDocumentPrompt(title: string, pages: string[]) {
  const body = pages.map((p, i) => `[#${i + 1}]\n${p}`).join("\n\n");
  return `Document title: ${title}\n\n<document>\n${body}\n</document>`;
}

// Free models drift from the schema in small ways: citing sources that don't exist,
// echoing "(refs: 2)" inside the text, or repeating the tldr as a section. Tidy those up
// rather than render dead chips or duplicates.
export function cleanRefs(summary: Summary, sourceCount: number): Summary {
  return {
    ...summary,
    sections: summary.sections
      .filter((s) => s.heading.trim().toLowerCase() !== "tldr")
      .map((s) => ({
        ...s,
        points: s.points.map((p) => ({
          text: p.text.replace(/\s*\((?:refs?|pages?|p\.)\s*:?\s*[\d,\s-]+\)\s*\.?$/i, "").trim(),
          refs: [...new Set(p.refs)].filter((r) => r >= 1 && r <= sourceCount).sort((a, b) => a - b),
        })),
      }))
      .filter((s) => s.points.length > 0),
  };
}

export function modelList(): string[] {
  return (
    process.env.OPENROUTER_MODELS ??
    "nvidia/nemotron-3-super-120b-a12b:free,dots-studio/dots-3-note-preview:free,google/gemma-4-31b-it:free"
  )
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}
