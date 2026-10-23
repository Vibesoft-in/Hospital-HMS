/**
 * Backfill readableSourceId on FhirHealthInformation records that don't have it yet.
 *
 * For each record, looks up the source document (Visit / IPD / Daycare / Case)
 * and sets readableSourceId to the human-readable ID (visitId, ipdId, daycareId, caseId).
 *
 * Usage:
 *   node scripts/backfill-readable-source-id.js
 *   node scripts/backfill-readable-source-id.js --dry-run   (preview only, no writes)
 *
 * Safe to re-run — skips records that already have readableSourceId set.
 */

require("dotenv").config({ path: "config/environments/.env.development" });
const mongoose = require("mongoose");

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI not found in environment");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");
  if (isDryRun) console.log("DRY RUN — no writes will be made\n");

  // Loose schemas so we can query any collection without full model definitions
  const FhirRecord = mongoose.model(
    "FhirHealthInformation",
    new mongoose.Schema({}, { strict: false }),
    "fhirhealthinformations"
  );
  const Visit    = mongoose.model("HospitalVisit",            new mongoose.Schema({}, { strict: false }), "hospitalvisits");
  const IPD      = mongoose.model("HospitalIPD",              new mongoose.Schema({}, { strict: false }), "hospitalipds");
  const Daycare  = mongoose.model("DaycareAppointment",       new mongoose.Schema({}, { strict: false }), "daycareappointments");
  const Case     = mongoose.model("Case",                     new mongoose.Schema({}, { strict: false }), "cases");

  // Only process records missing the field
  const cursor = FhirRecord.find({ readableSourceId: { $exists: false } })
    .select("_id sourceType sourceId")
    .lean()
    .cursor();

  let processed = 0, updated = 0, skipped = 0, errors = 0;

  for await (const rec of cursor) {
    processed++;
    let readableId = null;

    try {
      const id = rec.sourceId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.warn(`  [SKIP] _id=${rec._id} — sourceId '${id}' is not a valid ObjectId`);
        skipped++;
        continue;
      }

      switch (rec.sourceType) {
        case "Visit": {
          const doc = await Visit.findById(id).select("visitId appointmentId").lean();
          readableId = doc?.visitId || doc?.appointmentId || null;
          break;
        }
        case "IPD": {
          const doc = await IPD.findById(id).select("ipdId").lean();
          readableId = doc?.ipdId || null;
          break;
        }
        case "Daycare": {
          const doc = await Daycare.findById(id).select("daycareId appointmentId").lean();
          readableId = doc?.daycareId || doc?.appointmentId || null;
          break;
        }
        case "Case": {
          const doc = await Case.findById(id).select("caseId").lean();
          readableId = doc?.caseId || null;
          break;
        }
        default:
          console.warn(`  [SKIP] _id=${rec._id} — unknown sourceType '${rec.sourceType}'`);
          skipped++;
          continue;
      }

      if (!readableId) {
        console.warn(`  [SKIP] _id=${rec._id} sourceType=${rec.sourceType} sourceId=${id} — source doc not found or has no readable ID`);
        skipped++;
        continue;
      }

      console.log(`  [${isDryRun ? "DRY" : "SET"}] _id=${rec._id} ${rec.sourceType} ${id} → ${readableId}`);

      if (!isDryRun) {
        await FhirRecord.updateOne({ _id: rec._id }, { $set: { readableSourceId: readableId } });
      }
      updated++;
    } catch (err) {
      console.error(`  [ERROR] _id=${rec._id} — ${err.message}`);
      errors++;
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
