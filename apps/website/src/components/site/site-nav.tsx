import Link from "next/link";
import { Wordmark } from "./wordmark";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#tiers", label: "Tiers" },
  { href: "#safety", label: "Safety" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-ink/8 bg-paper/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="#top" className="text-lg text-ink" aria-label="Pacergo home">
            <Wordmark />
          </Link>

          <div className="hidden items-center gap-9 md:flex">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-ink/65 transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#waitlist"
              className="hidden text-sm font-medium text-ink/65 transition-colors hover:text-ink sm:inline"
            >
              Sign in
            </a>
            <a
              href="#waitlist"
              className="inline-flex h-9 items-center rounded-[var(--radius)] bg-ink px-4 text-sm font-semibold text-paper transition-transform hover:-translate-y-px"
            >
              Join the waitlist
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
