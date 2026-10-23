/**
 * Drops the stale single-field pharmaTokenId index from hospitalpharmatokens.
 * The correct compound index { pharmaTokenId: 1, date: 1 } is defined in the schema
 * and will be recreated automatically on next app start.
 *
 * Usage: node scripts/fix-pharma-token-indexes.js
 */

const { MongoClient } = require("mongodb");
require("dotenv").config({ path: "./config/environments/.env.development" });

const uri = process.env.DATABASE_URL;

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection("hospitalpharmatokens");

    const indexes = await col.indexes();
    console.log("Current indexes:", indexes.map((i) => i.name));

    if (indexes.find((i) => i.name === "pharmaTokenId_1")) {
      await col.dropIndex("pharmaTokenId_1");
      console.log("Dropped stale index: pharmaTokenId_1");
    } else {
      console.log("Index pharmaTokenId_1 not found — nothing to drop.");
    }

    console.log("Done.");
  } finally {
    await client.close();
  }
}

run().catch(console.error);
