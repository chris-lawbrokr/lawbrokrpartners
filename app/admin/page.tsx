"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Trash2, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

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
  created_at: string;
  reviewed_at: string | null;
  first_name: string;
  last_name: string;
  partner_email: string;
}

interface RewardItem {
  id?: number;
  category: string;
  type: string;
  description: string;
  note: string;
  sort_order: number;
}

type PlanType = "monthly" | "yearly";

export default function Home() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);

  const loadData = useCallback(async () => {
    const [referralsRes, rewardsRes] = await Promise.all([
      apiFetch("/api/referrals"),
      apiFetch("/api/rewards"),
    ]);
    if (!referralsRes.ok) return;
    const newReferrals = (await referralsRes.json()) as Referral[];
    if (rewardsRes.ok) setRewards((await rewardsRes.json()) as RewardItem[]);
    setReferrals(newReferrals);
  }, []);

  useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);

  return (
    <main className="mx-auto max-w-[1100px] p-8">
      <h1 className="mb-8 text-2xl font-bold">Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-xs text-brand-gray-300">Revenue generated</p>
          <p className="mt-1 text-2xl font-bold">$0</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-xs text-brand-gray-300">Referrals</p>
          <p className="mt-1 text-2xl font-bold">0</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-xs text-brand-gray-300">Paying customers</p>
          <p className="mt-1 text-2xl font-bold">0</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-xs text-brand-gray-300">Promoters</p>
          <p className="mt-1 text-2xl font-bold">0</p>
        </div>
      </div>

      <RewardCard
        rewards={rewards}
        onUpdated={() => {
          void loadData();
        }}
      />

      {/* Referrals & Leads */}
      {referrals.length > 0 ? (
        <div className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Referrals &amp; Leads</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 text-left">
                  <th className="px-2 py-3">Partner</th>
                  <th className="px-2 py-3">Source</th>
                  <th className="px-2 py-3">Lead</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3">Date</th>
                  <th className="px-2 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-gray-200 ${r.status === "submitted" ? "bg-yellow-50" : ""}`}
                  >
                    <td className="px-2 py-3">
                      {`${r.first_name} ${r.last_name}`.trim() ||
                        r.partner_email}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={`text-xs font-medium ${r.source === "manual" ? "text-purple-500" : "text-brand-gray-300"}`}
                      >
                        {r.source === "manual" ? "Manual" : "Link"}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      {r.lead_name || r.lead_email ? (
                        <div>
                          {r.lead_name ? (
                            <span className="font-medium">{r.lead_name}</span>
                          ) : null}
                          {r.lead_email ? (
                            <span className="ml-1 text-brand-gray-300">
                              {r.lead_email}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-brand-gray-200">-</span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.status === "submitted"
                            ? "bg-yellow-100 text-yellow-800"
                            : r.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : r.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {r.status === "submitted"
                          ? "Needs Review"
                          : r.status === "pending"
                            ? "Link Click"
                            : r.status}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-brand-gray-300">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-3">
                      {r.status === "submitted" ? (
                        <ReviewActions
                          referral={r}
                          onReviewed={() => {
                            void loadData();
                          }}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

    </main>
  );
}

function ReviewActions({
  referral,
  onReviewed,
}: {
  referral: Referral;
  onReviewed: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleReview = async (status: "approved" | "rejected") => {
    setSubmitting(true);
    try {
      await apiFetch(`/api/referrals/${String(referral.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNote }),
      });
      onReviewed();
    } finally {
      setSubmitting(false);
    }
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => {
          setExpanded(true);
        }}
        className="cursor-pointer text-xs font-medium text-purple-400 underline"
      >
        Review
      </button>
    );
  }

  return (
    <div className="min-w-[250px] rounded border border-gray-200 bg-white p-3">
      {referral.notes ? (
        <div className="mb-2 text-xs">
          <span className="font-medium text-brand-gray-400">
            Partner notes:
          </span>{" "}
          <span className="text-brand-gray-600">{referral.notes}</span>
        </div>
      ) : null}
      {referral.lead_phone ? (
        <div className="mb-2 text-xs text-brand-gray-400">
          Phone: {referral.lead_phone}
        </div>
      ) : null}
      <input
        type="text"
        value={adminNote}
        onChange={(e) => {
          setAdminNote(e.target.value);
        }}
        placeholder="Admin note (optional)"
        className="mb-2 w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-2 py-1 text-xs outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            void handleReview("approved");
          }}
          className="flex-1 cursor-pointer rounded bg-green-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-70"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            void handleReview("rejected");
          }}
          className="flex-1 cursor-pointer rounded bg-red-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-70"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
          }}
          className="cursor-pointer text-xs text-brand-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

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

  function updateItem(index: number, field: "description" | "plan", value: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
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
        {/* Header */}
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
              <div
                key={index}
                className="flex items-start gap-2"
              >
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
                  className="mt-2 cursor-pointer rounded p-1 text-brand-gray-300 hover:bg-red-50 hover:text-red-500"
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

        {/* Footer */}
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
