/**
 * Database seed script.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires DATABASE_URL in .env.local or environment.
 */

import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Set DATABASE_URL in .env.local or environment");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  // Drop old tables (order matters — drop dependents first)
  await sql`DROP TABLE IF EXISTS payout_methods`;
  await sql`DROP TABLE IF EXISTS assets`;
  await sql`DROP TABLE IF EXISTS referrals`;
  await sql`DROP TABLE IF EXISTS rewards`;
  await sql`DROP TABLE IF EXISTS reward`;
  await sql`DROP TABLE IF EXISTS deals`;
  await sql`DROP TABLE IF EXISTS invites`;
  await sql`DROP TABLE IF EXISTS users`;

  // Create users table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      referral_code TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      is_admin BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("Created users table");

  // Create invites table
  await sql`
    CREATE TABLE IF NOT EXISTS invites (
      id SERIAL PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      used BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      used_at TIMESTAMPTZ
    )
  `;
  console.log("Created invites table");

  // Create rewards table (multi-row) — referrals references it, so create first
  await sql`DROP TABLE IF EXISTS rewards`;
  await sql`
    CREATE TABLE IF NOT EXISTS rewards (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL DEFAULT 'promoter',
      type TEXT NOT NULL DEFAULT 'sale',
      description TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("Created rewards table");

  await sql`
    INSERT INTO rewards (category, type, description, note, sort_order)
    VALUES
      ('promoter', 'monthly', '10% commission one-time (annualized) for monthly accounts', '', 0),
      ('promoter', 'yearly', '20% commission one-time of annual contract value', '', 1)
  `;
  console.log("Seeded default rewards");

  // Create referrals table
  // source: 'link' (from referral link) or 'manual' (partner submitted)
  // status: 'pending' -> 'submitted' -> 'approved' or 'rejected'
  await sql`
    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      partner_id INTEGER NOT NULL REFERENCES users(id),
      reward_id INTEGER REFERENCES rewards(id),
      referral_code TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'link',
      lead_name TEXT NOT NULL DEFAULT '',
      lead_email TEXT NOT NULL DEFAULT '',
      lead_phone TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      visitor_ip TEXT,
      visitor_user_agent TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_note TEXT NOT NULL DEFAULT '',
      monthly_amount NUMERIC(12, 2),
      reviewed_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("Created referrals table");

  // Create deals table
  await sql`
    CREATE TABLE IF NOT EXISTS deals (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("Created deals table");

  // Create reward table (single row, legacy)
  await sql`
    CREATE TABLE IF NOT EXISTS reward (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT ''
    )
  `;
  await sql`
    INSERT INTO reward (id, title, description)
    VALUES (1, '', '')
    ON CONFLICT (id) DO NOTHING
  `;
  console.log("Created reward table");

  // Create payout_methods table
  await sql`DROP TABLE IF EXISTS payout_methods`;
  await sql`
    CREATE TABLE IF NOT EXISTS payout_methods (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      bank_country TEXT NOT NULL DEFAULT '',
      account_holder_name TEXT NOT NULL DEFAULT '',
      account_number TEXT NOT NULL DEFAULT '',
      routing_number TEXT NOT NULL DEFAULT '',
      recipient_country TEXT NOT NULL DEFAULT '',
      recipient_city TEXT NOT NULL DEFAULT '',
      recipient_address TEXT NOT NULL DEFAULT '',
      recipient_state TEXT NOT NULL DEFAULT '',
      recipient_postal_code TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("Created payout_methods table");

  // Create assets table — brand content library.
  // File bytes stored inline via bytea (intended for small assets only).
  await sql`DROP TABLE IF EXISTS assets`;
  await sql`
    CREATE TABLE IF NOT EXISTS assets (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      mime_type TEXT NOT NULL DEFAULT '',
      file_name TEXT NOT NULL DEFAULT '',
      file_size INTEGER NOT NULL DEFAULT 0,
      data BYTEA,
      content TEXT NOT NULL DEFAULT '',
      uploaded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("Created assets table");

  // Seed admin user
  const existing = await sql`SELECT id FROM users WHERE email = 'admin@lawbrokr.ca'`;
  if (existing.length === 0) {
    const hash = await bcrypt.hash("password123", 12);
    await sql`
      INSERT INTO users (first_name, last_name, email, password_hash, website, status, is_admin)
      VALUES ('Admin', 'User', 'admin@lawbrokr.ca', ${hash}, 'https://lawbrokr.ca', 'active', true)
    `;
    console.log("Seeded admin user: admin@lawbrokr.ca / password123");
  } else {
    console.log("Admin user already exists, skipping");
  }

  // Seed test partner with an un-approved lead
  const existingPartner = await sql`SELECT id FROM users WHERE email = 'test@gmail.com'`;
  if (existingPartner.length === 0) {
    const partnerHash = await bcrypt.hash("password123", 12);
    const partnerReferralCode = crypto.randomBytes(6).toString("hex");
    const partnerRows = await sql`
      INSERT INTO users (first_name, last_name, email, password_hash, website, referral_code, status, is_admin)
      VALUES ('Test', 'Partner', 'test@gmail.com', ${partnerHash}, 'https://example.com', ${partnerReferralCode}, 'active', false)
      RETURNING id
    `;
    const partnerId = partnerRows[0]?.id as number;

    await sql`
      INSERT INTO referrals (partner_id, reward_id, referral_code, source, lead_name, lead_email, lead_phone, notes, status)
      VALUES (${partnerId}, NULL, ${partnerReferralCode}, 'manual', 'Sample Lead', 'lead@example.com', '(555) 123-4567', 'Test lead awaiting review', 'submitted')
    `;
    console.log("Seeded test partner: test@gmail.com / password123 (with pending lead)");
  } else {
    console.log("Test partner already exists, skipping");
  }

  // Seed a second partner that is still awaiting admin approval
  const existingPending = await sql`SELECT id FROM users WHERE email = 'pending@gmail.com'`;
  if (existingPending.length === 0) {
    const pendingHash = await bcrypt.hash("password123", 12);
    const pendingReferralCode = crypto.randomBytes(6).toString("hex");
    await sql`
      INSERT INTO users (first_name, last_name, email, password_hash, website, referral_code, status, is_admin)
      VALUES ('Pending', 'Partner', 'pending@gmail.com', ${pendingHash}, 'https://example.com', ${pendingReferralCode}, 'pending_approval', false)
    `;
    console.log(
      "Seeded unapproved partner: pending@gmail.com / password123 (status: pending_approval)",
    );
  } else {
    console.log("Unapproved test partner already exists, skipping");
  }

  console.log("Done!");
}

main().catch(console.error);
