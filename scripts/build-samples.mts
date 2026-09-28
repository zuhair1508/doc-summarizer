// Precomputes every lens for every sample into src/samples/<slug>.json.
// Usage: npm run samples            (fills in missing lenses only)
//        npm run samples -- --force (regenerates everything)
import fs from "node:fs";
import path from "node:path";
import { generateText, Output } from "ai";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { extractPdfPages } from "../src/lib/extract-text";
import { generationSettings, summarizerModel } from "../src/lib/llm";
import { buildDocumentPrompt, buildSystemPrompt, cleanRefs } from "../src/lib/prompt";
import { SAMPLES, type SampleData } from "../src/lib/samples";
import { LENS_IDS, summarySchema } from "../src/lib/schema";

const force = process.argv.includes("--force");
const outDir = path.join("src", "samples");
fs.mkdirSync(outDir, { recursive: true });

for (const sample of SAMPLES) {
  const file = path.join(outDir, `${sample.slug}.json`);
  const existing: SampleData | null =
    !force && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;

  const pdf = await getDocument({ data: new Uint8Array(fs.readFileSync(path.join("public", sample.pdf))) }).promise;
  const pages = await extractPdfPages(pdf);
  const data: SampleData = { pages, summaries: existing?.summaries ?? {} };

  for (const lens of LENS_IDS) {
    const cached = data.summaries[lens];
    if (cached) {
      data.summaries[lens] = cleanRefs(cached, pages.length);
      console.log(`✓ ${sample.slug}/${lens} (cached)`);
      continue;
    }
    const started = Date.now();
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { output, response } = await generateText({
          model: summarizerModel(),
          ...generationSettings,
          system: buildSystemPrompt(lens, "pdf", pages.length),
          prompt: buildDocumentPrompt(sample.title, pages),
          output: Output.object({ schema: summarySchema }),
        });
        data.summaries[lens] = cleanRefs(output, pages.length);
        console.log(`✓ ${sample.slug}/${lens} via ${response.modelId} in ${((Date.now() - started) / 1000).toFixed(0)}s`);
        break;
      } catch (error) {
        console.warn(`✗ ${sample.slug}/${lens} attempt ${attempt}: ${(error as Error).message.slice(0, 200)}`);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 15_000 * attempt));
      }
    }
    // Write after every lens so a rate-limited run can resume where it stopped.
    fs.writeFileSync(file, JSON.stringify(data, null, 1));
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 1));
}
