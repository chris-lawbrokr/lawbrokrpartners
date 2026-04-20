"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

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
  created_at: string;
  reviewed_at: string | null;
  first_name: string;
  last_name: string;
  partner_email: string;
  reward_id: number | null;
  reward_description: string | null;
  reward_type: string | null;
}

const columns = [
  { key: "submitted", label: "Under Review", color: "border-purple-50" },
  { key: "unpaid", label: "Unpaid", color: "border-purple-100" },
  { key: "paid", label: "Paid", color: "border-purple-200" },
  { key: "rejected", label: "Rejected", color: "border-purple-300" },
] as const;

export default function AdminReferralsPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(
    null,
  );
  const [showAddReferral, setShowAddReferral] = useState(false);

  const loadData = useCallback(async () => {
    const res = await apiFetch("/api/referrals");
    if (res.ok) {
      setReferrals((await res.json()) as Referral[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);

  const grouped = {
    submitted: referrals.filter((r) => r.status === "submitted"),
    unpaid: referrals.filter((r) => r.status === "approved"),
    paid: referrals.filter((r) => r.status === "paid"),
    rejected: referrals.filter((r) => r.status === "rejected"),
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
                          {`${r.first_name} ${r.last_name}`.trim() ||
                            r.partner_email}
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

      {selectedReferral ? (
        <ReferralModal
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

function ReferralModal({
  referral,
  onClose,
  onUpdated,
}: {
  referral: Referral;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [adminNote, setAdminNote] = useState(referral.admin_note);
  const [submitting, setSubmitting] = useState(false);

  const canReview = referral.status === "submitted";
  const isUnpaid = referral.status === "approved";

  const handleReview = async (status: "approved" | "rejected" | "paid") => {
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
          <DetailRow
            label="Offer"
            value={
              referral.reward_description
                ? `${referral.reward_description} (${referral.reward_type === "yearly" ? "Yearly" : "Monthly"})`
                : ""
            }
          />
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
          {referral.admin_note && !canReview ? (
            <DetailRow label="Admin Note" value={referral.admin_note} />
          ) : null}

          {canReview ? (
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
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-200 px-6 py-4">
          {canReview ? (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    void handleReview("approved");
                  }}
                  className="flex-1 cursor-pointer rounded bg-purple-400 py-2.5 text-sm font-medium text-white disabled:opacity-70"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    void handleReview("paid");
                  }}
                  className="flex-1 cursor-pointer rounded bg-purple-600 py-2.5 text-sm font-medium text-white disabled:opacity-70"
                >
                  Approve &amp; Mark Paid
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    void handleReview("rejected");
                  }}
                  className="flex-1 cursor-pointer rounded bg-purple-200 py-2.5 text-sm font-medium text-purple-600 disabled:opacity-70"
                >
                  Reject
                </button>
              </div>
            </>
          ) : isUnpaid ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleReview("paid");
                }}
                className="flex-1 cursor-pointer rounded bg-purple-600 py-2.5 text-sm font-medium text-white disabled:opacity-70"
              >
                Mark as Paid
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleDelete();
                }}
                className="flex-1 cursor-pointer rounded bg-purple-200 py-2.5 text-sm font-medium text-purple-600 disabled:opacity-70"
              >
                Delete
              </button>
            </div>
          ) : referral.status === "paid" || referral.status === "rejected" ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                void handleDelete();
              }}
              className="w-full cursor-pointer rounded bg-purple-200 py-2.5 text-sm font-medium text-purple-600 disabled:opacity-70"
            >
              Delete
            </button>
          ) : null}
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
                      {r.description} ({r.type === "yearly" ? "Yearly" : "Monthly"})
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
