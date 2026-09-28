import { z } from "zod";

// Shared by the API route (generation + validation) and the client (useObject).
export const summarySchema = z.object({
  tldr: z.string().describe("One or two sentence overview of the document."),
  sections: z.array(
    z.object({
      heading: z.string(),
      points: z.array(
        z.object({
          text: z.string().describe("One concise point, written in the lens's voice."),
          refs: z
            .array(z.number().int())
            .describe("Source numbers from the [#N] markers that support this point. 1-3 items."),
        }),
      ),
    }),
  ),
});

export type Summary = z.infer<typeof summarySchema>;

export const LENS_IDS = ["brief", "actions", "eli5", "critique"] as const;
export type LensId = (typeof LENS_IDS)[number];

export const summarizeRequestSchema = z.object({
  documentId: z.string().uuid(),
  lens: z.enum(LENS_IDS),
  // Set by the client when the streamed attempt failed validation.
  retry: z.boolean().optional(),
});

export type DocKind = "pdf" | "text";

// What the viewer needs to render any document: user upload, shared link or sample.
export type ViewerDoc = {
  id: string;
  kind: DocKind;
  title: string;
  pages: string[];
  pdfUrl: string | null;
};

export const LIMITS = {
  maxFileBytes: 10 * 1024 * 1024,
  maxPages: 50,
  // ~40k tokens: keeps prompts inside every free model's context with room to spare.
  maxChars: 160_000,
  minChars: 200,
};
