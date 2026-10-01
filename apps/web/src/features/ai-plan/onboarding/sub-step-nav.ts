"use client";

import { usePathname, useRouter } from "next/navigation";

/** Path-string navigation shared by every onboarding sub-wizard (About You,
 *  Training Preferences): derived purely from the current pathname (works
 *  for both the unprefixed default locale and the `/en` prefix — see
 *  i18nConfig.prefixDefault), since every step lives one segment below the
 *  same `.../ai-plan/<flow>` parent. The setup hub ("Let's Get Started") is
 *  `.../ai-plan/setup` — `.../ai-plan` itself opens the user's active plan.
 *
 *  `skip` marks steps that aren't reachable given the current answers (e.g.
 *  a muscle-picker step when the preceding yes/no question was "No") —
 *  `goNext`/`goBack` step over them automatically; `total`/`index` (used for
 *  the progress bar) still count the full fixed step list, skipped or not.
 *
 *  `finishSuffix` sends `goNext()` (or the explicit `goToFinish()`) from the
 *  last step to `.../ai-plan/<finishSuffix>` instead of the hub — for a flow
 *  whose last step hands off to a follow-up screen that's a sibling of the
 *  flow's own folder (e.g. Gym & Equipment → `.../ai-plan/recommended-split`)
 *  rather than returning straight to "Let's Get Started".
 *
 *  Caution: `skip` reads answer state from the render that produced this
 *  hook instance. A screen that sets an answer and calls `goNext()` in the
 *  very same click handler (no re-render in between) will see the *old*
 *  value — `goNext()` isn't safe there. Use `goToStep()`/`goToFinish()`
 *  instead when the handler already knows the destination outright (e.g.
 *  "Yes"/"Not Now" both setting an answer and navigating in one click). */
export function useSubStepNav<T extends string>(
  steps: readonly T[],
  options?: { skip?: (step: T, index: number) => boolean; finishSuffix?: string },
) {
  const pathname = usePathname();
  const router = useRouter();

  const segments = pathname.split("/");
  const step = segments[segments.length - 1] as T;
  const basePath = segments.slice(0, -1).join("/"); // ".../ai-plan/<flow>"
  const rootPath = segments.slice(0, -2).join("/"); // ".../ai-plan"
  const hubPath = `${rootPath}/setup`;

  const index = Math.max(0, steps.indexOf(step));
  const total = steps.length;

  function nextVisible(from: number, dir: 1 | -1): number {
    let i = from + dir;
    while (i >= 0 && i < steps.length && options?.skip?.(steps[i], i)) i += dir;
    return i;
  }

  function goToStep(target: T) {
    router.push(`${basePath}/${target}`);
  }

  function goBack() {
    const prev = nextVisible(index, -1);
    router.push(prev < 0 ? hubPath : `${basePath}/${steps[prev]}`);
  }

  function goToFinish() {
    router.push(options?.finishSuffix ? `${rootPath}/${options.finishSuffix}` : hubPath);
  }

  function goNext() {
    const next = nextVisible(index, 1);
    if (next < steps.length) {
      router.push(`${basePath}/${steps[next]}`);
    } else {
      goToFinish();
    }
  }

  return { step, index, total, basePath, rootPath, hubPath, goToStep, goToFinish, goBack, goNext };
}
