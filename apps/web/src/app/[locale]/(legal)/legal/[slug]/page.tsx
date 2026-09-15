import { notFound } from "next/navigation";
import { isConsentSlug } from "@/lib/consent";
import { LegalDocumentView } from "@/features/legal/legal-document-view";

// One route serves all four documents (A-10: Terms, Privacy, risk disclosure,
// partner conduct rules) rather than four near-identical page files — the
// only thing that differs between them is which slug's i18n copy is shown.
type Params = { params: Promise<{ slug: string }> };

export default async function LegalDocumentPage({ params }: Params) {
  const { slug } = await params;
  if (!isConsentSlug(slug)) notFound();

  return <LegalDocumentView slug={slug} />;
}
