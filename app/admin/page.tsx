"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
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

interface Reward {
  title: string;
  description: string;
}

export default function Home() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [reward, setReward] = useState<Reward>({ title: "", description: "" });

  const loadData = useCallback(async () => {
    const [referralsRes, rewardRes] = await Promise.all([
      apiFetch("/api/referrals"),
      apiFetch("/api/reward"),
    ]);
    if (!referralsRes.ok) return;
    const newReferrals = (await referralsRes.json()) as Referral[];
    if (rewardRes.ok) setReward((await rewardRes.json()) as Reward);
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
        reward={reward}
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
  reward,
  onUpdated,
}: {
  reward: Reward;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(reward.title);
  const [description, setDescription] = useState(reward.description);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTitle(reward.title);
    setDescription(reward.description);
  }, [reward]);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await apiFetch("/api/reward", {
        method: "PUT",
        body: JSON.stringify({ title, description }),
      });
      setEditing(false);
      onUpdated();
    } finally {
      setSubmitting(false);
    }
  };

  const lines = reward.description.split("\n").filter((l) => l.trim());
  const isEmpty = !reward.title && !reward.description;

  if (editing) {
    return (
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Rewards</h2>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              placeholder="e.g. Partner Rewards"
              className="rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Description
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
              }}
              rows={4}
              placeholder={"Details"}
              className="rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                void handleSave();
              }}
              className="cursor-pointer rounded bg-purple-400 px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setTitle(reward.title);
                setDescription(reward.description);
              }}
              className="cursor-pointer rounded border border-brand-gray-100 bg-transparent px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Rewards</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(true);
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
        <div className="mt-3">
          {reward.title ? (
            <h3 className="text-base font-bold">{reward.title}</h3>
          ) : null}
          {lines.length > 0 ? (
            <div className="mt-2 space-y-1">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-sm text-brand-gray-400"
                >
                  <Bell className="mt-0.5 h-4 w-4 shrink-0 text-brand-gray-300" />
                  {line}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
