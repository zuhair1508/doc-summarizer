import Link from "next/link";
import { Uploader } from "@/components/Uploader";
import { LENSES } from "@/lib/lenses";
import { SAMPLES } from "@/lib/samples";
import { db, getClientId } from "@/lib/server";

type HistoryRow = {
  id: string;
  title: string;
  kind: "pdf" | "text";
  page_count: number;
  created_at: string;
  summaries: { lens: string }[];
};

async function loadHistory(): Promise<HistoryRow[]> {
  const clientId = await getClientId();
  if (!clientId) return [];
  try {
    const { data } = await db()
      .from("documents")
      .select("id, title, kind, page_count, created_at, summaries(lens)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(8);
    return (data as HistoryRow[] | null) ?? [];
  } catch {
    // History is a nice-to-have; samples and the uploader still work without it.
    return [];
  }
}

export default async function Home() {
  const history = await loadHistory();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
      <nav className="flex items-center justify-between py-5">
        <span className="font-serif text-2xl font-semibold italic text-accent">Gist</span>
        <a
          href="https://github.com/zuhair1508/doc-summarizer"
          className="text-sm text-muted hover:text-ink"
          target="_blank"
          rel="noreferrer"
        >
          GitHub →
        </a>
      </nav>

      <section className="grid gap-10 py-8 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-14">
        <div>
          <h1 className="font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl">
            Summaries that <em className="text-accent">cite their sources.</em>
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted">
            Drop in a PDF or paste text. Read it through four lenses, and check any point by clicking the page it
            came from.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {LENSES.map((l) => (
              <li key={l.id} className="rounded-full border border-line bg-surface px-3 py-1 text-sm">
                <span className="font-medium">{l.label}</span>
                <span className="text-muted"> · {l.tagline}</span>
              </li>
            ))}
          </ul>
        </div>
        <Uploader />
      </section>

      <section id="samples" className="scroll-mt-6 py-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted">Try a sample</h2>
        <p className="mb-4 text-sm text-muted">Precomputed, so they open instantly.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {SAMPLES.map((s) => (
            <Link
              key={s.slug}
              href={`/samples/${s.slug}`}
              className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
            >
              <span className="text-xs font-medium uppercase tracking-wider text-accent">{s.category}</span>
              <span className="mt-2 font-serif text-lg leading-snug">{s.title}</span>
              <span className="mt-2 flex-1 text-sm text-muted">{s.blurb}</span>
              <span className="mt-4 text-sm font-medium group-hover:text-accent">Open →</span>
            </Link>
          ))}
        </div>
      </section>

      {history.length > 0 && (
        <section className="py-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Your recent documents</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {history.map((d) => (
              <li key={d.id}>
                <Link href={`/d/${d.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2">
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted">
                    {d.kind}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.title}</span>
                  <span className="hidden text-xs text-muted sm:inline">
                    {d.summaries.length}/4 lenses · {new Date(d.created_at).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-10 border-t border-line pt-6 text-xs text-muted">
        Built with Next.js, Supabase and free models via OpenRouter. Summaries are AI-generated and can be wrong,
        which is why every point links to its source.
      </footer>
    </main>
  );
}
