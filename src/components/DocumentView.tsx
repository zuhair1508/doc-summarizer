"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";
import { LENSES, LENS_BY_ID } from "@/lib/lenses";
import type { LensId, Summary, ViewerDoc } from "@/lib/schema";
import { LensGenerator } from "./LensGenerator";
import { SummaryCards, summaryToMarkdown } from "./SummaryCards";
import { TextPane } from "./TextPane";

// pdf.js touches browser globals at import time.
const PdfPane = dynamic(() => import("./PdfPane"), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-muted">Loading viewer…</p>,
});

type Mode = "owner" | "sample" | "shared";

type Props = {
  doc: ViewerDoc;
  initialSummaries: Partial<Record<LensId, Summary>>;
  mode: Mode;
  source?: string;
};

export function DocumentView({ doc, initialSummaries, mode, source }: Props) {
  const [summaries, setSummaries] = useState(initialSummaries);
  const [lens, setLens] = useState<LensId>("brief");
  const [target, setTarget] = useState<{ ref: number; nonce: number } | null>(null);
  const [pdfFailed, setPdfFailed] = useState(false);
  const [mobilePane, setMobilePane] = useState<"summary" | "source">("summary");
  const [copied, setCopied] = useState(false);
  const [started, setStarted] = useState<Set<LensId>>(() => new Set());

  const cite = useCallback((ref: number) => {
    setMobilePane("source");
    setTarget((t) => ({ ref, nonce: (t?.nonce ?? 0) + 1 }));
  }, []);

  const current = summaries[lens];
  const showPdf = doc.kind === "pdf" && doc.pdfUrl && !pdfFailed;

  const copyMarkdown = async () => {
    if (!current) return;
    await navigator.clipboard.writeText(summaryToMarkdown(doc.title, LENS_BY_ID[lens].label, doc.kind, current));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
        <Link href="/" className="font-serif text-xl font-semibold italic text-accent">
          Gist
        </Link>
        <span className="text-line">/</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-medium">{doc.title}</h1>
          <p className="truncate text-xs text-muted">
            {source ??
              `${doc.pages.length} ${doc.kind === "pdf" ? "pages" : "paragraphs"}${mode === "shared" ? " · shared view" : ""}`}
          </p>
        </div>
        {mode === "owner" && <ShareButton documentId={doc.id} />}
      </header>

      <div className="flex border-b border-line bg-surface lg:hidden">
        {(["summary", "source"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setMobilePane(p)}
            className={`flex-1 py-2 text-sm capitalize ${mobilePane === p ? "border-b-2 border-accent font-medium" : "text-muted"}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        <div
          className={`min-h-0 border-line bg-surface-2 lg:block lg:border-r ${mobilePane === "source" ? "block" : "hidden"}`}
        >
          {showPdf ? (
            <PdfPane url={doc.pdfUrl!} target={target} onError={() => setPdfFailed(true)} />
          ) : (
            <TextPane pages={doc.pages} kind={doc.kind} target={target} />
          )}
        </div>

        <div className={`min-h-0 overflow-y-auto lg:block ${mobilePane === "summary" ? "block" : "hidden"}`}>
          <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
            <div role="tablist" className="mb-2 flex flex-wrap gap-2">
              {LENSES.map((l) => (
                <button
                  key={l.id}
                  role="tab"
                  type="button"
                  aria-selected={lens === l.id}
                  onClick={() => setLens(l.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    lens === l.id
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line bg-surface hover:border-accent"
                  }`}
                >
                  {l.label}
                  {summaries[l.id] && lens !== l.id && <span className="ml-1.5 text-ok">●</span>}
                </button>
              ))}
            </div>
            <div className="mb-6 flex items-center justify-between gap-2">
              <p className="text-xs text-muted">{LENS_BY_ID[lens].tagline}. Click a chip to see the source.</p>
              {current && (
                <button type="button" onClick={copyMarkdown} className="shrink-0 text-xs text-muted hover:text-ink">
                  {copied ? "Copied ✓" : "Copy as Markdown"}
                </button>
              )}
            </div>

            {current && <SummaryCards summary={current} kind={doc.kind} onCite={cite} />}

            {/* In-flight lenses stay mounted while hidden so switching tabs never restarts a paid request. */}
            {mode === "owner" &&
              LENSES.filter((l) => !summaries[l.id] && (l.id === lens || started.has(l.id))).map((l) => (
                <div key={l.id} hidden={l.id !== lens}>
                  <LensGenerator
                    documentId={doc.id}
                    lens={l.id}
                    kind={doc.kind}
                    sourceCount={doc.pages.length}
                    onCite={cite}
                    onStart={() => setStarted((prev) => (prev.has(l.id) ? prev : new Set(prev).add(l.id)))}
                    onDone={(s) => setSummaries((prev) => ({ ...prev, [l.id]: s }))}
                  />
                </div>
              ))}

            {!current && mode !== "owner" && (
              <p className="rounded-lg border border-dashed border-line p-6 text-sm text-muted">
                {mode === "sample"
                  ? "This lens hasn't been precomputed for this sample yet."
                  : "The owner hasn't generated this lens yet."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareButton({ documentId }: { documentId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "copied" | "error">("idle");
  const share = async () => {
    setState("busy");
    try {
      const res = await fetch(`/api/documents/${documentId}/share`, { method: "POST" });
      if (!res.ok) throw new Error();
      const { shareId } = await res.json();
      await navigator.clipboard.writeText(`${location.origin}/s/${shareId}`);
      setState("copied");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 2500);
  };
  return (
    <button
      type="button"
      onClick={share}
      disabled={state === "busy"}
      title="Creates a read-only link to this document and its summaries"
      className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent disabled:opacity-60"
    >
      {state === "copied" ? "Link copied ✓" : state === "error" ? "Couldn't share" : "Share"}
    </button>
  );
}
