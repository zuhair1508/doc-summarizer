import { notFound } from "next/navigation";
import { DocumentView } from "@/components/DocumentView";
import { SAMPLES, loadSample } from "@/lib/samples";

export function generateStaticParams() {
  return SAMPLES.map((s) => ({ slug: s.slug }));
}

export default async function SamplePage({ params }: PageProps<"/samples/[slug]">) {
  const { slug } = await params;
  const loaded = await loadSample(slug);
  if (!loaded) notFound();
  const { sample, data } = loaded;

  return (
    <DocumentView
      mode="sample"
      source={sample.source}
      doc={{ id: sample.slug, kind: "pdf", title: sample.title, pages: data.pages, pdfUrl: sample.pdf }}
      initialSummaries={data.summaries}
    />
  );
}
