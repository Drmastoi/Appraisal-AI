# AppraisalPortal UK — medical appraisal with integrated AI & CPD generation

A full-stack portal for the annual appraisal of UK doctors, mapping the **Medical Appraisal Guide (MAG 2022)** model form, with **integrated 360° feedback**, **yearly PDP carry-forward**, **Responsible Officer outputs**, and a provider-agnostic **AI layer** for CPD reflection drafting, PDP suggestion and appraisal summaries.

## Why this is different

| Platform | Their model | What we do |
|---|---|---|
| FourteenFish | Most-used GP toolkit; editable after submission | **Lock on sign-off** with version history and an append-only audit log |
| Agilio Clarity | Locks on submit; org dashboards; AI bolt-on | **AI native to the workflow** — approval-gated, logged, mock/UK-Azure swappable |
| Improval | Optional AI tools | AI drafts are always marked, approved and auditable |
| L2P / GP Tools / SOAR / MARS | Legacy or national systems | Three-role workflow + RO compliance view in one product |

## Roles & capabilities

- **Doctor** — complete the MAG form (autosaving sections), log CPD (internal/external with reflections + AI drafting), QI/audit/teaching/CBDs, declare significant events & complaints, run anonymous 360° colleague (MSF) and patient feedback cycles with single-use token links, review last year's PDP, draft the new PDP (with AI suggestions), attach evidence, submit to the appraiser.
- **Appraiser** — review submissions, comment per section (with resolve/reopen), make tracked edits (immutable version history), complete the appraiser's summary, generate an AI pre-appraisal summary and feedback-theme draft, **e-sign off** (locks the appraisal), export the MAG PDF.
- **Admin** — approve accounts, assign appraisers, create appraisals, compliance dashboard (per-doctor status, RO recommendations, GMC submission tracking), export the RO bundle (signed appraisal JSON + PDF) for the Responsible Officer, browse the audit log.

## Yearly PDP flow

Sign-off marks the PDP *agreed* → a new next-year appraisal is seeded automatically with agreed objectives carried forward as `CARRIED_FORWARD` → next year's appraisal opens with the review prompts already populated.

## Quick start

```bash
npm install
export DATABASE_URL="postgresql://…"   # or cp .env.example .env and edit
cp .env.example .env
npx prisma migrate deploy
SEED_ADMIN_EMAIL=admin@yourdomain.nhs.uk SEED_ADMIN_PASSWORD='<strong-password>' npm run db:seed
npm run dev            # http://localhost:4321
```

There are no demo accounts. The seed creates (or resets) the single bootstrap **admin** from
`SEED_ADMIN_*` env vars — nothing is hardcoded, and re-running it rotates that admin's password.
Doctors and appraisers register at `/register` and are approved by the admin under **Admin → Users**
before they can sign in.

## Health check

One command reports whether this checkout is actually usable — tooling, env vars, Postgres
reachability, Prisma connectivity, pending/failed migrations, the bootstrap admin, and whether the
dev server answers:

```bash
npm run doctor                     # everything (expects the dev server on 4321)
npm run doctor -- --no-server      # before starting the server
npm run doctor -- --port 3000      # non-default port
npm run doctor -- --url https://appraisal-v2.vercel.app   # check a deployed site
npm run doctor -- --json           # machine-readable
```

It is read-only (never migrates, seeds or writes), prints the exact fix command for every failure,
and exits non-zero when unhealthy — so it works as a pre-flight gate in scripts and CI.

## Quality gates

```bash
npm run typecheck && npm run lint && npm test
```
27 tests: auth/tokens, 360 feedback aggregation & thresholds, MAG submission gating, AI provider outputs, and a full **lifecycle E2E** (assign → complete → submit → feedback → review → sign-off → PDP carry-forward → PDF export).

## AI provider configuration

`AI_PROVIDER=mock` (default; deterministic, no data leaves the server) · `azure-openai` (set `AZURE_OPENAI_*`, use a **UK-region deployment**) · `openai`. Every interaction is stored (`AIInteraction`) with prompt metadata, response, provider, and a human approval record.

## Docs

- `docs/DEPLOYMENT.md` — local dev, UK-region production, backups, multi-instance notes
- `docs/PRIVACY_NOTICE.md` — UK GDPR privacy notice
- `docs/DPIA_CHECKLIST.md` — ICO-style DPIA working checklist incl. AI provider decision

## v1 boundaries (next steps)

- Direct **GMC Connect** API submission (v1 produces the RO bundle for manual upload)
- Email delivery via NHS Notify / transactional SMTP (in-app notifications are live)
- Object storage for attachments at scale (in-DB in v1), Redis-backed rate limiting for multi-instance
- NHS smartcard / SSO integration
