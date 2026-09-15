/** Minimal shell for legal/consent pages (A-10). Deliberately outside
 *  `(tabs)` — these must be readable pre-sign-up, so they skip the app's
 *  nav/tab chrome (which assumes an authenticated product user) and use the
 *  same plain centered-content shell style as `(auth)`. */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 py-10 sm:px-6">
      {children}
    </div>
  );
}
