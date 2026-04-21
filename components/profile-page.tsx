"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import PageSpinner from "@/components/page-spinner";

interface ProfileData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  website: string;
  referral_code: string | null;
  status: string;
  is_admin: boolean;
  created_at: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await apiFetch("/api/me");
    if (res.ok) {
      setProfile((await res.json()) as ProfileData);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (loading) return <PageSpinner />;
  if (!profile) return null;

  return (
    <main className="p-8">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-bold">Profile</h1>
        <DetailsCard profile={profile} onSaved={load} />
      </div>
    </main>
  );
}

function DetailsCard({
  profile,
  onSaved,
}: {
  profile: ProfileData;
  onSaved: () => Promise<void>;
}) {
  const pathname = usePathname();
  const passwordHref = pathname.startsWith("/admin")
    ? "/admin/profile/password"
    : "/dashboard/profile/password";

  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [website, setWebsite] = useState(profile.website);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dirty =
    firstName !== profile.first_name ||
    lastName !== profile.last_name ||
    website !== profile.website;

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const res = await apiFetch("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ firstName, lastName, website }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(data?.message ?? "Failed to save");
      }
      setSuccess(true);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">Account details</h2>
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
        {success && !dirty ? (
          <div className="rounded bg-green-50 p-3 text-sm text-green-700">
            Profile updated.
          </div>
        ) : null}
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            First name
            <input
              type="text"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
              }}
              required
              className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Last name
            <input
              type="text"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
              }}
              required
              className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
            />
          </label>
        </div>
        <div className="flex flex-col gap-1 text-sm font-medium">
          Email
          <div className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm text-brand-gray-500">
            {profile.email}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Website
          <input
            type="url"
            value={website}
            onChange={(e) => {
              setWebsite(e.target.value);
            }}
            placeholder="https://example.com"
            className="w-full rounded border border-brand-gray-100 bg-brand-gray-50 px-3 py-2 text-sm outline-none focus:border-purple-400"
          />
        </label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-100 pt-3 text-xs">
          {profile.referral_code ? (
            <div>
              <div className="text-brand-gray-300">Referral code</div>
              <div className="font-mono text-brand-gray-500">
                {profile.referral_code}
              </div>
            </div>
          ) : null}
          <div>
            <div className="text-brand-gray-300">Role</div>
            <div className="text-brand-gray-500">
              {profile.is_admin ? "Admin" : "Partner"}
            </div>
          </div>
          <div>
            <div className="text-brand-gray-300">Member since</div>
            <div className="text-brand-gray-500">
              {new Date(profile.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || !dirty}
          className="w-full cursor-pointer rounded bg-purple-400 py-2.5 text-sm font-medium text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        <Link
          href={passwordHref}
          className="block w-full text-center text-sm text-purple-500 hover:text-purple-600 hover:underline"
        >
          Change password
        </Link>
      </form>
    </section>
  );
}
