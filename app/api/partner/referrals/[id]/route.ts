import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

// PATCH: Partner updates a referral (add lead info, submit for review)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = (await request.json()) as {
    leadName?: string;
    leadEmail?: string;
    leadPhone?: string;
    notes?: string;
    submit?: boolean;
  };

  const sql = getDb();

  // Ensure the referral belongs to this partner
  const rows = await sql`
    SELECT id, status FROM referrals WHERE id = ${id} AND partner_id = ${auth.userId}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ message: "Referral not found" }, { status: 404 });
  }

  const referral = rows[0];
  // Only allow editing if not yet closed
  if (
    referral?.status === "closed_won" ||
    referral?.status === "closed_lost" ||
    referral?.status === "demo_booked"
  ) {
    return NextResponse.json(
      { message: "Cannot edit a referral that has progressed past submission" },
      { status: 400 },
    );
  }

  const newStatus = body.submit ? "submitted" : (referral?.status as string);

  await sql`
    UPDATE referrals SET
      lead_name = COALESCE(${body.leadName ?? null}, lead_name),
      lead_email = COALESCE(${body.leadEmail ?? null}, lead_email),
      lead_phone = COALESCE(${body.leadPhone ?? null}, lead_phone),
      notes = COALESCE(${body.notes ?? null}, notes),
      status = ${newStatus}
    WHERE id = ${id} AND partner_id = ${auth.userId}
  `;

  return NextResponse.json({ ok: true });
}
