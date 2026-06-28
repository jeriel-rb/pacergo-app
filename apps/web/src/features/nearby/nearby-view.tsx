"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NearbyCompanion } from "@pacergo/shared";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { TierBadge } from "@/shared/components/atoms/tier-badge";
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { Button } from "@/shared/components/ui/button";
import { useLocale } from "@/shared/hooks/use-locale";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { getNearbyCompanions } from "./nearby-actions";

const RADIUS_M = 20000;

const NearbyMap = dynamic(() => import("./nearby-map"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-muted" />,
});

type State = "locating" | "loading" | "ready" | "denied" | "error";

/** Map + distance-sorted list of nearby trainers (seeker-only discovery). */
export function NearbyView() {
  const { t } = useTranslation("trainer");
  const [state, setState] = useState<State>("locating");
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [companions, setCompanions] = useState<NearbyCompanion[]>([]);

  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState("error");
      return;
    }
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(c);
        setState("loading");
        try {
          setCompanions(await getNearbyCompanions(c.lat, c.lng, RADIUS_M));
          setState("ready");
        } catch {
          setState("error");
        }
      },
      () => setState("denied"),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  useEffect(() => {
    locate();
  }, []);

  if (state === "locating" || state === "loading") {
    return (
      <Centered>
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("nearby.locating")}</p>
      </Centered>
    );
  }

  if (state === "denied" || state === "error") {
    return (
      <Centered>
        <Navigation size={24} className="text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          {t(state === "denied" ? "nearby.denied" : "nearby.error")}
        </p>
        <Button variant="outline" onClick={locate} className="gap-2">
          <Navigation size={16} />
          {t("nearby.retry")}
        </Button>
      </Centered>
    );
  }

  return (
    <div className="space-y-4">
      {center && (
        <NearbyMap center={center} radiusM={RADIUS_M} companions={companions} />
      )}
      <p className="text-sm text-muted-foreground">
        {t("nearby.count", { count: companions.length })}
      </p>
      <div className="space-y-2">
        {companions.map((c) => (
          <NearbyRow key={c.companion_id} c={c} />
        ))}
      </div>
    </div>
  );
}

function NearbyRow({ c }: { c: NearbyCompanion }) {
  const locale = useLocale();
  const pathname = usePathname();
  const href = getLocalizedPath(
    `/trainers/${c.companion_id}`,
    getCurrentLocale(pathname),
  );

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent"
    >
      <InitialAvatar name={c.display_name} src={c.photo_url} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{c.display_name}</span>
          {c.tier && <TierBadge tier={c.tier} locale={locale} />}
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin size={12} />
          {(c.distance_m / 1000).toFixed(1)} km
          {c.home_area ? ` · ${c.home_area}` : ""}
        </p>
      </div>
      <PriceTag
        amount={c.price_ntd}
        isFree={c.is_free}
        perHour
        locale={locale}
        className="shrink-0 text-sm"
      />
    </Link>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      {children}
    </div>
  );
}
