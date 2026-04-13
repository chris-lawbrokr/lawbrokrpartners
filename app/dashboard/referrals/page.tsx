"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
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
}

const columns = [
  { key: "submitted", label: "Under Review", color: "border-purple-400" },
  { key: "unpaid", label: "Unpaid", color: "border-purple-500" },
  { key: "paid", label: "Paid", color: "border-purple-600" },
  { key: "rejected", label: "Rejected", color: "border-purple-200" },
] as const;

export default function PartnerReferralsPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<MyReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<MyReferral | null>(
    null,
  );

  const loadData = useCallback(async () => {
    const res = await apiFetch("/api/partner/referrals");
    if (res.ok) {
      const data = (await res.json()) as {
        referrals: MyReferral[];
        stats: unknown;
      };
      setReferrals(data.referrals);
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
      <h1 className="mb-6 text-2xl font-bold">Referrals</h1>

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
                    <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-xs text-brand-gray-200">
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
                        {r.lead_name || r.lead_email ? (
                          <p className="truncate text-sm font-medium text-brand-gray-500">
                            {r.lead_name || r.lead_email}
                          </p>
                        ) : (
                          <p className="text-sm text-brand-gray-200">
                            No lead details
                          </p>
                        )}
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
              <DetailRow label="Status" value={referral.status} />
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
