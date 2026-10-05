"use client";

import { ShieldCheck, UserCheck, Users, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AdminDashboardStats, AdminVerification, PayoutListRow } from "@/lib/admin";
import { StatCard } from "@/shared/components/atoms/stat-card";
import { formatCount, ntd } from "./dashboard-parts";

/** The four headline cards, two per row: users, trainers, requests, payouts. */
export function DashboardStats({
  stats,
  totalUsers,
  queue,
  payouts,
}: {
  stats: AdminDashboardStats | null;
  /** Fallback when the stats RPC isn't available. */
  totalUsers: number;
  queue: AdminVerification[];
  payouts: PayoutListRow[];
}) {
  const { t } = useTranslation("admin");
  const pending = queue.filter((v) => v.status === "pending").length;
  const approved = queue.filter((v) => v.status === "approved").length;
  const rejected = queue.filter((v) => v.status === "rejected").length;
  const open = payouts.filter((r) => r.status === "requested" || r.status === "processing");
  const openSum = open.reduce((acc, r) => acc + r.amount, 0);

  const users = stats?.total_users ?? totalUsers;
  const trainers = stats?.total_trainers ?? null;
  const share = trainers !== null && users > 0 ? Math.round((trainers / users) * 100) : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard
        title={t("dashboard.stats.totalUsers")}
        value={formatCount(users)}
        sub={stats ? t("dashboard.stats.newUsers", { count: stats.new_users_30d }) : undefined}
        subTone={stats && stats.new_users_30d > 0 ? "success" : "default"}
        icon={Users}
      />
      <StatCard
        title={t("dashboard.stats.trainers")}
        value={trainers === null ? "—" : formatCount(trainers)}
        sub={share === null ? undefined : t("dashboard.stats.trainersShare", { percent: share })}
        icon={UserCheck}
      />
      <StatCard
        title={t("dashboard.stats.pendingRequests")}
        value={formatCount(pending)}
        sub={t("dashboard.stats.requestsBreakdown", { approved, rejected })}
        subTone={pending > 0 ? "warning" : "default"}
        icon={ShieldCheck}
      />
      <StatCard
        title={t("dashboard.stats.openPayouts")}
        value={ntd(openSum)}
        sub={t("dashboard.stats.openPayoutsSub", { count: open.length })}
        subTone={open.length > 0 ? "warning" : "default"}
        icon={Wallet}
      />
    </div>
  );
}
