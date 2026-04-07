import { NavLink } from "@/components/nav/nav-link";
import { getUserShelves } from "@/lib/data/shelves";
import { BookOpen, Library, Star, Target, Upload } from "lucide-react";

type Props = { userId: string };

const LINK_BASE =
  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary";
const LINK_ACTIVE =
  "bg-bg-tertiary text-text-primary font-medium";

/**
 * Server Component sidebar nav.
 *
 * Shelf list comes from getUserShelves() which is React cache()-wrapped, so if
 * the library page is rendered in the same pass it reuses the same query result.
 */
export async function ShelfNav({ userId }: Props) {
  const shelves = await getUserShelves(userId);

  return (
    <nav className="flex flex-col gap-6 px-3 py-2">
      {/* Primary links */}
      <ul className="flex flex-col gap-0.5 list-none">
        <li>
          <NavLink href="/library" className={LINK_BASE} activeClassName={LINK_ACTIVE}>
            <Library size={15} />
            Library
          </NavLink>
        </li>
        <li>
          <NavLink href="/goals" className={LINK_BASE} activeClassName={LINK_ACTIVE}>
            <Target size={15} />
            Reading Goals
          </NavLink>
        </li>
        <li>
          <NavLink href="/stats" className={LINK_BASE} activeClassName={LINK_ACTIVE}>
            <Star size={15} />
            Stats
          </NavLink>
        </li>
        <li>
          <NavLink href="/import" className={LINK_BASE} activeClassName={LINK_ACTIVE}>
            <Upload size={15} />
            Import
          </NavLink>
        </li>
      </ul>

      {/* Shelf list */}
      {shelves.length > 0 && (
        <div>
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
            Shelves
          </p>
          <ul className="flex flex-col gap-0.5 list-none">
            {shelves.map((shelf) => (
              <li key={shelf.id}>
                <NavLink
                  href={`/shelf/${shelf.id}`}
                  className={LINK_BASE}
                  activeClassName={LINK_ACTIVE}
                >
                  <BookOpen size={15} className="shrink-0" />
                  <span className="flex-1 truncate">{shelf.name}</span>
                  <span className="text-xs text-text-tertiary">
                    {shelf.bookCount}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
