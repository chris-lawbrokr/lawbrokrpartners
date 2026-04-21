"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Search, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface MyReferral {
  id: number;
  referral_code: string;
  source: string;
  lead_name: string;
  lead_email: string;
  lead_phone: string;
  notes: string;
  status: string;
  admin_note: string;
  created_at: string;
  reviewed_at: string | null;
  paid_at: string | null;
  reward_id: number | null;
  reward_description: string | null;
  reward_type: string | null;
}

interface RewardOption {
  id: number;
  description: string;
  type: string;
}

const columns = [
  { key: "submitted", label: "Lead Submitted", color: "border-purple-50" },
  { key: "demo_booked", label: "Demo Booked", color: "border-purple-100" },
  { key: "closed_won", label: "Closed Won", color: "border-purple-200" },
  { key: "closed_lost", label: "Closed Lost", color: "border-purple-300" },
] as const;

const statusLabels: Record<string, string> = {
  pending: "Link Click",
  submitted: "Lead Submitted",
  demo_booked: "Demo Booked",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export default function PartnerReferralsPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<MyReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<MyReferral | null>(
    null,
  );
  const [rewards, setRewards] = useState<RewardOption[]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "7d" | "30d"
  >("all");
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
      apiFetch("/api/partner/referrals"),
      apiFetch("/api/rewards"),
    ]);
    if (referralsRes.ok) {
      const data = (await referralsRes.json()) as {
        referrals: MyReferral[];
        stats: unknown;
      };
      setReferrals(data.referrals);
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
      const matches =
        r.lead_name.toLowerCase().includes(q) ||
        r.lead_email.toLowerCase().includes(q) ||
        r.lead_phone.toLowerCase().includes(q);
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

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Referrals</h1>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray-300" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="Search by lead name, email, or phone"
            className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-purple-400"
          />
        </div>
        <div className="relative" ref={filtersRef}>
          <button
            type="button"
            onClick={() => {
              setFiltersOpen((v) => !v);
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm hover:border-purple-400"
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
                    <option value="unpaid">Unpaid (Closed Won)</option>
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
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-200 border-t-purple-500" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => {
            const items = grouped[col.key];
            return (
              <div key={col.key} className="flex min-w-[250px] flex-1 flex-col">
                <div
                  className={`mb-3 flex items-center justify-between border-t-2 ${col.color} pt-3`}
                >
                  <h2 className="text-sm font-semibold">{col.label}</h2>
                  <span className="rounded-full bg-brand-gray-50 px-2 py-0.5 text-xs font-medium text-brand-gray-400">
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  {items.length === 0 ? (
                    <div className="flex min-h-[88px] items-center justify-center rounded-lg border border-dashed border-gray-200 p-3 text-xs text-brand-gray-200">
                      No referrals
                    </div>
                  ) : (
                    items.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setSelectedReferral(r);
                        }}
                        className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 text-left transition-shadow hover:shadow-md"
                      >
                        <p className="truncate text-sm font-medium text-brand-gray-500">
                          {r.lead_name || (
                            <span className="text-brand-gray-200">
                              No lead name
                            </span>
                          )}
                        </p>
                        <p className="mt-1 truncate text-xs text-brand-gray-300">
                          {r.lead_email || (
                            <span className="text-brand-gray-200">
                              No lead email
                            </span>
                          )}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span
                            className={`text-xs font-medium ${r.source === "manual" ? "text-purple-500" : "text-brand-gray-300"}`}
                          >
                            {r.source === "manual" ? "Manual" : "Link"}
                          </span>
                          <span className="text-xs text-brand-gray-200">
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedReferral ? (
        <ReferralDetailModal
          referral={selectedReferral}
          onClose={() => {
            setSelectedReferral(null);
          }}
          onUpdated={() => {
            setSelectedReferral(null);
            void loadData();
          }}
        />
      ) : null}
    </main>
  );
}

function ReferralDetailModal({
  referral,
  onClose,
  onUpdated,
}: {
  referral: MyReferral;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [leadName, setLeadName] = useState(referral.lead_name);
  const [leadEmail, setLeadEmail] = useState(referral.lead_email);
  const [leadPhone, setLeadPhone] = useState(referral.lead_phone);
  const [notes, setNotes] = useState(referral.notes);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canEdit =
    referral.status === "pending" || referral.status === "submitted";

  const handleSave = async (submit: boolean) => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch(
        `/api/partner/referrals/${String(referral.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ leadName, leadEmail, leadPhone, notes, submit }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(data?.message ?? "Failed to update");
      }
      onUpdated();
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
      <div className="w-full max-w-[450px] rounded-lg bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Referral Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-brand-gray-300 hover:text-brand-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <div className="mx-6 mt-4 rounded bg-purple-50 p-3 text-sm text-purple-600">
            {error}
          </div>
        ) : null}

        {referral.admin_note ? (
          <div className="mx-6 mt-4 rounded bg-brand-gray-50 p-3 text-sm">
            <span className="font-medium text-brand-gray-400">
              Admin note:
            </span>{" "}
            <span className="text-brand-gray-600">{referral.admin_note}</span>
          </div>
        ) : null}

        {editing && canEdit ? (
          <div className="space-y-3 px-6 py-5">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Lead Name
              <input
                type="text"
                value={leadName}
                onChange={(e) => {
                  setLeadName(e.target.value);
                }}
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Lead Email
              <input
                type="email"
                value={leadEmail}
                onChange={(e) => {
                  setLeadEmail(e.target.value);
                }}
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Lead Phone
              <input
                type="tel"
                value={leadPhone}
                onChange={(e) => {
                  setLeadPhone(e.target.value);
                }}
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
                rows={3}
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </label>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleSave(false);
                }}
                className="flex-1 cursor-pointer rounded border border-brand-gray-100 bg-transparent py-2.5 text-sm disabled:opacity-70"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleSave(true);
                }}
                className="flex-1 cursor-pointer rounded bg-purple-400 py-2.5 text-sm font-medium text-white disabled:opacity-70"
              >
                {submitting ? "Saving..." : "Submit for Review"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 px-6 py-5">
              <DetailRow
                label="Source"
                value={referral.source === "manual" ? "Manual" : "Link Click"}
              />
              <DetailRow label="Lead Name" value={referral.lead_name} />
              <DetailRow label="Lead Email" value={referral.lead_email} />
              <DetailRow label="Lead Phone" value={referral.lead_phone} />
              <DetailRow label="Notes" value={referral.notes} />
              <DetailRow
                label="Status"
                value={statusLabels[referral.status] ?? referral.status}
              />
              <DetailRow
                label="Date"
                value={new Date(referral.created_at).toLocaleString()}
              />
            </div>
            {canEdit ? (
              <div className="border-t border-gray-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                  }}
                  className="w-full cursor-pointer rounded bg-purple-400 py-2.5 text-sm font-medium text-white"
                >
                  Edit &amp; Submit for Review
                </button>
              </div>
            ) : (
              <div className="border-t border-gray-200 px-6 py-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full cursor-pointer rounded border border-brand-gray-100 bg-transparent py-2.5 text-sm"
                >
                  Close
                </button>
              </div>
            )}
          </>
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
