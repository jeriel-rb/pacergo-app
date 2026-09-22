"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

/** Stand-in for an About You step that no longer exists. Old links and drafts
 *  that still point at it are moved on to `to` (a sibling step). Works with or
 *  without the locale prefix because it edits the current path, like the step
 *  navigation does. */
export function RetiredStepRedirect({ to }: { to: string }) {
  const pathname = usePathname();
  const router = useRouter();
  React.useEffect(() => {
    router.replace(`${pathname.split("/").slice(0, -1).join("/")}/${to}`);
  }, [pathname, router, to]);
  return null;
}
