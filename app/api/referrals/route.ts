import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

// GET: List all referrals (admin dashboard)
export async function GET() {
  const sql = getDb();
  const rows = await sql`
    SELECT r.id, r.referral_code, r.status, r.created_at,
           u.first_name, u.last_name, u.email AS partner_email
    FROM referrals r
    JOIN users u ON u.id = r.partner_id
    ORDER BY r.created_at DESC
  `;
  return NextResponse.json(rows);
}

// POST: Webhook called by Flowbite site when "Book Now" is clicked
export async function POST(request: NextRequest) {
  const body = (await request.json()) as { ref?: string };
  const ref = body.ref;

  if (!ref) {
    return NextResponse.json({ message: "Missing ref parameter" }, { status: 400 });
  }

  const sql = getDb();

  // Look up the partner by referral code
  const users = await sql`
    SELECT id FROM users WHERE referral_code = ${ref} AND status = 'active'
  `;

  if (users.length === 0) {
    return NextResponse.json({ message: "Invalid referral code" }, { status: 404 });
  }

  const partnerId = users[0]?.id as number;

  // Get IP and user agent from headers
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";

  await sql`
    INSERT INTO referrals (partner_id, referral_code, visitor_ip, visitor_user_agent)
    VALUES (${partnerId}, ${ref}, ${ip}, ${userAgent})
  `;

  return NextResponse.json({ ok: true }, { status: 201 });
}
