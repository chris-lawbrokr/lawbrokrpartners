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

type StatusFilter = "all" | "submitted" | "pending" | "approved" | "rejected";

export default function AdminReferralsPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [reviewReferral, setReviewReferral] = useState<Referral | null>(null);

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

  const filtered =
    filter === "all"
      ? referrals
      : referrals.filter((r) => r.status === filter);

  const counts = {
    all: referrals.length,
    submitted: referrals.filter((r) => r.status === "submitted").length,
    pending: referrals.filter((r) => r.status === "pending").length,
    approved: referrals.filter((r) => r.status === "approved").length,
    rejected: referrals.filter((r) => r.status === "rejected").length,
  };

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "submitted", label: "Needs Review" },
    { value: "pending", label: "Link Clicks" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <main className="mx-auto max-w-[1100px] p-8">
      <h1 className="mb-6 text-2xl font-bold">Referrals</h1>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => {
              setFilter(f.value);
            }}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-purple-400 text-white"
                : "bg-brand-gray-50 text-brand-gray-400 hover:bg-brand-gray-100"
            }`}
          >
            {f.label} ({counts[f.value]})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 text-left">
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-purple-200 border-t-purple-500" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-10 text-center text-brand-gray-200"
                >
                  {referrals.length === 0
                    ? "No referrals yet."
                    : "No referrals match this filter."}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-gray-200 ${r.status === "submitted" ? "bg-purple-50" : ""}`}
                >
                  <td className="px-4 py-3">
                    {`${r.first_name} ${r.last_name}`.trim() ||
                      r.partner_email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${r.source === "manual" ? "text-purple-500" : "text-brand-gray-300"}`}
                    >
                      {r.source === "manual" ? "Manual" : "Link"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-brand-gray-300">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewReferral(r);
                      }}
                      className="cursor-pointer text-xs font-medium text-purple-400 underline"
                    >
                      {r.status === "submitted" ? "Review" : "View"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {reviewReferral ? (
        <ReferralModal
          referral={reviewReferral}
          onClose={() => {
            setReviewReferral(null);
          }}
          onUpdated={() => {
            setReviewReferral(null);
            void loadData();
          }}
        />
      ) : null}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: "bg-purple-100 text-purple-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-600",
  };
  const labels: Record<string, string> = {
    submitted: "Needs Review",
    pending: "Link Click",
    approved: "Approved",
    rejected: "Rejected",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] ?? status}
    </span>
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
          <DetailRow label="Status" value={referral.status} />
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
                className="flex-1 cursor-pointer rounded bg-green-600 py-2.5 text-sm font-medium text-white disabled:opacity-70"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleReview("rejected");
                }}
                className="flex-1 cursor-pointer rounded bg-red-600 py-2.5 text-sm font-medium text-white disabled:opacity-70"
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
