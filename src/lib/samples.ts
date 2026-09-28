import type { LensId, Summary } from "./schema";

export type Sample = {
  slug: string;
  title: string;
  category: string;
  blurb: string;
  source: string;
  pdf: string;
};

// Sample summaries are precomputed into src/samples/*.json (scripts/build-samples.ts),
// so they render instantly and keep working even if OpenRouter or Supabase is down.
export const SAMPLES: Sample[] = [
  {
    slug: "chain-of-thought",
    title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
    category: "Research paper",
    blurb: "The paper that showed “let’s think step by step” style prompting unlocks reasoning.",
    source: "Wei et al., 2022 · arXiv:2201.11903 · CC BY 4.0 · excerpt, pages 1–10",
    pdf: "/samples/chain-of-thought.pdf",
  },
  {
    slug: "nist-ai-rmf",
    title: "NIST AI Risk Management Framework (AI RMF 1.0)",
    category: "Government report",
    blurb: "The US framework for managing risk in AI systems: govern, map, measure, manage.",
    source: "NIST AI 100-1, January 2023 · US Government work, public domain",
    pdf: "/samples/nist-ai-rmf.pdf",
  },
  {
    slug: "saas-agreement",
    title: "Master Subscription Agreement",
    category: "Contract",
    blurb: "A SaaS contract with a few clauses worth a second look. Try Action Items.",
    source: "Fictional sample written for this demo · not legal advice",
    pdf: "/samples/saas-agreement.pdf",
  },
];

export type SampleData = { pages: string[]; summaries: Partial<Record<LensId, Summary>> };

export async function loadSample(slug: string) {
  const sample = SAMPLES.find((s) => s.slug === slug);
  if (!sample) return null;
  const data = (await import(`@/samples/${slug}.json`)).default as SampleData;
  return { sample, data };
}
