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
  await sql`
    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      partner_id INTEGER NOT NULL REFERENCES users(id),
      referral_code TEXT NOT NULL,
      visitor_ip TEXT,
      visitor_user_agent TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("Created referrals table");

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
