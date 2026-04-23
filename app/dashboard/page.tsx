"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  DollarSign,
  CircleCheckBig,
  MousePointerClick,
  Users,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import PageSpinner from "@/components/page-spinner";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const statusLabels: Record<string, string> = {
  pending: "Link Click",
  submitted: "Lead Submitted",
  demo_booked: "Demo Booked",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

interface MyReferral {
  id: number;
  referral_code: string;
  lead_name: string;
  lead_email: string;
  lead_phone: string;
  notes: string;
  status: string;
  admin_note: string;
  created_at: string;
  reviewed_at: string | null;
}

interface Stats {
  total: string;
  closed_won: string;
  submitted: string;
  pending: string;
}

export default function PartnerDashboard() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<MyReferral[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: "0",
    closed_won: "0",
    submitted: "0",
    pending: "0",
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<MyReferral | null>(
    null,
  );
  const [payoutStatus, setPayoutStatus] = useState<
    "loading" | "missing" | "configured"
  >("loading");

  const refreshPayoutStatus = useCallback(async () => {
    const res = await apiFetch("/api/partner/payout");
    if (!res.ok) return;
    const data = (await res.json()) as PayoutMethod | null;
    setPayoutStatus(data ? "configured" : "missing");
  }, []);

  useEffect(() => {
    if (user) void refreshPayoutStatus();
  }, [user, refreshPayoutStatus]);

  const referralLink = user?.referralCode
    ? `https://www.lawbrokr.com/referral?ref=${user.referralCode}`
    : null;

  const loadData = useCallback(async () => {
    const referralsRes = await apiFetch("/api/partner/referrals");
    if (!referralsRes.ok) return;
    const data = (await referralsRes.json()) as {
      referrals: MyReferral[];
      stats: Stats;
    };
    setReferrals(data.referrals);
    setStats(data.stats);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);

  async function copyLink() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: "bg-gray-100 text-gray-600",
      submitted: "bg-yellow-100 text-yellow-800",
      demo_booked: "bg-blue-100 text-blue-800",
      closed_won: "bg-green-100 text-green-800",
      closed_lost: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
      >
        {statusLabels[status] ?? status}
      </span>
    );
  }

  if (loading || !user) {
    return (
      <main className="mx-auto max-w-[900px] p-8">
        <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
        <PageSpinner />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[900px] p-8">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      {payoutStatus === "missing" ? (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-700" />
          <p className="text-sm text-yellow-800">
            No payout method configured. Scroll down to &quot;Payout
            Method&quot; and click &quot;Set up&quot; to add your bank
            information.
          </p>
        </div>
      ) : null}

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100">
            <CalendarClock className="h-5 w-5 text-purple-900" />
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-900">30 days</p>
            <p className="text-xs text-brand-gray-900">Next Payment Due</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100">
            <DollarSign className="h-5 w-5 text-purple-900" />
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-900">$0.00</p>
            <p className="text-xs text-brand-gray-900">Total Unpaid</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100">
            <CircleCheckBig className="h-5 w-5 text-purple-900" />
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-900">$0.00</p>
            <p className="text-xs text-brand-gray-900">Total Paid</p>
          </div>
        </div>
      </div>

      {/* Lawbrokr Partners Card */}
      <div className="mb-8 rounded-lg border border-gray-200 px-6 py-5">
        <h3 className="mb-3 text-base font-bold text-purple-900">
          Lawbrokr Partners
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-900">
            <MousePointerClick className="h-5 w-5" />
            <span className="text-base font-bold">{stats.pending}</span>
            <span className="text-sm text-brand-gray-300">clicks</span>
          </div>
          <div className="flex items-center gap-2 text-purple-900">
            <Users className="h-5 w-5" />
            <span className="text-base font-bold">{stats.submitted}</span>
            <span className="text-sm text-brand-gray-300">referrals</span>
          </div>
          <div className="flex items-center gap-2 text-purple-900">
            <UserCheck className="h-5 w-5" />
            <span className="text-base font-bold">{stats.closed_won}</span>
            <span className="text-sm text-brand-gray-300">customers</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Leads &amp; Referrals</h2>
        <button
          type="button"
          onClick={() => {
            setShowAddLead(true);
          }}
          className="cursor-pointer rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white"
        >
          Submit a Lead
        </button>
      </div>

      {/* Referrals Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 text-left">
              <th className="px-2 py-3">Lead</th>
              <th className="px-2 py-3">Status</th>
              <th className="px-2 py-3">Date</th>
              <th className="px-2 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {referrals.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-6 text-center text-brand-gray-200"
                >
                  No referrals yet. Share your link or submit a lead.
                </td>
              </tr>
            ) : (
              referrals.map((r) => (
                <tr key={r.id} className="border-b border-gray-200">
                  <td className="px-2 py-3">
                    {r.lead_name || r.lead_email ? (
                      <div>
                        {r.lead_name ? (
                          <span className="font-medium">{r.lead_name}</span>
                        ) : null}
                        {r.lead_email ? (
                          <span className="ml-2 text-brand-gray-300">
                            {r.lead_email}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-brand-gray-200">
                        No details yet
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3">{statusBadge(r.status)}</td>
                  <td className="px-2 py-3 text-brand-gray-300">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-3">
                    {r.status === "pending" || r.status === "submitted" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReferral(r);
                        }}
                        className="cursor-pointer text-xs font-medium text-purple-600 underline"
                      >
                        {r.status === "pending" ? "Add Details" : "View"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReferral(r);
                        }}
                        className="cursor-pointer text-xs text-brand-gray-300 underline"
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Lead Modal */}
      {showAddLead ? (
        <AddLeadModal
          onClose={() => {
            setShowAddLead(false);
          }}
          onCreated={() => {
            void loadData();
          }}
        />
      ) : null}

      {/* Referral Detail Modal */}
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

      {/* Referral Link Card */}
      {referralLink ? (
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold">Your Referral Link</h2>
          <p className="mb-4 text-sm text-brand-gray-300">
            Share this link to earn referral commissions.
          </p>
          <div className="mb-4 break-all rounded-lg bg-brand-gray-50 p-3 text-sm text-brand-gray-600">
            {referralLink}
          </div>
          <button
            type="button"
            onClick={() => {
              void copyLink();
            }}
            className="cursor-pointer rounded bg-purple-600 px-6 py-2.5 text-sm font-medium text-white"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      ) : null}

      {/* Payout Method */}
      <PayoutMethodCard
        onChange={() => {
          void refreshPayoutStatus();
        }}
      />
    </main>
  );
}

function AddLeadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [leadFirstName, setLeadFirstName] = useState("");
  const [leadLastName, setLeadLastName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    setSubmitting(true);

    try {
      const res = await apiFetch("/api/partner/referrals", {
        method: "POST",
        body: JSON.stringify({
          leadName: `${leadFirstName} ${leadLastName}`.trim(),
          leadEmail,
          leadPhone,
          notes,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(data?.message ?? "Failed to submit lead");
      }

      onCreated();
      onClose();
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
      <div className="w-full max-w-[450px] rounded-lg bg-white p-8">
        <h2 className="mb-1 text-lg font-semibold">Submit a Lead</h2>
        <p className="mb-4 text-sm text-brand-gray-300">
          Manually submit a referral lead for admin review.
        </p>

        {error ? (
          <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
              Lead First Name *
              <input
                type="text"
                value={leadFirstName}
                onChange={(e) => {
                  setLeadFirstName(e.target.value);
                }}
                required
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
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
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Lead Email
            <input
              type="email"
              value={leadEmail}
              onChange={(e) => {
                setLeadEmail(e.target.value);
              }}
              className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Lead Phone
            <input
              type="tel"
              value={leadPhone}
              onChange={(e) => {
                setLeadPhone(formatPhone(e.target.value));
              }}
              placeholder="(555) 123-4567"
              className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
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
              placeholder="How did you refer this person?"
              className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 cursor-pointer rounded bg-purple-600 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Submitting..." : "Submit for Review"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded border border-brand-gray-100 bg-transparent px-4 py-3 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
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
          body: JSON.stringify({
            leadName,
            leadEmail,
            leadPhone,
            notes,
            submit,
          }),
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
      <div className="w-full max-w-[500px] rounded-lg bg-white p-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Referral Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-brand-gray-300 hover:text-brand-gray-600"
          >
            &times;
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {referral.admin_note ? (
          <div className="mb-4 rounded bg-brand-gray-50 p-3 text-sm">
            <span className="font-medium text-brand-gray-400">Admin note:</span>{" "}
            <span className="text-brand-gray-600">{referral.admin_note}</span>
          </div>
        ) : null}

        {editing && canEdit ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Lead Name
              <input
                type="text"
                value={leadName}
                onChange={(e) => {
                  setLeadName(e.target.value);
                }}
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
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
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Lead Phone
              <input
                type="tel"
                value={leadPhone}
                onChange={(e) => {
                  setLeadPhone(formatPhone(e.target.value));
                }}
                placeholder="(555) 123-4567"
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
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
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
              />
            </label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleSave(false);
                }}
                className="flex-1 cursor-pointer rounded border border-brand-gray-100 bg-transparent py-3 text-sm disabled:opacity-70"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleSave(true);
                }}
                className="flex-1 cursor-pointer rounded bg-purple-600 py-3 text-sm font-medium text-white disabled:opacity-70"
              >
                {submitting ? "Saving..." : "Submit for Review"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-3">
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
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                }}
                className="w-full cursor-pointer rounded bg-purple-600 py-3 text-sm font-medium text-white"
              >
                Edit &amp; Submit for Review
              </button>
            ) : null}
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

interface PayoutMethod {
  bankCountry: string;
  accountHolderName: string;
  accountNumber: string;
  routingNumber: string;
  recipientCountry: string;
  recipientCity: string;
  recipientAddress: string;
  recipientState: string;
  recipientPostalCode: string;
  status: string;
}

function PayoutMethodCard({ onChange }: { onChange: () => void }) {
  const [payout, setPayout] = useState<PayoutMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await apiFetch("/api/partner/payout");
      if (res.ok) {
        setPayout((await res.json()) as PayoutMethod | null);
      }
      setLoading(false);
    }
    void load();
  }, []);

  const handleSaved = async () => {
    setEditing(false);
    const res = await apiFetch("/api/partner/payout");
    if (res.ok) {
      setPayout((await res.json()) as PayoutMethod | null);
    }
    onChange();
  };

  return (
    <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payout Method</h2>
        {!loading ? (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
            }}
            className="cursor-pointer text-xs text-purple-500 underline"
          >
            {payout ? "Edit" : "Set up"}
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-200 border-t-purple-500" />
        </div>
      ) : !payout ? (
        <p className="mt-2 text-sm text-brand-gray-200">
          No payout method configured. Click &quot;Set up&quot; to add your bank
          details.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${payout.status === "active" ? "bg-purple-400" : "bg-brand-gray-200"}`}
            />
            <span className="text-xs font-medium text-brand-gray-400">
              {payout.status === "active" ? "Active" : payout.status}
            </span>
          </div>
          <DetailRow label="Bank Country" value={payout.bankCountry} />
          <DetailRow label="Account Holder" value={payout.accountHolderName} />
          <DetailRow label="Account Number" value={payout.accountNumber} />
          <DetailRow label="Routing Number" value={payout.routingNumber} />
          <DetailRow label="Country" value={payout.recipientCountry} />
          <DetailRow label="State" value={payout.recipientState} />
          <DetailRow label="City" value={payout.recipientCity} />
          <DetailRow label="Address" value={payout.recipientAddress} />
          <DetailRow label="Postal Code" value={payout.recipientPostalCode} />
        </div>
      )}

      {editing ? (
        <PayoutEditModal
          existing={payout}
          onClose={() => {
            setEditing(false);
          }}
          onSaved={() => {
            void handleSaved();
          }}
        />
      ) : null}
    </div>
  );
}

function PayoutEditModal({
  existing,
  onClose,
  onSaved,
}: {
  existing: PayoutMethod | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bankCountry, setBankCountry] = useState(
    existing?.bankCountry ?? "United States",
  );
  const [accountHolderName, setAccountHolderName] = useState(
    existing?.accountHolderName ?? "",
  );
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [recipientCountry, setRecipientCountry] = useState(
    existing?.recipientCountry ?? "United States",
  );
  const [recipientCity, setRecipientCity] = useState(
    existing?.recipientCity ?? "",
  );
  const [recipientAddress, setRecipientAddress] = useState(
    existing?.recipientAddress ?? "",
  );
  const [recipientState, setRecipientState] = useState(
    existing?.recipientState ?? "",
  );
  const [recipientPostalCode, setRecipientPostalCode] = useState(
    existing?.recipientPostalCode ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    if (!accountHolderName || !accountNumber || !routingNumber) {
      setError(
        "Account holder name, account number, and routing number are required.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/partner/payout", {
        method: "PUT",
        body: JSON.stringify({
          bankCountry,
          accountHolderName,
          accountNumber,
          routingNumber,
          recipientCountry,
          recipientCity,
          recipientAddress,
          recipientState,
          recipientPostalCode,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(data?.message ?? "Failed to save");
      }
      onSaved();
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
      <div className="w-full max-w-[500px] rounded-lg bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Edit Payout Method</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-brand-gray-300 hover:text-brand-gray-600"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="max-h-[70vh] overflow-y-auto px-6 py-5"
        >
          {error ? (
            <div className="mb-4 rounded bg-purple-50 p-3 text-sm text-purple-600">
              {error}
            </div>
          ) : null}

          <h3 className="mb-3 text-sm font-semibold">Bank Details</h3>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Bank Country *
              <select
                value={bankCountry}
                onChange={(e) => {
                  setBankCountry(e.target.value);
                }}
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
              >
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Account Holder Name *
              <input
                type="text"
                value={accountHolderName}
                onChange={(e) => {
                  setAccountHolderName(e.target.value);
                }}
                required
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Account Number *
              <input
                type="password"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value.replace(/\D/g, ""));
                }}
                required
                autoComplete="off"
                placeholder={existing ? "Enter new account number" : ""}
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Routing / ABA Number *
              <input
                type="password"
                value={routingNumber}
                onChange={(e) => {
                  setRoutingNumber(e.target.value.replace(/\D/g, ""));
                }}
                required
                autoComplete="off"
                placeholder={existing ? "Enter new routing number" : ""}
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </label>
          </div>

          <h3 className="mb-3 mt-5 text-sm font-semibold">Recipient Address</h3>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Country
              <select
                value={recipientCountry}
                onChange={(e) => {
                  setRecipientCountry(e.target.value);
                }}
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
              >
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
              </select>
            </label>
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
                State / Province
                <input
                  type="text"
                  value={recipientState}
                  onChange={(e) => {
                    setRecipientState(e.target.value);
                  }}
                  className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
                City
                <input
                  type="text"
                  value={recipientCity}
                  onChange={(e) => {
                    setRecipientCity(e.target.value);
                  }}
                  className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Address
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => {
                  setRecipientAddress(e.target.value);
                }}
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Postal Code
              <input
                type="text"
                value={recipientPostalCode}
                onChange={(e) => {
                  setRecipientPostalCode(e.target.value);
                }}
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full cursor-pointer rounded bg-purple-400 py-2.5 text-sm font-medium text-white disabled:opacity-70"
          >
            {submitting ? "Saving..." : "Save Payout Method"}
          </button>
        </form>
      </div>
    </div>
  );
}
