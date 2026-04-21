"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { AssetCard, ASSET_TABS } from "@/app/admin/assets/page";
import PageSpinner from "@/components/page-spinner";

interface Asset {
  id: number;
  title: string;
  category: string;
  mime_type: string;
  file_name: string;
  file_size: number;
  created_at: string;
}

export default function PartnerAssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const loadData = useCallback(async () => {
    const res = await apiFetch("/api/assets");
    if (res.ok) setAssets((await res.json()) as Asset[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);

  const filtered =
    categoryFilter === "all"
      ? assets
      : assets.filter((a) => a.category === categoryFilter);

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">Assets</h1>

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {ASSET_TABS.map((tab) => {
          const value = tab === "All" ? "all" : tab;
          const active = categoryFilter === value;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setCategoryFilter(value);
              }}
              className={`cursor-pointer border-b-2 px-4 py-2 text-sm font-medium -mb-px transition-colors ${
                active
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-brand-gray-400 hover:text-brand-gray-600"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {loading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-brand-gray-300">
          No assets available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
        </div>
      )}
    </main>
  );
}
