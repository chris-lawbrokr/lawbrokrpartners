/**
 * Database seed script.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires DATABASE_URL in .env.local or environment.
 */

import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Set DATABASE_URL in .env.local or environment");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  // Drop old tables
  await sql`DROP TABLE IF EXISTS reward`;
  await sql`DROP TABLE IF EXISTS deals`;
  await sql`DROP TABLE IF EXISTS referrals`;
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

  // Create referrals table
  // source: 'link' (from referral link) or 'manual' (partner submitted)
  // status: 'pending' -> 'submitted' -> 'approved' or 'rejected'
  await sql`
    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      partner_id INTEGER NOT NULL REFERENCES users(id),
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
      reviewed_at TIMESTAMPTZ,
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

  // Create rewards table (multi-row)
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

  console.log("Done!");
}

main().catch(console.error);
