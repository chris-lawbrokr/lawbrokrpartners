"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SignupForm from "./signup-form";

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
      <div>
        <h1>Account Created</h1>
        <p>Your account has been set up. You can now sign in.</p>
        <button
          type="button"
          onClick={() => {
            router.push("/login");
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (error && !loaded) {
    return (
      <div>
        <h1>Invite Link</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!loaded || !inviteInfo) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-500" />
      </div>
    );
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
