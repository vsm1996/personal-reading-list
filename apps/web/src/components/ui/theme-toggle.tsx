"use client";

import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun } from "lucide-react";

type Props = { className?: string };

export function ThemeToggle({ className = "" }: Props) {
  const { theme, toggleTheme, mounted } = useTheme();

  // Same dimensions as the button so layout doesn't shift on hydration
  if (!mounted) {
    return <div className={`h-8 w-8 ${className}`} aria-hidden />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`rounded-md p-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary ${className}`}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
