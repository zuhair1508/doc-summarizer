"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { extractPdfPages, splitParagraphs } from "@/lib/extract-text";
import { LIMITS } from "@/lib/schema";

type Tab = "pdf" | "text";

async function readPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  if (pdf.numPages > LIMITS.maxPages)
    throw new Error(`This PDF has ${pdf.numPages} pages. The demo accepts up to ${LIMITS.maxPages}.`);
  return extractPdfPages(pdf);
}

export function Uploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("pdf");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const create = async (kind: Tab, docTitle: string, pages: string[]) => {
    const chars = pages.reduce((n, p) => n + p.length, 0);
    if (chars < LIMITS.minChars)
      throw new Error(
        kind === "pdf"
          ? "This PDF has no readable text layer (it's probably a scan). OCR isn't supported in this demo."
          : "Paste at least a few paragraphs.",
      );
    if (chars > LIMITS.maxChars) throw new Error("That's too long for this demo (about 40k words max).");

    setStatus("Saving…");
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, title: docTitle, pages }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Could not save the document.");
    return body as { id: string; uploadUrl: string | null };
  };

  const handleFile = async (file: File) => {
    setError(null);
    try {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))
        throw new Error("Please choose a PDF file.");
      if (file.size > LIMITS.maxFileBytes) throw new Error("PDFs are limited to 10 MB in this demo.");
      setStatus("Reading PDF in your browser…");
      const pages = await readPdf(file);
      const { id, uploadUrl } = await create("pdf", file.name.replace(/\.pdf$/i, ""), pages);
      if (uploadUrl) {
        setStatus("Uploading original for the viewer…");
        const form = new FormData();
        form.append("cacheControl", "3600");
        form.append("", file);
        // Non-fatal: without the original, the viewer falls back to extracted text.
        await fetch(uploadUrl, { method: "PUT", body: form }).catch(() => null);
      }
      router.push(`/d/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setStatus(null);
    }
  };

  const handleText = async () => {
    setError(null);
    try {
      const pages = splitParagraphs(text);
      const docTitle = title.trim() || text.trim().split("\n")[0].slice(0, 80) || "Pasted text";
      const { id } = await create("text", docTitle, pages);
      router.push(`/d/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setStatus(null);
    }
  };

  const busy = status !== null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="mb-4 flex gap-1 rounded-lg bg-surface-2 p-1 text-sm">
        {(
          [
            ["pdf", "Upload PDF"],
            ["text", "Paste text"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-md py-1.5 transition ${tab === id ? "bg-surface font-medium shadow-sm" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pdf" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) void handleFile(file);
          }}
          className={`flex h-40 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-sm transition ${
            dragging ? "border-accent bg-accent-soft" : "border-line hover:border-accent"
          } disabled:cursor-wait`}
        >
          <span className="font-medium">{status ?? "Drop a PDF here or click to choose"}</span>
          {!busy && <span className="text-muted">Up to 10 MB / 50 pages, text-based PDFs</span>}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleFile(file);
            }}
          />
        </button>
      ) : (
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste an article, meeting notes, a policy… Blank lines separate paragraphs, which become citable ¶ numbers."
            rows={8}
            className="w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            disabled={busy || text.trim().length === 0}
            onClick={handleText}
            className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-accent-ink transition hover:opacity-90 disabled:opacity-50"
          >
            {status ?? "Summarize"}
          </button>
        </div>
      )}

      {error && <p className="mt-3 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-ink">{error}</p>}
      <p className="mt-3 text-xs text-muted">
        No sign-up. Uploads are private to this browser and auto-delete after 7 days, so please don&apos;t upload
        anything sensitive. 5 new summaries per hour.
      </p>
    </div>
  );
}
