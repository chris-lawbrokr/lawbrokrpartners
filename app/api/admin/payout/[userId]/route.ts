import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { withApi } from "@/lib/api-errors";

export const GET = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) => {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;
  const sql = getDb();

  const rows = await sql`
    SELECT bank_country, account_holder_name, account_number, routing_number,
           recipient_country, recipient_city, recipient_address, recipient_state,
           recipient_postal_code, status
    FROM payout_methods WHERE user_id = ${userId}
  `;

  if (rows.length === 0) {
    return NextResponse.json(null);
  }

  const row = rows[0] as Record<string, string>;
  return NextResponse.json({
    bankCountry: row.bank_country,
    accountHolderName: row.account_holder_name,
    accountNumber: row.account_number,
    routingNumber: row.routing_number,
    recipientCountry: row.recipient_country,
    recipientCity: row.recipient_city,
    recipientAddress: row.recipient_address,
    recipientState: row.recipient_state,
    recipientPostalCode: row.recipient_postal_code,
    status: row.status,
  });
});
