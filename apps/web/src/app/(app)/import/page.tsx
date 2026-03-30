import { GoodreadsImporter } from "@/components/import/goodreads-importer";
import { getAuthenticatedUser } from "@/lib/data/user";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Import from Goodreads" };

export default async function ImportPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");
  return (
    <div className="page-enter mx-auto max-w-[var(--container-content)] px-6 py-8">
      <h1 className="mb-2 font-heading text-2xl font-semibold text-[var(--color-text-primary)]">
        Import from Goodreads
      </h1>
      <p className="mb-8 text-sm text-[var(--color-text-secondary)]">
        Export your Goodreads library as a CSV and upload it here. Books already in your library will be skipped.
      </p>
      <GoodreadsImporter />
    </div>
  );
}
