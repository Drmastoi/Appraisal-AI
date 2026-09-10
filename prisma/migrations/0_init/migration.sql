-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "gmcNumber" TEXT,
    "designatedBody" TEXT,
    "revalidationDueDate" TIMESTAMP(3),
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appraiserId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appraisal" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appraiserId" TEXT,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "signedOffAt" TIMESTAMP(3),
    "appraisalMeetingDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appraisal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalSection" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppraisalSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionVersion" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "editedByRole" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CPDEntry" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "category" TEXT,
    "provider" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "reflection" TEXT,
    "learningNeeds" TEXT,
    "impactOnPractice" TEXT,
    "aiAssisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CPDEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QIEntry" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QIEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignificantEvent" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reflection" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignificantEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PDPObjective" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'NEW',
    "previousObjectiveId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "progressNote" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "smartSpecific" TEXT,
    "smartMeasurable" TEXT,
    "smartAchievable" TEXT,
    "smartRelevant" TEXT,
    "smartTimeBound" TEXT,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PDPObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackCycle" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "cycleType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "minResponses" INTEGER NOT NULL DEFAULT 15,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackInvite" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "recipientName" TEXT,
    "relationship" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackResponse" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "inviteId" TEXT,
    "ratings" TEXT NOT NULL DEFAULT '{}',
    "freeText" TEXT NOT NULL DEFAULT '[]',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraiserComment" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppraiserComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "signerRole" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "sectionKey" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "issuer" TEXT,
    "issuedAt" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalMeeting" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppraisalMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appraisalId" TEXT,
    "kind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "promptMeta" TEXT,
    "response" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RORecommendation" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "madeById" TEXT NOT NULL,
    "appraisalYear" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "note" TEXT,
    "submittedToGmc" BOOLEAN NOT NULL DEFAULT false,
    "gmcConnectRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RORecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_doctorId_appraiserId_key" ON "Assignment"("doctorId", "appraiserId");

-- CreateIndex
CREATE INDEX "Appraisal_appraiserId_idx" ON "Appraisal"("appraiserId");

-- CreateIndex
CREATE UNIQUE INDEX "Appraisal_doctorId_year_key" ON "Appraisal"("doctorId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalSection_appraisalId_sectionKey_key" ON "AppraisalSection"("appraisalId", "sectionKey");

-- CreateIndex
CREATE INDEX "SectionVersion_sectionId_idx" ON "SectionVersion"("sectionId");

-- CreateIndex
CREATE INDEX "CPDEntry_appraisalId_idx" ON "CPDEntry"("appraisalId");

-- CreateIndex
CREATE INDEX "QIEntry_appraisalId_idx" ON "QIEntry"("appraisalId");

-- CreateIndex
CREATE INDEX "SignificantEvent_appraisalId_idx" ON "SignificantEvent"("appraisalId");

-- CreateIndex
CREATE INDEX "PDPObjective_appraisalId_idx" ON "PDPObjective"("appraisalId");

-- CreateIndex
CREATE INDEX "FeedbackCycle_appraisalId_idx" ON "FeedbackCycle"("appraisalId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackInvite_token_key" ON "FeedbackInvite"("token");

-- CreateIndex
CREATE INDEX "FeedbackInvite_cycleId_idx" ON "FeedbackInvite"("cycleId");

-- CreateIndex
CREATE INDEX "FeedbackResponse_cycleId_idx" ON "FeedbackResponse"("cycleId");

-- CreateIndex
CREATE INDEX "AppraiserComment_appraisalId_sectionKey_idx" ON "AppraiserComment"("appraisalId", "sectionKey");

-- CreateIndex
CREATE UNIQUE INDEX "Signature_appraisalId_signerRole_key" ON "Signature"("appraisalId", "signerRole");

-- CreateIndex
CREATE INDEX "Attachment_appraisalId_idx" ON "Attachment"("appraisalId");

-- CreateIndex
CREATE INDEX "Attachment_verified_idx" ON "Attachment"("verified");

-- CreateIndex
CREATE INDEX "AppraisalMeeting_appraisalId_idx" ON "AppraisalMeeting"("appraisalId");

-- CreateIndex
CREATE INDEX "AppraisalMeeting_scheduledAt_idx" ON "AppraisalMeeting"("scheduledAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AIInteraction_appraisalId_idx" ON "AIInteraction"("appraisalId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "RORecommendation_doctorId_idx" ON "RORecommendation"("doctorId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_appraiserId_fkey" FOREIGN KEY ("appraiserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_appraiserId_fkey" FOREIGN KEY ("appraiserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalSection" ADD CONSTRAINT "AppraisalSection_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionVersion" ADD CONSTRAINT "SectionVersion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AppraisalSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CPDEntry" ADD CONSTRAINT "CPDEntry_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QIEntry" ADD CONSTRAINT "QIEntry_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignificantEvent" ADD CONSTRAINT "SignificantEvent_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDPObjective" ADD CONSTRAINT "PDPObjective_previousObjectiveId_fkey" FOREIGN KEY ("previousObjectiveId") REFERENCES "PDPObjective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDPObjective" ADD CONSTRAINT "PDPObjective_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackCycle" ADD CONSTRAINT "FeedbackCycle_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackInvite" ADD CONSTRAINT "FeedbackInvite_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "FeedbackCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "FeedbackCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "FeedbackInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraiserComment" ADD CONSTRAINT "AppraiserComment_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraiserComment" ADD CONSTRAINT "AppraiserComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalMeeting" ADD CONSTRAINT "AppraisalMeeting_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalMeeting" ADD CONSTRAINT "AppraisalMeeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInteraction" ADD CONSTRAINT "AIInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInteraction" ADD CONSTRAINT "AIInteraction_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RORecommendation" ADD CONSTRAINT "RORecommendation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RORecommendation" ADD CONSTRAINT "RORecommendation_madeById_fkey" FOREIGN KEY ("madeById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

