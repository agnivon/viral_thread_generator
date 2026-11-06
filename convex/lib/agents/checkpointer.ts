"use node";

import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import pg from "pg";

const { Pool } = pg;

// Aiven URLs often contain ?sslmode=require which overrides custom SSL objects in the pg driver.
// We parse the URL and remove sslmode so our explicit sslConfig takes precedence.
let connectionString = process.env.POSTGRES_URL;
if (connectionString) {
  try {
    const dbUrl = new URL(connectionString);
    dbUrl.searchParams.delete("sslmode");
    connectionString = dbUrl.toString();
  } catch {
    // Ignore URL parse error in tests
  }
}

const sslConfig = process.env.POSTGRES_CA_CERT
  ? { ca: process.env.POSTGRES_CA_CERT.replace(/\\n/g, "\n"), rejectUnauthorized: true }
  : { rejectUnauthorized: false };

export const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  max: 1, // Limit connections per isolate to prevent exhaustion in serverless environments
  idleTimeoutMillis: 10000,
});

export const checkpointSaver = new PostgresSaver(pool);
