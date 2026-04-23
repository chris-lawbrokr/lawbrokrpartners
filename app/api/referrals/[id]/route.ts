import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { withApi } from "@/lib/api-errors";

// PATCH: Admin approves or rejects a referral
export const PATCH = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = (await request.json()) as {
    status?: string;
    adminNote?: string;
    rewardId?: number | null;
    paid?: boolean;
    monthlyAmount?: number | null;
  };

  const validStatuses = [
    "submitted",
    "demo_booked",
    "closed_won",
    "closed_lost",
  ];

  const statusProvided = body.status !== undefined;
  const rewardProvided = "rewardId" in body;
  const paidProvided = body.paid !== undefined;
  const amountProvided = "monthlyAmount" in body;
  const adminNoteOnly =
    body.adminNote !== undefined &&
    !statusProvided &&
    !rewardProvided &&
    !paidProvided &&
    !amountProvided;

  if (body.status !== undefined && !validStatuses.includes(body.status)) {
    return NextResponse.json(
      {
        message:
          "Status must be 'submitted', 'demo_booked', 'closed_won', or 'closed_lost'",
      },
      { status: 400 },
    );
  }

  if (
    !statusProvided &&
    !rewardProvided &&
    !paidProvided &&
    !amountProvided &&
    !adminNoteOnly
  ) {
    return NextResponse.json(
      { message: "No update fields provided" },
      { status: 400 },
    );
  }

  const sql = getDb();

  const rows = await sql`SELECT id FROM referrals WHERE id = ${id}`;
  if (rows.length === 0) {
    return NextResponse.json({ message: "Referral not found" }, { status: 404 });
  }

  if (body.status !== undefined) {
    // Status change clears any attached offer, paid flag, and amount
    await sql`
      UPDATE referrals SET
        status = ${body.status},
        admin_note = ${body.adminNote ?? ""},
        reward_id = NULL,
        paid_at = NULL,
        monthly_amount = NULL,
        reviewed_at = NOW()
      WHERE id = ${id}
    `;
  } else if (rewardProvided) {
    await sql`
      UPDATE referrals SET
        reward_id = ${body.rewardId ?? null}
      WHERE id = ${id}
    `;
  } else if (paidProvided) {
    if (body.paid) {
      await sql`UPDATE referrals SET paid_at = NOW() WHERE id = ${id}`;
    } else {
      await sql`UPDATE referrals SET paid_at = NULL WHERE id = ${id}`;
    }
  } else if (amountProvided) {
    await sql`
      UPDATE referrals SET
        monthly_amount = ${body.monthlyAmount ?? null}
      WHERE id = ${id}
    `;
  } else if (body.adminNote !== undefined) {
    await sql`
      UPDATE referrals SET admin_note = ${body.adminNote} WHERE id = ${id}
    `;
  }

  return NextResponse.json({ ok: true });
});

// DELETE: Admin deletes a referral
export const DELETE = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const sql = getDb();

  const rows = await sql`SELECT id FROM referrals WHERE id = ${id}`;
  if (rows.length === 0) {
    return NextResponse.json({ message: "Referral not found" }, { status: 404 });
  }

  await sql`DELETE FROM referrals WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
});
