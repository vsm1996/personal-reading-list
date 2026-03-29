"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
};

/**
 * Nav link that applies activeClassName when the current pathname starts
 * with href. Kept as a thin Client Component so the Server Component sidebar
 * can render nav items without shipping extra client JS.
 */
export function NavLink({ href, children, className = "", activeClassName = "" }: Props) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`${className} ${isActive ? activeClassName : ""}`.trim()}
    >
      {children}
    </Link>
  );
}
