"use client";

import { useEffect, useRef, useState } from "react";
import {
  Award,
  Banknote,
  BadgeCheck,
  Bookmark,
  CalendarCheck,
  CalendarDays,
  CircleCheck,
  ClipboardCheck,
  Clock,
  CreditCard,
  Dumbbell,
  Eye,
  EyeOff,
  FileText,
  Flag,
  Hash,
  Landmark,
  Languages,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  Radio,
  Star,
  Target,
  User,
  UserCheck,
  UserX,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ACTIVITY_META,
  TIER_LABELS,
  formatInAppTimeZone,
  type ActivitySlug,
  type Tier,
} from "@pacergo/shared";
import type { AdminUserDetail } from "@/lib/admin";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Accordion, type AccordionItem } from "@/shared/components/atoms/accordion";
import { StatusBadge, type StatusTone } from "@/shared/components/atoms/status-badge";
import { useLocale } from "@/shared/hooks/use-locale";
import { fetchBankAccountNumber } from "../admin-actions";
import { formatCount, ntd } from "./dashboard-parts";

const VERIFICATION_TONE: Record<string, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};
const LISTING_TONE: Record<string, StatusTone> = {
  active: "success",
  paused: "warning",
  draft: "muted",
};

/** One fact on one line: icon, muted label, bold value — a row per detail. */
export function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border px-3 py-2.5 text-sm">
      <Icon size={16} aria-hidden className="mt-0.5 shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1 break-words">
        <span className="text-muted-foreground">{label}</span>
        <span aria-hidden className="text-muted-foreground">
          :{" "}
        </span>
        <span className="font-medium">{children}</span>
      </p>
    </div>
  );
}

/** The trainer's bank account number: masked until an admin asks to see it.
 *  "Show" asks the server to decrypt it (the number is stored encrypted and is
 *  only ever sent in that one response); "Hide" drops it from the page again.
 *  Closing the sheet or opening another user starts masked. */
export function BankAccountRow({
  userId,
  mask,
  hasAccount,
  label,
}: {
  userId: string;
  mask: string | null;
  hasAccount: boolean;
  label: string;
}) {
  const { t } = useTranslation("admin");
  const [state, setState] = useState<"hidden" | "loading" | "shown" | "error">("hidden");
  const [number, setNumber] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  if (!hasAccount) {
    return (
      <InfoRow icon={CreditCard} label={label}>
        —
      </InfoRow>
    );
  }

  async function reveal() {
    setState("loading");
    try {
      const value = await fetchBankAccountNumber(userId);
      if (!alive.current) return;
      setNumber(value);
      setState("shown");
    } catch {
      if (alive.current) setState("error");
    }
  }

  function hide() {
    setNumber(null);
    setState("hidden");
  }

  const shown = state === "shown";
  return (
    <InfoRow icon={CreditCard} label={label}>
      <span className="font-mono tracking-wide">{shown ? number : (mask ?? "—")}</span>
      {state === "error" && (
        <span role="alert" className="ml-2 text-xs font-normal text-destructive">
          {t("users.sheet.revealError")}
        </span>
      )}
      <button
        type="button"
        onClick={shown ? hide : reveal}
        disabled={state === "loading"}
        aria-pressed={shown}
        aria-label={shown ? t("users.sheet.hideAccount") : t("users.sheet.showAccount")}
        title={shown ? t("users.sheet.hideAccount") : t("users.sheet.showAccount")}
        className="ml-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md align-middle text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {state === "loading" ? (
          <Loader2 size={16} className="animate-spin" aria-hidden />
        ) : shown ? (
          <EyeOff size={16} aria-hidden />
        ) : (
          <Eye size={16} aria-hidden />
        )}
      </button>
    </InfoRow>
  );
}

/** A plain note where a list would be (nothing to show). */
export function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/** Read-only side sheet about one user: a list of detail rows grouped into
 *  accordion sections (all open at first) with a divider between sections.
 *  Trainer-only sections appear only for trainers. */
export function UserSheet({
  open,
  onOpenChange,
  detail,
  loading,
  error,
  onRetry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: AdminUserDetail | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation("admin");
  const locale = useLocale();

  const date = (iso: string | null | undefined) =>
    iso
      ? formatInAppTimeZone(iso, locale, { year: "numeric", month: "short", day: "numeric" })
      : "—";
  const dateTime = (iso: string | null | undefined) =>
    iso
      ? formatInAppTimeZone(iso, locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "—";
  const text = (v: string | number | null | undefined) =>
    v === null || v === undefined || v === "" ? "—" : String(v);
  /** A translated value when the key is known, else the raw value. */
  const named = (group: string, v: string | null | undefined) =>
    v ? t(`users.sheet.${group}.${v}`, { defaultValue: v }) : "—";
  const activityName = (slug: string | null) =>
    slug ? (ACTIVITY_META[slug as ActivitySlug]?.[locale] ?? slug) : "—";
  const f = (key: string) => t(`users.sheet.fields.${key}`);
  const s = (key: string) => t(`users.sheet.stats.${key}`);

  function sections(d: AdminUserDetail): AccordionItem[] {
    const items: AccordionItem[] = [
      {
        id: "account",
        title: t("users.sheet.sections.account"),
        children: (
          <div className="space-y-2">
            <InfoRow icon={User} label={f("role")}>
              <span className="inline-flex flex-wrap items-center gap-1 align-middle">
                {d.is_admin && <StatusBadge tone="info">{t("roleAdmin")}</StatusBadge>}
                {d.is_companion && <StatusBadge tone="success">{t("roleTrainer")}</StatusBadge>}
                {!d.is_admin && !d.is_companion && (
                  <StatusBadge tone="muted" dot={false}>
                    {t("roleMember")}
                  </StatusBadge>
                )}
              </span>
            </InfoRow>
            <InfoRow icon={Mail} label={f("email")}>
              {text(d.email)}{" "}
              <StatusBadge tone={d.email_confirmed ? "success" : "warning"} className="ml-1 align-middle">
                {d.email_confirmed ? t("users.sheet.verified") : t("users.sheet.unverified")}
              </StatusBadge>
            </InfoRow>
            <InfoRow icon={CalendarDays} label={f("joined")}>{date(d.created_at)}</InfoRow>
            <InfoRow icon={Clock} label={f("lastSignIn")}>{dateTime(d.last_sign_in_at)}</InfoRow>
            <InfoRow icon={Clock} label={f("updated")}>{dateTime(d.updated_at)}</InfoRow>
          </div>
        ),
      },
      {
        id: "profile",
        title: t("users.sheet.sections.profile"),
        children: (
          <div className="space-y-2">
            {d.profile.bio && <InfoRow icon={FileText} label={f("bio")}>{d.profile.bio}</InfoRow>}
            <InfoRow icon={UserCheck} label={f("gender")}>{named("gender", d.profile.gender)}</InfoRow>
            <InfoRow icon={Hash} label={f("age")}>{text(d.profile.age)}</InfoRow>
            <InfoRow icon={MapPin} label={f("homeArea")}>{text(d.profile.home_area)}</InfoRow>
            <InfoRow icon={Languages} label={f("language")}>{named("language", d.profile.locale)}</InfoRow>
            <InfoRow icon={Award} label={f("experience")}>
              {named("experience", d.profile.experience_level)}
            </InfoRow>
            <InfoRow icon={Target} label={f("weeklyTarget")}>{text(d.profile.weekly_target)}</InfoRow>
            <InfoRow icon={ClipboardCheck} label={f("profileSetup")}>
              {named("setup", d.setup.profile_setup_status ?? "notShown")}
            </InfoRow>
            <InfoRow icon={CircleCheck} label={f("onboarding")}>
              {d.setup.onboarding_completed ? t("users.sheet.yes") : t("users.sheet.no")}
            </InfoRow>
          </div>
        ),
      },
      {
        id: "fitness",
        title: t("users.sheet.sections.fitness"),
        children: (
          <div className="space-y-2">
            <InfoRow icon={Dumbbell} label={f("mainActivity")}>
              {named("activity", d.fitness.primary_activity)}
            </InfoRow>
            <InfoRow icon={Target} label={f("goal")}>{named("goal", d.fitness.goal)}</InfoRow>
            <InfoRow icon={Award} label={f("fitnessLevel")}>
              {named("experience", d.fitness.experience)}
            </InfoRow>
          </div>
        ),
      },
      {
        id: "activity",
        title: t("users.sheet.sections.activity"),
        children: (
          <div className="space-y-2">
            <InfoRow icon={CalendarCheck} label={s("bookingsMade")}>
              {formatCount(d.activity.bookings_made)}
            </InfoRow>
            <InfoRow icon={CalendarDays} label={s("bookingsReceived")}>
              {formatCount(d.activity.bookings_received)}
            </InfoRow>
            <InfoRow icon={Star} label={s("reviewsGiven")}>
              {formatCount(d.activity.reviews_given)}
            </InfoRow>
            <InfoRow icon={Bookmark} label={s("savedTrainers")}>
              {formatCount(d.activity.saved_trainers)}
            </InfoRow>
          </div>
        ),
      },
      {
        id: "safety",
        title: t("users.sheet.sections.safety"),
        children: (
          <div className="space-y-2">
            <InfoRow icon={UserX} label={s("blockedByThem")}>{formatCount(d.safety.blocked_by_me)}</InfoRow>
            <InfoRow icon={UserX} label={s("blockedThem")}>{formatCount(d.safety.blocked_me)}</InfoRow>
            <InfoRow icon={Flag} label={s("reportsFiled")}>{formatCount(d.safety.reports_filed)}</InfoRow>
            <InfoRow icon={Flag} label={s("reportsReceived")}>
              {formatCount(d.safety.reports_received)}
            </InfoRow>
            {d.safety.consents.length === 0 ? (
              <EmptyRow>{t("users.sheet.noConsents")}</EmptyRow>
            ) : (
              d.safety.consents.map((c) => (
                <InfoRow
                  key={`${c.document}-${c.version}`}
                  icon={FileText}
                  label={named("document", c.document)}
                >
                  {t("users.sheet.consentValue", { version: c.version, date: date(c.accepted_at) })}
                </InfoRow>
              ))
            )}
          </div>
        ),
      },
    ];

    if (d.trainer) {
      const { listing, verifications, money } = d.trainer;
      items.push(
        {
          id: "listing",
          title: t("users.sheet.sections.listing"),
          children: listing ? (
            <div className="space-y-2">
              <InfoRow icon={Megaphone} label={f("headline")}>{text(listing.headline)}</InfoRow>
              <InfoRow icon={MapPin} label={f("servedArea")}>{text(listing.served_area)}</InfoRow>
              <InfoRow icon={Radio} label={f("listingStatus")}>
                <StatusBadge tone={LISTING_TONE[listing.status] ?? "muted"} className="align-middle">
                  {t(`users.sheet.listingStatus.${listing.status}`)}
                </StatusBadge>
              </InfoRow>
              <InfoRow icon={Star} label={f("rating")}>
                {listing.rating_count > 0
                  ? t("users.sheet.ratingValue", {
                      avg: listing.rating_avg.toFixed(1),
                      count: listing.rating_count,
                    })
                  : t("users.sheet.noReviews")}
              </InfoRow>
              {listing.offerings.length === 0 ? (
                <EmptyRow>{t("users.sheet.noOfferings")}</EmptyRow>
              ) : (
                listing.offerings.map((o, i) => (
                  <InfoRow
                    key={i}
                    icon={Dumbbell}
                    label={`${activityName(o.activity)} · ${TIER_LABELS[o.tier as Tier]?.[locale] ?? o.tier}`}
                  >
                    {o.is_free ? t("users.sheet.free") : ntd(o.price_ntd)}
                    {" · "}
                    {t("users.sheet.minutes", { count: o.session_minutes })}
                  </InfoRow>
                ))
              )}
            </div>
          ) : (
            <EmptyRow>{t("users.sheet.noListing")}</EmptyRow>
          ),
        },
        {
          id: "verifications",
          title: t("users.sheet.sections.verifications"),
          children: (
            <div className="space-y-2">
              {verifications.length === 0 ? (
                <EmptyRow>{t("users.sheet.noVerifications")}</EmptyRow>
              ) : (
                verifications.map((v) => (
                  <InfoRow
                    key={v.id}
                    icon={BadgeCheck}
                    label={`${t(`docType.${v.doc_type}`, { defaultValue: v.doc_type })} · ${activityName(v.activity)}`}
                  >
                    <StatusBadge tone={VERIFICATION_TONE[v.status] ?? "muted"} className="mr-1.5 align-middle">
                      {t(v.status)}
                    </StatusBadge>
                    {t("users.sheet.submittedOn", { date: date(v.created_at) })}
                  </InfoRow>
                ))
              )}
            </div>
          ),
        },
        {
          id: "earnings",
          title: t("users.sheet.sections.earnings"),
          children: (
            <div className="space-y-2">
              <InfoRow icon={Wallet} label={s("available")}>{ntd(money.available_balance)}</InfoRow>
              <InfoRow icon={Clock} label={s("openWithdrawals")}>
                {t("users.sheet.openWithdrawalsValue", {
                  count: money.open_withdrawals_count,
                  amount: ntd(money.open_withdrawals_sum),
                })}
              </InfoRow>
              <InfoRow icon={Banknote} label={s("paidOut")}>{ntd(money.total_paid_out)}</InfoRow>
              <InfoRow icon={ClipboardCheck} label={s("ordersCompleted")}>
                {formatCount(money.completed_orders)}
              </InfoRow>
              <InfoRow icon={Hash} label={f("bankCode")}>{text(money.bank_code)}</InfoRow>
              <InfoRow icon={Landmark} label={f("bank")}>{text(money.bank_name)}</InfoRow>
              <InfoRow icon={MapPin} label={f("branch")}>{text(money.branch_name)}</InfoRow>
              <InfoRow icon={User} label={f("accountHolder")}>{text(money.bank_account_holder)}</InfoRow>
              <BankAccountRow
                userId={d.id}
                mask={money.bank_account_mask}
                hasAccount={Boolean(money.has_bank_account || money.bank_account_mask)}
                label={f("account")}
              />
            </div>
          ),
        },
      );
    }
    return items;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* The X is centred on the two-line header (24px padding + 48px of text). */}
      <SheetContent side="right" className="w-full sm:max-w-xl" closeClassName="right-6 top-[35px]">
        <SheetHeader className="gap-0 px-6 pb-2 pr-16 pt-6">
          <SheetTitle className="truncate leading-7">
            {detail ? detail.display_name : t("users.sheet.title")}
          </SheetTitle>
          <SheetDescription className="truncate leading-5">
            {detail ? text(detail.email) : " "}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && !detail ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error && !detail ? (
            <div className="space-y-3 text-sm">
              <p className="text-destructive">{t("users.sheet.loadError")}</p>
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                {t("users.sheet.retry")}
              </Button>
            </div>
          ) : detail ? (
            // Keyed by user so a different user starts with every section open again.
            <Accordion key={detail.id} items={sections(detail)} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
