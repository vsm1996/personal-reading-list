import { AddBookModal } from "@/components/library/add-book-modal";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

        {/* TODO: ShelfNav */}
        <nav className="flex-1 px-3" />

        <div className="border-t border-[var(--color-border)] p-4">
          <p className="mb-3 truncate text-xs text-[var(--color-text-tertiary)]">
            {user.email}
          </p>
          <SignOutButton className="w-full rounded-md px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]" />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>

      {/* Global modals — rendered outside the layout flow */}
      <AddBookModal />
    </div>
  );
}
