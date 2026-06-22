import { describe, it, expect } from "vitest";
import {
  validateAvatarFile,
  avatarObjectPath,
  MAX_AVATAR_BYTES,
} from "../avatar";

function makeFile(name: string, type: string, size = 16): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validateAvatarFile", () => {
  it("accepts a small image", () => {
    expect(validateAvatarFile(makeFile("a.png", "image/png"))).toBeNull();
  });

  it("rejects non-image files", () => {
    expect(validateAvatarFile(makeFile("a.pdf", "application/pdf"))).toBe(
      "type",
    );
  });

  it("rejects images larger than the limit", () => {
    const big = makeFile("big.jpg", "image/jpeg", MAX_AVATAR_BYTES + 1);
    expect(validateAvatarFile(big)).toBe("size");
  });
});

describe("avatarObjectPath", () => {
  it("scopes the path to the uid and keeps the extension", () => {
    expect(avatarObjectPath("uid-123", makeFile("pic.png", "image/png"))).toBe(
      "uid-123/avatar.png",
    );
  });

  it("falls back to jpg when there's no usable extension", () => {
    expect(avatarObjectPath("uid-123", makeFile("pic", "image/jpeg"))).toBe(
      "uid-123/avatar.jpg",
    );
  });
});
