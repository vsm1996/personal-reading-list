import { AddBookModal } from "@/components/library/add-book-modal";
import { CreateShelfModal } from "@/components/library/create-shelf-modal";
import { RenameShelfModal } from "@/components/library/rename-shelf-modal";
import { DeleteShelfModal } from "@/components/library/delete-shelf-modal";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { GuestBanner } from "@/components/auth/guest-banner";
import { ShelfNav } from "@/components/nav/shelf-nav";
import { MobileSidebar } from "@/components/nav/mobile-sidebar";
import { MobileHeader } from "@/components/nav/mobile-header";
import { getAuthenticatedUser } from "@/lib/data/user";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");

  const isAnonymous =
    user.is_anonymous === true ||
    user.app_metadata?.provider === "anonymous";

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      {/* Guest reminder — shown above everything when using a guest account */}
      <GuestBanner isAnonymous={isAnonymous} />

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-[var(--spacing-sidebar)] shrink-0 flex-col border-r border-border bg-bg-secondary lg:flex">
          <div className="p-6">
            <span className="font-heading text-lg font-semibold text-text-primary">
              Bookshelf
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <ShelfNav userId={user.id} />
          </div>

          <div className="border-t border-border p-4">
            <p className="mb-3 truncate text-xs text-text-tertiary">
              {user.email ?? "Guest"}
            </p>
            <SignOutButton className="w-full rounded-md px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary" />
          </div>
        </aside>

        {/* Mobile sidebar drawer */}
        <MobileSidebar>
          <ShelfNav userId={user.id} />
          <div className="border-t border-border p-4">
            <p className="mb-3 truncate text-xs text-text-tertiary">
              {user.email ?? "Guest"}
            </p>
            <SignOutButton className="w-full rounded-md px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary" />
          </div>
        </MobileSidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>

      {/* Global modals */}
      <AddBookModal />
      <CreateShelfModal />
      <RenameShelfModal />
      <DeleteShelfModal />
    </div>
  );
}
