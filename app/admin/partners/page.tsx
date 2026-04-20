"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface PartnerUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  website: string;
  referral_code: string | null;
  status: string;
  is_admin: boolean;
  created_at: string;
  invite_token: string | null;
  referral_count: string;
}

export default function PartnersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<PartnerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PartnerUser | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const res = await apiFetch("/api/users");
    if (!res.ok) return;
    setUsers((await res.json()) as PartnerUser[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);

  function getInviteLink(token: string): string {
    return `${window.location.origin}/invite/${token}`;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(getInviteLink(token));
    setCopiedToken(token);
    setTimeout(() => {
      setCopiedToken(null);
    }, 2000);
  }

  async function approvePartner(id: number) {
    const res = await apiFetch(`/api/users/${String(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "active" }),
    });
    if (res.ok) void loadData();
  }

  function statusBadge(status: string) {
    if (status === "active") {
      return (
        <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
          Active
        </span>
      );
    }
    if (status === "pending_approval") {
      return (
        <span className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
          Pending Approval
        </span>
      );
    }
    return (
      <span className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
        Pending
      </span>
    );
  }

  return (
    <main className="mx-auto max-w-[1100px] p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Partners</h1>
        <button
          type="button"
          onClick={() => {
            setShowCreateModal(true);
          }}
          className="cursor-pointer rounded bg-purple-400 px-4 py-2 text-sm font-medium text-white"
        >
          Create Partner
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 text-left">
              <th className="px-2 py-3">Name</th>
              <th className="px-2 py-3">Email</th>
              <th className="px-2 py-3">Website</th>
              <th className="px-2 py-3">Status</th>
              <th className="px-2 py-3">Referrals</th>
              <th className="px-2 py-3">Created</th>
              <th className="px-2 py-3">Invite</th>
            </tr>
          </thead>
          <tbody>
            {loading || !user ? (
              <tr>
                <td colSpan={7} className="py-8 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-purple-200 border-t-purple-500" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-6 text-center text-brand-gray-200"
                >
                  No partners yet. Create one to get started.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="cursor-pointer border-b border-gray-200 transition-colors hover:bg-brand-gray-50"
                  onClick={() => {
                    setSelectedUser(u);
                  }}
                >
                  <td className="px-2 py-3">
                    {u.first_name || u.last_name ? (
                      `${u.first_name} ${u.last_name}`.trim()
                    ) : (
                      <span className="text-brand-gray-200">-</span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    {u.email || <span className="text-brand-gray-200">-</span>}
                  </td>
                  <td className="px-2 py-3">
                    {u.website ? (
                      <span
                        className="text-purple-400 underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(u.website, "_blank");
                        }}
                      >
                        {u.website}
                      </span>
                    ) : (
                      <span className="text-brand-gray-200">-</span>
                    )}
                  </td>
                  <td className="px-2 py-3">{statusBadge(u.status)}</td>
                  <td className="px-2 py-3 text-center">
                    {u.status === "active" ? (
                      <span className="text-sm font-medium text-brand-gray-600">
                        {u.referral_count}
                      </span>
                    ) : (
                      <span className="text-brand-gray-200">-</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-brand-gray-300">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-3">
                    {u.invite_token && u.status === "pending" ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void copyLink(u.invite_token ?? "");
                        }}
                        className="cursor-pointer rounded border border-brand-gray-100 bg-transparent px-2 py-1 text-xs"
                      >
                        {copiedToken === u.invite_token
                          ? "Copied!"
                          : "Copy Link"}
                      </button>
                    ) : u.status === "pending_approval" ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void approvePartner(u.id);
                        }}
                        className="cursor-pointer rounded bg-purple-400 px-3 py-1 text-xs font-medium text-white"
                      >
                        Approve
                      </button>
                    ) : u.status === "active" ? (
                      <span className="text-xs text-brand-gray-200">Used</span>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal ? (
        <CreatePartnerModal
          onClose={() => {
            setShowCreateModal(false);
          }}
          onCreated={() => {
            void loadData();
          }}
        />
      ) : null}

      {selectedUser ? (
        <UserDetailModal
          user={selectedUser}
          onClose={() => {
            setSelectedUser(null);
          }}
          onUpdated={() => {
            setSelectedUser(null);
            void loadData();
          }}
        />
      ) : null}
    </main>
  );
}

function UserDetailModal({
  user,
  onClose,
  onUpdated,
}: {
  user: PartnerUser;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [email, setEmail] = useState(user.email);
  const [website, setWebsite] = useState(user.website);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/users/${String(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, website }),
      });
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

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await apiFetch(`/api/users/${String(user.id)}`, { method: "DELETE" });
      onUpdated();
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/users/${String(user.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(data?.message ?? "Failed to approve");
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
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Partner Details</h2>
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

        {editing ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">
                First Name
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                  }}
                  className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
                />
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">
                Last Name
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                  }}
                  className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                className="rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Website
              <input
                type="url"
                value={website}
                onChange={(e) => {
                  setWebsite(e.target.value);
                }}
                className="rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
              />
            </label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleSave();
                }}
                className="flex-1 cursor-pointer rounded bg-purple-400 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                }}
                className="cursor-pointer rounded border border-brand-gray-100 bg-transparent px-4 py-3 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-3">
              <DetailRow
                label="Name"
                value={`${user.first_name} ${user.last_name}`.trim()}
              />
              <DetailRow label="Email" value={user.email} />
              <DetailRow label="Website" value={user.website} />
              <DetailRow
                label="Status"
                value={
                  user.status === "active"
                    ? "Active"
                    : user.status === "pending_approval"
                      ? "Pending Approval"
                      : "Pending"
                }
              />
              <DetailRow label="Referrals" value={user.referral_count} />
              {user.referral_code ? (
                <DetailRow
                  label="Referral Link"
                  value={`https://www.lawbrokr.com/referral?ref=${user.referral_code}`}
                />
              ) : null}
              <DetailRow
                label="Created"
                value={new Date(user.created_at).toLocaleDateString()}
              />
            </div>
            {user.status === "pending_approval" ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleApprove();
                }}
                className="mb-2 w-full cursor-pointer rounded bg-purple-600 py-3 text-sm font-medium text-white disabled:opacity-70"
              >
                {submitting ? "Approving..." : "Approve Partner"}
              </button>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                }}
                className="flex-1 cursor-pointer rounded bg-purple-400 py-3 text-sm font-medium text-white"
              >
                Edit
              </button>
              {confirmDelete ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    void handleDelete();
                  }}
                  className="flex-1 cursor-pointer rounded bg-red-600 py-3 text-sm font-medium text-white disabled:opacity-70"
                >
                  {submitting ? "Deleting..." : "Confirm Delete"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(true);
                  }}
                  className="flex-1 cursor-pointer rounded border border-red-300 bg-transparent py-3 text-sm font-medium text-red-600"
                >
                  Delete
                </button>
              )}
            </div>
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
      <span className="text-sm text-brand-gray-600">
        {value || <span className="text-brand-gray-200">-</span>}
      </span>
    </div>
  );
}

function CreatePartnerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          email: email || undefined,
          website: website || undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(data?.message ?? "Failed to create partner");
      }

      const data = (await res.json()) as { inviteToken: string };
      setInviteLink(`${window.location.origin}/invite/${data.inviteToken}`);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[450px] rounded-lg bg-white p-8">
        {inviteLink ? (
          <>
            <h2 className="mb-4 text-lg font-semibold">Invite Link Created</h2>
            <p className="mb-2 text-sm text-brand-gray-300">
              Send this link to the partner. It can only be used once.
            </p>
            <div className="mb-4 break-all rounded bg-brand-gray-50 p-3 text-xs">
              {inviteLink}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void copyLink();
                }}
                className="flex-1 cursor-pointer rounded bg-purple-400 py-3 text-sm font-medium text-white"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 cursor-pointer rounded border border-brand-gray-100 bg-transparent py-3 text-sm"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-1 text-lg font-semibold">Create Partner</h2>
            <p className="mb-4 text-sm text-brand-gray-300">
              Optionally pre-fill partner details for reference. The partner can
              update these when they sign up.
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
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">
                  First Name
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                    }}
                    placeholder="Optional"
                    className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
                  />
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">
                  Last Name
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                    }}
                    placeholder="Optional"
                    className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                  }}
                  placeholder="Optional"
                  className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Website
                <input
                  type="url"
                  value={website}
                  onChange={(e) => {
                    setWebsite(e.target.value);
                  }}
                  placeholder="Optional"
                  className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
                />
              </label>
              <div className="mt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 cursor-pointer rounded bg-purple-400 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Creating..." : "Generate Invite Link"}
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
          </>
        )}
      </div>
    </div>
  );
}
