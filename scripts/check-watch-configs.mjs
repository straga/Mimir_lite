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
    // Get all watch configs
    const result = await session.run(`
      MATCH (w:WatchConfig) 
      RETURN w.id as id, w.path as path, w.status as status, 
             w.files_indexed as files_indexed, w.error as error,
             w.added_date as added_date
      ORDER BY w.files_indexed DESC
    `);

    console.log("\n=== ALL WATCH CONFIGS ===\n");

    let totalFiles = 0;
    let activeCount = 0;
    let inactiveCount = 0;

    result.records.forEach((record, idx) => {
      const id = record.get("id");
      const path = record.get("path");
      const status = record.get("status");
      const files = record.get("files_indexed")?.toNumber
        ? record.get("files_indexed").toNumber()
        : record.get("files_indexed");
      const error = record.get("error");

      totalFiles += files || 0;
      if (status === "active") activeCount++;
      if (status === "inactive") inactiveCount++;

      const statusIcon = status === "active" ? "✅" : "❌";
      console.log(
        `${statusIcon} ${status.padEnd(10)} | ${String(files).padEnd(
          8
        )} files | ${path}`
      );
      if (error) {
        console.log(`   └─ Error: ${error}`);
      }
      console.log(`   └─ ID: ${id}`);
      console.log("");
    });

    console.log("=== SUMMARY ===");
    console.log(`Total watches: ${result.records.length}`);
    console.log(`Active:        ${activeCount}`);
    console.log(`Inactive:      ${inactiveCount}`);
    console.log(`Total files:   ${totalFiles.toLocaleString()}`);

    // Get orphaned file count
    const orphanedResult = await session.run(`
      MATCH (f:File)
      WHERE NOT EXISTS((f)<-[:INDEXED_FILE]-(:WatchConfig {status: 'active'}))
      RETURN count(f) as orphaned_files
    `);

    const orphanedFiles = orphanedResult.records[0].get("orphaned_files")
      ?.toNumber
      ? orphanedResult.records[0].get("orphaned_files").toNumber()
      : orphanedResult.records[0].get("orphaned_files");

    console.log(`Orphaned files: ${orphanedFiles.toLocaleString()}`);
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
