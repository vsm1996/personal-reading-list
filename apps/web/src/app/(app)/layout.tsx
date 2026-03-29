import { AddBookModal } from "@/components/library/add-book-modal";
import { CreateShelfModal } from "@/components/library/create-shelf-modal";
import { RenameShelfModal } from "@/components/library/rename-shelf-modal";
import { DeleteShelfModal } from "@/components/library/delete-shelf-modal";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ShelfNav } from "@/components/nav/shelf-nav";
import { getAuthenticatedUser } from "@/lib/data/user";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cached — layout + any child page calling getAuthenticatedUser() share one Supabase call
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-primary)]">
      {/* Sidebar */}
      <aside className="hidden w-[var(--spacing-sidebar)] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] lg:flex">
        <div className="p-6">
          <span className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">
            Bookshelf
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ShelfNav is a Server Component — shares the getUserShelves() cache with the library page */}
          <ShelfNav userId={user.id} />
        </div>

        <div className="border-t border-[var(--color-border)] p-4">
          <p className="mb-3 truncate text-xs text-[var(--color-text-tertiary)]">
            {user.email}
          </p>
          <SignOutButton className="w-full rounded-md px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]" />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>

      {/* Global modals — rendered outside the layout flow so they overlay everything */}
      <AddBookModal />
      <CreateShelfModal />
      <RenameShelfModal />
      <DeleteShelfModal />
    </div>
  );
}
