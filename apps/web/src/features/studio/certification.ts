/** Max certification document size (8 MB). PDFs only. */
export const MAX_CERT_BYTES = 8 * 1024 * 1024;

export type CertValidationError = "type" | "size";

/** Validate a chosen certification file. Returns an error code, or null when OK. */
export function validateCertFile(file: File): CertValidationError | null {
  if (file.type !== "application/pdf") return "type";
  if (file.size > MAX_CERT_BYTES) return "size";
  return null;
}

/** Verification document kinds a trainer can submit for admin review:
 *  `background` qualifies Tier C, `certification` Tier B, `competition` (with a
 *  certification) Tier A — all per activity. */
export type VerificationDocType = "background" | "certification" | "competition";

/**
 * Storage object path for a verification doc, owner-scoped so the storage RLS
 * policy (folder = uid) accepts it: `<uid>/{bg,cert,comp}-<ts>.pdf`.
 */
export function verificationObjectPath(
  uid: string,
  ts: number,
  docType: VerificationDocType,
): string {
  const prefix = docType === "competition" ? "comp" : docType === "background" ? "bg" : "cert";
  return `${uid}/${prefix}-${ts}.pdf`;
}
