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

  // Drop old table if it exists with the old schema
  await sql`DROP TABLE IF EXISTS users`;

  // Create users table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      website TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("Created users table");

  // Seed a test user (skip if already exists)
  const existing = await sql`SELECT id FROM users WHERE email = 'admin@lawbrokr.ca'`;
  if (existing.length === 0) {
    const hash = await bcrypt.hash("password123", 12);
    await sql`
      INSERT INTO users (first_name, last_name, email, password_hash, website)
      VALUES ('Admin', 'User', 'admin@lawbrokr.ca', ${hash}, 'https://lawbrokr.ca')
    `;
    console.log("Seeded test user: admin@lawbrokr.ca / password123");
  } else {
    console.log("Test user already exists, skipping");
  }

  console.log("Done!");
}

main().catch(console.error);
