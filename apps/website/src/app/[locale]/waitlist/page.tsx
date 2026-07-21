import { redirect } from "next/navigation";
import { getWebAppSignInUrl } from "@/lib/web-app-links";

export default function LegacyWaitlistPage() {
  redirect(getWebAppSignInUrl("legacy_waitlist"));
}
