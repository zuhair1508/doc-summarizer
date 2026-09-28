"use client";

import type { DeepPartial } from "ai";
import type { DocKind, Summary } from "@/lib/schema";

type Props = {
  summary: DeepPartial<Summary> | undefined;
  kind: DocKind;
  streaming?: boolean;
  onCite: (ref: number) => void;
};

export function refLabel(kind: DocKind, ref: number) {
  return kind === "pdf" ? `p. ${ref}` : `¶ ${ref}`;
}

export function SummaryCards({ summary, kind, streaming, onCite }: Props) {
  const sections = summary?.sections ?? [];
  return (
    <div className="space-y-6">
      {summary?.tldr ? (
        <p
          className={`font-serif text-xl leading-snug text-ink ${streaming && !sections.length ? "streaming-caret" : ""}`}
        >
          {summary.tldr}
        </p>
      ) : streaming ? (
        <div className="space-y-2" aria-hidden>
          <div className="h-5 w-11/12 animate-pulse rounded bg-surface-2" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-surface-2" />
        </div>
      ) : null}

      {sections.map((section, si) => {
        const isLastSection = si === sections.length - 1;
        const points = section?.points ?? [];
        return (
          <section key={si}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              {section?.heading}
            </h3>
            <ul className="space-y-2">
              {points.map((point, pi) => {
                const live = streaming && isLastSection && pi === points.length - 1;
                const refs = (point?.refs ?? []).filter((r): r is number => typeof r === "number");
                return (
                  <li
                    key={pi}
                    className="rounded-lg border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed"
                  >
                    <span className={live ? "streaming-caret" : ""}>{point?.text}</span>
                    {refs.length > 0 && (
                      <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                        {refs.map((ref) => (
                          <button
                            key={ref}
                            type="button"
                            onClick={() => onCite(ref)}
                            title={`Show ${kind === "pdf" ? "page" : "paragraph"} ${ref}`}
                            className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[11px] font-medium text-accent transition hover:bg-accent hover:text-accent-ink"
                          >
                            {refLabel(kind, ref)}
                          </button>
                        ))}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function summaryToMarkdown(title: string, lensLabel: string, kind: DocKind, s: Summary) {
  const lines = [`# ${title}`, `_${lensLabel}_`, "", s.tldr, ""];
  for (const section of s.sections) {
    lines.push(`## ${section.heading}`);
    for (const p of section.points)
      lines.push(`- ${p.text}${p.refs.length ? ` (${p.refs.map((r) => refLabel(kind, r)).join(", ")})` : ""}`);
    lines.push("");
  }
  return lines.join("\n");
}
