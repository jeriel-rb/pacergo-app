import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import { getIsAdmin } from "@/lib/admin";
import { getAdminExport, type UnknownRow } from "@/lib/export/exports";
import { toExcelCsv } from "@/lib/export/csv";

export const runtime = "nodejs";

/** Admin CSV exports (B-9 / A9). Gated by `am_i_admin`; data is read through
 *  SECURITY DEFINER `admin_export_*` RPCs, one per resource, so the row set is
 *  admin-scoped server-side and the browser never hits tables directly (A-8).
 *  Only the resource name + row count are logged — never row payloads or bank
 *  data (spec §8.4 log scan). */

const RPC_BY_RESOURCE: Record<string, string> = {
  users: "admin_export_users",
  trainers: "admin_export_trainers",
  orders: "admin_export_orders",
  withdrawals: "admin_export_withdrawals",
};

const ALLOWED: ReadonlyArray<string> = Object.keys(RPC_BY_RESOURCE);

/** PostgREST may return jsonb as an array, a JSON string, or null. */
function normalizeExportRows(data: unknown): UnknownRow[] {
  if (data == null) return [];
  if (typeof data === "string") {
    try {
      return normalizeExportRows(JSON.parse(data));
    } catch {
      return [];
    }
  }
  if (Array.isArray(data)) return data as UnknownRow[];
  return [];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params;

  if (!ALLOWED.includes(resource)) {
    return NextResponse.json(
      { error: "export_unknown_resource" },
      { status: 404 },
    );
  }

  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json(
      { error: "supabase_unconfigured" },
      { status: 503 },
    );
  }

  // Admin gate (server-side). Mirrors apps/web/src/lib/admin.ts + am_i_admin RPC.
  const isAdmin = await getIsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const def = getAdminExport(resource);
  if (!def) {
    return NextResponse.json(
      { error: "export_unknown_resource" },
      { status: 404 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(RPC_BY_RESOURCE[resource]);
  if (error) {
    // Sanitised: do not echo row data / bank details into clients or logs.
    console.warn("admin_export_failed", {
      resource,
      rpc: RPC_BY_RESOURCE[resource],
      error_code: error.code ?? null,
    });
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }

  const rows = normalizeExportRows(data);
  const csv = toExcelCsv(def, rows);

  // Audit log: resource + count only. No bank / PII payloads.
  console.info("admin_export_served", { resource, rows: rows.length });

  const filename = `${def.filename(new Date())}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      // Excel opens this MIME as a spreadsheet; charset + BOM handle UTF-8.
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
