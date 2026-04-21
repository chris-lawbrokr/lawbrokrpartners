"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Trash2,
  Plus,
  X,
  DollarSign,
  Users,
  UserCheck,
  Link as LinkIcon,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import PageSpinner from "@/components/page-spinner";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface RewardItem {
  id?: number;
  category: string;
  type: string;
  description: string;
  note: string;
  sort_order: number;
}

interface TopPromoter {
  name: string;
  referrals: number;
  approved: number;
}

interface DashboardStats {
  revenue: number;
  referrals: number;
  payingCustomers: number;
  newReferrals: number;
  clicks: number;
  promoters: number;
  dailyReferrals: { date: string; count: number }[];
  topPromoters: TopPromoter[];
  pendingActions: {
    promoters: number;
    commissions: number;
    referrals: number;
  };
}

type PlanType = "monthly" | "yearly";

const defaultStats: DashboardStats = {
  revenue: 0,
  referrals: 0,
  payingCustomers: 0,
  newReferrals: 0,
  clicks: 0,
  promoters: 0,
  dailyReferrals: [],
  topPromoters: [],
  pendingActions: { promoters: 0, commissions: 0, referrals: 0 },
};

export default function Home() {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [rewardsRes, statsRes] = await Promise.all([
      apiFetch("/api/rewards"),
      apiFetch("/api/admin/stats"),
    ]);
    if (rewardsRes.ok) setRewards((await rewardsRes.json()) as RewardItem[]);
    if (statsRes.ok) setStats((await statsRes.json()) as DashboardStats);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);

  if (loading) {
    return (
      <main className="mx-auto max-w-[1200px] p-8">
        <h1 className="mb-8 text-2xl font-bold">Dashboard</h1>
        <PageSpinner />
      </main>
    );
  }

  // Build 30-day date range for chart
  const chartDates: string[] = [];
  const chartCounts: number[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    chartDates.push(
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    );
    const match = stats.dailyReferrals.find((r) => r.date.slice(0, 10) === key);
    chartCounts.push(match?.count ?? 0);
  }

  return (
    <main className="mx-auto max-w-[1200px] p-8">
      <h1 className="mb-8 text-2xl font-bold">Dashboard</h1>

      {/* Top stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-100"
          label="Revenue generated"
          value={`$${stats.revenue.toLocaleString()}`}
        />
        <StatCard
          icon={<LinkIcon className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-100"
          label="Referrals"
          value={String(stats.referrals)}
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-100"
          label="Paying customers"
          value={String(stats.payingCustomers)}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-100"
          label="Promoters"
          value={String(stats.promoters)}
        />
      </div>

      {/* Middle row: Overview chart + right sidebar */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Overview chart */}
        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-5 md:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Overview</h2>
            <span className="rounded border border-gray-200 px-3 py-1 text-xs text-brand-gray-300">
              Last 30 Days
            </span>
          </div>
          <div className="-mx-2 flex w-full flex-1 flex-col justify-center">
            <Chart
              type="area"
              width="100%"
              height={250}
              series={[{ name: "Referrals", data: chartCounts }]}
              options={{
                chart: {
                  toolbar: { show: false },
                  sparkline: { enabled: false },
                  fontFamily: "inherit",
                },
                stroke: { curve: "smooth", width: 2 },
                colors: ["#7634d9"],
                fill: {
                  type: "gradient",
                  gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.4,
                    opacityTo: 0.05,
                    stops: [0, 100],
                  },
                },
                xaxis: {
                  categories: chartDates,
                  labels: {
                    style: { fontSize: "10px", colors: "#a8a7ad" },
                    rotate: 0,
                    hideOverlappingLabels: true,
                  },
                  axisBorder: { show: false },
                  axisTicks: { show: false },
                },
                yaxis: {
                  labels: {
                    style: { fontSize: "10px", colors: "#a8a7ad" },
                  },
                },
                grid: {
                  borderColor: "#f1f0f1",
                  strokeDashArray: 4,
                },
                dataLabels: { enabled: false },
                tooltip: { theme: "light" },
              }}
            />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          {/* Trendings */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Top Promoters</h2>
              <span className="text-xs text-brand-gray-300">Last 30 days</span>
            </div>
            {stats.topPromoters.length === 0 ? (
              <p className="text-sm text-brand-gray-200">No promoters yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.topPromoters.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-brand-gray-500">
                      {p.name}
                    </span>
                    <span className="text-sm text-brand-gray-300">
                      {p.referrals} referral{p.referrals !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Commissions donut */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-semibold">Commissions</h2>
              <span className="text-xs text-brand-gray-300">All time</span>
            </div>
            <Chart
              type="donut"
              height={200}
              series={[0, 0]}
              options={{
                chart: { fontFamily: "inherit" },
                labels: ["Paid", "Unpaid"],
                colors: ["#b29af1", "#7634d9"],
                plotOptions: {
                  pie: {
                    donut: {
                      size: "70%",
                      labels: {
                        show: true,
                        name: {
                          show: true,
                          fontSize: "12px",
                          color: "#83818a",
                        },
                        value: {
                          show: true,
                          fontSize: "20px",
                          fontWeight: "700",
                          formatter: () => "$0",
                        },
                        total: {
                          show: true,
                          label: "Total earned",
                          fontSize: "12px",
                          color: "#83818a",
                          formatter: () => "$0",
                        },
                      },
                    },
                  },
                },
                dataLabels: { enabled: false },
                legend: { show: false },
                stroke: { width: 0 },
              }}
            />
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-gray-200" />
                  Total earned
                </div>
                <span className="font-medium">$0</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-200" />
                  Paid
                </div>
                <span className="font-medium">$0</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-400" />
                  Unpaid
                </div>
                <span className="font-medium">$0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending actions */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold">Pending actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3">
          <PendingItem
            icon={<Clock className="h-4 w-4 text-purple-500" />}
            label="Pending promoters"
            count={stats.pendingActions.promoters}
          />
          <PendingItem
            icon={<DollarSign className="h-4 w-4 text-purple-500" />}
            label="Pending commissions"
            count={stats.pendingActions.commissions}
          />
          <PendingItem
            icon={<LinkIcon className="h-4 w-4 text-purple-500" />}
            label="Pending referrals"
            count={stats.pendingActions.referrals}
          />
        </div>
      </div>

      {/* Rewards */}
      <RewardCard
        rewards={rewards}
        onUpdated={() => {
          void loadData();
        }}
      />
    </main>
  );
}

/* ─── Small helper components ─── */

function StatCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-5">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-brand-gray-300">{label}</p>
        <p className="mt-0.5 text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function PendingItem({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50">
          {icon}
        </div>
        <div>
          <p className="text-sm text-brand-gray-400">{label}</p>
          <p className="text-lg font-bold">{count}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-brand-gray-200" />
    </div>
  );
}

/* ─── Rewards Card + Modal ─── */

function RewardCard({
  rewards,
  onUpdated,
}: {
  rewards: RewardItem[];
  onUpdated: () => void;
}) {
  const [showModal, setShowModal] = useState(false);

  const isEmpty = rewards.length === 0;

  return (
    <>
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Rewards</h2>
          <button
            type="button"
            onClick={() => {
              setShowModal(true);
            }}
            className="cursor-pointer text-xs text-purple-500 underline"
          >
            {isEmpty ? "Set up" : "Edit"}
          </button>
        </div>
        {isEmpty ? (
          <p className="mt-2 text-sm text-brand-gray-200">
            No reward configured yet. Click &quot;Set up&quot; to define what
            partners earn.
          </p>
        ) : (
          <div className="mt-3 space-y-1">
            {rewards.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 text-sm text-brand-gray-400"
              >
                <Bell className="h-4 w-4 shrink-0 text-brand-gray-300" />
                <div>
                  <p>{r.description}</p>
                  <p className="text-xs text-brand-gray-200">
                    {r.type === "yearly" ? "Yearly plan" : "Monthly plan"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal ? (
        <RewardsSetupModal
          initialRewards={rewards}
          onClose={() => {
            setShowModal(false);
          }}
          onSaved={() => {
            setShowModal(false);
            onUpdated();
          }}
        />
      ) : null}
    </>
  );
}

function RewardsSetupModal({
  initialRewards,
  onClose,
  onSaved,
}: {
  initialRewards: RewardItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items, setItems] = useState<{ description: string; plan: PlanType }[]>(
    initialRewards.map((r) => ({
      description: r.description,
      plan: r.type === "yearly" ? "yearly" : "monthly",
    })),
  );
  const [submitting, setSubmitting] = useState(false);

  function updateItem(
    index: number,
    field: "description" | "plan",
    value: string,
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", plan: "monthly" }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const rewards: RewardItem[] = items
        .filter((item) => item.description.trim())
        .map((item, i) => ({
          category: "promoter",
          type: item.plan,
          description: item.description,
          note: "",
          sort_order: i,
        }));
      await apiFetch("/api/rewards", {
        method: "PUT",
        body: JSON.stringify({ rewards }),
      });
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[500px] rounded-lg bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Rewards setup</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-brand-gray-300 hover:text-brand-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <p className="mb-4 text-xs text-brand-gray-300">
            Define what partners earn for each referral.
          </p>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => {
                      updateItem(index, "description", e.target.value);
                    }}
                    placeholder="e.g. 10% commission one-time"
                    className="flex-1 rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
                    autoFocus={index === items.length - 1}
                  />
                  <select
                    value={item.plan}
                    onChange={(e) => {
                      updateItem(index, "plan", e.target.value);
                    }}
                    aria-label="Plan type"
                    className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400 sm:w-[140px]"
                  >
                    <option value="monthly">Monthly plan</option>
                    <option value="yearly">Yearly plan</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    removeItem(index);
                  }}
                  className="mt-2 cursor-pointer rounded p-1 text-brand-gray-300 hover:bg-purple-50 hover:text-purple-500"
                  aria-label="Remove reward"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-4 flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-purple-300 px-3 py-2 text-xs font-medium text-purple-500 hover:bg-purple-50/50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Reward
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-sm text-brand-gray-300 hover:text-brand-gray-500"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              void handleSave();
            }}
            className="cursor-pointer rounded bg-purple-400 px-6 py-2 text-sm font-medium text-white disabled:opacity-70"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
