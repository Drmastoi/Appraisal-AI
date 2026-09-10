import { prisma } from "@/lib/db";
import { getAIClient } from "@/lib/ai/provider";
import type { AIKind } from "@/lib/ai/provider";
import { audit } from "@/lib/audit";

const SYSTEM_PROMPTS: Record<AIKind, string> = {
  CPD_REFLECTION:
    "You help UK doctors draft reflective CPD entries for medical appraisal. Follow the 'what happened, what was learned, so what, now what' structure. Be concise, professional and generic about any clinical details. Output is a draft that the doctor must review and personalise.",
  PDP_SUGGESTION:
    "You suggest Personal Development Plan objectives for UK doctors' annual appraisals. Objectives must be specific, achievable within a year and linked to scope of practice and appraisal evidence. Output is a numbered list of draft objectives for the doctor to choose from.",
  APPRAISAL_SUMMARY:
    "You draft a neutral, factual pre-appraisal summary of a doctor's submitted evidence for their appraiser. Do not invent facts. Highlight completeness, coverage of scope of work, and anything the appraiser should explore. Output is a draft for the appraiser to edit.",
  FEEDBACK_THEMES:
    "You summarise anonymised 360-degree feedback results into themes for an appraisal discussion. Use only the aggregates provided. Do not attempt to identify respondents. Output is a draft for the appraiser or doctor to review.",
};

export type LoggedAIResult = {
  interactionId: string;
  text: string;
  provider: string;
  model: string | null;
};

export async function runAI(opts: {
  kind: AIKind;
  userId: string;
  appraisalId?: string | null;
  userPrompt: string;
  promptMeta?: Record<string, unknown>;
  maxTokens?: number;
}): Promise<LoggedAIResult> {
  const client = getAIClient();
  const result = await client.generate({
    kind: opts.kind,
    systemPrompt: SYSTEM_PROMPTS[opts.kind],
    userPrompt: opts.userPrompt,
    maxTokens: opts.maxTokens,
  });

  const interaction = await prisma.aIInteraction.create({
    data: {
      userId: opts.userId,
      appraisalId: opts.appraisalId ?? null,
      kind: opts.kind,
      provider: result.provider,
      model: result.model,
      promptMeta: JSON.stringify(opts.promptMeta ?? {}),
      response: result.text,
      approved: false,
    },
  });

  return { interactionId: interaction.id, text: result.text, provider: result.provider, model: result.model };
}

export async function approveAIInteraction(userId: string, role: string, interactionId: string) {
  const interaction = await prisma.aIInteraction.findUnique({ where: { id: interactionId } });
  if (!interaction) throw new Error("AI interaction not found");
  await prisma.aIInteraction.update({
    where: { id: interactionId },
    data: { approved: true, approvedById: userId, approvedAt: new Date() },
  });
  await audit({ actorId: userId, actorRole: role, action: "AI_APPROVE", entityType: "AIInteraction", entityId: interactionId, meta: { kind: interaction.kind } });
}

export async function unapprovedCountForAppraisal(appraisalId: string): Promise<number> {
  return prisma.aIInteraction.count({ where: { appraisalId, approved: false } });
}
