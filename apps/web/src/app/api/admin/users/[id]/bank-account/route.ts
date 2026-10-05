import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import { readAccountNumber } from "@/lib/crypto/bank-account";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reveals one user's full bank account number to a platform admin.
 *
 *  The admin check lives in the database (`admin_user_bank_secret` raises
 *  `forbidden` for anyone else); the server then decrypts with its own key, bound
 *  to that user's id. The number is returned only in this response — never
 *  cached, never logged (only the fact that a reveal happened is). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const { data, error } = await supabase.rpc("admin_user_bank_secret", { p_user_id: id });
  if (error) {
    const forbidden = error.message.includes("forbidden");
    return NextResponse.json(
      { error: forbidden ? "forbidden" : "reveal_failed" },
      { status: forbidden ? 403 : 500 },
    );
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let accountNumber: string | null;
  try {
    accountNumber = await readAccountNumber(id, data as string);
  } catch {
    console.warn("bank_account_decrypt_failed", { user: id });
    return NextResponse.json({ error: "decrypt_failed" }, { status: 500 });
  }

  // Audit trail: who revealed whose account (ids only — never the number).
  console.info("admin_bank_account_revealed", { admin: auth.user.id, user: id });

  return NextResponse.json(
    { accountNumber },
    { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}
