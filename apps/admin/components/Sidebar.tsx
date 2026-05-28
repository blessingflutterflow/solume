"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Server,
  Loader,
  ScrollText,
  LogOut,
} from "lucide-react";
import { clearToken } from "@/lib/api";

const nav = [
  { label: "Overview",     href: "/",            icon: LayoutDashboard },
  { label: "Clients",      href: "/clients",     icon: Users },
  { label: "Operations",   href: "/operations",  icon: Server },
  { label: "Provisioning", href: "/provisioning",icon: Loader },
  { label: "Audit Log",    href: "/audit",       icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <aside className="w-[220px] shrink-0 flex flex-col border-r border-[#2a2a2a] bg-[#0a0a0a] h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-[#2a2a2a]">
        <span className="text-[#faff69] font-bold text-lg tracking-tight">SOLUNE</span>
        <span className="ml-2 text-[#5a5a5a] text-xs font-medium mt-0.5">ADMIN</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm transition-colors",
                active
                  ? "bg-[#1a1a1a] text-white font-medium"
                  : "text-[#888888] hover:text-[#cccccc] hover:bg-[#1a1a1a]",
              ].join(" ")}
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm text-[#888888] hover:text-[#cccccc] hover:bg-[#1a1a1a] transition-colors"
        >
          <LogOut size={16} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
