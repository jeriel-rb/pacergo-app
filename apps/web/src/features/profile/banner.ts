/** Max banner upload size (4 MB — banners are wider than avatars). */
export const MAX_BANNER_BYTES = 4 * 1024 * 1024;

export type BannerValidationError = "type" | "size";

/** Validate a chosen banner file. Returns an error code, or null when OK. */
export function validateBannerFile(file: File): BannerValidationError | null {
  if (!file.type.startsWith("image/")) return "type";
  if (file.size > MAX_BANNER_BYTES) return "size";
  return null;
}

/** Storage object path for a user's banner: `<uid>/banner.<ext>` (owner-scoped). */
export function bannerObjectPath(uid: string, file: File): string {
  const dot = file.name.lastIndexOf(".");
  const ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : "";
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "jpg";
  return `${uid}/banner.${safeExt}`;
}
