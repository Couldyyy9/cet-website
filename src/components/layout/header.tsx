"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/const";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/practice", label: "在线做题" },
  { href: "/library/cet4", label: "四级真题" },
  { href: "/library/cet6", label: "六级真题" },
  { href: "/mistakes", label: "错题本" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full glass-strong border-b border-[#ffcd68]/35">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <img src="/logo.svg" alt={APP_NAME} className="h-9 w-9 rounded-lg object-contain transition-transform group-hover:scale-110" />
          <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-2 text-sm rounded-md transition-colors",
                isActive
                  ? "text-primary-strong font-medium bg-primary-soft"
                  : "text-muted hover:text-foreground hover:bg-primary-soft"
              )}
            >
              {item.label}
            </Link>
          )})}
          <ThemeToggle />
        </nav>

        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="切换菜单"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white dark:bg-[#211c14] px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block px-3 py-2 text-sm rounded-md",
                isActive
                  ? "text-primary-strong font-medium bg-primary-soft"
                  : "text-muted hover:bg-primary-soft"
              )}
            >
              {item.label}
            </Link>
          )})}
          <div className="px-3 py-2">
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
