import { redirectLocalized } from "@/lib/locale-redirect";

type AdminVerificationsParams = { params: Promise<{ locale: string }> };

/** Legacy path — trainer requests live at `/admin`. */
export default async function AdminVerificationsPage({
  params,
}: AdminVerificationsParams) {
  const { locale } = await params;
  redirectLocalized("/admin", locale);
}
