/** Max avatar upload size (2 MB). */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export type AvatarValidationError = "type" | "size";

/** Validate a chosen avatar file. Returns an error code, or null when OK. */
export function validateAvatarFile(file: File): AvatarValidationError | null {
  if (!file.type.startsWith("image/")) return "type";
  if (file.size > MAX_AVATAR_BYTES) return "size";
  return null;
}

/** Storage object path for a user's avatar: `<uid>/avatar.<ext>` (owner-scoped). */
export function avatarObjectPath(uid: string, file: File): string {
  const dot = file.name.lastIndexOf(".");
  const ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : "";
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "jpg";
  return `${uid}/avatar.${safeExt}`;
}
