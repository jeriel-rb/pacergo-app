"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

const RESOURCES = [
  { key: "users", labelKey: "exports.users" },
  { key: "trainers", labelKey: "exports.trainers" },
  { key: "orders", labelKey: "exports.orders" },
  { key: "withdrawals", labelKey: "exports.withdrawals" },
] as const;

/** Admin CSV export buttons (B-9 / A9). Rendered inside the admin-gated page,
 *  so only platform admins see these. The /api/admin/exports route re-checks
 *  am_i_admin server-side as well. Bank data is masked in every export. */
export function AdminExportsView() {
  const { t } = useTranslation("admin");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(resource: string) {
    setError(null);
    setBusy(resource);
    try {
      const res = await fetch(`/api/admin/exports/${resource}?format=csv`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        // Avoid saving JSON error bodies as "CSV" downloads.
        let code = "export_failed";
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) code = body.error;
        } catch {
          /* non-JSON error body */
        }
        throw new Error(t(`exports.errors.${code}`, { defaultValue: t("error") }));
      }

      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const matched = /filename="([^"]+)"/.exec(cd);
      const filename = matched?.[1] ?? `pacergo-${resource}.csv`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("exports.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("exports.notice")}</p>
      </header>
      <section className="space-y-3">
      {error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {RESOURCES.map((r) => (
          <Card key={r.key} className="flex items-center justify-between p-4">
            <span className="text-sm font-medium">{t(r.labelKey)}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("gap-2")}
              disabled={busy !== null}
              onClick={() => void download(r.key)}
            >
              {busy === r.key ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              {t("exports.download")}
            </Button>
          </Card>
        ))}
      </div>
      </section>
    </div>
  );
}
