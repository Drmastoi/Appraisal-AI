# User Guide

## Doctors (appraisees)

1. **Sign in** — your account must be approved by an administrator first.
2. **Open My appraisal** — the MAG form for the current year. Complete each section; text saves automatically.
3. **CPD** — log internal and external learning with reflections. Use *✦ Draft reflection with AI* for a starting draft, then edit so the reflection is genuinely yours. AI drafts are marked and logged.
4. **QI, events & complaints** — record audit/QI/teaching/CBDs, and declare significant events or complaints you were personally involved in.
5. **360 feedback** — create colleague (MSF) or patient cycles, generate single-use anonymous invite links, share them, and track responses. Reports unblind at the threshold (15 colleagues / 34 patients).
6. **PDP** — review last year's objectives (achieved — how; not achieved — why), carry unfinished ones forward, add new objectives (optionally AI-suggested from your portfolio).
7. **Attach evidence** — certificates, audit write-ups, feedback reports (PDF/Office/images, max 10 MB).
8. **Submit** — the portal checks MAG completeness first and lists anything outstanding. Submission locks the form and notifies your appraiser.

If your appraiser requests changes, the appraisal returns to draft for editing.

## Appraisers

1. Submitted appraisals appear on your dashboard grouped by status.
2. **Start review** — the doctor is notified.
3. Review each MAG section with the supporting information; open a **Report** on any 360 feedback cycle (threshold status is shown). Use *✦ AI pre-appraisal summary* for a neutral draft of the evidence base — verify it before relying on it.
4. **Comment** on any section; resolve threads when addressed. All threads must be resolved before sign-off.
5. **Edit sections** where needed — every change is recorded in version history with your name.
6. Complete **Section 15 (appraiser's summary)** and confirm the PDP was agreed.
7. **Sign and lock** — your e-signature is recorded, the appraisal is locked, the MAG PDF becomes available for export, and next year's appraisal is seeded automatically with the agreed PDP.

## Administrators

- **Users** — approve new registrations, deactivate/reactivate accounts, create current-year appraisals per doctor.
- **Assignments** — one active appraiser per doctor; reassigning retires the previous pairing.
- **Compliance** — per-doctor appraisal status, record POSITIVE/DEFERRED/NEGATIVE RO recommendations after sign-off, download the **RO bundle** (JSON) and MAG **PDF**, and track GMC submission references.
- **Audit log** — append-only record of logins, edits, submissions, sign-offs, exports and AI approvals.

## Security notes

- Sessions expire after 3 days; tokens are stored hashed.
- Rate limiting protects login, registration, AI endpoints and public feedback submission.
- All AI output is draft-only with a recorded human approval; prompts exclude patient-identifiable data.
