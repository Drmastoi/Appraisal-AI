# DPIA Checklist — Appraisal Portal deployment (UK GDPR / ICO)

Complete before go-live at a designated body. This is a working checklist, not legal advice.

## 1. Scope
- [ ] Describe the processing: accounts, MAG appraisal data, CPD, 360 feedback, PDP, sign-off, RO export, AI drafts.
- [ ] Identify the controller (designated body) and any processors (hosting provider, AI provider).
- [ ] Flow-map data: doctor → portal → appraiser → RO → GMC Connect (manual upload in v1).

## 2. Necessity & proportionality
- [ ] Confirm appraisal purpose cannot reasonably be met with less data.
- [ ] Confirm CPD/event reflections are limited to what appraisal requires.
- [ ] Confirm anonymous-by-design 360 feedback (single-use tokens, no respondent linkage in reports).
- [ ] Lawful basis documented (employment/official authority; Art 9(2)(b)/(h) where relevant).

## 3. Risks & mitigations (in-built)
- [ ] Unauthorised access → RBAC on every route, session expiry, hashed tokens, rate limiting.
- [ ] Feedback deanonymisation → threshold-based unblinding; free text only to appraiser/admin below threshold.
- [ ] AI risks (inaccurate drafts, over-reliance) → drafts-only policy, human approval recorded, prompt content excludes patient data, provider logged per interaction.
- [ ] Excessive retention → retention schedule agreed with the designated body.
- [ ] Export leakage → downloads audited; RO bundle only for signed-off appraisals; admin-only endpoints.

## 4. AI provider decision
- [ ] Default: mock provider (no data leaves the server) — acceptable for evaluation.
- [ ] Production: Azure OpenAI **UK region** with DPA, or no third-party AI at all.
- [ ] Record model, deployment region and retention settings in the DPIA.
- [ ] Confirm prompts contain no patient-identifiable data (design review + spot audit).

## 5. Transparency
- [ ] Privacy notice published and linked at registration.
- [ ] Doctors informed AI features are optional and approval-gated.
- [ ] Feedback respondents told responses are anonymous and how results unblind.

## 6. Residual risk sign-off
- [ ] Risks scored, mitigations noted, residual risk accepted by the SIRO/Caldicott Guardian as appropriate.
- [ ] Review date set (annually or on material change).
