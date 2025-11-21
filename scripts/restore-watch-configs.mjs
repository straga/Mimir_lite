#!/usr/bin/env node

import neo4j from "neo4j-driver";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { access } from "fs/promises";

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

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const session = driver.session();

  try {
    // Get all inactive watches
    const result = await session.run(`
      MATCH (w:WatchConfig)
      WHERE w.status = 'inactive' OR w.error = 'path_not_found'
      RETURN w.id as id, w.path as path, w.status as status, 
             w.files_indexed as files_indexed
      ORDER BY w.files_indexed DESC
    `);

    console.log("\n=== CHECKING INACTIVE WATCHES ===\n");

    const toReactivate = [];
    const stillMissing = [];

    for (const record of result.records) {
      const id = record.get("id");
      const path = record.get("path");
      const files = record.get("files_indexed")?.toNumber
        ? record.get("files_indexed").toNumber()
        : record.get("files_indexed");

      const exists = await pathExists(path);

      if (exists) {
        console.log(`✅ FOUND:   ${path} (${files} files)`);
        toReactivate.push({ id, path, files });
      } else {
        console.log(`❌ MISSING: ${path} (${files} files)`);
        stillMissing.push({ id, path, files });
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Can reactivate:  ${toReactivate.length} watches`);
    console.log(`Still missing:   ${stillMissing.length} watches`);

    if (toReactivate.length > 0) {
      console.log("\n=== REACTIVATING WATCHES ===\n");

      for (const { id, path, files } of toReactivate) {
        await session.run(
          `
          MATCH (w:WatchConfig {id: $id})
          SET 
            w.status = 'active',
            w.error = null,
            w.last_updated = datetime()
          RETURN w
        `,
          { id }
        );

        console.log(`✅ Reactivated: ${path} (${files} files)`);
      }

      console.log(
        `\n✅ Successfully reactivated ${toReactivate.length} watches!`
      );
      console.log(
        `\nNOTE: You need to restart the Mimir server for file watchers to start.`
      );
    } else {
      console.log("\n⚠️  No watches could be reactivated.");
      console.log("\nPossible solutions:");
      console.log("1. Check if paths exist on your system");
      console.log("2. Re-index folders using index_folder MCP tool");
      console.log("3. Delete orphaned watches and files");
    }

    if (stillMissing.length > 0) {
      console.log(`\n=== PATHS STILL MISSING ===`);
      stillMissing.forEach(({ path, files }) => {
        console.log(`  ${path} (${files} files)`);
      });
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
