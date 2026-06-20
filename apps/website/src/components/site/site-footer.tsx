import { Wordmark } from "./wordmark";

const COLUMNS = [
  {
    heading: "Product",
    links: ["How it works", "Tiers & pricing", "Trust & safety", "For companions"],
  },
  {
    heading: "Company",
    links: ["About", "Careers", "Press", "Contact"],
  },
  {
    heading: "Legal",
    links: ["Privacy", "Terms", "Community guidelines", "Cookies"],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark className="text-lg text-ink" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/55">
              Find an in-person workout companion in Taiwan — from certified pros
              to training buddies.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink/45">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-ink/65 transition-colors hover:text-brand"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-ink/10 pt-6 text-xs text-ink/45 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Pacergo. Made in Taiwan.</p>
          <p className="font-mono uppercase tracking-[0.16em]">Set the pace · Never train alone</p>
        </div>
      </div>
    </footer>
  );
}
