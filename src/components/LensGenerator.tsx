"use client";

import { useObject } from "@ai-sdk/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cleanRefs } from "@/lib/prompt";
import { summarySchema, type DocKind, type LensId, type Summary } from "@/lib/schema";
import { SummaryCards } from "./SummaryCards";

type Props = {
  documentId: string;
  lens: LensId;
  kind: DocKind;
  sourceCount: number;
  onStart: () => void;
  onDone: (summary: Summary) => void;
  onCite: (ref: number) => void;
};

// Streams one lens for one document, mounted while that lens has no cached summary.
// If the streamed JSON fails validation, it asks the server
// for one non-streamed retry, which doesn't count against the rate limit.
export function LensGenerator({ documentId, lens, kind, sourceCount, onStart, onDone, onCite }: Props) {
  const [phase, setPhase] = useState<"streaming" | "retrying" | "failed">("streaming");
  const [failure, setFailure] = useState<string | null>(null);
  const started = useRef(false);

  const retry = async () => {
    setPhase("retrying");
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId, lens, retry: true }),
      });
      const body = await res.text();
      if (!res.ok) throw new Error(body);
      onDone(cleanRefs(summarySchema.parse(JSON.parse(body)), sourceCount));
    } catch (error) {
      setFailure((error as Error).message);
      setPhase("failed");
    }
  };

  const { object, submit, error } = useObject({
    api: "/api/summarize",
    schema: summarySchema,
    onFinish: ({ object: finished }) => {
      if (finished) onDone(cleanRefs(finished, sourceCount));
      else void retry();
    },
  });

  useEffect(() => {
    // Guard against React strict-mode double mount firing two paid requests.
    if (started.current) return;
    started.current = true;
    onStart();
    submit({ documentId, lens });
  }, [documentId, lens, submit, onStart]);

  const message = failure ?? error?.message;
  if (message || phase === "failed") {
    const rateLimited = message?.startsWith("RATE_LIMIT:");
    return (
      <div className="rounded-lg border border-line bg-warn-bg p-4 text-sm text-warn-ink">
        <p>{rateLimited ? message!.slice("RATE_LIMIT:".length) : message || "Something went wrong."}</p>
        {rateLimited ? (
          <Link href="/#samples" className="mt-2 inline-block font-medium underline">
            Browse samples →
          </Link>
        ) : (
          <button type="button" onClick={() => location.reload()} className="mt-2 font-medium underline">
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 flex items-center gap-2 text-xs text-muted">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
        {phase === "retrying"
          ? "The model's output was malformed, retrying once…"
          : object
            ? "Writing summary…"
            : "Reading the document… free models can take 20–60s to start."}
      </p>
      <SummaryCards summary={object} kind={kind} streaming onCite={onCite} />
    </div>
  );
}
