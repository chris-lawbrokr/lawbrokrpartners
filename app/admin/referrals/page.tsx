"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import PageSpinner from "@/components/page-spinner";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

interface Partner {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface RewardOption {
  id: number;
  description: string;
  type: string;
}

interface Referral {
  id: number;
  referral_code: string;
  source: string;
  lead_name: string;
  lead_email: string;
  lead_phone: string;
  notes: string;
  status: string;
  admin_note: string;
  monthly_amount: string | null;
  created_at: string;
  reviewed_at: string | null;
  paid_at: string | null;
  first_name: string;
  last_name: string;
  partner_email: string;
  reward_id: number | null;
  reward_description: string | null;
  reward_type: string | null;
}

const columns = [
  { key: "submitted", label: "Lead Submitted", color: "border-purple-50" },
  { key: "demo_booked", label: "Demo Booked", color: "border-purple-100" },
  { key: "closed_won", label: "Closed Won", color: "border-purple-200" },
  { key: "closed_lost", label: "Closed Lost", color: "border-purple-300" },
] as const;

type DroppableStatus =
  | "submitted"
  | "demo_booked"
  | "closed_won"
  | "closed_lost";

export default function AdminReferralsPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [rewards, setRewards] = useState<RewardOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferralId, setSelectedReferralId] = useState<number | null>(
    null,
  );
  const [showAddReferral, setShowAddReferral] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7d" | "30d">(
    "all",
  );
  const [offerFilter, setOfferFilter] = useState<string>("all");
  const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "unpaid">(
    "all",
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        filtersRef.current &&
        !filtersRef.current.contains(e.target as Node)
      ) {
        setFiltersOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [filtersOpen]);

  const activeFilterCount =
    (dateFilter !== "all" ? 1 : 0) +
    (offerFilter !== "all" ? 1 : 0) +
    (paidFilter !== "all" ? 1 : 0);

  const resetFilters = () => {
    setDateFilter("all");
    setOfferFilter("all");
    setPaidFilter("all");
  };

  const loadData = useCallback(async () => {
    const [referralsRes, rewardsRes] = await Promise.all([
      apiFetch("/api/referrals"),
      apiFetch("/api/rewards"),
    ]);
    if (referralsRes.ok) {
      setReferrals((await referralsRes.json()) as Referral[]);
    }
    if (rewardsRes.ok) {
      setRewards((await rewardsRes.json()) as RewardOption[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);

  const q = search.trim().toLowerCase();
  const dateCutoff = (() => {
    if (dateFilter === "all") return null;
    const d = new Date();
    if (dateFilter === "today") {
      d.setHours(0, 0, 0, 0);
    } else if (dateFilter === "7d") {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 30);
    }
    return d.getTime();
  })();

  const filtered = referrals.filter((r) => {
    if (q) {
      const partnerName = `${r.first_name} ${r.last_name}`.trim();
      const matches =
        r.lead_name.toLowerCase().includes(q) ||
        r.lead_email.toLowerCase().includes(q) ||
        r.lead_phone.toLowerCase().includes(q) ||
        partnerName.toLowerCase().includes(q) ||
        r.partner_email.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (dateCutoff !== null && new Date(r.created_at).getTime() < dateCutoff) {
      return false;
    }
    if (offerFilter !== "all") {
      if (offerFilter === "none") {
        if (r.reward_id !== null) return false;
      } else if (String(r.reward_id ?? "") !== offerFilter) {
        return false;
      }
    }
    if (paidFilter === "paid" && !r.paid_at) return false;
    if (paidFilter === "unpaid") {
      if (r.status !== "closed_won" || r.paid_at) return false;
    }
    return true;
  });

  const grouped = {
    submitted: filtered.filter((r) => r.status === "submitted"),
    demo_booked: filtered.filter((r) => r.status === "demo_booked"),
    closed_won: filtered.filter((r) => r.status === "closed_won"),
    closed_lost: filtered.filter((r) => r.status === "closed_lost"),
  };

  const handleDrop = async (id: number, newStatus: DroppableStatus) => {
    const ref = referrals.find((r) => r.id === id);
    if (!ref || ref.status === newStatus) return;
    // Optimistic update — server clears reward_id and paid_at on status change
    setReferrals((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: newStatus,
              reward_id: null,
              reward_description: null,
              reward_type: null,
              paid_at: null,
              monthly_amount: null,
            }
          : r,
      ),
    );
    const res = await apiFetch(`/api/referrals/${String(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus, adminNote: ref.admin_note }),
    });
    if (!res.ok) {
      void loadData();
    }
  };

  const handleTogglePaid = async (id: number, paid: boolean) => {
    setReferrals((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, paid_at: paid ? new Date().toISOString() : null }
          : r,
      ),
    );
    const res = await apiFetch(`/api/referrals/${String(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ paid }),
    });
    if (!res.ok) {
      void loadData();
    }
  };

  const handleSetAmount = async (id: number, monthlyAmount: number | null) => {
    setReferrals((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              monthly_amount:
                monthlyAmount === null ? null : monthlyAmount.toFixed(2),
            }
          : r,
      ),
    );
    const res = await apiFetch(`/api/referrals/${String(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ monthlyAmount }),
    });
    if (!res.ok) {
      void loadData();
    }
  };

  const handleSetReward = async (id: number, rewardId: number | null) => {
    const reward = rewardId
      ? (rewards.find((r) => r.id === rewardId) ?? null)
      : null;
    setReferrals((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              reward_id: rewardId,
              reward_description: reward?.description ?? null,
              reward_type: reward?.type ?? null,
            }
          : r,
      ),
    );
    const res = await apiFetch(`/api/referrals/${String(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ rewardId }),
    });
    if (!res.ok) {
      void loadData();
    }
  };

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Referrals</h1>
        <button
          type="button"
          onClick={() => {
            setShowAddReferral(true);
          }}
          className="flex cursor-pointer items-center gap-1.5 rounded bg-purple-400 px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Add Referral
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray-300" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="Search by lead name, email, phone, or partner"
            className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-purple-400"
          />
        </div>
        <div className="relative" ref={filtersRef}>
          <button
            type="button"
            onClick={() => {
              setFiltersOpen((v) => !v);
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm hover:bg-brand-gray-100"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 ? (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-400 px-1.5 text-xs font-medium text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
          {filtersOpen ? (
            <div className="absolute right-0 top-full z-10 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
              <div className="space-y-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-brand-gray-400">
                    Date
                  </span>
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value as typeof dateFilter);
                    }}
                    className="w-full cursor-pointer rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 outline-none focus:border-purple-400"
                  >
                    <option value="all">All time</option>
                    <option value="today">Today</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-brand-gray-400">
                    Offer
                  </span>
                  <select
                    value={offerFilter}
                    onChange={(e) => {
                      setOfferFilter(e.target.value);
                    }}
                    className="w-full cursor-pointer rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 outline-none focus:border-purple-400"
                  >
                    <option value="all">All offers</option>
                    <option value="none">No offer</option>
                    {rewards.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.description} (
                        {r.type === "yearly" ? "Yearly" : "Monthly"})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-brand-gray-400">
                    Paid status
                  </span>
                  <select
                    value={paidFilter}
                    onChange={(e) => {
                      setPaidFilter(e.target.value as typeof paidFilter);
                    }}
                    className="w-full cursor-pointer rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 outline-none focus:border-purple-400"
                  >
                    <option value="all">All</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </label>
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={resetFilters}
                    disabled={activeFilterCount === 0}
                    className="cursor-pointer text-xs text-purple-500 underline disabled:cursor-not-allowed disabled:text-brand-gray-200 disabled:no-underline"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFiltersOpen(false);
                    }}
                    className="cursor-pointer rounded bg-purple-400 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => {
            const items = grouped[col.key];
            const isDragOver = dragOverCol === col.key;
            return (
              <div
                key={col.key}
                className="flex min-w-[250px] flex-1 flex-col"
                onDragOver={(e) => {
                  if (draggingId === null) return;
                  e.preventDefault();
                  if (dragOverCol !== col.key) setDragOverCol(col.key);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (dragOverCol === col.key) setDragOverCol(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverCol(null);
                  if (draggingId === null) return;
                  void handleDrop(draggingId, col.key as DroppableStatus);
                  setDraggingId(null);
                }}
              >
                <div
                  className={`mb-3 flex items-center justify-between border-t-2 ${col.color} pt-3`}
                >
                  <h2 className="text-sm font-semibold">{col.label}</h2>
                  <span className="rounded-full bg-brand-gray-50 px-2 py-0.5 text-xs font-medium text-brand-gray-400">
                    {items.length}
                  </span>
                </div>
                <div
                  className={`flex flex-1 flex-col gap-2 rounded-lg p-1 transition-colors ${isDragOver ? "bg-purple-50 ring-2 ring-purple-300" : ""}`}
                >
                  {items.length === 0 ? (
                    <div className="flex min-h-[88px] items-center justify-center rounded-lg border border-dashed border-gray-200 p-3 text-xs text-brand-gray-200">
                      {isDragOver ? "Drop here" : "No referrals"}
                    </div>
                  ) : (
                    items.map((r) => (
                      <div
                        key={r.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggingId(r.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverCol(null);
                        }}
                        className={`relative cursor-grab rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md active:cursor-grabbing ${draggingId === r.id ? "opacity-40" : ""}`}
                      >
                        {col.key === "closed_won" ? (
                          <span
                            className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.paid_at ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                          >
                            {r.paid_at ? "Paid" : "Unpaid"}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReferralId(r.id);
                          }}
                          className={`block w-full cursor-pointer text-left ${col.key === "closed_won" ? "pr-14" : ""}`}
                        >
                          <p className="truncate text-sm font-medium text-brand-gray-500">
                            {`${r.first_name} ${r.last_name}`.trim() ||
                              r.partner_email}
                          </p>
                        </button>
                        <div className="mt-3 space-y-2 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReferralId(r.id);
                            }}
                            className="flex w-full cursor-pointer items-baseline justify-between gap-2 text-left"
                          >
                            <span className="shrink-0 text-brand-gray-300">
                              Created
                            </span>
                            <span className="truncate text-right text-brand-gray-400">
                              {new Date(r.created_at).toLocaleDateString()}
                            </span>
                          </button>
                          <select
                            aria-label="Offer"
                            value={r.reward_id ?? ""}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              void handleSetReward(
                                r.id,
                                val === "" ? null : Number(val),
                              );
                            }}
                            className={`w-full min-w-0 cursor-pointer truncate rounded border border-brand-gray-100 bg-brand-gray-50/50 py-0.5 pl-1.5 pr-6 text-xs outline-none focus:border-purple-300 focus:outline-none focus:ring-0 ${r.reward_description ? "text-brand-gray-400" : "text-brand-gray-200"}`}
                          >
                            <option value="">No offer</option>
                            {rewards.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.description} (
                                {opt.type === "yearly" ? "Yearly" : "Monthly"})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReferralId(r.id);
                            }}
                            className="flex w-full cursor-pointer items-baseline justify-between gap-2 text-left"
                          >
                            <span className="shrink-0 text-brand-gray-300">
                              Monthly revenue
                            </span>
                            <span
                              className={`truncate text-right ${r.monthly_amount ? "text-brand-gray-400" : "text-brand-gray-200"}`}
                            >
                              {r.monthly_amount
                                ? `$${Number(r.monthly_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo`
                                : "No amount yet"}
                            </span>
                          </button>
                          {r.status === "closed_won" ||
                          r.status === "closed_lost" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReferralId(r.id);
                              }}
                              className="flex w-full cursor-pointer items-baseline justify-between gap-2 text-left"
                            >
                              <span className="shrink-0 text-brand-gray-300">
                                Closed
                              </span>
                              <span className="truncate text-right text-brand-gray-400">
                                {r.reviewed_at
                                  ? new Date(
                                      r.reviewed_at,
                                    ).toLocaleDateString()
                                  : "-"}
                              </span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddReferral ? (
        <AddReferralModal
          onClose={() => {
            setShowAddReferral(false);
          }}
          onCreated={() => {
            setShowAddReferral(false);
            void loadData();
          }}
        />
      ) : null}

      {selectedReferralId !== null
        ? (() => {
            const selectedReferral = referrals.find(
              (r) => r.id === selectedReferralId,
            );
            if (!selectedReferral) return null;
            return (
              <ReferralModal
                referral={selectedReferral}
                rewards={rewards}
                onClose={() => {
                  setSelectedReferralId(null);
                }}
                onUpdated={() => {
                  setSelectedReferralId(null);
                  void loadData();
                }}
                onSetReward={(rewardId) => {
                  void handleSetReward(selectedReferral.id, rewardId);
                }}
                onSetAmount={(amount) => {
                  void handleSetAmount(selectedReferral.id, amount);
                }}
                onTogglePaid={(paid) => {
                  void handleTogglePaid(selectedReferral.id, paid);
                }}
              />
            );
          })()
        : null}
    </main>
  );
}

function ReferralModal({
  referral,
  rewards,
  onClose,
  onUpdated,
  onSetReward,
  onSetAmount,
  onTogglePaid,
}: {
  referral: Referral;
  rewards: RewardOption[];
  onClose: () => void;
  onUpdated: () => void;
  onSetReward: (rewardId: number | null) => void;
  onSetAmount: (amount: number | null) => void;
  onTogglePaid: (paid: boolean) => void;
}) {
  const [adminNote, setAdminNote] = useState(referral.admin_note);
  const [amountInput, setAmountInput] = useState(
    referral.monthly_amount ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isTerminal =
    referral.status === "closed_won" || referral.status === "closed_lost";
  const canReview = !isTerminal;
  const noteDirty = adminNote !== referral.admin_note;

  const handleReview = async (
    status: "demo_booked" | "closed_won" | "closed_lost",
  ) => {
    setSubmitting(true);
    try {
      await apiFetch(`/api/referrals/${String(referral.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNote }),
      });
      onUpdated();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveNote = async () => {
    setSubmitting(true);
    try {
      await apiFetch(`/api/referrals/${String(referral.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ adminNote }),
      });
      onUpdated();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await apiFetch(`/api/referrals/${String(referral.id)}`, {
        method: "DELETE",
      });
      onUpdated();
    } finally {
      setSubmitting(false);
    }
  };

  const partnerName =
    `${referral.first_name} ${referral.last_name}`.trim() ||
    referral.partner_email;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[450px] rounded-lg bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold">
            {canReview ? "Review Referral" : "Referral Details"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-brand-gray-300 hover:text-brand-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-6 py-5">
          <DetailRow label="Partner" value={partnerName} />
          <label className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2">
            <span className="text-sm font-medium text-brand-gray-300">
              Offer
            </span>
            <select
              aria-label="Offer"
              value={referral.reward_id ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                onSetReward(val === "" ? null : Number(val));
              }}
              className="w-[60%] cursor-pointer truncate rounded border border-brand-gray-100 bg-brand-gray-50 py-1 pl-2 pr-7 text-sm outline-none focus:border-purple-400"
            >
              <option value="">No offer</option>
              {rewards.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.description} (
                  {opt.type === "yearly" ? "Yearly" : "Monthly"})
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2">
            <span className="text-sm font-medium text-brand-gray-300">
              Monthly revenue
            </span>
            <div className="relative w-[60%]">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-brand-gray-300">
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                }}
                onBlur={() => {
                  const current = referral.monthly_amount ?? "";
                  if (amountInput === current) return;
                  if (amountInput === "") {
                    onSetAmount(null);
                  } else {
                    const n = Number(amountInput);
                    if (!Number.isNaN(n)) onSetAmount(n);
                  }
                }}
                placeholder="0.00"
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-2 py-1 pl-5 text-right text-sm outline-none focus:border-purple-400"
              />
            </div>
          </label>
          {referral.status === "closed_won" ? (
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2">
              <span className="text-sm font-medium text-brand-gray-300">
                Payment
              </span>
              <button
                type="button"
                onClick={() => {
                  onTogglePaid(!referral.paid_at);
                }}
                className={`cursor-pointer rounded px-3 py-1 text-xs font-medium ${referral.paid_at ? "border border-brand-gray-100 bg-transparent text-brand-gray-500 hover:bg-brand-gray-50" : "bg-purple-400 text-white hover:bg-purple-500"}`}
              >
                {referral.paid_at ? "Mark Unpaid" : "Mark Paid"}
              </button>
            </div>
          ) : null}
          <DetailRow
            label="Source"
            value={referral.source === "manual" ? "Manual" : "Link Click"}
          />
          {referral.lead_name ? (
            <DetailRow label="Lead Name" value={referral.lead_name} />
          ) : null}
          {referral.lead_email ? (
            <DetailRow label="Lead Email" value={referral.lead_email} />
          ) : null}
          {referral.lead_phone ? (
            <DetailRow label="Phone" value={referral.lead_phone} />
          ) : null}
          {referral.notes ? (
            <div className="flex items-baseline justify-between border-b border-gray-100 pb-2">
              <span className="text-sm font-medium text-brand-gray-300">
                Partner Notes
              </span>
              <span className="max-w-[60%] text-right text-sm text-brand-gray-600">
                {referral.notes}
              </span>
            </div>
          ) : null}
          <DetailRow
            label="Date"
            value={new Date(referral.created_at).toLocaleDateString()}
          />
          {referral.reviewed_at ? (
            <DetailRow
              label="Reviewed"
              value={new Date(referral.reviewed_at).toLocaleDateString()}
            />
          ) : null}
          <div className="pt-1">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Admin Note
              <input
                type="text"
                value={adminNote}
                onChange={(e) => {
                  setAdminNote(e.target.value);
                }}
                placeholder="Optional note"
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-200 px-6 py-4">
          {referral.status === "submitted" ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                void handleReview("demo_booked");
              }}
              className="w-full cursor-pointer rounded bg-purple-400 py-2.5 text-sm font-medium text-white disabled:opacity-70"
            >
              Mark Demo Booked
            </button>
          ) : referral.status === "demo_booked" ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleReview("closed_won");
                }}
                className="flex-1 cursor-pointer rounded bg-purple-400 py-2.5 text-sm font-medium text-white disabled:opacity-70"
              >
                Mark Closed Won
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleReview("closed_lost");
                }}
                className="flex-1 cursor-pointer rounded bg-purple-900 py-2.5 text-sm font-medium text-white disabled:opacity-70"
              >
                Mark Closed Lost
              </button>
            </div>
          ) : null}
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              if (noteDirty) {
                void handleSaveNote();
              } else {
                onClose();
              }
            }}
            className="w-full cursor-pointer rounded border border-brand-gray-100 bg-brand-gray-50 py-2.5 text-sm font-medium hover:bg-brand-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && noteDirty ? "Saving..." : "Save"}
          </button>
          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleDelete();
                }}
                className="flex-1 cursor-pointer rounded bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-70"
              >
                {submitting ? "Deleting..." : "Confirm Delete"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                }}
                className="cursor-pointer rounded border border-brand-gray-100 bg-transparent px-4 py-2.5 text-sm text-brand-gray-500"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(true);
              }}
              className="w-full cursor-pointer rounded bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddReferralModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [rewards, setRewards] = useState<RewardOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [partnerId, setPartnerId] = useState("");
  const [rewardId, setRewardId] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadLastName, setLeadLastName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const [usersRes, rewardsRes] = await Promise.all([
        apiFetch("/api/users"),
        apiFetch("/api/rewards"),
      ]);
      if (usersRes.ok) {
        const users = (await usersRes.json()) as Partner[];
        setPartners(users);
      }
      if (rewardsRes.ok) {
        const r = (await rewardsRes.json()) as RewardOption[];
        setRewards(r);
      }
      setLoadingData(false);
    }
    void load();
  }, []);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    if (!partnerId || !rewardId) {
      setError("Please select a partner and an offer.");
      return;
    }

    if (leadPhone && leadPhone.replace(/\D/g, "").length < 7) {
      setError("Please enter a valid phone number (at least 7 digits).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/admin/referrals", {
        method: "POST",
        body: JSON.stringify({
          partnerId: Number(partnerId),
          rewardId: Number(rewardId),
          leadName: `${leadName} ${leadLastName}`.trim(),
          leadEmail,
          leadPhone,
          notes,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(data?.message ?? "Failed to create referral");
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
      <div className="w-full max-w-[480px] rounded-lg bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Add Referral</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-brand-gray-300 hover:text-brand-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-200 border-t-purple-500" />
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="px-6 py-5"
          >
            {error ? (
              <div className="mb-4 rounded bg-purple-50 p-3 text-sm text-purple-600">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Offer *
                <select
                  value={rewardId}
                  onChange={(e) => {
                    setRewardId(e.target.value);
                  }}
                  required
                  className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
                >
                  <option value="">Select an offer</option>
                  {rewards.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.description} (
                      {r.type === "yearly" ? "Yearly" : "Monthly"})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium">
                Partner *
                <select
                  value={partnerId}
                  onChange={(e) => {
                    setPartnerId(e.target.value);
                  }}
                  required
                  className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
                >
                  <option value="">Select a partner</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {`${p.first_name} ${p.last_name}`.trim() || p.email}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-3">
                <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
                  Lead First Name *
                  <input
                    type="text"
                    value={leadName}
                    onChange={(e) => {
                      setLeadName(e.target.value);
                    }}
                    required
                    className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
                  Lead Last Name *
                  <input
                    type="text"
                    value={leadLastName}
                    onChange={(e) => {
                      setLeadLastName(e.target.value);
                    }}
                    required
                    className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm font-medium">
                Lead Email *
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => {
                    setLeadEmail(e.target.value);
                  }}
                  required
                  className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium">
                Lead Phone *
                <input
                  type="tel"
                  value={leadPhone}
                  onChange={(e) => {
                    setLeadPhone(formatPhone(e.target.value));
                  }}
                  placeholder="(555) 123-4567"
                  required
                  className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium">
                Notes
                <textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                  }}
                  rows={2}
                  className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
                />
              </label>
            </div>

            <div className="mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full cursor-pointer rounded bg-purple-400 py-2.5 text-sm font-medium text-white disabled:opacity-70"
              >
                {submitting ? "Creating..." : "Create Referral"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-gray-100 pb-2">
      <span className="text-sm font-medium text-brand-gray-300">{label}</span>
      <span className="max-w-[60%] text-right text-sm text-brand-gray-600">
        {value || <span className="text-brand-gray-200">-</span>}
      </span>
    </div>
  );
}
