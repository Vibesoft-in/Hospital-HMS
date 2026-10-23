/**
 * drop-visitid-unique-index.js
 *
 * Drops the unique index on visitId in the hospitalvisits collection.
 * Required because Follow-up-report visits intentionally reuse the visitId
 * of the patient's last visit.
 *
 * Usage: node scripts/drop-visitid-unique-index.js
 */

const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

// Load env
const envPath = path.join(__dirname, "..", "config", "environments", ".env.development");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    }
  });
}

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

if (!MONGO_URI) {
  console.error("No MongoDB URI found in environment. Set MONGODB_URI in your .env file.");
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");

  const db = mongoose.connection.db;
  const collection = db.collection("hospitalvisits");

  // List current indexes
  const indexes = await collection.indexes();
  console.log("\nCurrent indexes on hospitalvisits:");
  indexes.forEach((idx) => console.log(" -", idx.name, JSON.stringify(idx.key)));

  const targetIndex = indexes.find(
    (idx) => idx.key && idx.key.visitId !== undefined && idx.unique === true
  );

  if (!targetIndex) {
    console.log("\nNo unique index on visitId found — nothing to drop.");
  } else {
    console.log(`\nDropping unique index: "${targetIndex.name}"`);
    await collection.dropIndex(targetIndex.name);
    console.log("Done. Unique index on visitId has been removed.");
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
