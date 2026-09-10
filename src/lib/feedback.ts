// 360° multi-source feedback questionnaires, aligned with the GMC's good
// medical practice domains and common UK MSF/patient survey instruments.
export type LikertQuestion = { id: string; text: string; domain: "KNOWLEDGE_SKILLS" | "SAFETY_QUALITY" | "COMMUNICATION" | "PROFESSIONALISM" };
export type FreeTextQuestion = { id: string; text: string; placeholder?: string };

export const COLLEAGUE_LIKERT: LikertQuestion[] = [
  { id: "c1", text: "Provides good clinical care", domain: "SAFETY_QUALITY" },
  { id: "c2", text: "Keeps up to date and uses evidence-based practice", domain: "KNOWLEDGE_SKILLS" },
  { id: "c3", text: "Communicates clearly with colleagues", domain: "COMMUNICATION" },
  { id: "c4", text: "Is a good team worker", domain: "COMMUNICATION" },
  { id: "c5", text: "Is accessible and available to colleagues", domain: "COMMUNICATION" },
  { id: "c6", text: "Manages patients safely, involving colleagues appropriately", domain: "SAFETY_QUALITY" },
  { id: "c7", text: "Acts with professionalism and integrity", domain: "PROFESSIONALISM" },
  { id: "c8", text: "Shows respect and courtesy to patients and colleagues", domain: "PROFESSIONALISM" },
  { id: "c9", text: "Raises concerns appropriately and acts on feedback", domain: "PROFESSIONALISM" },
  { id: "c10", text: "Contributes to teaching, supervision or team development", domain: "KNOWLEDGE_SKILLS" },
];

export const PATIENT_LIKERT: LikertQuestion[] = [
  { id: "p1", text: "I was treated with courtesy and respect", domain: "PROFESSIONALISM" },
  { id: "p2", text: "The doctor listened to me", domain: "COMMUNICATION" },
  { id: "p3", text: "The doctor understood my concerns", domain: "COMMUNICATION" },
  { id: "p4", text: "The doctor explained things in a way I could understand", domain: "COMMUNICATION" },
  { id: "p5", text: "I was involved in decisions about my care", domain: "SAFETY_QUALITY" },
  { id: "p6", text: "The doctor gave me enough time", domain: "SAFETY_QUALITY" },
  { id: "p7", text: "I have confidence in this doctor", domain: "PROFESSIONALISM" },
  { id: "p8", text: "Overall, my care has been very good", domain: "SAFETY_QUALITY" },
];

export const COLLEAGUE_FREETEXT: FreeTextQuestion[] = [
  { id: "cf1", text: "What does this doctor do particularly well?", placeholder: "Describe strengths with an example if possible" },
  { id: "cf2", text: "What could this doctor do to improve their practice?", placeholder: "One or two constructive suggestions" },
];

export const PATIENT_FREETEXT: FreeTextQuestion[] = [
  { id: "pf1", text: "Is there anything the doctor could have done better?", placeholder: "Optional — your response is anonymous" },
];

export const LIKERT_LABELS = ["Poor", "Below average", "Average", "Good", "Excellent"] as const;

export function cycleQuestions(cycleType: "COLLEAGUE" | "PATIENT") {
  return cycleType === "COLLEAGUE"
    ? { likert: COLLEAGUE_LIKERT, freeText: COLLEAGUE_FREETEXT }
    : { likert: PATIENT_LIKERT, freeText: PATIENT_FREETEXT };
}

export type AggregatedRating = { questionId: string; text: string; domain: string; mean: number | null; count: number; distribution: number[] };

export function aggregateRatings(
  responses: { ratings: string }[],
  likert: LikertQuestion[]
): { perQuestion: AggregatedRating[]; overallMean: number | null; totalResponses: number } {
  const parsed = responses.map((r) => {
    try {
      return JSON.parse(r.ratings) as Record<string, number>;
    } catch {
      return {} as Record<string, number>;
    }
  });

  const perQuestion: AggregatedRating[] = likert.map((q) => {
    const distribution = [0, 0, 0, 0, 0];
    let sum = 0;
    let count = 0;
    for (const ratings of parsed) {
      const v = ratings[q.id];
      if (typeof v === "number" && v >= 1 && v <= 5) {
        distribution[v - 1] += 1;
        sum += v;
        count += 1;
      }
    }
    return { questionId: q.id, text: q.text, domain: q.domain, mean: count ? Number((sum / count).toFixed(2)) : null, count, distribution };
  });

  const answered = perQuestion.filter((q) => q.mean !== null);
  const overallMean = answered.length ? Number((answered.reduce((s, q) => s + (q.mean ?? 0), 0) / answered.length).toFixed(2)) : null;
  return { perQuestion, overallMean, totalResponses: responses.length };
}

export type DomainSummary = { domain: string; mean: number | null; questions: number; responses: number };

export function domainSummaries(perQuestion: AggregatedRating[]): DomainSummary[] {
  const byDomain = new Map<string, { sum: number; qs: number; responses: number }>();
  for (const q of perQuestion) {
    if (q.mean === null) continue;
    const prev = byDomain.get(q.domain) ?? { sum: 0, qs: 0, responses: 0 };
    prev.sum += q.mean;
    prev.qs += 1;
    prev.responses += q.count;
    byDomain.set(q.domain, prev);
  }
  return Array.from(byDomain.entries()).map(([domain, v]) => ({
    domain,
    mean: v.qs ? Number((v.sum / v.qs).toFixed(2)) : null,
    questions: v.qs,
    responses: v.responses,
  }));
}

export type TrendPoint = { label: string; mean: number | null };

// Minimum responses before a report is unblinded to the doctor — consistent
// with MSF conventions (~15 colleagues, ~34 patients per full cycle).
export function meetsThreshold(cycleType: "COLLEAGUE" | "PATIENT", responseCount: number): boolean {
  const min = cycleType === "COLLEAGUE" ? 15 : 34;
  return responseCount >= min;
}

export function minimumResponses(cycleType: "COLLEAGUE" | "PATIENT"): number {
  return cycleType === "COLLEAGUE" ? 15 : 34;
}
