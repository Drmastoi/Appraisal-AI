// AI abstraction layer. The portal never calls a vendor SDK directly; it talks
// to this interface. Adding a provider means implementing `AIClient` and
// registering it in `getAIClient()`. Every call is logged to AIInteraction by
// the caller, and all output is draft-only until a human approves it.

export type AIKind = "CPD_REFLECTION" | "PDP_SUGGESTION" | "APPRAISAL_SUMMARY" | "FEEDBACK_THEMES";

export type AIRequest = {
  kind: AIKind;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
};

export type AIResponse = {
  text: string;
  provider: string;
  model: string | null;
};

export interface AIClient {
  readonly provider: string;
  generate(req: AIRequest): Promise<AIResponse>;
}

/**
 * Deterministic offline provider. Produces useful, structured draft text from
 * the inputs alone — no network, no data leaves the server. This keeps the
 * product fully functional in demos and lets the workflow (approval gating,
 * logging, editing) be exercised end-to-end before a real model is attached.
 */
export class MockAIClient implements AIClient {
  readonly provider = "mock";

  async generate(req: AIRequest): Promise<AIResponse> {
    const text = mockGenerate(req.kind, req.userPrompt);
    return { text, provider: this.provider, model: "mock-v1" };
  }
}

type PromptFacts = { title?: string; bullets: string[] };

function parseFacts(userPrompt: string): PromptFacts {
  const lines = userPrompt.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => l.startsWith("- ")).map((l) => l.slice(2));
  const titleLine = lines.find((l) => l.toLowerCase().startsWith("title:"));
  return { title: titleLine?.slice(6).trim(), bullets };
}

function mockGenerate(kind: AIKind, userPrompt: string): string {
  const facts = parseFacts(userPrompt);
  const topic = facts.title ?? "this learning";

  if (kind === "CPD_REFLECTION") {
    const first = facts.bullets[0] ?? topic;
    return [
      `Draft reflection (AI-generated — requires your review and approval):`,
      ``,
      `What happened: I completed "${topic}". Key content included ${first.toLowerCase()}.`,
      ``,
      `What I learned: The session consolidated my understanding of ${topic.toLowerCase()}, highlighting current guidance and where my practice aligns or needs adjustment.`,
      ``,
      `So what: This matters for my practice because it directly affects the quality and safety of the care I deliver, and it supports the standards expected within my scope of work.`,
      ``,
      `Now what: I will apply this learning in my day-to-day practice, discuss it at my next team meeting, and review whether it changes any of my working habits. Any remaining gaps will be considered for my PDP.`,
      ``,
      `Edit this draft to reflect your own learning before saving — reflections must be your own.`,
    ].join("\n");
  }

  if (kind === "PDP_SUGGESTION") {
    const themes = facts.bullets.length ? facts.bullets.slice(0, 5) : ["maintaining clinical currency", "quality improvement"];
    return themes
      .map((t, i) => `${i + 1}. Strengthen my practice in ${t} — complete targeted learning and evidence the impact on patient care within the next appraisal year.`)
      .join("\n");
  }

  if (kind === "APPRAISAL_SUMMARY") {
    return [
      `Draft summary for the appraiser to edit (AI-generated):`,
      ``,
      facts.bullets.length
        ? `Evidence reviewed: ${facts.bullets.join("; ")}.`
        : `Evidence reviewed across the appraisal year.`,
      ``,
      `The doctor has engaged with the appraisal process and provided supporting information covering their scope of practice. Key discussion points and agreements should be recorded here by the appraiser, including the outcome of the PDP discussion.`,
    ].join("\n");
  }

  // FEEDBACK_THEMES
  return [
    `AI-generated theme summary of anonymised feedback (for the appraiser's review):`,
    ``,
    facts.bullets.length
      ? `Predominant themes in the quantitative results: ${facts.bullets.join("; ")}.`
      : `Quantitative results are broadly positive with no significant outlier questions.`,
    ``,
    `Free-text comments, where present, should be grouped into strengths and development areas before the appraisal discussion.`,
  ].join("\n");
}

export function getAIClient(): AIClient {
  const provider = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  if (provider === "azure-openai") {
    return new AzureOpenAIClient();
  }
  if (provider === "openai") {
    return new OpenAIClient();
  }
  return new MockAIClient();
}

class AzureOpenAIClient implements AIClient {
  readonly provider = "azure-openai";

  async generate(req: AIRequest): Promise<AIResponse> {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    if (!endpoint || !apiKey || !deployment) {
      throw new Error("Azure OpenAI is not configured (set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT)");
    }
    const res = await fetch(`${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=2024-06-01`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        messages: [
          { role: "system", content: req.systemPrompt },
          { role: "user", content: req.userPrompt },
        ],
        max_tokens: req.maxTokens ?? 700,
        temperature: 0.4,
      }),
    });
    if (!res.ok) throw new Error(`Azure OpenAI request failed: ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; model?: string };
    const text = data.choices?.[0]?.message?.content ?? "";
    return { text, provider: this.provider, model: data.model ?? deployment };
  }
}

class OpenAIClient implements AIClient {
  readonly provider = "openai";

  async generate(req: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OpenAI is not configured (set OPENAI_API_KEY)");
    const model = process.env.AI_MODEL || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: req.systemPrompt },
          { role: "user", content: req.userPrompt },
        ],
        max_tokens: req.maxTokens ?? 700,
        temperature: 0.4,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI request failed: ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; model?: string };
    const text = data.choices?.[0]?.message?.content ?? "";
    return { text, provider: this.provider, model: data.model ?? model };
  }
}
