import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { modelList } from "./prompt";

// Free OpenRouter models come and go, so we pass a fallback list: OpenRouter tries
// them in order when one is rate-limited, down or removed.
export function summarizerModel() {
  const models = modelList();
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    headers: { "X-Title": "Doc Summarizer" },
  });
  // Reasoning is off: free reasoning models otherwise spend the whole output budget
  // thinking and never emit the JSON (and are 4x slower).
  return openrouter.chat(models[0], { models, extraBody: { reasoning: { enabled: false } } });
}

export const generationSettings = {
  temperature: 0.2,
  maxOutputTokens: 4000,
} as const;
