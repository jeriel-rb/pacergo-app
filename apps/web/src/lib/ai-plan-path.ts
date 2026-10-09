const SECTION = "ai-plan";

function segmentsOf(pathname: string): string[] {
  const query = pathname.indexOf("?");
  const hash = pathname.indexOf("#");
  const cut = query === -1 ? hash : hash === -1 ? query : Math.min(query, hash);
  const path = cut === -1 ? pathname : pathname.slice(0, cut);
  return path.split("/").filter((part) => part.length > 0);
}

function locate(pathname: string): { prefix: string[]; rest: string[] } {
  const parts = segmentsOf(pathname);
  const at = parts.indexOf(SECTION);
  if (at === -1) return { prefix: [], rest: [] };
  return { prefix: parts.slice(0, at + 1), rest: parts.slice(at + 1) };
}

function join(parts: string[]): string {
  return `/${parts.join("/")}`;
}

export function aiPlanRoot(pathname: string): string {
  const { prefix } = locate(pathname);
  return prefix.length === 0 ? `/${SECTION}` : join(prefix);
}

export function aiPlanHref(pathname: string, tail: string): string {
  const path = tail.startsWith("/") ? tail : `/${tail}`;
  return `${aiPlanRoot(pathname)}${path}`;
}

export function planOverviewHref(pathname: string): string {
  const { prefix, rest } = locate(pathname);
  const [page, id, child] = rest;
  if (prefix.length === 0 || page !== "plan" || !id || child !== "update" || rest.length !== 3) {
    return pathname;
  }
  return join([...prefix, "plan", id]);
}

export function workoutOverviewHref(pathname: string): string {
  const { prefix, rest } = locate(pathname);
  const [page, id, day, dayIndex] = rest;
  if (prefix.length === 0 || page !== "plan" || !id || day !== "day" || dayIndex === undefined || rest.length !== 4) {
    return pathname;
  }
  return join([...prefix, "plan", id]);
}

export function workoutDayHref(pathname: string): string {
  const { prefix, rest } = locate(pathname);
  const [page, id, day, dayIndex, exercise, slug] = rest;
  if (
    prefix.length === 0 ||
    page !== "plan" ||
    !id ||
    day !== "day" ||
    dayIndex === undefined ||
    exercise !== "exercise" ||
    slug === undefined ||
    rest.length !== 6
  ) {
    return pathname;
  }
  return join([...prefix, "plan", id, "day", dayIndex]);
}
