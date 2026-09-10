# Deployment & Operations

## Local development
```bash
npm install
cp .env.example .env        # SQLite local DB
npx prisma db push
npm run db:seed             # demo accounts
npm run dev                 # http://localhost:4321
```

Demo accounts: `admin@portal.nhs.uk / Admin123!`, `appraiser@portal.nhs.uk / Appraiser123!`, `doctor@portal.nhs.uk / Doctor123!`.

## Quality gates
```bash
npm run typecheck && npm run lint && npm test
```

## Production (UK region)
1. **Database:** provision PostgreSQL in a UK region (AWS `eu-west-2`, Azure `UK South`, etc.). Set `DATABASE_URL="postgresql://..."`, then in `prisma/schema.prisma` switch `provider = "postgresql"` and run `npx prisma migrate deploy` (use migrations, not `db push`, in production).
2. **Secrets:** set a strong `AUTH_SECRET`; rotate on incident. Store secrets in the platform secret manager, never in the repo.
3. **Build & run:**
   ```bash
   npm ci && npm run build && npm start   # listens on :4321
   ```
   Terminate TLS at your ingress; cookies are `Secure` in production.
4. **AI provider:** keep `AI_PROVIDER="mock"` for evaluation. For production AI use `AI_PROVIDER="azure-openai"` with a **UK-region deployment** (`AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`) under a DPA. Omitting AI keys keeps all other features fully functional.
5. **Email/notifications:** in-app notifications are live; connect an email provider (e.g. NHS Notify or transactional SMTP) to `src/lib/notify.ts` when ready.
6. **Backups:** automated daily DB snapshots with restore testing; attachments are stored in-database in v1 — move to object storage (S3/Azure Blob, UK region) before scale-out.
7. **Multi-instance:** replace the in-memory rate limiter with Redis if you run more than one node.

## First-run checklist
- [ ] Sign in as admin, change the seeded admin password policy for your org (enforce via registration review).
- [ ] Approve real users, assign appraisers (Admin → Assignments).
- [ ] Create current-year appraisals for doctors (Admin → Users → Create appraisal).
- [ ] Confirm RO recommendation flow on the Compliance page after first sign-off.
