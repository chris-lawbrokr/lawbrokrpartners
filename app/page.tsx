"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import PageSpinner from "@/components/page-spinner";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace(user.isAdmin ? "/admin" : "/dashboard");
    }
  }, [user, router]);

  return <PageSpinner />;
}
