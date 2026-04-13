"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
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

const columns = [
  { key: "submitted", label: "Under Review", color: "border-purple-400" },
  { key: "approved", label: "Confirmed", color: "border-purple-600" },
  { key: "rejected", label: "Rejected", color: "border-purple-200" },
] as const;

export default function AdminReferralsPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(
    null,
  );

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
    approved: referrals.filter((r) => r.status === "approved"),
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
                        <p className="text-sm font-medium text-brand-gray-500">
                          {`${r.first_name} ${r.last_name}`.trim() ||
                            r.partner_email}
                        </p>
                        {r.lead_name || r.lead_email ? (
                          <p className="mt-1 truncate text-xs text-brand-gray-300">
                            {r.lead_name || r.lead_email}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-brand-gray-200">
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

  const handleReview = async (status: "approved" | "rejected") => {
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

        <div className="flex gap-2 border-t border-gray-200 px-6 py-4">
          {canReview ? (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleReview("approved");
                }}
                className="flex-1 cursor-pointer rounded bg-purple-500 py-2.5 text-sm font-medium text-white disabled:opacity-70"
              >
                Approve
              </button>
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
            </>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className={`cursor-pointer rounded border border-brand-gray-100 bg-transparent px-4 py-2.5 text-sm ${canReview ? "" : "flex-1"}`}
          >
            {canReview ? "Cancel" : "Close"}
          </button>
        </div>
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
