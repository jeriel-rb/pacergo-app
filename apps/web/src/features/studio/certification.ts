/** Max certification document size (8 MB). PDFs only. */
export const MAX_CERT_BYTES = 8 * 1024 * 1024;

export type CertValidationError = "type" | "size";

/** Validate a chosen certification file. Returns an error code, or null when OK. */
export function validateCertFile(file: File): CertValidationError | null {
  if (file.type !== "application/pdf") return "type";
  if (file.size > MAX_CERT_BYTES) return "size";
  return null;
}

/** Storage object path for a verification doc: `<uid>/cert-<ts>.pdf` (owner-scoped). */
export function certObjectPath(uid: string, ts: number): string {
  return `${uid}/cert-${ts}.pdf`;
}
