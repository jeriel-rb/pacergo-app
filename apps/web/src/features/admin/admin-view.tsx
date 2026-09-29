"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight, FileText, Loader2, ShieldOff, ShieldCheck, X } from "lucide-react";
import {
  ACTIVITY_META,
  isExperienceQualified,
  type ActivitySlug,
} from "@pacergo/shared";
import type { AdminUsersPage, AdminUser, AdminVerification } from "@/lib/admin";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { SearchInput } from "@/shared/components/ui/search-input";
import { useToast } from "@/shared/components/ui/toast";
import { useLocale } from "@/shared/hooks/use-locale";
import { cn } from "@/lib/utils";
import {
  fetchUsersPage,
  getCertSignedUrl,
  reviewVerification,
  setUserAdmin,
} from "./admin-actions";

const MEMBERS_PAGE_SIZE = 20;

type Tab = "verifications" | "members";

/** Admin console: verification review queue + member management. */
export function AdminView({
  queue,
  usersPage,
}: {
  queue: AdminVerification[];
  usersPage: AdminUsersPage;
}) {
  const { t } = useTranslation("admin");
  const [tab, setTab] = useState<Tab>("verifications");
  const pending = queue.filter((v) => v.status === "pending");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <TabButton
          active={tab === "verifications"}
          onClick={() => setTab("verifications")}
        >
          {t("tabVerifications")} ({pending.length})
        </TabButton>
        <TabButton active={tab === "members"} onClick={() => setTab("members")}>
          {t("tabMembers")} ({usersPage.total})
        </TabButton>
      </div>

      {tab === "verifications" ? (
        <VerificationsPanel queue={queue} />
      ) : (
        <MembersPanel initial={usersPage} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function VerificationsPanel({ queue }: { queue: AdminVerification[] }) {
  const { t } = useTranslation("admin");
  const pending = queue.filter((v) => v.status === "pending");
  const reviewed = queue.filter((v) => v.status !== "pending");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t("pendingTitle")} ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">{t("empty")}</Card>
        ) : (
          pending.map((v) => <Row key={v.id} v={v} />)
        )}
      </section>

      {reviewed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {t("historyTitle")} ({reviewed.length})
          </h2>
          {reviewed.map((v) => (
            <Row key={v.id} v={v} />
          ))}
        </section>
      )}
    </div>
  );
}

function MembersPanel({ initial }: { initial: AdminUsersPage }) {
  const { t } = useTranslation("admin");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  const pageCount = Math.max(1, Math.ceil(data.total / MEMBERS_PAGE_SIZE));

  async function load(nextPage: number, nextSearch: string) {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUsersPage(nextPage, nextSearch);
      if (id !== requestId.current) return; // a newer request already landed
      setData(result);
      setPage(nextPage);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  function goTo(next: number) {
    if (next < 0 || next >= pageCount || next === page) return;
    load(next, search);
  }

  function onSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(0, value);
    }, 300);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function onRoleChanged(userId: string, isAdmin: boolean) {
    setData((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId ? { ...u, is_admin: isAdmin } : u,
      ),
    }));
  }

  return (
    <section className="space-y-3">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder={t("searchMembers")}
        aria-label={t("searchMembers")}
        clearLabel={t("clearSearch")}
      />

      {data.total === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground">
          {search ? t("noSearchResults") : t("noMembers")}
        </Card>
      ) : (
        <>
          <div className={cn("space-y-3", loading && "opacity-60")}>
            {data.users.map((u) => (
              <MemberRow key={u.id} user={u} onRoleChanged={onRoleChanged} />
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {pageCount > 1 && (
            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goTo(page - 1)}
                disabled={loading || page === 0}
                className="gap-1"
              >
                <ChevronLeft size={16} />
                {t("prevPage")}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t("pageOf", { page: page + 1, total: pageCount })}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goTo(page + 1)}
                disabled={loading || page >= pageCount - 1}
                className="gap-1"
              >
                {t("nextPage")}
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function MemberRow({
  user,
  onRoleChanged,
}: {
  user: AdminUser;
  onRoleChanged: (userId: string, isAdmin: boolean) => void;
}) {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleAdmin() {
    setBusy(true);
    setError(null);
    try {
      const next = !user.is_admin;
      await setUserAdmin(user.id, next);
      onRoleChanged(user.id, next);
      toast.show(
        t(next ? "toast.madeAdmin" : "toast.revokedAdmin", {
          name: user.display_name,
        }),
        "success",
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : t("error");
      setError(message);
      toast.show(t("toast.roleUpdateFailed"), "destructive");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center gap-3">
        <InitialAvatar name={user.display_name} src={user.photo_url} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{user.display_name}</p>
            <RoleBadge
              label={t("roleAdmin")}
              active={user.is_admin}
              tone="admin"
            />
            <RoleBadge
              label={t("roleTrainer")}
              active={user.is_companion}
              tone="trainer"
            />
            {!user.is_admin && !user.is_companion && (
              <RoleBadge label={t("roleMember")} active tone="member" />
            )}
          </div>
          {user.email && (
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        variant="outline"
        onClick={toggleAdmin}
        disabled={busy}
        className={cn(
          "w-full justify-center gap-2",
          user.is_admin && "text-destructive hover:bg-destructive/10 hover:text-destructive",
        )}
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : user.is_admin ? (
          <ShieldOff size={16} />
        ) : (
          <ShieldCheck size={16} />
        )}
        {user.is_admin ? t("revokeAdmin") : t("makeAdmin")}
      </Button>
    </Card>
  );
}

function RoleBadge({
  label,
  active,
  tone,
}: {
  label: string;
  active: boolean;
  tone: "admin" | "trainer" | "member";
}) {
  if (!active) return null;
  const cls =
    tone === "admin"
      ? "bg-primary/15 text-primary"
      : tone === "trainer"
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
        cls,
      )}
    >
      {label}
    </span>
  );
}

function Row({ v }: { v: AdminVerification }) {
  const { t } = useTranslation("admin");
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const activityLabel = v.activity
    ? ACTIVITY_META[v.activity as ActivitySlug]?.[locale] ?? v.activity
    : null;
  const [notes, setNotes] = useState(v.notes ?? "");
  const [busy, setBusy] = useState<"approve" | "reject" | "doc" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPending = v.status === "pending";

  // Review is the only enforcement point for document kind, so spell out the
  // per-activity bar: gym-style activities need a coaching licence, while
  // accompaniment activities accept experience proof instead.
  const reviewBarKey =
    v.doc_type === "competition"
      ? "expected.competition"
      : v.doc_type === "certification" && v.activity
        ? isExperienceQualified(v.activity)
          ? "expected.experience"
          : "expected.coachCert"
        : null;

  async function openDoc() {
    setBusy("doc");
    setError(null);
    try {
      const url = await getCertSignedUrl(v.document_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError(t("docError"));
    } finally {
      setBusy(null);
    }
  }

  async function decide(status: "approved" | "rejected") {
    setBusy(status === "approved" ? "approve" : "reject");
    setError(null);
    try {
      await reviewVerification(v.id, status, notes.trim());
      toast.show(
        t(status === "approved" ? "toast.verificationApproved" : "toast.verificationRejected"),
        "success",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
      toast.show(t("toast.verificationUpdateFailed"), "destructive");
      setBusy(null);
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-3">
        <InitialAvatar name={v.display_name} src={v.photo_url} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{v.display_name}</p>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {t(`docType.${v.doc_type}`, { defaultValue: v.doc_type })}
            </span>
            {activityLabel && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {activityLabel}
              </span>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {v.label || t("noLabel")}
          </p>
        </div>
        <StatusBadge status={v.status} />
      </div>

      <p className="text-xs text-muted-foreground">
        {t("submitted", {
          date: new Date(v.created_at).toLocaleDateString(),
        })}
      </p>

      {isPending && reviewBarKey && (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          {t(reviewBarKey)}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={openDoc}
        disabled={busy !== null}
        className="w-full justify-start gap-2"
      >
        {busy === "doc" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <FileText size={16} />
        )}
        {t("viewDoc")}
      </Button>

      {isPending && (
        <>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("notesPlaceholder")}
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => decide("approved")}
              disabled={busy !== null}
              className="flex-1 gap-2"
            >
              {busy === "approve" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              {t("approve")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => decide("rejected")}
              disabled={busy !== null}
              className="flex-1 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {busy === "reject" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <X size={16} />
              )}
              {t("reject")}
            </Button>
          </div>
        </>
      )}

      {!isPending && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </Card>
  );
}

function StatusBadge({ status }: { status: AdminVerification["status"] }) {
  const { t } = useTranslation("admin");
  const cls =
    status === "approved"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "rejected"
        ? "bg-destructive/15 text-destructive"
        : "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
        cls,
      )}
    >
      {t(status)}
    </span>
  );
}
