"use client";

import { useEffect, useRef } from "react";
import type { DocKind } from "@/lib/schema";
import { refLabel } from "./SummaryCards";

type Props = {
  pages: string[];
  kind: DocKind;
  target: { ref: number; nonce: number } | null;
};

// Used for pasted text, and as the fallback when a PDF's original file can't be loaded.
export function TextPane({ pages, kind, target }: Props) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!target) return;
    const el = refs.current[target.ref - 1];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.remove("cite-flash");
    void el.offsetWidth;
    el.classList.add("cite-flash");
  }, [target]);

  return (
    <div className="h-full space-y-3 overflow-y-auto p-4">
      {pages.map((text, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="scroll-mt-4 rounded-md border border-line bg-surface p-4"
        >
          <span className="mb-1 block font-mono text-[11px] text-muted">{refLabel(kind, i + 1)}</span>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
        </div>
      ))}
    </div>
  );
}
