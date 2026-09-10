# Privacy Notice — Medical Appraisal Portal (UK)

**Data controller:** your designated body (the organisation that engaged the portal). The portal operator acts as a processor where applicable.

## What we process
- **Account data:** name, email, role, GMC number, designated body, revalidation due date.
- **Appraisal data:** MAG form sections (scope of work, declarations), CPD entries and reflections, quality improvement activity, significant events and complaints you declare, PDP objectives and notes.
- **360 feedback:** anonymous colleague/patient questionnaire responses (responses are not linked to respondents' identities in reporting; invite links are single-use and randomised).
- **Attachments:** certificates, audit write-ups and feedback reports you upload.
- **Audit records:** who did what and when (logins, section edits, sign-offs, exports, AI approvals).
- **AI interaction records:** which AI features were used, the prompt *summary* (never patient-identifiable content), the generated draft, and who approved it.

## Legal bases
- **Performance of the employment contract / exercising official authority** — appraisal and revalidation are requirements placed on doctors by the GMC (Medical Act 1983 as amended) and their designated body.
- **Article 9(2)(b) & (h)** — health and social care purposes where applicable.
- **Consent** for optional AI-drafting features (withdrawable; features remain fully usable without AI).

## AI use principles
1. AI output is always a **draft**, clearly marked, and requires human review and approval before it becomes part of the record.
2. Prompts sent to AI providers exclude patient-identifiable data by design.
3. Every AI interaction is logged (kind, provider, timestamp, approver).
4. With the mock provider, no data leaves the server. With Azure OpenAI, use a **UK-region deployment** under a data-processing agreement.

## Retention
- Appraisal records: retained per your designated body's policy — commonly the full revalidation cycle plus a defined period after (typically a minimum of 10 years for adult health records guidance; confirm your local schedule).
- Feedback responses: anonymous; retained with the appraisal record.
- Audit log: retained for the life of the record; append-only.

## Your rights
Access (machine-readable export built in), rectification, erasure (subject to statutory revalidation retention), restriction, and objection. Contact your designated body's data protection officer.

## Security
Encrypted in transit (TLS) and at rest at the hosting layer; hashed session tokens; bcrypt password hashing; role-based access control on every route; append-only audit trail; attachments downloadable only by the doctor, their appraiser, or an administrator.
