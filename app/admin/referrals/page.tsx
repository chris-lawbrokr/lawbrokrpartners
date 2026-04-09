"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface Deal {
  id: number;
  title: string;
  description: string;
  is_default: boolean;
  created_at: string;
}

export default function AdminReferralsPage() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDeal, setShowCreateDeal] = useState(false);

  const loadData = useCallback(async () => {
    const dealsRes = await apiFetch("/api/deals");
    if (dealsRes.ok) {
      setDeals((await dealsRes.json()) as Deal[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);

  return (
    <main className="mx-auto max-w-[1100px] p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Referrals</h1>
        <button
          type="button"
          onClick={() => {
            setShowCreateDeal(true);
          }}
          className="cursor-pointer rounded bg-purple-400 px-4 py-2 text-sm font-medium text-white"
        >
          Create Deal
        </button>
      </div>

      {/* Deals */}
      <div>

        {deals.length === 0 && !loading ? (
          <p className="py-6 text-center text-brand-gray-200">
            No deals yet. Create one to get started.
          </p>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onUpdated={() => {
                void loadData();
              }}
            />
          ))
        )}
      </div>

      {showCreateDeal ? (
        <CreateDealModal
          onClose={() => {
            setShowCreateDeal(false);
          }}
          onCreated={() => {
            void loadData();
          }}
        />
      ) : null}
    </main>
  );
}

function DealCard({ deal, onUpdated }: { deal: Deal; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(deal.title);
  const [description, setDescription] = useState(deal.description);
  const [isDefault, setIsDefault] = useState(deal.is_default);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await apiFetch(`/api/deals/${String(deal.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ title, description, isDefault }),
      });
      setEditing(false);
      onUpdated();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await apiFetch(`/api/deals/${String(deal.id)}`, { method: "DELETE" });
      onUpdated();
    } finally {
      setSubmitting(false);
    }
  };

  if (editing) {
    return (
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              className="rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Description (one item per line)
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
              }}
              rows={4}
              className="rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-base outline-none focus:border-purple-400"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => {
                setIsDefault(e.target.checked);
              }}
              className="h-4 w-4 accent-purple-400"
            />
            Default deal
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

  const lines = deal.description.split("\n").filter((l) => l.trim());

  return (
    <div className="mb-4 rounded-lg border border-gray-200 border-l-4 border-l-purple-400 bg-white p-5">
      <div className="mb-1 flex items-center justify-between">
        <div>
          {deal.is_default ? (
            <span className="mb-1 inline-block text-xs font-semibold text-purple-500">
              Default
            </span>
          ) : null}
          <h3 className="text-base font-bold">{deal.title}</h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setEditing(true);
            }}
            className="cursor-pointer text-xs text-brand-gray-300 underline"
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
              className="cursor-pointer text-xs font-medium text-red-600 underline"
            >
              {submitting ? "Deleting..." : "Confirm"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(true);
              }}
              className="cursor-pointer text-xs text-red-400 underline"
            >
              Delete
            </button>
          )}
        </div>
      </div>
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
  );
}

function CreateDealModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiFetch("/api/deals", {
        method: "POST",
        body: JSON.stringify({ title, description, isDefault }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(data?.message ?? "Failed to create deal");
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
        <h2 className="mb-1 text-lg font-semibold">Create Deal</h2>
        <p className="mb-4 text-sm text-brand-gray-300">
          Define a commission deal that partners can see.
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
          <label className="flex flex-col gap-1 text-sm font-medium">
            Title *
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              required
              placeholder="e.g. Lawbrokr Partners"
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => {
                setIsDefault(e.target.checked);
              }}
              className="h-4 w-4 accent-purple-400"
            />
            Default deal
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 cursor-pointer rounded bg-purple-400 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Creating..." : "Create Deal"}
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
