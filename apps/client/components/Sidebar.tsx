"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, CreditCard, Settings, HelpCircle, LogOut, MessageSquare, Info } from "lucide-react";
import { signOut } from "@/lib/api";

const NAV = [
  { href: "/",          label: "Dashboard",  icon: LayoutDashboard },
  { href: "/chat",      label: "Chat",       icon: MessageSquare },
  { href: "/knowledge", label: "Knowledge",  icon: BookOpen },
  { href: "/billing",   label: "Billing",    icon: CreditCard },
  { href: "/settings",  label: "Settings",   icon: Settings },
  { href: "/support",   label: "Support",    icon: HelpCircle },
  { href: "/about",     label: "About",      icon: Info },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-[220px] shrink-0 bg-[#0a0a0a] border-r border-[#2a2a2a] flex flex-col h-full">
      <div className="px-5 py-6 border-b border-[#2a2a2a]">
        <span className="text-[#faff69] font-bold text-base tracking-tight">SOLUNE</span>
        <p className="text-[#5a5a5a] text-xs mt-0.5">Agent dashboard</p>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm transition-colors ${
                active
                  ? "bg-[#1a1a1a] text-white"
                  : "text-[#888888] hover:text-white hover:bg-[#1a1a1a]"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[#2a2a2a]">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-[8px] text-sm text-[#888888] hover:text-white hover:bg-[#1a1a1a] transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
