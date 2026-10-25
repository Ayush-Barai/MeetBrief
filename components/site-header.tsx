"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { NetworkStatus } from "@/components/network-status";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/meetings", label: "Meetings" },
  { href: "/demo", label: "Demo report" },
  { href: "/setup", label: "Setup" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="no-print sticky top-0 z-50 border-b border-line/80 bg-paper/85 backdrop-blur-xl">
      <div className="container-page flex h-[68px] items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[0.8125rem] font-medium transition-colors",
                  active
                    ? "bg-ink/5 text-ink"
                    : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <NetworkStatus />
          <Link
            href="/meetings/new"
            className={buttonStyles("primary", "sm", "pl-3")}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            New meeting
          </Link>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/meetings/new"
            className={buttonStyles("primary", "icon", "size-9")}
            aria-label="New meeting"
          >
            <Plus className="size-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="grid size-9 place-items-center rounded-full border border-line-strong bg-white text-ink"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>
      {open ? (
        <div id="mobile-nav" className="border-t border-line bg-paper md:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-sm font-medium",
                  pathname === link.href
                    ? "bg-ink/5 text-ink"
                    : "text-ink-soft hover:bg-ink/5",
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
              <NetworkStatus />
              <Link
                href="/install"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-accent"
              >
                Install app
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
