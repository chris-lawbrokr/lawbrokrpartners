import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

// PATCH: Admin approves or rejects a referral
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = (await request.json()) as {
    status?: string;
    adminNote?: string;
  };

  if (body.status !== "approved" && body.status !== "rejected") {
    return NextResponse.json(
      { message: "Status must be 'approved' or 'rejected'" },
      { status: 400 },
    );
  }

  const sql = getDb();

  const rows = await sql`SELECT id FROM referrals WHERE id = ${id}`;
  if (rows.length === 0) {
    return NextResponse.json({ message: "Referral not found" }, { status: 404 });
  }

  await sql`
    UPDATE referrals SET
      status = ${body.status},
      admin_note = ${body.adminNote ?? ""},
      reviewed_at = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}
