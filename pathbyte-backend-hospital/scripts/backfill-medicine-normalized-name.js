/**
 * Backfill normalizedName on all Medicine documents that don't have it yet.
 *
 * normalizedName = name.toLowerCase().replace(/\s+/g, " ").trim()
 * It is the unique dedup key used for fuzzy matching on import.
 *
 * Usage:
 *   node scripts/backfill-medicine-normalized-name.js
 *   node scripts/backfill-medicine-normalized-name.js --dry-run   (preview only, no writes)
 *
 * Safe to re-run — skips documents that already have normalizedName set.
 * If two existing docs normalize to the same name (true duplicates), the script
 * will report them and skip the second one rather than crashing.
 */

require("dotenv").config({ path: "config/environments/.env.development" });
const mongoose = require("mongoose");

const isDryRun = process.argv.includes("--dry-run");

function normalizeMedicineName(name) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI not found in environment");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");
  if (isDryRun) console.log("DRY RUN — no writes will be made\n");

  const Medicine = mongoose.model(
    "Medicine",
    new mongoose.Schema({}, { strict: false }),
    "medicines"
  );

  const cursor = Medicine.find({ normalizedName: { $exists: false } })
    .select("_id name")
    .lean()
    .cursor();

  let processed = 0, updated = 0, skipped = 0, errors = 0;
  const seenNormalized = new Set();

  for await (const doc of cursor) {
    processed++;

    if (!doc.name || typeof doc.name !== "string") {
      console.warn(`  [SKIP] _id=${doc._id} — missing or invalid name`);
      skipped++;
      continue;
    }

    const normalized = normalizeMedicineName(doc.name);

    if (seenNormalized.has(normalized)) {
      console.warn(`  [DUPLICATE] _id=${doc._id} name="${doc.name}" → "${normalized}" already seen in this run, skipping`);
      skipped++;
      continue;
    }

    seenNormalized.add(normalized);
    console.log(`  [${isDryRun ? "DRY" : "SET"}] _id=${doc._id} "${doc.name}" → "${normalized}"`);

    if (!isDryRun) {
      try {
        await Medicine.updateOne({ _id: doc._id }, { $set: { normalizedName: normalized } });
        updated++;
      } catch (err) {
        // E11000 = duplicate key — another doc already got this normalizedName
        if (err.code === 11000) {
          console.warn(`  [DUPLICATE-KEY] _id=${doc._id} "${normalized}" conflicts with existing doc, skipping`);
          skipped++;
        } else {
          console.error(`  [ERROR] _id=${doc._id} — ${err.message}`);
          errors++;
        }
      }
    } else {
      updated++;
    }
  }

  console.log(`\nDone.`);
  console.log(`  Processed : ${processed}`);
  console.log(`  Updated   : ${updated}`);
  console.log(`  Skipped   : ${skipped}`);
  console.log(`  Errors    : ${errors}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
