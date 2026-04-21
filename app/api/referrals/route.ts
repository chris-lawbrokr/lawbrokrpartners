import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

// GET: List all referrals (admin only)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const sql = getDb();
  const rows = await sql`
    SELECT r.id, r.referral_code, r.source, r.lead_name, r.lead_email, r.lead_phone,
           r.notes, r.status, r.admin_note, r.monthly_amount, r.created_at,
           r.reviewed_at, r.paid_at,
           u.first_name, u.last_name, u.email AS partner_email,
           rw.id AS reward_id, rw.description AS reward_description, rw.type AS reward_type
    FROM referrals r
    JOIN users u ON u.id = r.partner_id
    LEFT JOIN rewards rw ON rw.id = r.reward_id
    ORDER BY
      CASE r.status
        WHEN 'submitted' THEN 0
        WHEN 'demo_booked' THEN 1
        WHEN 'pending' THEN 2
        ELSE 3
      END,
      r.created_at DESC
  `;
  return NextResponse.json(rows);
}

// POST: Webhook called by Flowbite site (no auth required — public webhook)
export async function POST(request: NextRequest) {
  const body = (await request.json()) as { ref?: string };
  const ref = body.ref;

  if (!ref) {
    return NextResponse.json({ message: "Missing ref parameter" }, { status: 400 });
  }

  const sql = getDb();

  const users = await sql`
    SELECT id FROM users WHERE referral_code = ${ref} AND status = 'active'
  `;

  if (users.length === 0) {
    return NextResponse.json({ message: "Invalid referral code" }, { status: 404 });
  }

  const partnerId = users[0]?.id as number;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";

  await sql`
    INSERT INTO referrals (partner_id, referral_code, visitor_ip, visitor_user_agent)
    VALUES (${partnerId}, ${ref}, ${ip}, ${userAgent})
  `;

  return NextResponse.json({ ok: true }, { status: 201 });
}
