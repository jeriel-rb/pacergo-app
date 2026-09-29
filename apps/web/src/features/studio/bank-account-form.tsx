"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BankAccount } from "@/lib/earnings";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/components/ui/toast";
import { saveBankAccount } from "./earnings-actions";

/** Trainer payout account. Withdrawals stay blocked until this is saved. */
export function BankAccountForm({ bank }: { bank: BankAccount | null }) {
  const { t } = useTranslation("studio");
  const router = useRouter();
  const toast = useToast();
  const [bankCode, setBankCode] = useState(bank?.bank_code ?? "");
  const [bankName, setBankName] = useState(bank?.bank_name ?? "");
  const [branchName, setBranchName] = useState(bank?.branch_name ?? "");
  const [accountNumber, setAccountNumber] = useState(bank?.bank_account_number ?? "");
  const [accountHolder, setAccountHolder] = useState(bank?.bank_account_holder ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveBankAccount({
        bankCode,
        bankName,
        branchName,
        accountNumber,
        accountHolder,
      });
      setSaved(true);
      toast.show(t("toast.bankAccountSaved"), "success");
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(
        message.includes("bank_details_invalid")
          ? t("earnings.bank.invalid")
          : t("earnings.error"),
      );
      toast.show(t("toast.bankAccountSaveFailed"), "destructive");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold">{t("earnings.bank.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {bank?.bank_account_mask
            ? t("earnings.bank.savedAs", { mask: bank.bank_account_mask })
            : t("earnings.bank.missing")}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t("earnings.bank.code")}
          value={bankCode}
          inputMode="numeric"
          autoComplete="off"
          onChange={(e) => setBankCode(e.target.value)}
        />
        <Input
          label={t("earnings.bank.name")}
          value={bankName}
          autoComplete="off"
          onChange={(e) => setBankName(e.target.value)}
        />
        <Input
          label={t("earnings.bank.branch")}
          value={branchName}
          autoComplete="off"
          onChange={(e) => setBranchName(e.target.value)}
        />
        <Input
          label={t("earnings.bank.number")}
          value={accountNumber}
          inputMode="numeric"
          autoComplete="off"
          onChange={(e) => setAccountNumber(e.target.value)}
        />
        <div className="sm:col-span-2">
          <Input
            label={t("earnings.bank.holder")}
            value={accountHolder}
            autoComplete="name"
            onChange={(e) => setAccountHolder(e.target.value)}
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {saved && <p className="text-sm text-muted-foreground">{t("saved")}</p>}
      <Button type="button" onClick={() => void submit()} disabled={busy} className="gap-2">
        {busy && <Loader2 size={16} className="animate-spin" />}
        {t("save")}
      </Button>
    </Card>
  );
}
