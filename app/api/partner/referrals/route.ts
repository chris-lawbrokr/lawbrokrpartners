import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

// GET: List the partner's own referrals
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const sql = getDb();
  const rows = await sql`
    SELECT r.id, r.referral_code, r.source, r.lead_name, r.lead_email, r.lead_phone,
           r.notes, r.status, r.admin_note, r.created_at, r.reviewed_at, r.paid_at,
           rw.id AS reward_id, rw.description AS reward_description, rw.type AS reward_type
    FROM referrals r
    LEFT JOIN rewards rw ON rw.id = r.reward_id
    WHERE r.partner_id = ${auth.userId}
    ORDER BY r.created_at DESC
  `;

  const countRows = await sql`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'closed_won') AS closed_won,
      COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending
    FROM referrals WHERE partner_id = ${auth.userId}
  `;

  return NextResponse.json({
    referrals: rows,
    stats: {
      total: String(countRows[0]?.total ?? 0),
      closed_won: String(countRows[0]?.closed_won ?? 0),
      submitted: String(countRows[0]?.submitted ?? 0),
      pending: String(countRows[0]?.pending ?? 0),
    },
  });
}

// POST: Partner creates a manual lead
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as {
    rewardId?: number;
    leadName?: string;
    leadEmail?: string;
    leadPhone?: string;
    notes?: string;
  };

  if (!body.rewardId) {
    return NextResponse.json(
      { message: "Offer is required" },
      { status: 400 },
    );
  }

  if (!body.leadName && !body.leadEmail) {
    return NextResponse.json(
      { message: "Lead name or email is required" },
      { status: 400 },
    );
  }

  const sql = getDb();

  const rewards = await sql`SELECT id FROM rewards WHERE id = ${body.rewardId}`;
  if (rewards.length === 0) {
    return NextResponse.json({ message: "Offer not found" }, { status: 404 });
  }

  // Get the partner's referral code
  const userRows = await sql`SELECT referral_code FROM users WHERE id = ${auth.userId}`;
  const referralCode = String(userRows[0]?.referral_code ?? "");

  await sql`
    INSERT INTO referrals (partner_id, reward_id, referral_code, source, lead_name, lead_email, lead_phone, notes, status)
    VALUES (${auth.userId}, ${body.rewardId}, ${referralCode}, 'manual', ${body.leadName ?? ""}, ${body.leadEmail ?? ""}, ${body.leadPhone ?? ""}, ${body.notes ?? ""}, 'submitted')
  `;

  return NextResponse.json({ ok: true }, { status: 201 });
}
