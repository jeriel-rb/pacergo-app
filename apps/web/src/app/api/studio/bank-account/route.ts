import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import {
  ACCOUNT_NUMBER_PATTERN,
  encryptAccountNumber,
  maskAccountNumber,
} from "@/lib/crypto/bank-account";

export const runtime = "nodejs";

/** Saves the signed-in trainer's payout account.
 *
 *  The account number is encrypted here, on the server (AES-GCM, bound to the
 *  user's id), and only the ciphertext + mask are sent to the database — Postgres
 *  never sees the plaintext. Errors are short codes; no field values are echoed
 *  or logged. */
export async function POST(request: Request) {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return NextResponse.json({ error: "bank_unauthenticated" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bank_details_invalid" }, { status: 400 });
  }

  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const bankCode = text(body.bankCode);
  const bankName = text(body.bankName);
  const branchName = text(body.branchName);
  const accountNumber = text(body.accountNumber);
  const accountHolder = text(body.accountHolder);

  // The database re-checks the plain fields; the account number can only be
  // checked here, because by the time it gets there it is ciphertext.
  if (!ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
    return NextResponse.json({ error: "bank_details_invalid" }, { status: 400 });
  }

  let cipher: string;
  try {
    cipher = await encryptAccountNumber(userId, accountNumber);
  } catch {
    console.warn("bank_account_encrypt_failed");
    return NextResponse.json({ error: "encryption_unavailable" }, { status: 503 });
  }

  const { error } = await supabase.rpc("save_bank_account_encrypted", {
    p_bank_code: bankCode,
    p_bank_name: bankName,
    p_branch_name: branchName,
    p_account_cipher: cipher,
    p_account_mask: maskAccountNumber(accountNumber),
    p_account_holder: accountHolder,
  });
  if (error) {
    const invalid = error.message.includes("bank_details_invalid");
    return NextResponse.json(
      { error: invalid ? "bank_details_invalid" : "bank_save_failed" },
      { status: invalid ? 400 : 500 },
    );
  }

  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
