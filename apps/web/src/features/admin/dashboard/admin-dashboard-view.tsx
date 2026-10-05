"use client";

import { useTranslation } from "react-i18next";
import type {
  AdminDashboardStats,
  AdminUsersPage,
  AdminVerification,
  PayoutList,
} from "@/lib/admin";
import { DashboardCard } from "./dashboard-parts";
import { DashboardStats } from "./dashboard-stats";
import { PayoutsCard } from "./payouts-card";
import { TrainerRequestsCard } from "./trainer-requests-card";
import { UsersTable } from "./users-table";

/** Admin console landing page.
 *
 *  - lg and up (desktops, laptops, landscape tablets): exactly the viewport
 *    height — the page itself never scrolls. A 24-column grid puts the KPI cards
 *    and the users table on the left and trainer requests + payouts stacked on
 *    the right. The table shows as many rows as fit (paged, never scrolling) and
 *    the side lists scroll inside their cards.
 *  - md (portrait tablets): one column, with the two side cards next to each
 *    other; the page scrolls.
 *  - below md (phones): one column, everything stacked; the page scrolls. */
export function AdminDashboardView({
  stats,
  queue,
  usersPage,
  payouts,
}: {
  stats: AdminDashboardStats | null;
  queue: AdminVerification[];
  usersPage: AdminUsersPage;
  payouts: PayoutList;
}) {
  const { t } = useTranslation("admin");

  return (
    <div className="flex flex-col gap-4 lg:h-full">
      <h1 className="text-2xl font-bold lg:text-3xl">{t("dashboard.title")}</h1>

      <div className="grid grid-cols-1 gap-4 lg:min-h-[480px] lg:flex-1 lg:grid-cols-24 lg:items-stretch">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-14 lg:h-full lg:min-h-0 xl:col-span-16">
          <DashboardStats
            stats={stats}
            totalUsers={usersPage.total}
            queue={queue}
            payouts={payouts.rows}
          />
          <DashboardCard
            title={t("dashboard.users.title")}
            description={t("dashboard.users.subtitle")}
            className="lg:min-h-0 lg:flex-1"
          >
            <UsersTable initial={usersPage} />
          </DashboardCard>
        </div>

        {/* On lg+ the side cards fill exactly the height of the left column. */}
        <div className="min-w-0 lg:relative lg:col-span-10 lg:h-full lg:min-h-0 xl:col-span-8">
          <div className="grid gap-4 md:grid-cols-2 md:items-start lg:absolute lg:inset-0 lg:flex lg:flex-col lg:items-stretch">
            <TrainerRequestsCard queue={queue} className="lg:min-h-0 lg:flex-1" />
            <PayoutsCard rows={payouts.rows} className="lg:min-h-0 lg:flex-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
