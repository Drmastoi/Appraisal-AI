export const ROLES = ["DOCTOR", "APPRAISER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export const APPRAISAL_STATUSES = ["DRAFT", "SUBMITTED", "IN_REVIEW", "SIGNED_OFF"] as const;
export type AppraisalStatus = (typeof APPRAISAL_STATUSES)[number];

export function isAppraisalStatus(value: string): value is AppraisalStatus {
  return (APPRAISAL_STATUSES as readonly string[]).includes(value);
}
