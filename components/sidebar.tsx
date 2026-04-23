"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Link as LinkIcon,
  FolderOpen,
  LogOut,
  UserCircle,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const adminNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Partners",
    href: "/admin/partners",
    icon: <Users className="h-4 w-4" />,
  },
  {
    label: "Referrals",
    href: "/admin/referrals",
    icon: <LinkIcon className="h-4 w-4" />,
  },
  {
    label: "Assets",
    href: "/admin/assets",
    icon: <FolderOpen className="h-4 w-4" />,
  },
];

const partnerNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Referrals",
    href: "/dashboard/referrals",
    icon: <LinkIcon className="h-4 w-4" />,
  },
  {
    label: "Assets",
    href: "/dashboard/assets",
    icon: <FolderOpen className="h-4 w-4" />,
  },
];

export function Sidebar({ variant }: { variant: "admin" | "partner" }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const items = variant === "admin" ? adminNav : partnerNav;
  const profileHref =
    variant === "admin" ? "/admin/profile" : "/dashboard/profile";
  const profileActive = pathname === profileHref;

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center px-5">
        <img src="/Logo.svg" alt="Lawbrokr" className="h-6" />
      </div>

      {/* Profile link (shows user name) */}
      {user ? (
        <div className="px-3 pb-2">
          <Link
            href={profileHref}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              profileActive
                ? "bg-purple-50 text-purple-700"
                : "text-brand-gray-600 hover:bg-brand-gray-50"
            }`}
          >
            <UserCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {`${user.firstName} ${user.lastName}`.trim() || user.email}
            </span>
          </Link>
        </div>
      ) : null}

      <div className="mx-3 border-t border-gray-200" />

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-purple-50 text-purple-700"
                  : "text-brand-gray-400 hover:bg-brand-gray-50 hover:text-brand-gray-600"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-200 px-4 py-4">
        <button
          type="button"
          onClick={() => {
            void logout();
          }}
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-brand-gray-400 hover:bg-brand-gray-50 hover:text-brand-gray-600"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export function SidebarLayout({
  variant,
  children,
}: {
  variant: "admin" | "partner";
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar variant={variant} />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
