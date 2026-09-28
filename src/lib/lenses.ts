import type { LensId } from "./schema";

export type Lens = {
  id: LensId;
  label: string;
  tagline: string;
  instructions: string;
};

export const LENSES: Lens[] = [
  {
    id: "brief",
    label: "Executive Brief",
    tagline: "What a busy decision-maker needs",
    instructions: `Write an executive brief.
- tldr: 2 sentences max, what the document is and why it matters.
- Section "Key Points": the 5 most important points, each one sentence.
- Section "Bottom Line": 1-2 points stating the implication or recommendation.`,
  },
  {
    id: "actions",
    label: "Action Items",
    tagline: "Tasks, owners, deadlines",
    instructions: `Extract everything someone would need to act on.
- tldr: one sentence on what the document asks of its reader.
- Section "Tasks": concrete actions, obligations or recommendations. Name the responsible party when stated.
- Section "Dates & Deadlines": every date, deadline, notice period or time-bound commitment.
- Section "Open Questions": ambiguities or things the reader should clarify before acting.
Omit a section only if the document truly contains nothing for it.`,
  },
  {
    id: "eli5",
    label: "ELI5",
    tagline: "Plain English, no jargon",
    instructions: `Explain the document to a smart 12-year-old.
- tldr: one friendly sentence.
- Section "In Plain English": 4-6 points explaining the core ideas with everyday language and analogies.
- Section "Key Terms": 3-6 points, each formatted "Term: simple definition".`,
  },
  {
    id: "critique",
    label: "Critical Review",
    tagline: "Claims, weak spots, gaps",
    instructions: `Review the document like a sharp, fair skeptic.
- tldr: one sentence verdict on how convincing or sound the document is.
- Section "Main Claims": the central claims or commitments made.
- Section "Weak Spots & Risks": unsupported claims, one-sided terms, hidden risks or methodological issues. Look hard for easy-to-miss clauses or caveats that quietly disadvantage the reader (e.g. data reuse, unilateral changes, auto-renewals, narrow remedies).
- Section "What's Missing": information a careful reader would expect but is absent.`,
  },
];

export const LENS_BY_ID = Object.fromEntries(LENSES.map((l) => [l.id, l])) as Record<LensId, Lens>;
