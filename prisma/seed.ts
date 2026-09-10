import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Deployment bootstrap. Real-life mode: the seed does NOT create demo doctors,
 * appraisers or appraisal data. It only ensures the bootstrap ADMIN exists.
 *
 * Credentials come from environment variables — never hardcoded:
 *   SEED_ADMIN_EMAIL      (default: admin@portal.nhs.uk)
 *   SEED_ADMIN_PASSWORD   (required, min 8 chars — re-running resets this password)
 *   SEED_ADMIN_NAME       (default: Portal Admin)
 *
 * Doctors and appraisers register themselves at /register and are approved by
 * the admin under Admin → Users before they can sign in.
 */
async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@portal.nhs.uk").toLowerCase();
  const name = process.env.SEED_ADMIN_NAME ?? "Portal Admin";
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password || password.length < 8) {
    console.warn("Seed skipped admin bootstrap: set SEED_ADMIN_PASSWORD (min 8 chars) to create or reset the admin account.");
    console.warn("Existing users and data are untouched.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email },
    // Re-running the seed rotates the bootstrap admin's password to SEED_ADMIN_PASSWORD.
    update: { passwordHash },
    create: { email, passwordHash, name, role: "ADMIN", approved: true },
  });

  console.log("Seed complete: admin ready →", admin.email);
}

export const DEFAULT_SECTIONS = [
  "doctor_details",
  "scope_of_work",
  "record_of_appraisals",
  "cpd",
  "quality_improvement",
  "significant_events",
  "colleague_feedback",
  "patient_feedback",
  "wellbeing",
  "complaints",
  "achievements",
  "pdp_review",
  "new_pdp",
  "probity",
  "health",
  "indemnity",
  "additional_info",
  "academic_leadership",
  "agreed_pdp",
  "appraisal_outputs",
  "appraiser_checklist",
  "appraiser_summary",
];

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
