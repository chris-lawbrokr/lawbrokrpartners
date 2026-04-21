"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function PasswordPage() {
  const pathname = usePathname();
  const backHref = pathname.startsWith("/admin")
    ? "/admin/profile"
    : "/dashboard/profile";

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/me/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(data?.message ?? "Failed to change password");
      }
      reset();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="p-8">
      <div className="mx-auto max-w-lg">
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1 text-sm text-brand-gray-400 hover:text-brand-gray-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Link>
        <h1 className="mb-6 text-2xl font-bold">Change password</h1>
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="mb-4 text-xs text-brand-gray-300">
            Enter your current password to confirm, then choose a new one at
            least 8 characters long.
          </p>
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="space-y-3"
          >
            {error ? (
              <div className="rounded bg-purple-50 p-3 text-sm text-purple-600">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded bg-green-50 p-3 text-sm text-green-700">
                Password updated.
              </div>
            ) : null}
            <label className="flex flex-col gap-1 text-sm font-medium">
              Current password
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={current}
                  onChange={(e) => {
                    setCurrent(e.target.value);
                  }}
                  autoComplete="current-password"
                  required
                  className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 pr-10 text-sm outline-none focus:border-purple-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCurrent((v) => !v);
                  }}
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-brand-gray-300 hover:text-brand-gray-500"
                >
                  {showCurrent ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              New password
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={next}
                  onChange={(e) => {
                    setNext(e.target.value);
                  }}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 pr-10 text-sm outline-none focus:border-purple-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowNew((v) => !v);
                  }}
                  aria-label={showNew ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-brand-gray-300 hover:text-brand-gray-500"
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Confirm new password
              <input
                type={showNew ? "text" : "password"}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                }}
                autoComplete="new-password"
                minLength={8}
                required
                className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </label>
            <button
              type="submit"
              disabled={submitting || !current || !next || !confirm}
              className="w-full cursor-pointer rounded bg-purple-400 py-2.5 text-sm font-medium text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Update password"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
