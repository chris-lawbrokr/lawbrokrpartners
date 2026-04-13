import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

interface PayoutBody {
  bankCountry: string;
  accountHolderName: string;
  accountNumber: string;
  routingNumber: string;
  recipientCountry: string;
  recipientCity: string;
  recipientAddress: string;
  recipientState: string;
  recipientPostalCode: string;
}

function maskValue(val: string): string {
  if (val.length <= 4) return "****";
  return "*".repeat(val.length - 4) + val.slice(-4);
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const sql = getDb();
  const rows = await sql`
    SELECT bank_country, account_holder_name, account_number, routing_number,
           recipient_country, recipient_city, recipient_address, recipient_state,
           recipient_postal_code, status
    FROM payout_methods WHERE user_id = ${auth.userId}
  `;

  if (rows.length === 0) {
    return NextResponse.json(null);
  }

  const row = rows[0] as {
    bank_country: string;
    account_holder_name: string;
    account_number: string;
    routing_number: string;
    recipient_country: string;
    recipient_city: string;
    recipient_address: string;
    recipient_state: string;
    recipient_postal_code: string;
    status: string;
  };
  return NextResponse.json({
    bankCountry: row.bank_country,
    accountHolderName: row.account_holder_name,
    accountNumber: maskValue(row.account_number),
    routingNumber: maskValue(row.routing_number),
    recipientCountry: row.recipient_country,
    recipientCity: row.recipient_city,
    recipientAddress: row.recipient_address,
    recipientState: row.recipient_state,
    recipientPostalCode: row.recipient_postal_code,
    status: row.status,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as PayoutBody;

  if (!body.accountHolderName || !body.accountNumber || !body.routingNumber) {
    return NextResponse.json(
      { message: "Account holder name, account number, and routing number are required" },
      { status: 400 },
    );
  }

  const sql = getDb();

  await sql`
    INSERT INTO payout_methods (
      user_id, bank_country, account_holder_name, account_number, routing_number,
      recipient_country, recipient_city, recipient_address, recipient_state,
      recipient_postal_code, updated_at
    ) VALUES (
      ${auth.userId}, ${body.bankCountry}, ${body.accountHolderName},
      ${body.accountNumber}, ${body.routingNumber},
      ${body.recipientCountry}, ${body.recipientCity},
      ${body.recipientAddress}, ${body.recipientState},
      ${body.recipientPostalCode}, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      bank_country = ${body.bankCountry},
      account_holder_name = ${body.accountHolderName},
      account_number = ${body.accountNumber},
      routing_number = ${body.routingNumber},
      recipient_country = ${body.recipientCountry},
      recipient_city = ${body.recipientCity},
      recipient_address = ${body.recipientAddress},
      recipient_state = ${body.recipientState},
      recipient_postal_code = ${body.recipientPostalCode},
      updated_at = NOW()
  `;

  return NextResponse.json({ ok: true });
}
