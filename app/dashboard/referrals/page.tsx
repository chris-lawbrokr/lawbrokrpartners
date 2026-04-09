"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface Deal {
  id: number;
  title: string;
  description: string;
  is_default: boolean;
}

export default function ReferralsPage() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const dealsRes = await apiFetch("/api/me/deals");
    if (dealsRes.ok) {
      setDeals((await dealsRes.json()) as Deal[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);

  return (
    <main className="mx-auto max-w-[900px] p-8">
      <h1 className="mb-8 text-2xl font-bold">Referrals</h1>

      {loading || !user ? (
        <div className="py-8 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-purple-200 border-t-purple-500" />
        </div>
      ) : deals.length > 0 ? (
        <div className="space-y-4">
          {deals.map((deal) => {
            const lines = deal.description.split("\n").filter((l) => l.trim());
            return (
              <div key={deal.id} className="rounded-lg border border-gray-200 border-l-4 border-l-purple-400 bg-white p-5">
                <div>
                  {deal.is_default ? (
                    <span className="mb-1 inline-block text-xs font-semibold text-purple-500">Default</span>
                  ) : null}
                  <h3 className="text-base font-bold">{deal.title}</h3>
                </div>
                {lines.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {lines.map((line, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-brand-gray-400">
                        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-brand-gray-300" />
                        {line}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-brand-gray-200">No deals available.</p>
      )}
    </main>
  );
}
