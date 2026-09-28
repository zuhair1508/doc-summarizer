// Copies a page range out of a PDF. Usage: node scripts/excerpt-pdf.mjs in.pdf out.pdf 1 10
import { PDFDocument } from "pdf-lib";
import fs from "node:fs";

const [input, output, from, to] = process.argv.slice(2);
const src = await PDFDocument.load(fs.readFileSync(input));
const out = await PDFDocument.create();
const indices = Array.from({ length: Number(to) - Number(from) + 1 }, (_, i) => Number(from) - 1 + i);
for (const p of await out.copyPages(src, indices)) out.addPage(p);
fs.writeFileSync(output, await out.save());
console.log(`wrote ${output} (${indices.length} pages)`);
