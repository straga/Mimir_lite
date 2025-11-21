#!/usr/bin/env node

import neo4j from "neo4j-driver";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "..", ".env") });

const NEO4J_URI = process.env.NEO4J_URI || "bolt://localhost:7687";
const NEO4J_USER = process.env.NEO4J_USER || "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || "password";

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);

async function main() {
  const session = driver.session();

  try {
    // Get all inactive watches
    const result = await session.run(`
      MATCH (w:WatchConfig)
      WHERE w.status = 'inactive' AND w.error = 'path_not_found'
      RETURN w.id as id, w.path as path, w.files_indexed as files_indexed
      ORDER BY w.files_indexed DESC
    `);

    if (result.records.length === 0) {
      console.log(
        "✅ No inactive watches found. Everything is already active!"
      );
      return;
    }

    console.log(`\n=== REACTIVATING ${result.records.length} WATCHES ===\n`);

    let totalFiles = 0;

    for (const record of result.records) {
      const id = record.get("id");
      const path = record.get("path");
      const files = record.get("files_indexed")?.toNumber
        ? record.get("files_indexed").toNumber()
        : record.get("files_indexed") || 0;

      totalFiles += files;

      await session.run(
        `
        MATCH (w:WatchConfig {id: $id})
        SET 
          w.status = 'active',
          w.error = null,
          w.last_updated = datetime()
      `,
        { id }
      );

      console.log(`✅ ${path} (${files.toLocaleString()} files)`);
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Reactivated:    ${result.records.length} watches`);
    console.log(`Total files:    ${totalFiles.toLocaleString()}`);
    console.log(
      `\n⚠️  IMPORTANT: Restart the Mimir server to resume file watching:`
    );
    console.log(`   docker compose restart mimir-server`);
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
