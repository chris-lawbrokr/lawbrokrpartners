"use client";

import { SidebarLayout } from "@/components/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SidebarLayout variant="admin">{children}</SidebarLayout>;
}
