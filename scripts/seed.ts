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

  // Create users table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("Created users table");

  // Seed a test user (skip if already exists)
  const existing = await sql`SELECT id FROM users WHERE email = 'admin@lawbrokr.ca'`;
  if (existing.length === 0) {
    const hash = await bcrypt.hash("password123", 12);
    await sql`
      INSERT INTO users (email, name, password_hash)
      VALUES ('admin@lawbrokr.ca', 'Admin User', ${hash})
    `;
    console.log("Seeded test user: admin@lawbrokr.ca / password123");
  } else {
    console.log("Test user already exists, skipping");
  }

  console.log("Done!");
}

main().catch(console.error);
