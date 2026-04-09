"use client";

import { SidebarLayout } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SidebarLayout variant="partner">{children}</SidebarLayout>;
}
