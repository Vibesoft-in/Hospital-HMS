/**
 * scripts/disable-ipd-charges.js
 *
 * Secure script to set allowBedCharges and allowNursingCharges to false
 * for a specific IPD record (e.g. 6a3fcb54ac167c661273821e).
 *
 * Usage:
 *   node scripts/disable-ipd-charges.js
 */

const mongoose = require("mongoose");
const readline = require("readline");
const path = require("path");
const fs = require("fs");

// ── 1. Load environment configuration ─────────────────────────────────────────
const nodeEnv = process.env.NODE_ENV || "development";
const envFileName = nodeEnv === "production" ? ".env.production" : ".env.development";
let envPath = path.join(__dirname, "..", "config", "environments", envFileName);

if (!fs.existsSync(envPath)) {
  const altFileName = nodeEnv === "production" ? ".env.development" : ".env.production";
  const altPath = path.join(__dirname, "..", "config", "environments", altFileName);
  if (fs.existsSync(altPath)) {
    envPath = altPath;
  }
}

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

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  const mongoUri = process.env.DATABASE_URL;
  if (!mongoUri) {
    console.error("❌  DATABASE_URL not found in environment configuration.");
    process.exit(1);
  }

  console.log(`Connecting to MongoDB (${nodeEnv})...`);
  await mongoose.connect(mongoUri);
  console.log("✅  Connected to MongoDB\n");

  // Get collections directly
  const IPDCollection = mongoose.connection.collection("hospitalipds");
  const PatientsCollection = mongoose.connection.collection("patients");

  // ── 2. Prompt for IPD ID ───────────────────────────────────────────────────
  const defaultIpdId = "6a3fcb54ac167c661273821e";
  const ipdInput = await ask(`Enter IPD ObjectId [default: ${defaultIpdId}]: `);
  const ipdIdStr = ipdInput.trim() || defaultIpdId;

  if (!mongoose.Types.ObjectId.isValid(ipdIdStr)) {
    console.error("❌  Invalid ObjectId format.");
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }

  const ipdObjectId = new mongoose.Types.ObjectId(ipdIdStr);

  // Fetch the IPD record
  const ipd = await IPDCollection.findOne({ _id: ipdObjectId });
  if (!ipd) {
    console.error(`❌  No IPD record found with _id: ${ipdIdStr}`);
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }

  // Fetch patient details for display
  let patientName = "N/A";
  if (ipd.patientId) {
    const patient = await PatientsCollection.findOne({ _id: new mongoose.Types.ObjectId(ipd.patientId) });
    if (patient) {
      patientName = `${patient.title || ""} ${patient.name || ""}`.trim();
    }
  }

  // ── 3. Preview ─────────────────────────────────────────────────────────────
  console.log("\n📋  IPD Record Found:");
  console.log(`   _id:                 ${ipd._id}`);
  console.log(`   IPD ID:              ${ipd.ipdId}`);
  console.log(`   Patient Name:        ${patientName}`);
  console.log(`   Admission Date:      ${ipd.admissionDate}`);
  console.log(`   Status:              ${ipd.status}`);
  console.log(`   allowBedCharges:     ${ipd.allowBedCharges ?? true}`);
  console.log(`   allowNursingCharges: ${ipd.allowNursingCharges ?? true}`);
  console.log("");

  // ── 4. Confirm update ──────────────────────────────────────────────────────
  const confirm = await ask("Set allowBedCharges and allowNursingCharges to false? (yes/no): ");
  if (confirm.trim().toLowerCase() !== "yes" && confirm.trim().toLowerCase() !== "y") {
    console.log("❌  Aborted. No changes made.");
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  }

  // ── 5. Perform update ──────────────────────────────────────────────────────
  const result = await IPDCollection.updateOne(
    { _id: ipdObjectId },
    {
      $set: {
        allowBedCharges: false,
        allowNursingCharges: false,
      },
    }
  );

  if (result.modifiedCount > 0) {
    console.log("\n✅  Success! IPD updated successfully.");
    console.log("   allowBedCharges set to false");
    console.log("   allowNursingCharges set to false");
  } else {
    console.log("\n⚠️   No changes made (fields might already be false).");
  }

  rl.close();
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Script failed:", err.message);
  rl.close();
  mongoose.disconnect();
  process.exit(1);
});
