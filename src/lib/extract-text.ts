// Shared by the browser uploader and scripts/build-samples.ts so samples and uploads
// are extracted identically. Takes a pdf.js document so callers choose their build.

// pdf.js also yields marked-content items without text; those are skipped.
type TextItem = { str?: string; hasEOL?: boolean } | object;
type PdfLike = {
  numPages: number;
  getPage(n: number): Promise<{ getTextContent(): Promise<{ items: TextItem[] }> }>;
};

export function cleanPageText(raw: string) {
  return raw
    .replace(/(\w)-\n(\w)/g, "$1$2") // re-join words hyphenated across lines
    .replace(/[ \t ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractPdfPages(pdf: PdfLike): Promise<string[]> {
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const content = await (await pdf.getPage(n)).getTextContent();
    const raw = content.items
      .map((item) => ("str" in item ? (item.str ?? "") + (item.hasEOL ? "\n" : "") : ""))
      .join("");
    pages.push(cleanPageText(raw));
  }
  return pages;
}

/** Pasted text: paragraphs play the role of pages, so citations point at ¶ numbers. */
export function splitParagraphs(text: string, maxParagraphs = 200): string[] {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
  // Merge tiny fragments (headings, list stubs) into the next paragraph so refs stay meaningful.
  const merged: string[] = [];
  let carry = "";
  for (const p of paragraphs) {
    const next = carry ? `${carry}\n${p}` : p;
    if (next.length < 80) carry = next;
    else {
      merged.push(next);
      carry = "";
    }
  }
  if (carry && merged.length) merged[merged.length - 1] += `\n${carry}`;
  else if (carry) merged.push(carry);
  if (merged.length <= maxParagraphs) return merged;
  // Very long pastes: group neighbours so the source count stays citeable.
  const size = Math.ceil(merged.length / maxParagraphs);
  const grouped: string[] = [];
  for (let i = 0; i < merged.length; i += size) grouped.push(merged.slice(i, i + size).join("\n\n"));
  return grouped;
}
