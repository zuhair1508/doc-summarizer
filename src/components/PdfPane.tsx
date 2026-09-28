"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";

// Copied from pdfjs-dist by the postinstall script; must be set in the module that renders <Document>.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type Props = {
  url: string;
  target: { ref: number; nonce: number } | null;
  onError: () => void;
};

// Renders only pages near the viewport: the NIST sample alone is 48 pages.
export default function PdfPane({ url, target, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [numPages, setNumPages] = useState(0);
  const [width, setWidth] = useState(0);
  const [ratio, setRatio] = useState(11 / 8.5);
  const [visible, setVisible] = useState<Set<number>>(() => new Set([1, 2]));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width) - 32));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ready = numPages > 0 && width > 0;
  useEffect(() => {
    if (!ready) return;
    const io = new IntersectionObserver(
      (entries) =>
        setVisible((prev) => {
          const next = new Set(prev);
          for (const e of entries) {
            const n = Number((e.target as HTMLElement).dataset.page);
            if (e.isIntersecting) next.add(n);
          }
          return next.size === prev.size ? prev : next;
        }),
      { root: containerRef.current, rootMargin: "1200px 0px" },
    );
    pageRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [ready]);

  useEffect(() => {
    if (!target) return;
    const el = pageRefs.current[target.ref - 1];
    if (!el) return;
    setVisible((prev) => new Set(prev).add(target.ref));
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.remove("cite-flash");
    void el.offsetWidth; // restart the animation on repeated clicks
    el.classList.add("cite-flash");
  }, [target]);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto px-4 py-4">
      <Document
        file={url}
        onLoadSuccess={async (pdf) => {
          setNumPages(pdf.numPages);
          const vp = (await pdf.getPage(1)).getViewport({ scale: 1 });
          setRatio(vp.height / vp.width);
        }}
        onLoadError={onError}
        loading={<p className="p-6 text-sm text-muted">Loading PDF…</p>}
      >
        {width > 0 &&
          Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              data-page={n}
              ref={(el) => {
                pageRefs.current[n - 1] = el;
              }}
              className="relative mx-auto mb-4 scroll-mt-4 overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-line"
              style={{ width, minHeight: Math.round(width * ratio) }}
            >
              <span className="absolute right-2 top-2 z-10 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white">
                p. {n}
              </span>
              {visible.has(n) && (
                <Page pageNumber={n} width={width} renderAnnotationLayer={false} loading={null} />
              )}
            </div>
          ))}
      </Document>
    </div>
  );
}
