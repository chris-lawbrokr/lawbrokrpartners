import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as {
    partnerId: number;
    rewardId: number;
    leadName?: string;
    leadEmail?: string;
    leadPhone?: string;
    notes?: string;
  };

  if (!body.partnerId || !body.rewardId) {
    return NextResponse.json(
      { message: "Partner and reward are required" },
      { status: 400 },
    );
  }

  const sql = getDb();

  const users = await sql`SELECT id, referral_code FROM users WHERE id = ${body.partnerId} AND is_admin = false`;
  if (users.length === 0) {
    return NextResponse.json({ message: "Partner not found" }, { status: 404 });
  }

  const rewards = await sql`SELECT id FROM rewards WHERE id = ${body.rewardId}`;
  if (rewards.length === 0) {
    return NextResponse.json({ message: "Reward not found" }, { status: 404 });
  }

  const referralCode = (users[0] as { referral_code: string | null }).referral_code ?? "";

  await sql`
    INSERT INTO referrals (partner_id, reward_id, referral_code, source, lead_name, lead_email, lead_phone, notes, status)
    VALUES (
      ${body.partnerId},
      ${body.rewardId},
      ${referralCode},
      'manual',
      ${body.leadName ?? ""},
      ${body.leadEmail ?? ""},
      ${body.leadPhone ?? ""},
      ${body.notes ?? ""},
      'submitted'
    )
  `;

  return NextResponse.json({ ok: true }, { status: 201 });
}
