"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { GoogleIcon, AppleIcon } from "./provider-icons";
import { signInWithProvider, type AuthProvider } from "./sign-in-with-provider";

/** Google / Apple sign-in buttons (mock — routes home on success). */
export function SocialButtons() {
  const { t } = useTranslation("auth");
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState<AuthProvider | null>(null);

  async function handle(provider: AuthProvider) {
    if (loading) return;
    setLoading(provider);
    await signInWithProvider(provider);
    router.push(getLocalizedPath("/", getCurrentLocale(pathname)));
  }

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        onClick={() => handle("google")}
        disabled={loading !== null}
        className="h-12 w-full gap-3 rounded-xl text-sm"
      >
        {loading === "google" ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        {t("continueGoogle")}
      </Button>
      <Button
        variant="outline"
        onClick={() => handle("apple")}
        disabled={loading !== null}
        className="h-12 w-full gap-3 rounded-xl text-sm"
      >
        {loading === "apple" ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <AppleIcon />
        )}
        {t("continueApple")}
      </Button>
    </div>
  );
}
