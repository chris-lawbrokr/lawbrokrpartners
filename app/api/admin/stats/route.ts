import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const sql = getDb();

  const [
    referralCounts,
    promoterCounts,
    dailyReferrals,
    topPromoters,
    pendingPromoters,
    pendingReferrals,
  ] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'closed_won')::int AS closed_won,
        COUNT(*) FILTER (WHERE status = 'submitted')::int AS submitted,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
      FROM referrals
    `,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
      FROM users
      WHERE is_admin = false
    `,
    sql`
      SELECT
        created_at::date AS date,
        COUNT(*)::int AS count
      FROM referrals
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY created_at::date
      ORDER BY date
    `,
    sql`
      SELECT
        u.first_name,
        u.last_name,
        u.email,
        COUNT(r.id)::int AS referral_count,
        COUNT(r.id) FILTER (WHERE r.status = 'closed_won')::int AS closed_won_count
      FROM users u
      LEFT JOIN referrals r ON r.partner_id = u.id
      WHERE u.is_admin = false AND u.status = 'active'
      GROUP BY u.id, u.first_name, u.last_name, u.email
      ORDER BY referral_count DESC
      LIMIT 5
    `,
    sql`
      SELECT COUNT(*)::int AS total
      FROM users
      WHERE is_admin = false AND status = 'pending'
    `,
    sql`
      SELECT COUNT(*)::int AS total
      FROM referrals
      WHERE status = 'submitted'
    `,
  ]);

  const rc = referralCounts[0] as { total: number; closed_won: number; submitted: number; pending: number } | undefined;
  const pc = promoterCounts[0] as { active: number; pending: number } | undefined;
  const pp = pendingPromoters[0] as { total: number } | undefined;
  const pr = pendingReferrals[0] as { total: number } | undefined;

  return NextResponse.json({
    revenue: 0,
    referrals: rc?.total ?? 0,
    payingCustomers: rc?.closed_won ?? 0,
    newReferrals: rc?.submitted ?? 0,
    clicks: rc?.pending ?? 0,
    promoters: pc?.active ?? 0,
    dailyReferrals: dailyReferrals.map((r) => ({
      date: r.date as string,
      count: r.count as number,
    })),
    topPromoters: topPromoters.map((p) => ({
      name: `${String(p.first_name)} ${String(p.last_name)}`.trim() || String(p.email),
      referrals: p.referral_count as number,
      approved: p.closed_won_count as number,
    })),
    pendingActions: {
      promoters: pp?.total ?? 0,
      commissions: 0,
      referrals: pr?.total ?? 0,
    },
  });
}
