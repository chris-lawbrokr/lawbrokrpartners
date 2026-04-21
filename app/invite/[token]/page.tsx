"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SignupForm from "./signup-form";
import PageSpinner from "@/components/page-spinner";

interface InviteInfo {
  firstName: string;
  lastName: string;
  email: string;
  website: string;
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/invite/${params.token}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        setError(data?.message ?? "Invalid or expired invite link");
        return;
      }
      const data = (await res.json()) as InviteInfo;
      setInviteInfo(data);
      setLoaded(true);
    }
    void load();
  }, [params.token]);

  if (done) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-brand-gray-50">
        <div className="max-w-md rounded-2xl bg-white p-10 text-center shadow-sm">
          <h1 className="mb-3 text-2xl font-bold text-brand-gray-600">
            Enrollment Submitted
          </h1>
          <p className="mb-6 text-sm text-brand-gray-300">
            Thanks for enrolling! Your account is pending admin approval.
            You&apos;ll be able to log in once an admin reviews and accepts
            your enrollment.
          </p>
          <button
            type="button"
            onClick={() => {
              router.push("/login");
            }}
            className="w-full cursor-pointer rounded-lg bg-purple-600 py-3 text-base font-semibold text-white hover:bg-purple-500"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (error && !loaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-brand-gray-50">
        <div className="max-w-sm rounded-2xl bg-white p-10 text-center shadow-sm">
          <h1 className="mb-3 text-2xl font-bold text-brand-gray-600">
            Invite Link
          </h1>
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!loaded || !inviteInfo) {
    return <PageSpinner />;
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div
        className="relative h-full w-full bg-cover bg-center"
        style={{ backgroundImage: "url(/invite-bg.jpg)" }}
      >
        <div className="absolute top-0 left-0 p-8">
          <img src="/Logo.svg" alt="LawBrokr" className="h-8" />
          <h2 className="mt-6 text-4xl font-semibold text-black">
            Welcome to Lawbrokr&apos;s
            <br />
            Partner Program
          </h2>
        </div>
      </div>
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col p-4">
          <SignupForm
            token={params.token}
            initialFirstName={inviteInfo.firstName}
            initialLastName={inviteInfo.lastName}
            initialEmail={inviteInfo.email}
            initialWebsite={inviteInfo.website}
            onSuccess={() => {
              setDone(true);
            }}
          />
        </div>
      </div>
    </div>
  );
}
