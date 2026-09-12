"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Mic, Pill, ScrollText } from "lucide-react";
import { cn } from "cn";

const ITEMS = [
  { href: "/consult", label: "Consult", icon: Mic },
  { href: "/appointments", label: "Visits", icon: CalendarDays },
  { href: "/history", label: "History", icon: ScrollText },
  { href: "/prescriptions", label: "Scripts", icon: Pill },
];

export function PatientNav() {
  const path = usePathname();
  return (
    <nav aria-label="Patient sections" className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex w-full max-w-2xl items-start justify-around px-4 py-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex w-16 flex-col items-center gap-1 py-1"
            >
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-full border transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-secondary-foreground",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className={cn("text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
