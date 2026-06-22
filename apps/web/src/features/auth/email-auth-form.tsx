"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";

/** Email + password auth. Sign-up sends a confirmation email; sign-in requires
 *  a confirmed account. */
export function EmailAuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { t } = useTranslation("auth");
  const router = useRouter();
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const home = getLocalizedPath("/", locale);

    try {
      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}${home}`
                : undefined,
          },
        });
        if (error) throw error;
        // If email confirmation is on, there's no session yet → tell them to check email.
        if (data.session) {
          router.push(home);
          router.refresh();
        } else {
          setSent(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(home);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
          <MailCheck size={24} />
        </span>
        <p className="font-semibold">{t("checkEmailTitle")}</p>
        <p className="text-sm text-muted-foreground">
          {t("checkEmailBody", { email })}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          {t("email")}
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          {t("password")}
        </label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("passwordPlaceholder")}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl">
        {loading && <Loader2 size={16} className="animate-spin" />}
        {mode === "sign-up" ? t("signUpCta") : t("signInCta")}
      </Button>
    </form>
  );
}
